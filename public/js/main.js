/* JIJAH BAKE4U — client-side cart, calculator, modal, nav (no external framework) */
(function () {
  'use strict';

  const CART_KEY = 'jb4u_tempahan2027_cart_v1';
  // Harga sebekas kini IKUT SETIAP BISKUT (diambil dari kad produk). Server kira & sahkan semula
  // harga sebenar dari pangkalan data semasa checkout.
  const INSTALLMENT_MONTHS = 1; // tiada ansuran — bayaran penuh
  // Mirrors server CONFIG.POSTAGE_TIERS / POSTAGE_FREE_METHODS in lib/helpers.js (paparan sahaja —
  // jumlah sebenar dikira semula & disahkan di server semasa checkout).
  const POSTAGE_FREE_METHODS = ['Pickup di Kedai', 'Ambil dengan Ejen'];
  const POSTAGE_TIERS = [
    { maxContainers: 3, amount: 10 },
    { maxContainers: 10, amount: 15 },
    { maxContainers: 20, amount: 20 },
  ];
  function calcPostage(containers, deliveryMethod) {
    if (POSTAGE_FREE_METHODS.indexOf(deliveryMethod) !== -1) return 0;
    const tier = POSTAGE_TIERS.find((t) => containers <= t.maxContainers);
    return tier ? tier.amount : POSTAGE_TIERS[POSTAGE_TIERS.length - 1].amount;
  }

  // ---------- Cart storage ----------
  function getCart() {
    try {
      const raw = sessionStorage.getItem(CART_KEY);
      return raw ? JSON.parse(raw) : { items: [] };
    } catch (e) { return { items: [] }; }
  }
  function setCart(cart) {
    sessionStorage.setItem(CART_KEY, JSON.stringify(cart));
    updateCartBadge();
  }
  function cartTotalContainers(cart) {
    return cart.items.reduce((sum, it) => sum + Number(it.qty), 0);
  }
  function round2(n) { return Math.round(n * 100) / 100; }
  // Jumlah tempahan troli. discount = diskaun ejen sebekas (RM4/RM5), 0 untuk pelanggan biasa.
  // Potongan ejen bagi satu item: produk tertentu ada kadar khas (cth. Combo Box RM4).
  function itemDiscount(it, discount) {
    if (!discount) return 0;
    return it.agentDiscount !== undefined && it.agentDiscount !== null && it.agentDiscount !== '' ? Number(it.agentDiscount) : discount;
  }
  function cartTotalAmount(cart, discount) {
    discount = discount || 0;
    return round2(cart.items.reduce((sum, it) => sum + Math.max(0, Number(it.price || 0) - itemDiscount(it, discount)) * Number(it.qty), 0));
  }
  function addToCart(product, qty) {
    qty = Math.max(1, parseInt(qty, 10) || 1);
    const cart = getCart();
    const existing = cart.items.find((it) => it.productId === product.productId);
    if (existing) {
      existing.qty += qty;
    } else {
      cart.items.push({ productId: product.productId, name: product.name, image: product.image, price: Number(product.price) || 0, agentDiscount: product.agentDiscount === '' || product.agentDiscount === undefined ? null : Number(product.agentDiscount), qty: qty });
    }
    setCart(cart);
    showToast(`${product.name} ditambah ke tempahan (x${qty})`);
  }
  function updateQty(productId, qty) {
    const cart = getCart();
    const item = cart.items.find((it) => it.productId === productId);
    if (!item) return;
    qty = parseInt(qty, 10);
    if (isNaN(qty) || qty < 1) qty = 1;
    item.qty = qty;
    setCart(cart);
    renderCartPage();
  }
  function removeFromCart(productId) {
    const cart = getCart();
    cart.items = cart.items.filter((it) => it.productId !== productId);
    setCart(cart);
    renderCartPage();
  }
  function updateCartBadge() {
    const badge = document.getElementById('cartBadge');
    if (!badge) return;
    const cart = getCart();
    badge.textContent = cartTotalContainers(cart);
  }

  // ---------- Toast ----------
  function showToast(msg) {
    const toast = document.getElementById('toast');
    if (!toast) return;
    toast.textContent = msg;
    toast.classList.add('show');
    clearTimeout(window.__jb4uToastTimer);
    window.__jb4uToastTimer = setTimeout(() => toast.classList.remove('show'), 2600);
  }

  // ---------- Mobile nav ----------
  function initNav() {
    const btn = document.getElementById('hamburgerBtn');
    const nav = document.getElementById('mobileNav');
    if (!btn || !nav) return;
    btn.addEventListener('click', () => nav.classList.toggle('open'));
  }

  // ---------- Money format ----------
  function money(n) {
    return 'RM' + (Math.round(n * 100) / 100).toLocaleString('en-MY', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }

  // ---------- Installment calculation (mirrors lib/helpers.js on the server) ----------
  // Terima JUMLAH TEMPAHAN (RM) dan bahagi kepada 5 ansuran.
  function calcPlan(totalAmount) {
    const total = round2(totalAmount);
    const base = Math.floor(Math.round(total * 100) / INSTALLMENT_MONTHS) / 100; // kira dalam sen
    const installments = [];
    let allocated = 0;
    for (let i = 1; i <= INSTALLMENT_MONTHS; i++) {
      let amt = base;
      if (i === INSTALLMENT_MONTHS) amt = Math.round((total - allocated) * 100) / 100;
      installments.push(amt);
      allocated = Math.round((allocated + amt) * 100) / 100;
    }
    return { total, base, installments };
  }

  // ---------- Product cards (listing page) ----------
  function initProductCards() {
    document.querySelectorAll('.product-card').forEach((card) => {
      const productId = card.dataset.id;
      const name = card.dataset.name;
      const image = card.dataset.image || '';
      const price = parseFloat(card.dataset.price) || 0;
      const agentDiscount = card.dataset.agentDiscount;
      const qtyInput = card.querySelector('.qty-input');
      const minusBtn = card.querySelector('.qty-minus');
      const plusBtn = card.querySelector('.qty-plus');
      const addBtn = card.querySelector('.add-cart-btn');

      if (minusBtn) minusBtn.addEventListener('click', () => {
        qtyInput.value = Math.max(1, parseInt(qtyInput.value || 1, 10) - 1);
      });
      if (plusBtn) plusBtn.addEventListener('click', () => {
        qtyInput.value = Math.max(1, parseInt(qtyInput.value || 1, 10) + 1);
      });
      if (addBtn) addBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        addToCart({ productId, name, image, price, agentDiscount }, qtyInput ? qtyInput.value : 1);
      });

      const openers = card.querySelectorAll('.product-photo, .product-name');
      openers.forEach((el) => el.addEventListener('click', () => openProductModal(card.dataset)));
    });
  }

  // ---------- Product modal ----------
  function openProductModal(data) {
    const overlay = document.getElementById('productModal');
    if (!overlay) return;
    overlay.querySelector('.modal-photo-img').src = data.image ? `/images/${data.image}` : '';
    overlay.querySelector('.modal-photo-img').style.display = data.image ? 'block' : 'none';
    const placeholder = overlay.querySelector('.modal-photo-placeholder');
    if (placeholder) placeholder.style.display = data.image ? 'none' : 'flex';
    overlay.querySelector('.modal-name').textContent = data.name;
    overlay.querySelector('.modal-size').textContent = data.size || '';
    overlay.querySelector('.modal-desc').textContent = data.description || '';
    const noteEl = overlay.querySelector('.modal-note');
    if (noteEl) noteEl.textContent = data.note || '';
    const unitEl = overlay.querySelector('.modal-price-note');
    if (unitEl) unitEl.textContent = 'Harga Se' + (data.unit || 'bekas');
    const price = parseFloat(data.price) || 0;
    overlay.querySelector('.modal-installment-price').textContent = money(price);
    const qtyInput = overlay.querySelector('.modal-qty');
    qtyInput.value = 1;
    const subtotalEl = overlay.querySelector('.modal-subtotal');
    function updateSubtotal() { subtotalEl.textContent = money(price * (parseInt(qtyInput.value, 10) || 1)); }
    updateSubtotal();
    qtyInput.oninput = updateSubtotal;
    overlay.querySelector('.modal-qty-minus').onclick = () => { qtyInput.value = Math.max(1, parseInt(qtyInput.value, 10) - 1); updateSubtotal(); };
    overlay.querySelector('.modal-qty-plus').onclick = () => { qtyInput.value = Math.max(1, parseInt(qtyInput.value, 10) + 1); updateSubtotal(); };
    overlay.querySelector('.modal-add-btn').onclick = () => {
      addToCart({ productId: data.id, name: data.name, image: data.image, price: price, agentDiscount: data.agentDiscount }, qtyInput.value);
      closeProductModal();
    };
    overlay.classList.add('open');
  }
  function closeProductModal() {
    const overlay = document.getElementById('productModal');
    if (overlay) overlay.classList.remove('open');
  }
  function initModal() {
    const overlay = document.getElementById('productModal');
    if (!overlay) return;
    overlay.querySelector('.modal-close').addEventListener('click', closeProductModal);
    overlay.addEventListener('click', (e) => { if (e.target === overlay) closeProductModal(); });
  }

  // ---------- Installment calculator widget ----------
  function initCalculator() {
    const widget = document.getElementById('calcWidget');
    if (!widget) return;
    const options = widget.querySelectorAll('.calc-option');
    const customInput = widget.querySelector('#calcCustomInput');
    const priceSelect = widget.querySelector('#calcPriceSelect');
    let currentContainers = 10;
    function render(containers) {
      currentContainers = containers;
      const perContainer = priceSelect ? (parseFloat(priceSelect.value) || 0) : 0;
      const plan = calcPlan(containers * perContainer);
      widget.querySelector('#calcTotalContainers').textContent = containers;
      widget.querySelector('#calcTotalAmount').textContent = money(plan.total);
      widget.querySelector('#calcMonthlyAmount').textContent = money(plan.base);
      const breakdown = widget.querySelector('#calcBreakdown');
      breakdown.innerHTML = plan.installments.map((amt, i) => `<div class="month"><span>Bulan ${i + 1}</span><b>${money(amt)}</b></div>`).join('');
    }
    options.forEach((opt) => {
      opt.addEventListener('click', () => {
        options.forEach((o) => o.classList.remove('active'));
        opt.classList.add('active');
        if (customInput) customInput.value = '';
        render(parseInt(opt.dataset.qty, 10));
      });
    });
    if (customInput) {
      customInput.addEventListener('input', () => {
        const val = parseInt(customInput.value, 10);
        options.forEach((o) => o.classList.remove('active'));
        if (val > 0) render(val);
      });
    }
    if (priceSelect) priceSelect.addEventListener('change', () => render(currentContainers));
    // default render
    const defaultOpt = widget.querySelector('.calc-option[data-qty="10"]');
    if (defaultOpt) defaultOpt.click();
  }

  // ---------- Cart page ----------
  function renderCartPage() {
    const container = document.getElementById('cartPageItems');
    if (!container) return;
    const cart = getCart();
    if (cart.items.length === 0) {
      container.innerHTML = `<div class="empty-state">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><circle cx="9" cy="21" r="1"/><circle cx="19" cy="21" r="1"/><path d="M1 1h3l2.6 13.4a2 2 0 0 0 2 1.6h9.8a2 2 0 0 0 2-1.6L22 5H6"/></svg>
        <p>Tempahan anda masih kosong.</p>
        <a href="/produk" class="btn btn-primary">Lihat Katalog Biskut</a>
      </div>`;
      document.getElementById('cartSummaryBox').style.display = 'none';
      return;
    }
    document.getElementById('cartSummaryBox').style.display = 'block';
    container.innerHTML = cart.items.map((it) => `
      <div class="cart-item">
        <div class="thumb">${it.image ? `<img src="/images/${it.image}" alt="${escapeHtml(it.name)}"/>` : ''}</div>
        <div>
          <div class="name">${escapeHtml(it.name)}</div>
          <div class="qty-stepper">
            <button type="button" onclick="JB4U.updateQty('${it.productId}', ${it.qty - 1})">-</button>
            <input type="number" min="1" value="${it.qty}" onchange="JB4U.updateQty('${it.productId}', this.value)" />
            <button type="button" onclick="JB4U.updateQty('${it.productId}', ${it.qty + 1})">+</button>
          </div>
          <button class="remove-btn" onclick="JB4U.removeFromCart('${it.productId}')">Buang</button>
        </div>
        <div class="price">${money(Number(it.price || 0) * it.qty)}<div style="font-size:.75rem;font-weight:400;color:#8a7a5c;">${money(Number(it.price || 0))} / bekas</div></div>
      </div>
    `).join('');

    const containers = cartTotalContainers(cart);
    const plan = calcPlan(cartTotalAmount(cart));
    document.getElementById('sumContainers').textContent = containers;
    document.getElementById('sumTotal').textContent = money(plan.total);
    const goCheckout = document.getElementById('goCheckoutBtn');
    if (goCheckout) goCheckout.style.display = containers > 0 ? 'flex' : 'none';
  }

  function escapeHtml(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }

  // ---------- Checkout page ----------
  function initCheckoutPage() {
    const form = document.getElementById('checkoutForm');
    if (!form) return;
    const cart = getCart();
    const containers = cartTotalContainers(cart);
    if (containers === 0) { window.location.href = '/tempahan/keranjang'; return; }
    const summaryEl = document.getElementById('checkoutSummary');
    const deliverySelect = document.getElementById('deliveryMethodSelect');
    const agentInput = document.getElementById('agentNameInput');
    let discount = 0; // diskaun ejen sebekas — ditukar automatik jika nama ejen layak harga khas
    let plan = calcPlan(cartTotalAmount(cart, discount));

    function renderSummary() {
      const postage = calcPostage(containers, deliverySelect ? deliverySelect.value : '');
      const isAgentPrice = discount > 0;
      summaryEl.innerHTML = cart.items.map((it) => {
        const unit = Math.max(0, Number(it.price || 0) - itemDiscount(it, discount));
        return `<div class="order-line"><span>${escapeHtml(it.name)} × ${it.qty} <small style="color:#8a7a5c;">(${money(unit)}/bekas)</small></span><span>${money(unit * it.qty)}</span></div>`;
      }).join('')
        + `<div class="order-line"><span>Jumlah Bekas</span><span>${containers} bekas</span></div>`
        + (isAgentPrice ? `<div class="order-line"><span>Harga Ejen</span><span>Diskaun ejen dikenakan</span></div>` : '')
        + (postage ? `<div class="order-line"><span>Kos Penghantaran (Pos/Kurier)</span><span>${money(postage)}</span></div>` : '')
        + `<div class="order-line" style="font-weight:700;font-size:1.05rem;border-top:2px solid #e7dcc4;padding-top:12px;margin-top:6px;"><span>JUMLAH PERLU DIBAYAR</span><span>${money(plan.total + postage)}</span></div>`;
    }
    renderSummary();
    if (deliverySelect) deliverySelect.addEventListener('change', renderSummary);

    // Semak diskaun ejen (RM4/RM5 sebekas ikut jumlah bekas terkumpul) — dipanggil bila nama
    // ejen ditukar. Ini paparan sahaja; harga sebenar dikira & disahkan semula di server.
    let agentCheckTimer = null;
    function checkAgentPrice() {
      clearTimeout(agentCheckTimer);
      const name = agentInput ? agentInput.value.trim() : '';
      if (!name) {
        discount = 0;
        plan = calcPlan(cartTotalAmount(cart, discount));
        renderSummary();
        return;
      }
      agentCheckTimer = setTimeout(async () => {
        try {
          const resp = await fetch(`/api/agent-price-preview?name=${encodeURIComponent(name)}&containers=${containers}`);
          const data = await resp.json();
          discount = Number(data.discount) || 0;
          plan = calcPlan(cartTotalAmount(cart, discount));
          renderSummary();
        } catch (err) { /* biarkan harga biasa jika semakan gagal — server sahkan semula semasa checkout */ }
      }, 400);
    }
    if (agentInput) agentInput.addEventListener('change', checkAgentPrice);

    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const submitBtn = form.querySelector('button[type="submit"]');
      submitBtn.disabled = true;
      submitBtn.textContent = 'Memproses...';
      const fd = new FormData(form);
      const payload = Object.fromEntries(fd.entries());
      payload.items = cart.items.map((it) => ({ productId: it.productId, qty: it.qty }));
      try {
        const resp = await fetch('/api/checkout', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
        const data = await resp.json();
        if (!resp.ok) {
          showToast(data.error || 'Ralat semasa membuat tempahan.');
          submitBtn.disabled = false;
          submitBtn.textContent = 'HANTAR TEMPAHAN';
          return;
        }
        sessionStorage.removeItem(CART_KEY);
        window.location.href = `/tempahan/berjaya?id=${encodeURIComponent(data.orderId)}`;
      } catch (err) {
        showToast('Ralat sambungan. Sila cuba lagi.');
        submitBtn.disabled = false;
        submitBtn.textContent = 'HANTAR TEMPAHAN';
      }
    });
  }

  // ---------- Order status lookup ----------
  function initOrderLookup() {
    const form = document.getElementById('orderLookupForm');
    if (!form) return;
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const fd = new FormData(form);
      const payload = Object.fromEntries(fd.entries());
      const resultBox = document.getElementById('orderLookupResult');
      resultBox.innerHTML = '<p>Mencari tempahan...</p>';
      try {
        const resp = await fetch('/api/order-status', {
          method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload),
        });
        const data = await resp.json();
        if (!resp.ok) { resultBox.innerHTML = `<div class="alert alert-error">${data.error}</div>`; return; }
        window.location.href = `/tempahan/status/${encodeURIComponent(data.orderId)}?phone=${encodeURIComponent(payload.phone)}`;
      } catch (err) {
        resultBox.innerHTML = '<div class="alert alert-error">Ralat sambungan. Sila cuba lagi.</div>';
      }
    });
  }

  // ---------- Pendaftaran Ejen ----------
  function initDaftarEjenForm() {
    const form = document.getElementById('daftarEjenForm');
    if (!form) return;
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const submitBtn = form.querySelector('button[type="submit"]');
      submitBtn.disabled = true;
      submitBtn.textContent = 'Menghantar...';
      const fd = new FormData(form);
      const payload = Object.fromEntries(fd.entries());
      const resultBox = document.getElementById('daftarEjenResult');
      try {
        const resp = await fetch('/api/ejen/daftar', {
          method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload),
        });
        const data = await resp.json();
        if (!resp.ok) {
          resultBox.innerHTML = `<div class="alert alert-error">${data.error}</div>`;
          submitBtn.disabled = false;
          submitBtn.textContent = 'HANTAR PENDAFTARAN';
          return;
        }
        window.location.href = '/ejen/daftar/berjaya';
      } catch (err) {
        resultBox.innerHTML = '<div class="alert alert-error">Ralat sambungan. Sila cuba lagi.</div>';
        submitBtn.disabled = false;
        submitBtn.textContent = 'HANTAR PENDAFTARAN';
      }
    });
  }

  document.addEventListener('DOMContentLoaded', () => {
    initNav();
    updateCartBadge();
    initProductCards();
    initModal();
    initCalculator();
    initDaftarEjenForm();
    renderCartPage();
    initCheckoutPage();
    initOrderLookup();
  });

  window.JB4U = { addToCart, updateQty, removeFromCart, getCart, cartTotalContainers, calcPlan, money, showToast };
})();
