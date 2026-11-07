const express = require('express');
const multer = require('multer');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const db = require('../database');
const { requireAdmin } = require('../middleware/admin-auth');

const router = express.Router();
const uploadDir = path.join(__dirname, '..', 'private-support-uploads');
fs.mkdirSync(uploadDir, { recursive: true });

// Safe, additive schema migration. Existing store tables and records are untouched.
db.exec(`
 CREATE TABLE IF NOT EXISTS support_conversations (
   id INTEGER PRIMARY KEY AUTOINCREMENT,
   user_id INTEGER NOT NULL UNIQUE,
   status TEXT NOT NULL DEFAULT 'open' CHECK(status IN ('open','closed')),
   admin_last_read_at TEXT,
   admin_last_read_message_id INTEGER NOT NULL DEFAULT 0,
   user_last_read_at TEXT,
   created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
   updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
   FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
 );
 CREATE TABLE IF NOT EXISTS support_messages (
   id INTEGER PRIMARY KEY AUTOINCREMENT,
   conversation_id INTEGER NOT NULL,
   sender_type TEXT NOT NULL CHECK(sender_type IN ('customer','admin')),
   sender_id INTEGER NOT NULL,
   body TEXT NOT NULL DEFAULT '',
   attachment_name TEXT,
   attachment_key TEXT UNIQUE,
   attachment_mime TEXT,
   attachment_size INTEGER,
   sent_at_ms INTEGER NOT NULL DEFAULT 0,
   created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
   FOREIGN KEY(conversation_id) REFERENCES support_conversations(id) ON DELETE CASCADE
 );
 CREATE INDEX IF NOT EXISTS idx_support_messages_conversation ON support_messages(conversation_id, id);
 CREATE INDEX IF NOT EXISTS idx_support_conversations_updated ON support_conversations(updated_at DESC);
`);
// Additive compatibility migration if a partial support schema already exists.
const messageColumns = db.prepare('PRAGMA table_info(support_messages)').all().map(c => c.name);
if (!messageColumns.includes('sent_at_ms')) db.exec('ALTER TABLE support_messages ADD COLUMN sent_at_ms INTEGER NOT NULL DEFAULT 0');
const conversationColumns = db.prepare('PRAGMA table_info(support_conversations)').all().map(c => c.name);
if (!conversationColumns.includes('admin_last_read_message_id')) db.exec('ALTER TABLE support_conversations ADD COLUMN admin_last_read_message_id INTEGER NOT NULL DEFAULT 0');
if (!conversationColumns.includes('user_last_read_message_id')) db.exec('ALTER TABLE support_conversations ADD COLUMN user_last_read_message_id INTEGER NOT NULL DEFAULT 0');

function requireCustomer(req, res, next) {
  if (!req.session || !req.session.userId) return res.status(401).json({ success:false, error:'Please sign in to use customer support.' });
  const user = db.prepare('SELECT id, username, name FROM users WHERE id = ?').get(req.session.userId);
  if (!user) return res.status(401).json({ success:false, error:'Customer session is no longer valid.' });
  req.supportUser = user;
  next();
}
const storage = multer.memoryStorage();
const upload = multer({ storage, limits:{fileSize:5*1024*1024, files:1}, fileFilter(req,file,cb){
  if (!['image/jpeg','image/png','image/webp','image/gif'].includes(file.mimetype)) return cb(new Error('Attach a JPG, PNG, WEBP, or GIF image (max 5 MB).'));
  cb(null,true);
}});
function detectImage(buffer) {
  if (buffer.length >= 3 && buffer[0]===0xff && buffer[1]===0xd8 && buffer[2]===0xff) return 'image/jpeg';
  if (buffer.length >= 8 && buffer.subarray(0,8).equals(Buffer.from([137,80,78,71,13,10,26,10]))) return 'image/png';
  if (buffer.length >= 12 && buffer.toString('ascii',0,4)==='RIFF' && buffer.toString('ascii',8,12)==='WEBP') return 'image/webp';
  if (buffer.length >= 6 && ['GIF87a','GIF89a'].includes(buffer.toString('ascii',0,6))) return 'image/gif';
  return null;
}
function getOrCreateConversation(userId) {
  db.prepare('INSERT OR IGNORE INTO support_conversations(user_id) VALUES (?)').run(userId);
  return db.prepare('SELECT * FROM support_conversations WHERE user_id = ?').get(userId);
}
function serializeMessage(row) {
  return { id:row.id, senderType:row.sender_type, senderId:row.sender_id, body:row.body,
    attachment: row.attachment_key ? { url:`/api/support/attachments/${encodeURIComponent(row.attachment_key)}`, name:row.attachment_name, mime:row.attachment_mime, size:row.attachment_size } : null,
    createdAt:row.created_at };
}
const messageSelect = `SELECT id,sender_type,sender_id,body,attachment_name,attachment_key,attachment_mime,attachment_size,created_at FROM support_messages`;

