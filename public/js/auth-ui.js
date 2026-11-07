let currentUserLoggedIn = false;
window.currentUserId = null;

function smEsc(value) {
    return String(value ?? "").replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
}
function smCartKey() { return window.currentUserId ? "cart_user_" + window.currentUserId : null; }
function smReadCart() {
    try { return smCartKey() ? JSON.parse(localStorage.getItem(smCartKey()) || "[]") : []; }
    catch (_) { return []; }
}
function smWriteCart(cart) {
    if (!smCartKey()) return;
    localStorage.setItem(smCartKey(), JSON.stringify(cart));
    updateCartCount();
    renderCartPreview();
}
function ensureHelpNav() {
    const nav = document.querySelector(".site-header nav");
    if (!nav || nav.querySelector('a[href="/help.html"]')) return;
    const link = document.createElement("a");
    link.href = "/help.html";
    link.textContent = "Help";
    nav.appendChild(link);
}
function setActiveNav() {
    const path = location.pathname;
    document.querySelectorAll(".site-header nav a").forEach(a => {
        const href = a.getAttribute("href");
        const active = (path === "/" && href === "/") ||
            (path !== "/" && href === path) ||
            (path === "/product.html" && href === "/products.html") ||
            (path === "/customer-dashboard.html" && href === "/customer-dashboard.html");
        a.classList.toggle("active", active);
        if (active) a.setAttribute("aria-current", "page");
        else a.removeAttribute("aria-current");
    });
}
function cartPreviewMarkup(cart) {
    if (!currentUserLoggedIn) return '<div class="cart-preview-empty">Log in to view your saved cart.</div>';
    if (!cart.length) return '<div class="cart-preview-empty">Your cart is empty.</div>';
    return cart.map((item, index) => `
      <div class="cart-preview-item">
        <img class="cart-preview-image" src="${smEsc(item.image || "/images/product-placeholder.png")}" alt="${smEsc(item.name || "Product")}" onerror="this.classList.add('cart-image-missing');this.removeAttribute('src')">
        <div class="cart-preview-item-info"><strong>${smEsc(item.name || "Product")}</strong><span>Rs. ${Number(item.price || 0).toLocaleString("en-PK")}</span></div>
        <div class="cart-preview-quantity">
          <button type="button" data-cart-action="minus" data-cart-index="${index}" aria-label="Decrease quantity">−</button>
          <span>${Math.max(1, Number(item.quantity || 1))}</span>
          <button type="button" data-cart-action="plus" data-cart-index="${index}" aria-label="Increase quantity">+</button>
          <button type="button" class="cart-preview-remove" data-cart-action="remove" data-cart-index="${index}" aria-label="Remove ${smEsc(item.name || "product")}">×</button>
        </div>
      </div>`).join("");
}
function renderCartPreview() {
    const cart = smReadCart();
    const preview = document.querySelector(".cart-preview-list");
    if (preview) preview.innerHTML = cartPreviewMarkup(cart);
    const count = document.querySelector(".cart-link-count");
    if (count) count.textContent = ` (${cart.length})`;
    hydrateCartImages(cart);
}
async function hydrateCartImages(cart) {
    if (!currentUserLoggedIn || !cart.length || !smCartKey()) return;
    let changed = false;
    for (const item of cart) {
        if (item.image || !item.id) continue;
        try {
            const response = await fetch(`/api/products/${encodeURIComponent(item.id)}`, { credentials: "same-origin" });
            if (!response.ok) continue;
            const product = await response.json();
            const media = Array.isArray(product.media) ? product.media : [];
            const image = media.find(m => String(m.media_type).toLowerCase() === "image" && m.file_path);
            if (image) { item.image = image.file_path; changed = true; }
            else if (product.image) { item.image = product.image; changed = true; }
        } catch (_) { /* keep cart usable if a thumbnail lookup fails */ }
    }
    if (changed) {
        localStorage.setItem(smCartKey(), JSON.stringify(cart));
        const preview = document.querySelector(".cart-preview-list");
        if (preview) preview.innerHTML = cartPreviewMarkup(cart);
    }
}
function attachCartPreview() {
    const actions = document.querySelector(".header-actions");
    if (!actions) return;
    let cartLink = actions.querySelector('a[href="/cart.html"]');
    if (!cartLink) return;
    if (cartLink.closest(".cart-hover-wrap")) {
        renderCartPreview();
        return;
    }
    const wrap = document.createElement("div");
    wrap.className = "cart-hover-wrap";
    cartLink.parentNode.insertBefore(wrap, cartLink);
    wrap.appendChild(cartLink);
    cartLink.classList.add("cart-hover-link");
    const text = cartLink.textContent.replace(/\s*\(\d+\)/, "").trim();
    cartLink.innerHTML = `<span class="cart-link-label">${smEsc(text)}</span><span class="cart-link-count"></span>`;
    const panel = document.createElement("div");
    panel.className = "cart-preview-panel";
    panel.innerHTML = `<div class="cart-preview-title">Your cart</div><div class="cart-preview-list"></div><a class="cart-preview-view button" href="/cart.html">View Cart</a>`;
    wrap.appendChild(panel);
    renderCartPreview();
}
async function updateAuthUI() {
    const headerActions = document.querySelector(".header-actions");
    ensureHelpNav();
    if (!headerActions) { setActiveNav(); return; }
    try {
        const response = await fetch("/api/auth/me", { credentials: "same-origin" });
        const result = await response.json();
        currentUserLoggedIn = result.loggedIn === true;
        if (currentUserLoggedIn) {
            window.currentUserId = result.user.id;
            const userName = result.user.name || result.user.username || "Customer";
            headerActions.innerHTML = `
              <span class="welcome-user">Hi, ${smEsc(userName)}</span>
              <a class="dashboard-header-button" href="/customer-dashboard.html">▦ Dashboard</a>
              <div class="cart-hover-wrap"><a class="cart-hover-link" href="/cart.html"><span class="cart-link-label">🛒 Cart</span><span class="cart-link-count"></span></a><div class="cart-preview-panel"><div class="cart-preview-title">Your cart</div><div class="cart-preview-list"></div><a class="cart-preview-view button" href="/cart.html">View Cart</a></div></div>`;
        } else {
            window.currentUserId = null;
            headerActions.innerHTML = `
              <a href="/login.html">Login</a>
              <a href="/signup.html">Create Account</a>
              <div class="cart-hover-wrap"><a class="cart-hover-link" href="/cart.html"><span class="cart-link-label">🛒 Cart</span><span class="cart-link-count"></span></a><div class="cart-preview-panel"><div class="cart-preview-title">Your cart</div><div class="cart-preview-list"></div><a class="cart-preview-view button" href="/cart.html">View Cart</a></div></div>`;
        }
        updateCartCount();
        renderCartPreview();
        setActiveNav();
    } catch (error) {
        console.error("Auth UI error:", error);
        ensureHelpNav();
        setActiveNav();
    }
}
async function logoutUser() {
    try {
        const response = await fetch("/api/auth/logout", { method: "POST", credentials: "same-origin" });
        const result = await response.json();
        if (result.success) { currentUserLoggedIn = false; window.currentUserId = null; window.location.href = "/"; }
    } catch (error) { console.error("Logout error:", error); }
}
function updateCartCount() {
    const count = document.querySelector(".cart-link-count");
    const cartLink = document.querySelector('.header-actions a[href="/cart.html"]');
    if (!cartLink) return;
    const cart = smReadCart();
    if (count) count.textContent = ` (${cart.length})`;
    else cartLink.textContent = `🛒 Cart (${cart.length})`;
}
document.addEventListener("click", event => {
    const button = event.target.closest("[data-cart-action]");
    if (!button) return;
    event.preventDefault();
    event.stopPropagation();
    const cart = smReadCart();
    const index = Number(button.dataset.cartIndex);
    if (!Number.isInteger(index) || !cart[index]) return;
    const action = button.dataset.cartAction;
    if (action === "plus") cart[index].quantity = Math.max(1, Number(cart[index].quantity || 1) + 1);
    if (action === "minus") {
        cart[index].quantity = Math.max(1, Number(cart[index].quantity || 1) - 1);
    }
    if (action === "remove") cart.splice(index, 1);
    smWriteCart(cart);
});
document.addEventListener("keydown", event => {
    if (event.key === "Escape") document.querySelectorAll(".cart-hover-wrap").forEach(w => w.classList.remove("cart-preview-open"));
});
document.addEventListener("mouseover", event => {
    const wrap = event.target.closest(".cart-hover-wrap");
    if (!wrap || wrap.contains(event.relatedTarget)) return;
    renderCartPreview();
    wrap.classList.add("cart-preview-open");
});
document.addEventListener("focusin", event => {
    const wrap = event.target.closest(".cart-hover-wrap");
    if (wrap) wrap.classList.add("cart-preview-open");
});
window.addEventListener("storage", event => {
    if (smCartKey() && event.key === smCartKey()) { updateCartCount(); renderCartPreview(); }
});
document.addEventListener("mouseout", event => {
    const wrap = event.target.closest(".cart-hover-wrap");
    if (wrap && !wrap.contains(event.relatedTarget)) wrap.classList.remove("cart-preview-open");
});
document.addEventListener("click", event => {
    if (!event.target.closest(".cart-hover-wrap")) document.querySelectorAll(".cart-hover-wrap").forEach(w => w.classList.remove("cart-preview-open"));
});
updateAuthUI();
