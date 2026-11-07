
(() => {
  "use strict";

  const $ = (id) => document.getElementById(id);

  const state = {
    products: [],
    categories: [],
    orders: [],
    selectedCategory: null,
    selectedOrderFilter: "all-history",
    selectedTrackingOrder: null,
    selectedDetailsOrder: null
  };

  const videoCache = new Map();

  const esc = (value) => String(value ?? "").replace(/[&<>"']/g, (c) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;"
  })[c]);

  const money = (value) =>
    "Rs. " + Number(value || 0).toLocaleString("en-PK");

  const pretty = (value) =>
    String(value || "pending")
      .replace(/[_-]/g, " ")
      .replace(/\b\w/g, c => c.toUpperCase());

  const statusClass = (value) =>
    String(value || "pending")
      .toLowerCase()
      .replace(/[^a-z0-9_-]/g, "");

  async function getJSON(url) {
    const response = await fetch(url, {
      credentials: "same-origin"
    });

    const data = await response.json().catch(() => ({}));

    if (response.status === 401) {
      window.location.href =
        "/login.html?redirect=" +
        encodeURIComponent("/customer-dashboard.html");

      throw new Error("Please log in to view your dashboard.");
    }

    if (!response.ok) {
      throw new Error(data.error || "Could not load data.");
    }

    return data;
  }

  function productCard(p) {
    const image = p.image
      ? `<img src="${esc(p.image)}" alt="${esc(p.name)}" loading="lazy">`
      : `<span class="product-placeholder">Image coming soon</span>`;

    return `<article class="product-tile product-tile-clickable"
      data-product-id="${esc(p.id)}"
      data-product-url="/product.html?id=${encodeURIComponent(p.id)}"
      tabindex="0"
      role="link"
      aria-label="View ${esc(p.name)}">

      <div class="product-media">${image}</div>
      <h3>${esc(p.name)}</h3>
      <p class="product-description">${esc(
        p.description || "Discover more details about this product."
      )}</p>
      <div class="product-tile-bottom">
        <span class="product-price">${money(p.price)}</span>
      </div>
    </article>`;
  }

  function renderProducts(
    targetId,
    products,
    query = "",
    pricePrefix = null
  ) {
    const box = $(targetId);
    if (!box) return;

    const q = query.trim().toLowerCase();

    const prefix =
      pricePrefix ||
      (targetId === "allProducts" ? "all" : "category");

    const minValue = $(prefix + "MinPrice")?.value;
    const maxValue = $(prefix + "MaxPrice")?.value;

    const min =
      minValue !== "" && minValue != null
        ? Number(minValue)
        : null;

    const max =
      maxValue !== "" && maxValue != null
        ? Number(maxValue)
        : null;

    const filtered = products.filter(p =>
      (!q ||
        `${p.name || ""} ${p.description || ""}`
          .toLowerCase()
          .includes(q)) &&
      (min === null || Number(p.price) >= min) &&
      (max === null || Number(p.price) <= max)
    );

    if (targetId === "allProducts" && $("allProductCount")) {
      $("allProductCount").textContent =
        `${filtered.length} product${filtered.length === 1 ? "" : "s"}`;
    }

    if (!filtered.length) {
      box.innerHTML =
        `<div class="state-card">No products match your search.</div>`;
      return;
    }

    box.innerHTML = filtered.map(productCard).join("");
  }

  function renderCategories(query = "") {
    const list = $("categoryList");
    if (!list) return;

    const q = query.trim().toLowerCase();

    const categories = state.categories.filter(c =>
      `${c.name || ""} ${c.description || ""}`
        .toLowerCase()
        .includes(q)
    );

    if (!categories.length) {
      list.innerHTML =
        `<div class="muted-state">No categories found.</div>`;
      return;
    }

    list.innerHTML = categories.map(c => `
      <button type="button"
        class="category-option ${
          String(c.id) === String(state.selectedCategory) ? "active" : ""
        }"
        data-category-id="${esc(c.id)}">
        <span>${esc(c.name)}</span>
        <small>›</small>
      </button>
    `).join("");

    list.querySelectorAll("[data-category-id]").forEach(button => {
      button.addEventListener("click", () => {
        state.selectedCategory = button.dataset.categoryId;

        const selected = state.categories.find(
          c => String(c.id) === String(state.selectedCategory)
        );

        if ($("selectedCategoryTitle")) {
          $("selectedCategoryTitle").textContent =
            selected?.name || "Category";
        }

        if ($("selectedCategoryDescription")) {
          $("selectedCategoryDescription").textContent = "";
        }

        renderCategories($("categorySearch")?.value || "");

        const products = state.products.filter(
          p => String(p.category_id) === String(state.selectedCategory)
        );

        renderProducts(
          "categoryProducts",
          products,
          $("categoryProductSearch")?.value || "",
          "category"
        );
      });
    });
  }

  function paymentLabel(value) {
    const map = {
      pending: "Payment under verification",
      submitted: "Payment under verification",
      approved: "Payment accepted",
      rejected: "Rejected"
    };

    return map[String(value || "pending").toLowerCase()]
      || `Payment: ${pretty(value)}`;
  }

  function orderCard(o) {
    const payment = String(o.payment_status || "pending").toLowerCase();
    const orderStatus = String(o.order_status || "pending").toLowerCase();

    const lines = (o.items || []).map(i => `
      <span class="order-line">
        ${esc(i.product_name)} × ${Number(i.quantity || 0)} · ${money(i.price)}
      </span>
    `).join("");

    const milestones = [
      ["Order placed", true],
      [
        payment === "approved"
          ? "Payment verified"
          : payment === "rejected"
            ? "Payment rejected"
            : "Payment verification pending",
        ["submitted", "approved", "rejected"].includes(payment)
      ],
      [
        "Processing",
        ["processing", "shipped", "delivered"].includes(orderStatus)
      ],
      ["Shipped", ["shipped", "delivered"].includes(orderStatus)],
      ["Delivered", orderStatus === "delivered"]
    ].map(([label, done]) => `
      <span class="milestone ${done ? "done" : ""}">
        ${done ? "✓ " : ""}${esc(label)}
      </span>
    `).join("");

    const rejection =
      payment === "rejected" && o.rejection_note
        ? `<div class="rejection-note">
            <strong>Reason for rejection</strong><br>
            ${esc(o.rejection_note)}
          </div>`
        : "";

    let note = "";

    if (payment === "pending" || payment === "submitted") {
      note = "Your order has been received and it is under payment review.";
    } else if (payment === "rejected") {
      note =
        "Please review the rejection reason above and contact support if you need help.";
    } else if (
      payment === "approved" &&
      !["processing", "shipped", "delivered"].includes(orderStatus)
    ) {
      note =
        "Your payment has been approved. Your order will move to processing next.";
    }

    return `<article class="order-status-card">
      <div class="order-status-head">
        <div>
          <div class="order-number">Order #${Number(o.id)}</div>
          <span class="order-date">${esc(o.created_at || "")}</span>
        </div>
        <div class="order-total">
          ${money(o.total)}<br>
          <span class="status-pill ${payment === "rejected" ? "rejected" : "order-state-pill"}">
            ${esc(paymentLabel(payment))}
          </span>
          ${
            ["processing", "shipped", "delivered"].includes(orderStatus)
              ? `<br><span class="status-pill order-state-pill">
                  ${esc(pretty(orderStatus))}
                </span>`
              : ""
          }
        </div>
      </div>

      <div class="order-lines">
        ${lines || '<span class="order-line">Product details unavailable</span>'}
      </div>

      <div class="order-milestones">${milestones}</div>
      ${note ? `<p class="payment-note">${esc(note)}</p>` : ""}
      ${rejection}
      <button type="button" class="primary-button order-details-open" data-open-order-details="${esc(o.id)}">Order Details ↗</button>

      ${
        payment === "rejected"
          ? `<p class="payment-note">
              If you have a corrected receipt, open the order/payment page
              or contact customer support for next steps.
            </p>`
          : ""
      }
    </article>`;
  }

  const orderStatusGroups = [
    {
      key: "placed",
      label: "Order Placed",
      matches: o =>
        String(o.payment_status || "pending").toLowerCase() !== "rejected" &&
        !["processing", "shipped", "delivered"].includes(
          String(o.order_status || "pending").toLowerCase()
        ) &&
        String(o.payment_status || "pending").toLowerCase() !== "approved"
    },
    {
      key: "rejected",
      label: "Payment Rejected",
      matches: o =>
        String(o.payment_status || "").toLowerCase() === "rejected"
    },
    {
      key: "accepted",
      label: "Payment Accepted",
      matches: o =>
        String(o.payment_status || "").toLowerCase() === "approved" &&
        !["processing", "shipped", "delivered"].includes(
          String(o.order_status || "pending").toLowerCase()
        )
    },
    {
      key: "processing",
      label: "Processing",
      matches: o =>
        String(o.order_status || "").toLowerCase() === "processing"
    },
    {
      key: "shipped",
      label: "Shipped",
      matches: o =>
        String(o.order_status || "").toLowerCase() === "shipped"
    },
    {
      key: "delivered",
      label: "Delivered",
      matches: o =>
        String(o.order_status || "").toLowerCase() === "delivered"
    }
  ];

  function renderOrders() {
    const box = $("orderStatusList");
    if (!box) return;

    const counts = orderStatusGroups.map(group => ({
      ...group,
      count: state.orders.filter(group.matches).length
    }));

    const current = state.selectedOrderFilter;
    const selectedGroup = counts.find(group => group.key === current);

    const shownOrders =
      current === "all-history"
        ? state.orders
        : state.orders.filter(selectedGroup?.matches || (() => false));

    const filters = `
      <div class="order-status-filters" aria-label="Filter orders by status">
        ${counts.map(group => `
          <button type="button"
            class="order-filter-card ${
              current === group.key ? "active" : ""
            }"
            data-order-filter="${group.key}"
            aria-pressed="${current === group.key}">
            <span>${esc(group.label)}</span>
            <strong>${group.count}</strong>
          </button>
        `).join("")}

        <button type="button"
          class="order-filter-card order-history-filter ${
            current === "all-history" ? "active" : ""
          }"
          data-order-filter="all-history"
          aria-pressed="${current === "all-history"}">
          <span>All Orders History</span>
          <strong>${state.orders.length}</strong>
        </button>
      </div>`;

    if (!state.orders.length) {
      box.innerHTML = filters + `
        <div class="state-card">
          You have not placed an order yet.
          <a href="/products.html">Browse products</a> to get started.
        </div>`;

      bindOrderFilters();
      renderCustomerOrderDetails();
      return;
    }

    box.innerHTML = filters + `
      <div class="order-filter-results">
        ${
          current !== "all-history"
            ? `<div class="order-filter-caption">
                ${esc(selectedGroup?.label || "")} · ${shownOrders.length}
                order${shownOrders.length === 1 ? "" : "s"}
              </div>`
            : `<div class="order-filter-caption">
                All Orders History · ${state.orders.length}
                order${state.orders.length === 1 ? "" : "s"}
              </div>`
        }
        ${
          shownOrders.length
            ? shownOrders.map(orderCard).join("")
            : `<div class="state-card">No orders in this status.</div>`
        }
      </div>`;

    bindOrderFilters();
    renderCustomerOrderDetails();
  }

  function renderCustomerOrderDetails() {
    const picker = $("customerOrderPicker");
    const details = $("customerOrderDetails");
    if (!picker || !details) return;
    if (!state.orders.length) {
      picker.innerHTML = `<div class="state-card">No orders to display yet.</div>`;
      details.innerHTML = "";
      return;
    }
    if (!state.orders.some(o => String(o.id) === String(state.selectedDetailsOrder))) {
      state.selectedDetailsOrder = String(state.orders[0].id);
    }
    const selected = state.orders.find(o => String(o.id) === String(state.selectedDetailsOrder));
    picker.innerHTML = state.orders.map(o => `
      <button type="button" class="customer-order-choice ${String(o.id) === String(state.selectedDetailsOrder) ? "active" : ""}" data-customer-order="${esc(o.id)}" aria-pressed="${String(o.id) === String(state.selectedDetailsOrder)}">
        <span><strong>Order #${Number(o.id)}</strong><small><span class="status-pill ${String(o.payment_status || "").toLowerCase() === "rejected" ? "rejected" : "order-state-pill"}">${String(o.payment_status || "").toLowerCase() === "rejected" ? "Rejected" : esc(pretty(o.order_status))}</span></small></span>
        <b>${money(o.total)}</b>
      </button>`).join("");
    const items = (selected.items || []).map(item => `<div class="customer-detail-product"><span><strong>${esc(item.product_name || "Product")}</strong><small>Qty ${Number(item.quantity || 1)} × ${money(item.price)}</small></span><b>${money(Number(item.quantity || 1) * Number(item.price || 0))}</b></div>`).join("") || `<p class="customer-detail-muted">No item details were returned for this order.</p>`;
    const selectedStatus = String(selected.order_status || "").toLowerCase();
    const isEditable = !["shipped", "delivered"].includes(selectedStatus);
    details.innerHTML = `
      <article class="customer-order-detail-card">
        <div class="customer-detail-title"><div><span class="details-eyebrow">ORDER #${Number(selected.id)}</span><h4>Products & delivery</h4></div><span class="status-pill ${String(selected.payment_status || "").toLowerCase() === "rejected" ? "rejected" : "order-state-pill"}">${String(selected.payment_status || "").toLowerCase() === "rejected" ? "Rejected" : esc(pretty(selected.order_status))}</span></div>
        <div class="customer-detail-products">${items}</div>
        <div class="customer-detail-total"><span>Order total</span><strong>${money(selected.total)}</strong></div>
        <div class="customer-address-block"><h4>Saved delivery address</h4>
          <div class="customer-address-summary"><strong>${esc(selected.full_name || "Not provided")}</strong><span>${esc(selected.phone || "")}</span><p>${esc([selected.address, selected.city, selected.province, selected.postal_code].filter(Boolean).join(", ") || "No saved address available")}</p>${selected.delivery_instructions ? `<small>Instructions: ${esc(selected.delivery_instructions)}</small>` : ""}</div>
        </div>
        ${isEditable ? `<form class="delivery-edit-form" id="deliveryEditForm" data-edit-order="${Number(selected.id)}"><h4>Edit delivery details <span>Available until Shipped</span></h4><div class="delivery-edit-grid">
          <label>Full Name<input name="fullName" required maxlength="120" value="${esc(selected.full_name || "")}"></label>
          <label>Contact Number<input name="phone" required maxlength="30" value="${esc(selected.phone || "")}"></label>
          <label>Province / Territory<input name="province" required maxlength="100" value="${esc(selected.province || "")}"></label>
          <label>City<input name="city" required maxlength="100" value="${esc(selected.city || "")}"></label>
          <label>Postal Code<input name="postalCode" required inputmode="numeric" pattern="[0-9]{5}" maxlength="5" value="${esc(selected.postal_code || "")}"></label>
          <label class="delivery-edit-wide">Complete Delivery Address<textarea name="address" required maxlength="1000" rows="3">${esc(selected.address || "")}</textarea></label>
          <label class="delivery-edit-wide">Delivery Instructions (optional)<textarea name="deliveryInstructions" maxlength="1000" rows="2">${esc(selected.delivery_instructions || "")}</textarea></label>
        </div><p class="delivery-edit-message" id="deliveryEditMessage" role="status"></p><button class="primary-button" type="submit">Save Delivery Details</button></form>` : `<p class="delivery-locked-note">${["shipped", "delivered"].includes(selectedStatus) ? "This order has shipped, so delivery details can no longer be edited. Please contact Customer Support if you need help." : "Delivery details are unavailable for this order. Please contact Customer Support if you need a change."}</p>`}
      </article>`;
    picker.querySelectorAll("[data-customer-order]").forEach(button => button.addEventListener("click", () => {
      state.selectedDetailsOrder = button.dataset.customerOrder;
      renderCustomerOrderDetails();
    }));
    const form = $("deliveryEditForm");
    if (form) form.addEventListener("submit", async event => {
      event.preventDefault();
      const msg = $("deliveryEditMessage");
      const button = form.querySelector('button[type="submit"]');
      const formData = new FormData(form);
      const payload = Object.fromEntries(formData.entries());
      button.disabled = true; button.textContent = "Saving…"; msg.textContent = "";
      try {
        const response = await fetch(`/api/orders/${encodeURIComponent(form.dataset.editOrder)}/delivery`, { method: "PATCH", credentials: "same-origin", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
        const result = await response.json().catch(() => ({}));
        if (!response.ok || !result.success) throw new Error(result.error || "Could not update delivery details.");
        const index = state.orders.findIndex(o => String(o.id) === String(result.order.id));
        if (index >= 0) state.orders[index] = { ...state.orders[index], ...result.order };
        renderCustomerOrderDetails();
        const refreshedMessage = $("deliveryEditMessage");
        if (refreshedMessage) refreshedMessage.textContent = "Delivery details saved successfully.";
      } catch (error) {
        msg.textContent = error.message || "Could not save changes.";
        button.disabled = false; button.textContent = "Save Delivery Details";
      }
    });
  }

  function bindOrderFilters() {
    document.querySelectorAll("[data-order-filter]").forEach(button => {
      button.addEventListener("click", () => {
        state.selectedOrderFilter = button.dataset.orderFilter;
        renderOrders();
      });
    });
    document.querySelectorAll("[data-open-order-details]").forEach(button => {
      button.addEventListener("click", () => {
        state.selectedDetailsOrder = button.dataset.openOrderDetails;
        renderCustomerOrderDetails();
        $("customerOrderDetailsPanel")?.scrollIntoView({ behavior: "smooth", block: "start" });
      });
    });
  }

  function renderTracking() {
    const box = $("trackingList");
    if (!box) return;

    const shippedOrders = state.orders.filter(
      o => String(o.order_status || "").toLowerCase() === "shipped"
    );

    const trackableOrders = shippedOrders.map(o => ({
      order: o,
      entries: (o.tracking || []).filter(t =>
        String(t.courier_name || "").trim() &&
        String(t.tracking_number || "").trim()
      )
    })).filter(entry => entry.entries.length > 0);

    if (!trackableOrders.length) {
      state.selectedTrackingOrder = null;
      box.innerHTML =
        `<div class="state-card">No order tracking to show.</div>`;
      return;
    }

    if (!trackableOrders.some(
      entry => String(entry.order.id) === String(state.selectedTrackingOrder)
    )) {
      state.selectedTrackingOrder = String(trackableOrders[0].order.id);
    }

    const selected = trackableOrders.find(
      entry => String(entry.order.id) === String(state.selectedTrackingOrder)
    );

    const orderTabs = `
      <div class="tracking-order-tabs" aria-label="Choose an order to track">
        ${trackableOrders.map(entry => `
          <button type="button"
            class="tracking-order-tab ${
              String(entry.order.id) === String(state.selectedTrackingOrder)
                ? "active"
                : ""
            }"
            data-tracking-order="${esc(entry.order.id)}"
            aria-pressed="${
              String(entry.order.id) === String(state.selectedTrackingOrder)
            }">
            Order #${Number(entry.order.id)}
            <small>${entry.entries.length} tracking item${
              entry.entries.length === 1 ? "" : "s"
            }</small>
          </button>
        `).join("")}
      </div>`;

    const orderItems = (selected.order.items || []).map(i => `
      <span class="tracking-product-line">
        ${esc(i.product_name || "Product")} × ${Number(i.quantity || 1)}
      </span>
    `).join("");

    const details = selected.entries.map(t => `
      <article class="tracking-card">
        <h3>${esc(t.product_name || "Shipment")}</h3>

        <div class="tracking-meta">
          <div>
            <strong>Courier</strong>
            <span class="tracking-highlight">${esc(t.courier_name)}</span>
          </div>
          <div>
            <strong>Tracking ID</strong>
            <span class="tracking-highlight">${esc(t.tracking_number)}</span>
          </div>
          ${
            t.quantity_covered
              ? `<div><strong>Quantity covered</strong>
                  <span>${Number(t.quantity_covered)}</span></div>`
              : t.quantity
                ? `<div><strong>Quantity</strong>
                    <span>${Number(t.quantity)}</span></div>`
                : ""
          }
        </div>

        ${
          t.tracking_url
            ? `<a class="tracking-link"
                href="${esc(t.tracking_url)}"
                target="_blank"
                rel="noopener noreferrer">Track shipment ↗</a>`
            : ""
        }
      </article>
    `).join("");

    const orderDetails = orderItems
      ? `<div class="tracking-products tracking-order-products">
          <strong>Products in Order #${Number(selected.order.id)}</strong>
          ${orderItems}
        </div>`
      : "";

    box.innerHTML = orderTabs + `
      <div class="tracking-selected-order">
        ${orderDetails}
        ${details}
        <div class="customer-detail-total tracking-order-total"><span>Total for Order #${Number(selected.order.id)}</span><strong>${money(selected.order.total)}</strong></div>
      </div>`;

    box.querySelectorAll("[data-tracking-order]").forEach(button => {
      button.addEventListener("click", () => {
        state.selectedTrackingOrder = button.dataset.trackingOrder;
        renderTracking();
      });
    });
  }

  async function enableVideoHover(tile) {
    if (!tile || tile.dataset.videoLoading === "true") return;

    tile.dataset.videoLoading = "true";
    const id = tile.dataset.productId;

    try {
      let videoPath = videoCache.get(String(id));

      if (videoPath === undefined) {
        const detail = await getJSON(
          `/api/products/${encodeURIComponent(id)}`
        );

        const video = (
          Array.isArray(detail.media) ? detail.media : []
        ).find(m =>
          String(m.media_type).toLowerCase() === "video" &&
          m.file_path
        );

        videoPath = video ? video.file_path : null;
        videoCache.set(String(id), videoPath);
      }

      const media = tile.querySelector(".product-media");

      if (
        !videoPath ||
        !media ||
        !media.matches(":hover") ||
        media.querySelector("video")
      ) {
        return;
      }

      const video = document.createElement("video");
      video.className = "product-hover-video";
      video.src = videoPath;
      video.muted = true;
      video.loop = true;
      video.autoplay = true;
      video.playsInline = true;
      video.preload = "metadata";

      media.appendChild(video);
      video.play().catch(() => {});
    } catch (error) {
      console.debug("Product hover video not available", error);
    } finally {
      tile.dataset.videoLoading = "false";
    }
  }

  function showView(name) {
    document.querySelectorAll(".dashboard-view").forEach(v => {
      v.classList.toggle("active", v.id === `view-${name}`);
    });

    document.querySelectorAll(".customer-nav .nav-item").forEach(b => {
      b.classList.toggle("active", b.dataset.view === name);
    });

    const titles = {
      dashboard: [
        "Dashboard",
        "Browse products and discover something useful."
      ],
      categories: [
        "Categories",
        "Find products by category."
      ],
      orders: [
        "Order Status",
        "See payment decisions and order progress."
      ],
      tracking: [
        "Tracking",
        "View tracking details for shipped orders."
      ],
      support: [
        "Customer Support",
        "Help and support options."
      ]
    };

    if (titles[name]) {
      if ($("pageTitle")) $("pageTitle").textContent = titles[name][0];
      if ($("pageSubtitle")) $("pageSubtitle").textContent = titles[name][1];
    }

    if (name === "orders" || name === "tracking") loadOrders();
  }

  async function loadOrders() {
    const statusBox = $("orderStatusList");
    const trackingBox = $("trackingList");

    if (statusBox) {
      statusBox.innerHTML =
        `<div class="state-card">Loading your orders…</div>`;
    }

    if (trackingBox) {
      trackingBox.innerHTML =
        `<div class="state-card">Loading tracking…</div>`;
    }

    try {
      const data = await getJSON("/api/orders/mine");

      state.orders = Array.isArray(data.orders) ? data.orders : [];

      renderOrders();
      renderTracking();
    } catch (error) {
      if (statusBox) {
        statusBox.innerHTML =
          `<div class="state-card">${esc(error.message)}</div>`;
      }

      if (trackingBox) {
        trackingBox.innerHTML =
          `<div class="state-card">${esc(error.message)}</div>`;
      }
    }
  }

  async function init() {
    try {
      const [me, products, categories] = await Promise.all([
        getJSON("/api/auth/me"),
        getJSON("/api/products"),
        getJSON("/api/categories")
      ]);

      if (!me.loggedIn) {
        window.location.href =
          "/login.html?redirect=" +
          encodeURIComponent("/customer-dashboard.html");
        return;
      }

      const name =
        me.user?.name ||
        me.user?.username ||
        "My Account";

      if ($("profileName")) $("profileName").textContent = name;

      if ($("profileAvatar")) {
        $("profileAvatar").textContent =
          name.trim().charAt(0).toUpperCase() || "S";
      }

      state.products = Array.isArray(products) ? products : [];
      state.categories = Array.isArray(categories) ? categories : [];

      const mixedProducts = [...state.products].sort(
        () => Math.random() - 0.5
      );

      renderProducts(
        "allProducts",
        mixedProducts,
        $("allProductSearch")?.value || "",
        "all"
      );

      renderCategories();

      if (state.categories.length) {
        const first = state.categories[0];

        state.selectedCategory = String(first.id);

        if ($("selectedCategoryTitle")) {
          $("selectedCategoryTitle").textContent = first.name;
        }

        if ($("selectedCategoryDescription")) {
          $("selectedCategoryDescription").textContent = "";
        }

        renderCategories();

        renderProducts(
          "categoryProducts",
          state.products.filter(
            p => String(p.category_id) === String(first.id)
          ),
          $("categoryProductSearch")?.value || "",
          "category"
        );
      } else if ($("categoryProducts")) {
        $("categoryProducts").innerHTML =
          `<div class="state-card">No categories available yet.</div>`;
      }

      loadOrders();
    } catch (error) {
      if ($("allProducts")) {
        $("allProducts").innerHTML =
          `<div class="state-card">${esc(error.message)}</div>`;
      }

      if (error.message.includes("log in")) return;

      if ($("categoryList")) {
        $("categoryList").innerHTML =
          `<div class="muted-state">Could not load categories.</div>`;
      }

      console.error("Customer dashboard initialization failed:", error);
    }
  }

  document.addEventListener("mouseover", event => {
    const media = event.target.closest(".product-media");
    const tile = media?.closest(".product-tile-clickable");

    if (media && tile && !media.contains(event.relatedTarget)) {
      enableVideoHover(tile);
    }
  });

  document.addEventListener("mouseout", event => {
    const media = event.target.closest(".product-media");

    if (!media || media.contains(event.relatedTarget)) return;

    const tile = media.closest(".product-tile-clickable");
    if (!tile) return;

    const video = media.querySelector(".product-hover-video");

    if (video) {
      video.pause();
      video.remove();
    }
  });

  document.addEventListener("click", event => {
    const tile = event.target.closest(".product-tile-clickable");

    if (
      !tile ||
      event.target.closest("a, button, input, select, textarea")
    ) {
      return;
    }

    window.location.href = tile.dataset.productUrl;
  });

  document.addEventListener("keydown", event => {
    const tile = event.target.closest(".product-tile-clickable");

    if (tile && (event.key === "Enter" || event.key === " ")) {
      event.preventDefault();
      window.location.href = tile.dataset.productUrl;
    }
  });

  document.querySelectorAll(".customer-nav [data-view]").forEach(button => {
    button.addEventListener("click", () => showView(button.dataset.view));
  });

  if ($("allProductSearch")) {
    $("allProductSearch").addEventListener("input", e => {
      renderProducts("allProducts", state.products, e.target.value, "all");
    });
  }

  function bindPrice(prefix, targetId, getProducts, getQuery) {
    const button = $(prefix + "PriceFilterButton");
    const dropdown = $(prefix + "PriceFilterDropdown");
    const anyButton = $(prefix + "AnyPriceButton");
    const minInput = $(prefix + "MinPrice");
    const maxInput = $(prefix + "MaxPrice");

    if (!button || !dropdown || !anyButton || !minInput || !maxInput) {
      return;
    }

    const render = () => {
      const hasRange =
        minInput.value !== "" || maxInput.value !== "";

      anyButton.classList.toggle("active", !hasRange);
      anyButton.textContent = hasRange ? "Any price" : "✓ Any price";

      renderProducts(targetId, getProducts(), getQuery(), prefix);
    };

    button.addEventListener("click", () => {
      const open = dropdown.hidden;
      dropdown.hidden = !open;
      button.setAttribute("aria-expanded", String(open));
    });

    anyButton.addEventListener("click", () => {
      minInput.value = "";
      maxInput.value = "";
      render();
    });

    minInput.addEventListener("input", render);
    maxInput.addEventListener("input", render);
  }

  bindPrice(
    "all",
    "allProducts",
    () => state.products,
    () => $("allProductSearch")?.value || ""
  );

  bindPrice(
    "category",
    "categoryProducts",
    () => state.products.filter(
      p => String(p.category_id) === String(state.selectedCategory)
    ),
    () => $("categoryProductSearch")?.value || ""
  );

  document.addEventListener("click", event => {
    document.querySelectorAll(".dashboard-price-filter").forEach(wrap => {
      if (wrap.contains(event.target)) return;

      const button = wrap.querySelector(".price-filter-toggle");
      const dropdown = wrap.querySelector(".price-filter-dropdown");

      if (button && dropdown) {
        dropdown.hidden = true;
        button.setAttribute("aria-expanded", "false");
      }
    });
  });

  if ($("categorySearch")) {
    $("categorySearch").addEventListener("input", e => {
      renderCategories(e.target.value);
    });
  }

  if ($("categoryProductSearch")) {
    $("categoryProductSearch").addEventListener("input", e => {
      const products = state.products.filter(
        p => String(p.category_id) === String(state.selectedCategory)
      );

      renderProducts(
        "categoryProducts",
        products,
        e.target.value,
        "category"
      );
    });
  }

  if ($("refreshOrders")) {
    $("refreshOrders").addEventListener("click", loadOrders);
  }

  if ($("refreshTracking")) {
    $("refreshTracking").addEventListener("click", loadOrders);
  }

  if ($("dashboardLogout")) {
    $("dashboardLogout").addEventListener("click", async () => {
      try {
        await fetch("/api/auth/logout", {
          method: "POST",
          credentials: "same-origin"
        });

        window.location.href = "/";
      } catch (_) {
        window.location.href = "/";
      }
    });
  }

  // FIX: supportNotice element may not exist in the HTML.
  // Check it before attaching the click event to prevent a JavaScript crash.
  const supportNotice = $("supportNotice");

  if (supportNotice) {
    supportNotice.addEventListener("click", () => {
      supportNotice.textContent = "Support options will be added soon";
    });
  }

  init();
})();