router.get('/me', requireCustomer, (req,res) => {
  const conversation = getOrCreateConversation(req.supportUser.id);
  const messages = db.prepare(`${messageSelect} WHERE conversation_id=? ORDER BY id ASC LIMIT 300`).all(conversation.id).map(serializeMessage);
  const unreadRow = db.prepare("SELECT COALESCE(MAX(id),0) AS latestAdminId, COUNT(*) AS unreadCount FROM support_messages WHERE conversation_id=? AND sender_type='admin' AND id>COALESCE((SELECT user_last_read_message_id FROM support_conversations WHERE id=?),0)").get(conversation.id, conversation.id);
  const markRead = String(req.query.markRead || '').toLowerCase() === '1' || String(req.query.markRead || '').toLowerCase() === 'true';
  let unreadCount = Number(unreadRow.unreadCount || 0);
  if (markRead) {
    db.prepare('UPDATE support_conversations SET user_last_read_at=CURRENT_TIMESTAMP,user_last_read_message_id=? WHERE id=?').run(unreadRow.latestAdminId, conversation.id);
    unreadCount = 0;
  }
  const lastCustomerMessage = db.prepare("SELECT sent_at_ms,created_at FROM support_messages WHERE conversation_id=? AND sender_type='customer' ORDER BY id DESC LIMIT 1").get(conversation.id);
  const lastSentAt = lastCustomerMessage ? (lastCustomerMessage.sent_at_ms || new Date(lastCustomerMessage.created_at.replace(' ','T')+'Z').getTime()) : 0;
  const cooldownRemainingMs = lastSentAt ? Math.max(0, 15000 - (Date.now() - lastSentAt)) : 0;
  res.json({success:true, conversation:{id:conversation.id,status:conversation.status,updatedAt:conversation.updated_at},messages,cooldownRemainingMs,unreadCount});
});

router.post('/messages', requireCustomer, (req,res) => {
  upload.single('screenshot')(req,res, err => {
    if (err) return res.status(400).json({success:false,error:err.message || 'Could not upload screenshot.'});
    try {
      const body = String(req.body.message || '').trim();
      if (body.length > 2000) return res.status(400).json({success:false,error:'Messages must be 2,000 characters or fewer.'});
      if (!body && !req.file) return res.status(400).json({success:false,error:'Write a message or attach a screenshot.'});
      if (req.file && detectImage(req.file.buffer) !== req.file.mimetype) return res.status(400).json({success:false,error:'The attachment is not a valid supported image.'});
      const conversation = getOrCreateConversation(req.supportUser.id);
      if (conversation.status === 'closed') db.prepare("UPDATE support_conversations SET status='open' WHERE id=?").run(conversation.id);
      const last = db.prepare("SELECT sent_at_ms,created_at FROM support_messages WHERE conversation_id=? AND sender_type='customer' ORDER BY id DESC LIMIT 1").get(conversation.id);
      if (last) {
        const lastTime = last.sent_at_ms || new Date(last.created_at.replace(' ','T')+'Z').getTime();
        const remaining = 15000 - (Date.now() - lastTime);
        if (remaining > 0) return res.status(429).json({success:false,error:'Please wait before sending another message.',retryAfterMs:remaining});
      }
      let key=null, attachmentName=null, attachmentMime=null, attachmentSize=null;
      if (req.file) {
        key = crypto.randomBytes(24).toString('hex');
        const ext = ({'image/jpeg':'.jpg','image/png':'.png','image/webp':'.webp','image/gif':'.gif'})[req.file.mimetype];
        fs.writeFileSync(path.join(uploadDir, key+ext), req.file.buffer, {flag:'wx',mode:0o600});
        key += ext; attachmentName = path.basename(req.file.originalname || 'screenshot').slice(0,160); attachmentMime=req.file.mimetype; attachmentSize=req.file.size;
      }
      const insert = db.prepare(`INSERT INTO support_messages(conversation_id,sender_type,sender_id,body,attachment_name,attachment_key,attachment_mime,attachment_size,sent_at_ms) VALUES (?,'customer',?,?,?,?,?,?,?)`);
      const result = insert.run(conversation.id, req.supportUser.id, body, attachmentName, key, attachmentMime, attachmentSize, Date.now());
      db.prepare('UPDATE support_conversations SET updated_at=CURRENT_TIMESTAMP WHERE id=?').run(conversation.id);
      const message = db.prepare(`${messageSelect} WHERE id=?`).get(result.lastInsertRowid);
      res.status(201).json({success:true,message:serializeMessage(message),cooldownMs:15000});
    } catch(e) { console.error('Support message error:',e); res.status(500).json({success:false,error:'Could not send message.'}); }
  });
});

