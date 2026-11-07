(() => {
    "use strict";

    const ordersPanel = document.getElementById("orders");
    if (!ordersPanel) {
        console.error('Admin panel: element with id="orders" was not found.');
        return;
    }

    const api = "/api/admin/orders";
    let currentSection = "management";
    const sections = {
        management: "Pending Orders",
        approved: "Approved Orders",
        processing: "Processing Orders",
        shipped: "Shipped Orders",
        rejected: "Rejected Orders",
        delivered: "Delivered Orders"
    };

    const escapeHTML = (value) =>
        String(value ?? "").replace(/[&<>"']/g, (char) => ({
            "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
        })[char]);

    const money = (value) => "Rs. " + Number(value || 0).toLocaleString("en-PK");
    const dateText = (value) => {
        if (!value) return "—";
        const date = new Date(value);
        return Number.isNaN(date.getTime()) ? escapeHTML(value) : date.toLocaleString();
    };

    async function apiRequest(url, options = {}) {
        const response = await fetch(url, {
            credentials: "same-origin",
            ...options,
            headers: {
                ...(options.body ? { "Content-Type": "application/json" } : {}),
                ...(options.headers || {})
            }
        });
        if (response.status === 401) {
            window.location.href = "/admin/login.html";
            throw new Error("Admin login required.");
        }
        const data = await response.json().catch(() => ({}));
        if (!response.ok) throw new Error(data.message || data.error || "Request failed.");
        return data;
    }

    function addStyles() {
        if (document.getElementById("admin-orders-styles")) return;
        const style = document.createElement("style");
        style.id = "admin-orders-styles";
        style.textContent = `
            #orders .ao-summary-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:14px;margin:22px 0}
            #orders .ao-summary-card{width:100%;border:1px solid #e5e7eb;border-radius:12px;padding:18px;text-align:left;background:#fff;cursor:pointer;color:#111827;font:inherit;transition:border-color .15s,box-shadow .15s,transform .15s}
            #orders .ao-summary-card:hover{border-color:#93b4ff;transform:translateY(-1px)}
            #orders .ao-summary-card.active{border:2px solid #2563eb;padding:17px;box-shadow:0 0 0 3px #dbeafe}
            #orders .ao-summary-label{display:block;color:#6b7280;font-size:13px}
            #orders .ao-summary-count{display:block;font-size:27px;font-weight:750;margin:10px 0 5px}
            #orders .ao-summary-help{display:block;color:#6b7280;font-size:12px;line-height:1.4}
            #orders .ao-toolbar{display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:12px;margin:16px 0}
            #orders .ao-tabs{display:flex;gap:8px;flex-wrap:wrap;margin:18px 0}
            #orders .ao-tab{border:1px solid #d1d5db;border-radius:8px;padding:10px 13px;background:#fff;color:#374151;cursor:pointer;font:inherit;font-size:13px;font-weight:600}
            #orders .ao-tab:hover{background:#f3f4f6}
            #orders .ao-tab.active{background:#2563eb;border-color:#2563eb;color:#fff}
            #orders .ao-btn{border:1px solid #d1d5db;border-radius:7px;padding:8px 11px;background:#fff;color:#111827;cursor:pointer;font:inherit}
            #orders .ao-btn:hover{background:#f3f4f6}
            #orders .ao-btn:disabled{opacity:.55;cursor:wait}
            #orders .ao-btn-primary{background:#111827;color:#fff;border-color:#111827}
            #orders .ao-btn-primary:hover{background:#374151}
            #orders .ao-btn-danger{color:#b91c1c;border-color:#fecaca}
            #orders .ao-table-wrap{overflow-x:auto;width:100%}
            #orders .ao-table{width:100%;border-collapse:collapse;min-width:850px}
            #orders .ao-table th,#orders .ao-table td{padding:12px 10px;border-bottom:1px solid #e5e7eb;text-align:left;vertical-align:top;font-size:14px}
            #orders .ao-table th{background:#f9fafb;font-weight:600}
            #orders .ao-status{display:inline-block;padding:4px 8px;border-radius:20px;background:#f3f4f6;font-size:12px}
            #orders .ao-countdown{display:inline-block;margin-top:7px;color:#b45309;line-height:1.4}
            #orders .ao-details{background:#f9fafb}
            #orders .ao-detail-box{padding:15px;line-height:1.7;overflow-wrap:anywhere}
            #orders .ao-delivery-card{margin:12px 0 20px;padding:15px;background:#fff;border:1px solid #e5e7eb;border-radius:9px}
            #orders .ao-delivery-card p{margin:6px 0}
            #orders .ao-receipt{display:block;max-width:360px;max-height:420px;object-fit:contain;margin:10px 0;border:1px solid #ddd;background:white;border-radius:6px}
            #orders .ao-controls{display:flex;gap:7px;flex-wrap:wrap;align-items:center}
            #orders .ao-tracking-form{display:grid;grid-template-columns:repeat(3,minmax(150px,1fr));gap:10px;align-items:end;margin:12px 0}
            #orders .ao-tracking-form label{font-size:12px;font-weight:600;color:#4b5563}
            #orders .ao-tracking-form input{width:100%;margin-top:6px;padding:9px;border:1px solid #d1d5db;border-radius:7px;font:inherit;min-width:0}
            #orders .ao-tracking-form button{min-height:36px}
            #orders .ao-controls select{max-width:180px;padding:8px;border:1px solid #d1d5db;border-radius:7px}
            #orders .ao-message{padding:12px;margin:12px 0;border-radius:7px;background:#f3f4f6}
            #orders .ao-error{background:#fef2f2;color:#991b1b}
            #orders .ao-rejection-note{padding:10px 12px;margin:8px 0;border:1px solid #fecaca;border-radius:7px;background:#fef2f2;color:#991b1b;white-space:pre-wrap;overflow-wrap:anywhere}
            #orders .ao-items{width:100%;border-collapse:collapse;margin-top:10px}
            #orders .ao-items th,#orders .ao-items td{padding:7px;border:1px solid #e5e7eb}
            @media(max-width:900px){#orders .ao-summary-grid{grid-template-columns:repeat(2,minmax(0,1fr))}}
            @media(max-width:600px){#orders .ao-summary-grid{gap:9px}#orders .ao-summary-card{padding:13px}#orders .ao-summary-card.active{padding:12px}#orders .ao-summary-count{font-size:23px}#orders .ao-tab{flex:1 1 45%}#orders .ao-tracking-form{grid-template-columns:1fr}}
        `;
        document.head.appendChild(style);
    }

    function statusOptions(current, paymentStatus) {
        let statuses;
        if (paymentStatus !== "approved") statuses = [current || "pending"];
        else if (current === "pending") statuses = ["pending", "processing", "cancelled"];
        else if (current === "processing") statuses = ["processing", "shipped", "cancelled"];
        else if (current === "shipped") statuses = ["shipped", "delivered"];
        else statuses = [current || "pending"];
        return statuses.map(status =>
            `<option value="${escapeHTML(status)}" ${status === current ? "selected" : ""}>${escapeHTML(status)}</option>`
        ).join("");
    }

    function countdownDueEpoch(shippedAt) {
        if (!shippedAt) return 0;
        const normalized = String(shippedAt).includes("T") ? String(shippedAt) : String(shippedAt).replace(" ", "T") + "Z";
        const shippedEpoch = Date.parse(normalized);
        return Number.isFinite(shippedEpoch) ? shippedEpoch + 10 * 24 * 60 * 60 * 1000 : 0;
    }

    function refreshCountdowns() {
        ordersPanel.querySelectorAll("[data-countdown-due]").forEach(node => {
            const due = Number(node.dataset.countdownDue);
            if (!due) { node.textContent = "Countdown unavailable"; return; }
            const remaining = due - Date.now();
            if (remaining <= 0) { node.textContent = "Delivery update pending…"; return; }
            let seconds = Math.floor(remaining / 1000);
            const days = Math.floor(seconds / 86400); seconds %= 86400;
            const hours = Math.floor(seconds / 3600); seconds %= 3600;
            const minutes = Math.floor(seconds / 60); seconds %= 60;
            node.textContent = `Auto-delivery in ${days}d ${hours}h ${minutes}m ${seconds}s`;
        });
    }

    function paymentButtons(order) {
        if (order.payment_status === "submitted" && order.receipt_path) {
            return `<div class="ao-controls">
                <button class="ao-btn ao-btn-primary" data-action="payment" data-id="${Number(order.id)}" data-status="approved">Approve payment</button>
                <button class="ao-btn ao-btn-danger" data-action="payment" data-id="${Number(order.id)}" data-status="rejected">Reject</button>
            </div>`;
        }
        const status = `<span class="ao-status">${escapeHTML(order.payment_status || "unknown")}</span>`;
        const note = order.payment_status === "rejected" && order.rejection_note
            ? `<div class="ao-rejection-note"><strong>Rejection reason:</strong><br>${escapeHTML(order.rejection_note)}</div>` : "";
        return `${status}${note}`;
    }

    function renderOrders(orders) {
        const content = ordersPanel.querySelector("#ao-orders-content");
        if (!orders.length) {
            content.innerHTML = `<div class="ao-message">Is section mein abhi koi order nahi hai.</div>`;
            return;
        }
        orders.sort((a, b) => Number(b.id) - Number(a.id));
        const rows = orders.map(order => `
            <tr>
                <td>#${Number(order.id)}</td>
                <td><strong>${escapeHTML(order.full_name)}</strong><br>${escapeHTML(order.phone)}<br><small>${escapeHTML(order.customer_username || "")}</small></td>
                <td>${money(order.total)}</td>
                <td>${paymentButtons(order)}</td>
                <td><span class="ao-status">${escapeHTML(order.order_status || "pending")}</span>
                    ${order.order_status === "shipped" && order.shipped_at ? `<br><small class="ao-countdown" data-countdown-due="${countdownDueEpoch(order.shipped_at)}">Calculating countdown…</small>` : ""}
                </td>
                <td>${dateText(order.created_at)}</td>
                <td><button class="ao-btn" data-action="details" data-id="${Number(order.id)}">View details</button></td>
            </tr>`).join("");
        content.innerHTML = `<div class="ao-table-wrap"><table class="ao-table">
            <thead><tr><th>Order</th><th>Customer</th><th>Total</th><th>Payment</th><th>Order status</th><th>Date</th><th>Details</th></tr></thead>
            <tbody>${rows}</tbody></table></div><p><small>Total orders shown: ${orders.length}</small></p>`;
    }

    async function loadStats() {
        const data = await apiRequest(`${api}/stats`);
        if (!data.success || !data.stats) throw new Error("Dashboard statistics ka response sahi nahi hai.");
        const stats = data.stats;
        for (const [section, count] of Object.entries(stats.sectionCounts || {})) {
            const cardCount = ordersPanel.querySelector(`[data-count="${section}"]`);
            if (cardCount) cardCount.textContent = Number(count || 0).toLocaleString("en-PK");
        }
        const mapping = { totalProducts: stats.totalProducts, totalCustomers: stats.totalCustomers, totalOrders: stats.totalOrders, pendingPayments: stats.pendingPayments };
        for (const [id, value] of Object.entries(mapping)) {
            const element = document.getElementById(id);
            if (element) element.textContent = Number(value || 0).toLocaleString("en-PK");
        }
    }

    async function loadOrders() {
        const content = ordersPanel.querySelector("#ao-orders-content");
        content.innerHTML = '<div class="ao-message">Orders load ho rahe hain…</div>';
        try {
            const data = await apiRequest(`${api}?section=${encodeURIComponent(currentSection)}`);
            if (!data.success || !Array.isArray(data.orders)) throw new Error("Orders ka response sahi nahi hai.");
            renderOrders(data.orders);
            refreshCountdowns();
        } catch (error) {
            content.innerHTML = `<div class="ao-message ao-error">${escapeHTML(error.message)}</div>`;
        }
    }

    async function showDetails(button) {
        const id = Number(button.dataset.id);
        const oldRow = button.closest("tr");
        const existing = oldRow.nextElementSibling;
        if (existing && existing.classList.contains("ao-details")) {
            existing.remove();
            button.textContent = "View details";
            return;
        }

        button.disabled = true;
        button.textContent = "Loading…";
        try {
            const data = await apiRequest(`${api}/${id}`);
            if (!data.success || !data.order) throw new Error("Order details nahi milin.");
            const order = data.order;
            const items = (order.items || []).map(item => `
                <tr><td>${escapeHTML(item.product_name)}</td><td>${Number(item.quantity)}</td><td>${money(item.price)}</td><td>${money(Number(item.quantity) * Number(item.price))}</td></tr>
            `).join("");
            const receipt = order.receipt_path ? `
                <p><strong>Uploaded receipt:</strong></p>
                <a href="${escapeHTML(order.receipt_path)}" target="_blank" rel="noopener">
                    <img class="ao-receipt" src="${escapeHTML(order.receipt_path)}" alt="Payment receipt for order ${id}">
                </a>` : "<p>No receipt uploaded yet.</p>";
            const rejectionNote = order.payment_status === "rejected"
                ? `<div class="ao-rejection-note"><strong>Payment rejection reason:</strong><br>${escapeHTML(order.rejection_note || "No reason was recorded.")}</div>` : "";

            const detailsRow = document.createElement("tr");
            detailsRow.className = "ao-details";
            detailsRow.innerHTML = `<td colspan="7"><div class="ao-detail-box">
                <h3>Order #${id} details</h3>
                <div class="ao-delivery-card"><h4>Complete Delivery Details</h4>
                    <p><strong>Full Name:</strong> ${escapeHTML(order.full_name || "Not provided")}</p>
                    <p><strong>Phone:</strong> ${escapeHTML(order.phone || "Not provided")}</p>
                    <p><strong>Street / House Address:</strong> ${escapeHTML(order.address || "Not provided")}</p>
                    <p><strong>City:</strong> ${escapeHTML(order.city || "Not provided")}</p>
                    <p><strong>Province / Territory:</strong> ${escapeHTML(order.province || "Not provided")}</p>
                    <p><strong>Postal Code:</strong> ${escapeHTML(order.postal_code || "Not provided")}</p>
                    <p><strong>Delivery Instructions:</strong> ${escapeHTML(order.delivery_instructions || "None")}</p>
                </div>
                <p><strong>Payment status:</strong> ${escapeHTML(order.payment_status || "unknown")}</p>
                ${rejectionNote}
                <p><strong>Order status:</strong> ${escapeHTML(order.order_status || "pending")}</p>
                <p><strong>Order total:</strong> ${money(order.total)}</p>
                <h4>Ordered Products</h4>
                <div class="ao-table-wrap"><table class="ao-items">
                    <thead><tr><th>Product</th><th>Qty</th><th>Unit price</th><th>Subtotal</th></tr></thead>
                    <tbody>${items || "<tr><td colspan='4'>No items found.</td></tr>"}</tbody>
                </table></div>
                ${receipt}
                <hr><h4>Product-wise Tracking</h4>
                <p>Har product ki har quantity ki tracking row manage karne ke liye Tracking page open karein.</p>
                <p><a class="ao-btn ao-btn-primary" href="/admin/tracking.html">Open Tracking page</a></p>
                <hr><p><strong>Update order status:</strong></p>
                <div class="ao-controls"><select data-status-select="${id}">${statusOptions(order.order_status, order.payment_status)}</select>
                <button class="ao-btn ao-btn-primary" data-action="status" data-id="${id}">Save status</button></div>
            </div></td>`;
            oldRow.insertAdjacentElement("afterend", detailsRow);
            button.textContent = "Hide details";
        } catch (error) {
            alert(error.message);
            button.textContent = "View details";
        } finally {
            button.disabled = false;
        }
    }

    async function updatePayment(button) {
        const id = Number(button.dataset.id);
        const payment_status = button.dataset.status;
        let rejection_note = "";

        if (payment_status === "rejected") {
            const answer = window.prompt(`Order #${id} reject karne ki wajah likhein. Ye customer ko nazar aayegi:`);
            if (answer === null) return;
            rejection_note = answer.trim();
            if (!rejection_note) {
                alert("Reject karne ke liye reason zaroor likhein.");
                return;
            }
        }

        const verb = payment_status === "approved" ? "approve" : "reject";
        if (!confirm(`Order #${id} ki payment ${verb} karni hai? Receipt check kar lena.`)) return;

        button.disabled = true;
        try {
            const result = await apiRequest(`${api}/${id}/payment`, {
                method: "PATCH",
                body: JSON.stringify({ payment_status, rejection_note })
            });
            alert(result.message || "Payment status updated.");
            await Promise.all([loadOrders(), loadStats()]);
        } catch (error) {
            alert(error.message);
            button.disabled = false;
        }
    }

    async function updateOrderStatus(button) {
        const id = Number(button.dataset.id);
        const select = ordersPanel.querySelector(`[data-status-select="${id}"]`);
        if (!select) return;
        button.disabled = true;
        try {
            const result = await apiRequest(`${api}/${id}/status`, {
                method: "PATCH",
                body: JSON.stringify({ order_status: select.value })
            });
            alert(result.message || "Order status updated.");
            await Promise.all([loadOrders(), loadStats()]);
        } catch (error) {
            alert(error.message);
        } finally {
            button.disabled = false;
        }
    }

    function renderSectionCards() {
        ordersPanel.querySelectorAll("button[data-section]").forEach(card => {
            const active = card.dataset.section === currentSection;
            card.classList.toggle("active", active);
            card.setAttribute("aria-pressed", String(active));
        });
        const title = ordersPanel.querySelector("#ao-section-title");
        if (title) title.textContent = sections[currentSection];
    }

    function initializeOrdersPanel() {
        addStyles();
        ordersPanel.innerHTML = `
            <div class="ao-page-heading"><h2>Order Management</h2><p>Payment review, order processing, shipping aur delivery ek hi jagah manage karein.</p></div>
            <div class="ao-summary-grid" aria-label="Order sections">
                <button type="button" class="ao-summary-card active" data-section="management" aria-pressed="true"><span class="ao-summary-label">Awaiting action</span><span class="ao-summary-count" data-count="management">—</span><strong>Pending</strong><span class="ao-summary-help">New orders and payment review</span></button>
                <button type="button" class="ao-summary-card" data-section="approved" aria-pressed="false"><span class="ao-summary-label">Payment approved</span><span class="ao-summary-count" data-count="approved">—</span><strong>Approved</strong><span class="ao-summary-help">Ready to begin processing</span></button>
                <button type="button" class="ao-summary-card" data-section="processing" aria-pressed="false"><span class="ao-summary-label">Being prepared</span><span class="ao-summary-count" data-count="processing">—</span><strong>Processing</strong><span class="ao-summary-help">Orders placed with supplier</span></button>
                <button type="button" class="ao-summary-card" data-section="shipped" aria-pressed="false"><span class="ao-summary-label">On the way</span><span class="ao-summary-count" data-count="shipped">—</span><strong>Shipped</strong><span class="ao-summary-help">Tracking details entered</span></button>
                <button type="button" class="ao-summary-card" data-section="rejected" aria-pressed="false"><span class="ao-summary-label">Payment rejected</span><span class="ao-summary-count" data-count="rejected">—</span><strong>Rejected</strong><span class="ao-summary-help">Rejected payment records</span></button>
                <button type="button" class="ao-summary-card" data-section="delivered" aria-pressed="false"><span class="ao-summary-label">Completed</span><span class="ao-summary-count" data-count="delivered">—</span><strong>Delivered</strong><span class="ao-summary-help">Successfully delivered orders</span></button>
            </div>
            <div class="ao-toolbar"><strong id="ao-section-title">Order Management</strong><button class="ao-btn ao-btn-primary" id="ao-refresh">Refresh orders</button></div>
            <div id="ao-orders-content"><div class="ao-message">Orders load ho rahe hain…</div></div>`;

        renderSectionCards();
        document.getElementById("ao-refresh").addEventListener("click", loadOrders);
        ordersPanel.addEventListener("click", async (event) => {
            const tab = event.target.closest("button[data-section]");
            if (tab && ordersPanel.contains(tab)) {
                const section = tab.dataset.section;
                if (!Object.prototype.hasOwnProperty.call(sections, section)) return;
                currentSection = section;
                renderSectionCards();
                await loadOrders();
                return;
            }
            const button = event.target.closest("button[data-action]");
            if (!button || !ordersPanel.contains(button)) return;
            if (button.dataset.action === "details") await showDetails(button);
            if (button.dataset.action === "payment") await updatePayment(button);
            if (button.dataset.action === "status") await updateOrderStatus(button);
        });

        loadOrders();
        loadStats().catch(error => console.error("Dashboard stats:", error.message));
    }

    // Update visible countdown every second; server-side delivery remains authoritative.
    setInterval(refreshCountdowns, 1000);
    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", initializeOrdersPanel, { once: true });
    } else {
        initializeOrdersPanel();
    }
})();