router.get('/attachments/:key', (req,res) => {
  const key = String(req.params.key || '');
  const row = db.prepare(`SELECT m.attachment_key,m.attachment_mime,m.attachment_name,m.conversation_id,c.user_id FROM support_messages m JOIN support_conversations c ON c.id=m.conversation_id WHERE m.attachment_key=?`).get(key);
  if (!row) return res.sendStatus(404);
  const isAdmin = !!(req.session && req.session.adminId);
  const isOwner = !!(req.session && req.session.userId && Number(req.session.userId)===row.user_id);
  if (!isAdmin && !isOwner) return res.sendStatus(403);
  const filePath = path.join(uploadDir, row.attachment_key);
  if (!fs.existsSync(filePath)) return res.sendStatus(404);
  res.set({'Content-Type':row.attachment_mime,'Content-Disposition':`inline; filename="${path.basename(row.attachment_name || 'screenshot').replace(/["\r\n]/g,'_')}"`,'X-Content-Type-Options':'nosniff','Cache-Control':'private, no-store'});
  res.sendFile(filePath);
});

router.get('/admin/conversations', requireAdmin, (req,res) => {
  const rows = db.prepare(`SELECT c.id,c.user_id,c.status,c.created_at,c.updated_at,u.name AS user_name,u.username,
    (SELECT body FROM support_messages m WHERE m.conversation_id=c.id ORDER BY m.id DESC LIMIT 1) AS last_message,
    (SELECT attachment_key FROM support_messages m WHERE m.conversation_id=c.id ORDER BY m.id DESC LIMIT 1) AS last_attachment,
    (SELECT created_at FROM support_messages m WHERE m.conversation_id=c.id ORDER BY m.id DESC LIMIT 1) AS last_message_at,
    (SELECT COUNT(*) FROM support_messages m WHERE m.conversation_id=c.id AND m.sender_type='customer' AND m.id>COALESCE(c.admin_last_read_message_id,0)) AS unread_count
    FROM support_conversations c JOIN users u ON u.id=c.user_id ORDER BY COALESCE(last_message_at,c.updated_at) DESC,c.id DESC`).all();
  res.json({success:true,conversations:rows.map(r=>({...r,last_message:r.last_message || (r.last_attachment?'📷 Screenshot':'No messages yet')}))});
});
router.get('/admin/conversations/:id/messages', requireAdmin, (req,res) => {
  const id=Number(req.params.id);
  const conversation=db.prepare('SELECT id,user_id,status FROM support_conversations WHERE id=?').get(id);
  if (!conversation) return res.status(404).json({success:false,error:'Conversation not found.'});
  const latestCustomerMessage = db.prepare("SELECT COALESCE(MAX(id),0) AS id FROM support_messages WHERE conversation_id=? AND sender_type='customer'").get(id).id;
  db.prepare('UPDATE support_conversations SET admin_last_read_at=CURRENT_TIMESTAMP,admin_last_read_message_id=? WHERE id=?').run(latestCustomerMessage,id);
  const messages=db.prepare(`${messageSelect} WHERE conversation_id=? ORDER BY id ASC LIMIT 500`).all(id).map(serializeMessage);
  res.json({success:true,conversation,messages});
});
router.post('/admin/conversations/:id/messages', requireAdmin, (req,res) => {
  const id=Number(req.params.id), body=String(req.body.message || '').trim();
  const conversation=db.prepare('SELECT id FROM support_conversations WHERE id=?').get(id);
  if (!conversation) return res.status(404).json({success:false,error:'Conversation not found.'});
  if (!body) return res.status(400).json({success:false,error:'Write a reply first.'});
  if (body.length>2000) return res.status(400).json({success:false,error:'Messages must be 2,000 characters or fewer.'});
  const result=db.prepare("INSERT INTO support_messages(conversation_id,sender_type,sender_id,body) VALUES (?,'admin',?,?)").run(id,req.session.adminId,body);
  db.prepare('UPDATE support_conversations SET updated_at=CURRENT_TIMESTAMP,status=\'open\' WHERE id=?').run(id);
  res.status(201).json({success:true,message:serializeMessage(db.prepare(`${messageSelect} WHERE id=?`).get(result.lastInsertRowid))});
});
router.post('/admin/conversations/:id/read', requireAdmin, (req,res) => {
  const id=Number(req.params.id);
  const latestCustomerMessage=db.prepare("SELECT COALESCE(MAX(id),0) AS id FROM support_messages WHERE conversation_id=? AND sender_type='customer'").get(id).id;
  const result=db.prepare('UPDATE support_conversations SET admin_last_read_at=CURRENT_TIMESTAMP,admin_last_read_message_id=? WHERE id=?').run(latestCustomerMessage,id);
  if (!result.changes) return res.status(404).json({success:false,error:'Conversation not found.'});
  res.json({success:true});
});
module.exports = router;
