// ── NITROCOINS app.js ─────────────────────────────────────────────────────────
// Cart state
let cart = JSON.parse(localStorage.getItem('nc_cart') || '[]');

function saveCart() {
  localStorage.setItem('nc_cart', JSON.stringify(cart));
}

function formatPrice(n) {
  return 'R$ ' + n.toFixed(2).replace('.', ',').replace(/\B(?=(\d{3})+(?!\d))/g, '.');
}

function getCartTotal() {
  return cart.reduce((sum, item) => sum + item.price * item.qty, 0);
}

function getCartCount() {
  return cart.reduce((sum, item) => sum + item.qty, 0);
}

// ── ADD TO CART ──────────────────────────────────────────────────────────────
function addToCart(id, name, game, price, icon) {
  const existing = cart.find(i => i.id === id);
  if (existing) {
    existing.qty += 1;
  } else {
    cart.push({ id, name, game, price, icon, qty: 1 });
  }
  saveCart();
  renderCart();
  openCart();
  showToast(`${name} adicionado!`);
}

// ── TOAST ────────────────────────────────────────────────────────────────────
function showToast(msg) {
  let t = document.getElementById('nc-toast');
  if (!t) {
    t = document.createElement('div');
    t.id = 'nc-toast';
    t.style.cssText = 'position:fixed;top:80px;left:50%;transform:translateX(-50%);z-index:999;padding:10px 20px;background:#6366f1;color:#fff;border-radius:12px;font-size:13px;font-weight:600;box-shadow:0 8px 24px rgba(99,102,241,0.4);transition:opacity .3s;pointer-events:none;white-space:nowrap;';
    document.body.appendChild(t);
  }
  t.textContent = msg;
  t.style.opacity = '1';
  clearTimeout(t._to);
  t._to = setTimeout(() => { t.style.opacity = '0'; }, 2200);
}

// ── CART RENDER ───────────────────────────────────────────────────────────────
function renderCart() {
  const empty   = document.getElementById('cart-empty');
  const items   = document.getElementById('cart-items');
  const footer  = document.getElementById('cart-footer');
  const total   = document.getElementById('cart-total');
  const badge   = document.getElementById('cart-badge');
  const count   = getCartCount();

  // Badge no header
  if (badge) {
    badge.textContent = count;
    badge.style.display = count > 0 ? 'inline-flex' : 'none';
  }

  // Bottom bar mobile
  updateBottomBar();

  if (!empty) return;

  if (count === 0) {
    empty.style.display  = 'flex';
    items.style.display  = 'none';
    footer.style.display = 'none';
    return;
  }

  empty.style.display  = 'none';
  items.style.display  = 'flex';
  footer.style.display = 'block';
  total.textContent    = formatPrice(getCartTotal());

  items.innerHTML = cart.map(item => `
    <div style="display:flex;gap:12px;align-items:center;padding:14px;background:rgba(255,255,255,0.04);border-radius:12px;border:1px solid rgba(255,255,255,0.06);">
      <div style="flex-shrink:0;width:44px;height:44px;border-radius:10px;background:linear-gradient(135deg,rgba(56,189,248,.2),rgba(99,102,241,.2));display:flex;align-items:center;justify-content:center;font-size:20px;">${item.icon || '🎮'}</div>
      <div style="flex:1;min-width:0;">
        <p style="font-size:13px;font-weight:600;color:#e6edf3;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${item.name}</p>
        <p style="font-size:11px;color:#8b949e;margin-top:2px;">${item.game}</p>
        <p style="font-size:14px;font-weight:700;color:#38bdf8;margin-top:4px;">${formatPrice(item.price * item.qty)}</p>
      </div>
      <div style="display:flex;flex-direction:column;align-items:center;gap:4px;">
        <div style="display:flex;align-items:center;gap:6px;">
          <button onclick="changeQty('${item.id}',-1)" style="width:30px;height:30px;border:1px solid rgba(255,255,255,0.1);background:rgba(255,255,255,0.05);border-radius:8px;color:#e6edf3;font-size:16px;cursor:pointer;display:flex;align-items:center;justify-content:center;line-height:1;">−</button>
          <span style="font-size:14px;font-weight:600;width:20px;text-align:center;">${item.qty}</span>
          <button onclick="changeQty('${item.id}',1)" style="width:30px;height:30px;border:1px solid rgba(255,255,255,0.1);background:rgba(255,255,255,0.05);border-radius:8px;color:#e6edf3;font-size:16px;cursor:pointer;display:flex;align-items:center;justify-content:center;line-height:1;">+</button>
        </div>
        <button onclick="removeItem('${item.id}')" style="font-size:11px;color:#8b949e;background:none;border:none;cursor:pointer;padding:4px;">Remover</button>
      </div>
    </div>
  `).join('');
}

function changeQty(id, delta) {
  const item = cart.find(i => i.id === id);
  if (!item) return;
  item.qty += delta;
  if (item.qty <= 0) cart = cart.filter(i => i.id !== id);
  saveCart();
  renderCart();
}

function removeItem(id) {
  cart = cart.filter(i => i.id !== id);
  saveCart();
  renderCart();
}

// ── CART DRAWER OPEN/CLOSE ────────────────────────────────────────────────────
function openCart() {
  const drawer  = document.getElementById('cart-drawer');
  const overlay = document.getElementById('cart-overlay');
  if (!drawer) return;
  // Reset to cart view (not checkout)
  showCartView();
  drawer.style.right = '0';
  overlay.style.display = 'block';
  document.body.classList.add('cart-open');
}

function closeCart() {
  const drawer  = document.getElementById('cart-drawer');
  const overlay = document.getElementById('cart-overlay');
  if (!drawer) return;
  drawer.style.right = '-100vw';
  overlay.style.display = 'none';
  document.body.classList.remove('cart-open');
}

function toggleCart() {
  const drawer = document.getElementById('cart-drawer');
  if (!drawer) return;
  if (drawer.style.right === '0px' || drawer.style.right === '0') {
    closeCart();
  } else {
    renderCart();
    openCart();
  }
}

// ── CHECKOUT FLOW ─────────────────────────────────────────────────────────────
// The original site's checkout is a flow inside the cart drawer:
// Step 1: Cart items → click "Finalizar compra" → goes to checkout form
// Step 2: Checkout form with: login email OR guest, payment method (Pix/Card/Boleto)
// Step 3: Payment screen (Pix QR or card form)
// Step 4: Success

let checkoutStep = 'cart'; // 'cart' | 'form' | 'payment' | 'success'
let paymentMethod = 'pix';

function showCartView() {
  checkoutStep = 'cart';
  const body = document.getElementById('cart-body');
  const footer = document.getElementById('cart-footer');
  if (!body) return;
  // Restore original cart body content
  body.innerHTML = `
    <div id="cart-empty" style="display:${getCartCount() === 0 ? 'flex' : 'none'};flex-direction:column;align-items:center;justify-content:center;gap:14px;height:100%;color:#8b949e;text-align:center;">
      <svg xmlns="http://www.w3.org/2000/svg" width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><circle cx="8" cy="21" r="1"/><circle cx="19" cy="21" r="1"/><path d="M2.05 2.05h2l2.66 12.42a2 2 0 0 0 2 1.58h9.78a2 2 0 0 0 1.95-1.57l1.65-7.43H5.12"/></svg>
      <p style="font-size:15px;font-weight:500;">Seu carrinho está vazio</p>
      <p style="font-size:13px;">Adicione moedas e aproveite os descontos.</p>
      <a href="index.html#catalogo" onclick="closeCart()" style="margin-top:4px;display:inline-flex;align-items:center;padding:8px 20px;background:linear-gradient(135deg,#38bdf8,#6366f1);border-radius:12px;color:#fff;font-size:13px;font-weight:600;text-decoration:none;">Ver ofertas</a>
    </div>
    <div id="cart-items" style="display:${getCartCount() > 0 ? 'flex' : 'none'};flex-direction:column;gap:10px;"></div>
  `;
  if (footer) {
    footer.style.display = getCartCount() > 0 ? 'block' : 'none';
    footer.innerHTML = `
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px;">
        <span style="font-size:14px;font-weight:600;color:#8b949e;">Total</span>
        <span id="cart-total" style="font-family:'Space Grotesk',sans-serif;font-size:22px;font-weight:700;color:#e6edf3;">${formatPrice(getCartTotal())}</span>
      </div>
      <div style="display:flex;align-items:center;gap:6px;margin-bottom:12px;padding:10px 12px;background:rgba(34,197,94,0.1);border:1px solid rgba(34,197,94,0.2);border-radius:10px;">
        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#22c55e" stroke-width="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
        <span style="font-size:12px;color:#22c55e;font-weight:500;">Compra 100% segura e protegida</span>
      </div>
      <button onclick="goToCheckout()" style="width:100%;display:flex;align-items:center;justify-content:center;gap:8px;padding:15px;background:linear-gradient(135deg,#38bdf8,#6366f1);border:none;border-radius:14px;color:#fff;font-size:15px;font-weight:700;cursor:pointer;letter-spacing:.01em;">
        Finalizar compra
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="m9 18 6-6-6-6"/></svg>
      </button>
    `;
  }
  renderCart();
}

function goToCheckout() {
  checkoutStep = 'form';
  const body   = document.getElementById('cart-body');
  const footer = document.getElementById('cart-footer');
  if (!body) return;

  const total = formatPrice(getCartTotal());
  const itemsSummary = cart.map(i => `<div style="display:flex;justify-content:space-between;font-size:13px;padding:8px 0;border-bottom:1px solid rgba(255,255,255,0.06);">
    <span style="color:#8b949e;">${i.qty}x ${i.name}</span>
    <span style="font-weight:600;">${formatPrice(i.price * i.qty)}</span>
  </div>`).join('');

  body.innerHTML = `
    <div style="padding-bottom:16px;">
      <!-- Back -->
      <button onclick="showCartView()" style="display:flex;align-items:center;gap:6px;background:none;border:none;color:#8b949e;font-size:13px;cursor:pointer;padding:0 0 16px;min-height:44px;">
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="m12 19-7-7 7-7"/><path d="M19 12H5"/></svg>
        Voltar ao carrinho
      </button>

      <!-- Order summary -->
      <div style="padding:14px;background:rgba(255,255,255,0.04);border:1px solid rgba(255,255,255,0.08);border-radius:14px;margin-bottom:20px;">
        <h3 style="font-family:'Space Grotesk',sans-serif;font-size:14px;font-weight:600;margin-bottom:12px;color:#8b949e;text-transform:uppercase;letter-spacing:.08em;">Resumo do pedido</h3>
        ${itemsSummary}
        <div style="display:flex;justify-content:space-between;padding-top:12px;margin-top:4px;">
          <span style="font-size:14px;font-weight:700;">Total</span>
          <span style="font-family:'Space Grotesk',sans-serif;font-size:18px;font-weight:700;color:#38bdf8;">${total}</span>
        </div>
      </div>

      <!-- Email -->
      <div style="margin-bottom:16px;">
        <label style="display:block;font-size:13px;font-weight:500;margin-bottom:6px;color:#8b949e;">E-mail para receber o comprovante</label>
        <input id="ck-email" type="email" placeholder="seu@email.com" style="width:100%;padding:12px 14px;background:rgba(255,255,255,0.06);border:1px solid rgba(255,255,255,0.1);border-radius:12px;color:#e6edf3;font-size:16px;outline:none;" onfocus="this.style.borderColor='#6366f1'" onblur="this.style.borderColor='rgba(255,255,255,0.1)'"/>
      </div>

      <!-- Payment method -->
      <div style="margin-bottom:20px;">
        <label style="display:block;font-size:13px;font-weight:500;margin-bottom:10px;color:#8b949e;">Forma de pagamento</label>
        <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:8px;">
          <button onclick="selectPayment('pix',this)" id="pm-pix" style="display:flex;flex-direction:column;align-items:center;gap:6px;padding:12px 8px;border-radius:12px;border:2px solid #6366f1;background:rgba(99,102,241,0.1);cursor:pointer;transition:.2s;">
            <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#38bdf8" stroke-width="2"><path d="m4 4 7.07 7.07"/><path d="m20 20-7.07-7.07"/><path d="M12 2v2m0 16v2M2 12h2m16 0h2"/><circle cx="12" cy="12" r="3"/></svg>
            <span style="font-size:12px;font-weight:600;color:#e6edf3;">Pix</span>
            <span style="font-size:10px;color:#22c55e;font-weight:500;">Instantâneo</span>
          </button>
          <button onclick="selectPayment('card',this)" id="pm-card" style="display:flex;flex-direction:column;align-items:center;gap:6px;padding:12px 8px;border-radius:12px;border:2px solid rgba(255,255,255,0.08);background:rgba(255,255,255,0.03);cursor:pointer;transition:.2s;">
            <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#8b949e" stroke-width="2"><rect width="20" height="14" x="2" y="5" rx="2"/><line x1="2" x2="22" y1="10" y2="10"/></svg>
            <span style="font-size:12px;font-weight:600;color:#e6edf3;">Cartão</span>
            <span style="font-size:10px;color:#8b949e;">Crédito/Débito</span>
          </button>
          <button onclick="selectPayment('boleto',this)" id="pm-boleto" style="display:flex;flex-direction:column;align-items:center;gap:6px;padding:12px 8px;border-radius:12px;border:2px solid rgba(255,255,255,0.08);background:rgba(255,255,255,0.03);cursor:pointer;transition:.2s;">
            <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#8b949e" stroke-width="2"><path d="M3 5v14"/><path d="M7 5v14"/><path d="M11 5v14"/><path d="M15 5v14"/><path d="M19 5v14"/><path d="M21 5H3v14h18z"/></svg>
            <span style="font-size:12px;font-weight:600;color:#e6edf3;">Boleto</span>
            <span style="font-size:10px;color:#8b949e;">1-3 dias úteis</span>
          </button>
        </div>
      </div>

      <!-- Garantia badge -->
      <div style="display:flex;align-items:center;gap:10px;padding:10px 12px;background:rgba(245,158,11,0.08);border:1px solid rgba(245,158,11,0.2);border-radius:12px;margin-bottom:16px;">
        <img src="garantia-30-dias.webp" alt="Garantia" style="width:36px;height:36px;object-fit:contain;" onerror="this.style.display='none'"/>
        <div>
          <p style="font-size:12px;font-weight:600;color:#fbbf24;">30 dias de garantia</p>
          <p style="font-size:11px;color:#8b949e;margin-top:1px;">Reembolso total se não receber</p>
        </div>
      </div>

      <!-- Submit -->
      <button onclick="processPayment()" style="width:100%;display:flex;align-items:center;justify-content:center;gap:8px;padding:15px;background:linear-gradient(135deg,#38bdf8,#6366f1);border:none;border-radius:14px;color:#fff;font-size:15px;font-weight:700;cursor:pointer;">
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
        Pagar ${total}
      </button>
      <p style="text-align:center;font-size:11px;color:#8b949e;margin-top:10px;">🔒 Pagamento criptografado e seguro</p>
    </div>
  `;
  if (footer) footer.style.display = 'none';
}

function selectPayment(method, btn) {
  paymentMethod = method;
  ['pix','card','boleto'].forEach(m => {
    const el = document.getElementById(`pm-${m}`);
    if (!el) return;
    if (m === method) {
      el.style.borderColor = '#6366f1';
      el.style.background  = 'rgba(99,102,241,0.1)';
      el.querySelector('svg').setAttribute('stroke','#38bdf8');
    } else {
      el.style.borderColor = 'rgba(255,255,255,0.08)';
      el.style.background  = 'rgba(255,255,255,0.03)';
      el.querySelector('svg').setAttribute('stroke','#8b949e');
    }
  });
}

function processPayment() {
  const emailEl = document.getElementById('ck-email');
  if (emailEl && !emailEl.value.includes('@')) {
    emailEl.style.borderColor = '#f87171';
    emailEl.placeholder = 'Digite um e-mail válido';
    emailEl.focus();
    return;
  }
  checkoutStep = 'payment';
  showPaymentScreen();
}

function showPaymentScreen() {
  const body = document.getElementById('cart-body');
  const footer = document.getElementById('cart-footer');
  if (!body) return;

  if (paymentMethod === 'pix') {
    const pixKey = '09.376.495/0001-22';
    // Fake QR code using a pattern
    body.innerHTML = `
      <div style="display:flex;flex-direction:column;align-items:center;gap:16px;text-align:center;padding:8px 0;">
        <div style="width:48px;height:48px;border-radius:12px;background:linear-gradient(135deg,#22c55e,#16a34a);display:flex;align-items:center;justify-content:center;">
          <svg xmlns="http://www.w3.org/2000/svg" width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2.5"><path d="m4 4 7.07 7.07"/><path d="m20 20-7.07-7.07"/><path d="M12 2v2m0 16v2M2 12h2m16 0h2"/><circle cx="12" cy="12" r="3"/></svg>
        </div>
        <div>
          <h3 style="font-family:'Space Grotesk',sans-serif;font-size:18px;font-weight:700;">Pague com Pix</h3>
          <p style="font-size:13px;color:#8b949e;margin-top:4px;">Escaneie o QR Code ou copie a chave</p>
        </div>

        <!-- QR Code (placeholder visual) -->
        <div style="padding:16px;background:#fff;border-radius:16px;width:180px;height:180px;display:flex;align-items:center;justify-content:center;">
          <svg viewBox="0 0 37 37" xmlns="http://www.w3.org/2000/svg" width="148" height="148">
            <rect width="37" height="37" fill="white"/>
            <!-- QR finder patterns -->
            <rect x="1" y="1" width="7" height="7" fill="black"/><rect x="2" y="2" width="5" height="5" fill="white"/><rect x="3" y="3" width="3" height="3" fill="black"/>
            <rect x="29" y="1" width="7" height="7" fill="black"/><rect x="30" y="2" width="5" height="5" fill="white"/><rect x="31" y="3" width="3" height="3" fill="black"/>
            <rect x="1" y="29" width="7" height="7" fill="black"/><rect x="2" y="30" width="5" height="5" fill="white"/><rect x="3" y="31" width="3" height="3" fill="black"/>
            <!-- Data pattern (decorative) -->
            <rect x="9" y="1" width="1" height="1" fill="black"/><rect x="11" y="1" width="2" height="1" fill="black"/>
            <rect x="9" y="3" width="2" height="1" fill="black"/><rect x="14" y="3" width="1" height="1" fill="black"/>
            <rect x="10" y="5" width="1" height="2" fill="black"/><rect x="13" y="5" width="2" height="1" fill="black"/>
            <rect x="16" y="2" width="1" height="3" fill="black"/><rect x="18" y="1" width="2" height="1" fill="black"/>
            <rect x="20" y="3" width="1" height="2" fill="black"/><rect x="22" y="1" width="2" height="2" fill="black"/>
            <rect x="25" y="2" width="1" height="1" fill="black"/><rect x="27" y="1" width="1" height="2" fill="black"/>
            <rect x="9" y="7" width="2" height="2" fill="black"/><rect x="13" y="8" width="3" height="1" fill="black"/>
            <rect x="17" y="7" width="1" height="2" fill="black"/><rect x="20" y="8" width="2" height="1" fill="black"/>
            <rect x="24" y="7" width="3" height="2" fill="black"/>
            <rect x="9" y="10" width="1" height="3" fill="black"/><rect x="11" y="11" width="2" height="1" fill="black"/>
            <rect x="14" y="10" width="1" height="2" fill="black"/><rect x="16" y="11" width="3" height="1" fill="black"/>
            <rect x="20" y="10" width="2" height="2" fill="black"/><rect x="23" y="11" width="1" height="1" fill="black"/>
            <rect x="25" y="10" width="2" height="3" fill="black"/><rect x="28" y="9" width="1" height="2" fill="black"/>
            <rect x="30" y="9" width="7" height="1" fill="black"/><rect x="29" y="11" width="1" height="7" fill="black"/>
            <rect x="9" y="14" width="3" height="2" fill="black"/><rect x="13" y="13" width="1" height="3" fill="black"/>
            <rect x="15" y="14" width="2" height="1" fill="black"/><rect x="18" y="13" width="1" height="2" fill="black"/>
            <rect x="21" y="14" width="3" height="1" fill="black"/><rect x="25" y="13" width="1" height="3" fill="black"/>
            <rect x="28" y="14" width="2" height="1" fill="black"/>
            <rect x="1" y="9" width="7" height="1" fill="black"/><rect x="1" y="11" width="1" height="7" fill="black"/>
            <rect x="9" y="17" width="2" height="2" fill="black"/><rect x="12" y="18" width="3" height="1" fill="black"/>
            <rect x="16" y="17" width="1" height="2" fill="black"/><rect x="19" y="18" width="2" height="1" fill="black"/>
            <rect x="22" y="17" width="3" height="2" fill="black"/><rect x="26" y="18" width="1" height="1" fill="black"/>
            <rect x="29" y="17" width="2" height="2" fill="black"/>
            <rect x="9" y="20" width="1" height="3" fill="black"/><rect x="11" y="21" width="3" height="1" fill="black"/>
            <rect x="15" y="20" width="2" height="2" fill="black"/><rect x="18" y="21" width="1" height="2" fill="black"/>
            <rect x="21" y="20" width="2" height="3" fill="black"/><rect x="24" y="21" width="3" height="1" fill="black"/>
            <rect x="28" y="20" width="3" height="2" fill="black"/>
            <rect x="9" y="24" width="2" height="2" fill="black"/><rect x="12" y="25" width="2" height="1" fill="black"/>
            <rect x="15" y="24" width="3" height="2" fill="black"/><rect x="19" y="25" width="2" height="1" fill="black"/>
            <rect x="22" y="24" width="1" height="3" fill="black"/><rect x="24" y="25" width="2" height="1" fill="black"/>
            <rect x="27" y="24" width="2" height="2" fill="black"/><rect x="30" y="25" width="6" height="1" fill="black"/>
            <rect x="9" y="27" width="1" height="2" fill="black"/><rect x="11" y="28" width="3" height="1" fill="black"/>
            <rect x="15" y="27" width="2" height="2" fill="black"/><rect x="18" y="28" width="1" height="1" fill="black"/>
            <rect x="20" y="27" width="2" height="2" fill="black"/><rect x="23" y="28" width="3" height="1" fill="black"/>
            <rect x="27" y="27" width="1" height="2" fill="black"/>
            <rect x="9" y="30" width="2" height="2" fill="black"/><rect x="12" y="31" width="2" height="1" fill="black"/>
            <rect x="15" y="30" width="1" height="3" fill="black"/><rect x="17" y="31" width="3" height="1" fill="black"/>
            <rect x="21" y="30" width="2" height="2" fill="black"/><rect x="24" y="31" width="1" height="1" fill="black"/>
            <rect x="26" y="30" width="3" height="2" fill="black"/>
          </svg>
        </div>

        <div style="display:flex;flex-direction:column;gap:6px;width:100%;padding:12px;background:rgba(255,255,255,0.04);border-radius:12px;border:1px solid rgba(255,255,255,0.08);">
          <span style="font-size:11px;color:#8b949e;font-weight:500;">CHAVE PIX (CNPJ)</span>
          <div style="display:flex;align-items:center;justify-content:space-between;gap:8px;">
            <span id="pix-key" style="font-family:monospace;font-size:14px;font-weight:600;color:#e6edf3;">${pixKey}</span>
            <button onclick="copyPix()" style="flex-shrink:0;padding:6px 12px;background:rgba(99,102,241,0.15);border:1px solid rgba(99,102,241,0.3);border-radius:8px;color:#6366f1;font-size:12px;font-weight:600;cursor:pointer;">Copiar</button>
          </div>
        </div>

        <div style="display:flex;flex-direction:column;gap:8px;width:100%;padding:12px;background:rgba(34,197,94,0.08);border-radius:12px;border:1px solid rgba(34,197,94,0.2);">
          <div style="display:flex;align-items:center;gap:6px;">
            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#22c55e" stroke-width="2"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
            <span style="font-size:12px;color:#22c55e;font-weight:500;">Após o pagamento, suas moedas chegam em segundos</span>
          </div>
          <div style="display:flex;align-items:center;gap:6px;">
            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#22c55e" stroke-width="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
            <span style="font-size:12px;color:#22c55e;font-weight:500;">30 dias de garantia</span>
          </div>
        </div>

        <div id="pix-timer" style="font-size:13px;color:#8b949e;">⏱ Código válido por <strong id="pix-countdown" style="color:#e6edf3;">14:59</strong></div>

        <button onclick="showSuccess()" style="width:100%;padding:14px;background:linear-gradient(135deg,#22c55e,#16a34a);border:none;border-radius:14px;color:#fff;font-size:15px;font-weight:700;cursor:pointer;">
          Já paguei — confirmar
        </button>
        <button onclick="showCartView()" style="background:none;border:none;color:#8b949e;font-size:13px;cursor:pointer;padding:4px;">Cancelar</button>
      </div>
    `;
    startPixTimer();
  } else if (paymentMethod === 'card') {
    body.innerHTML = `
      <div style="display:flex;flex-direction:column;gap:16px;padding:8px 0;">
        <button onclick="goToCheckout()" style="display:flex;align-items:center;gap:6px;background:none;border:none;color:#8b949e;font-size:13px;cursor:pointer;padding:0;min-height:44px;">
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="m12 19-7-7 7-7"/><path d="M19 12H5"/></svg>
          Voltar
        </button>
        <h3 style="font-family:'Space Grotesk',sans-serif;font-size:17px;font-weight:700;">Dados do cartão</h3>
        <div>
          <label style="font-size:12px;color:#8b949e;font-weight:500;display:block;margin-bottom:6px;">Número do cartão</label>
          <input type="text" placeholder="0000 0000 0000 0000" maxlength="19" style="width:100%;padding:12px 14px;background:rgba(255,255,255,0.06);border:1px solid rgba(255,255,255,0.1);border-radius:12px;color:#e6edf3;font-size:16px;outline:none;" oninput="this.value=this.value.replace(/\D/g,'').replace(/(.{4})/g,'$1 ').trim()" onfocus="this.style.borderColor='#6366f1'" onblur="this.style.borderColor='rgba(255,255,255,0.1)'"/>
        </div>
        <div>
          <label style="font-size:12px;color:#8b949e;font-weight:500;display:block;margin-bottom:6px;">Nome no cartão</label>
          <input type="text" placeholder="NOME COMPLETO" style="width:100%;padding:12px 14px;background:rgba(255,255,255,0.06);border:1px solid rgba(255,255,255,0.1);border-radius:12px;color:#e6edf3;font-size:16px;outline:none;text-transform:uppercase;" onfocus="this.style.borderColor='#6366f1'" onblur="this.style.borderColor='rgba(255,255,255,0.1)'"/>
        </div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;">
          <div>
            <label style="font-size:12px;color:#8b949e;font-weight:500;display:block;margin-bottom:6px;">Validade</label>
            <input type="text" placeholder="MM/AA" maxlength="5" style="width:100%;padding:12px 14px;background:rgba(255,255,255,0.06);border:1px solid rgba(255,255,255,0.1);border-radius:12px;color:#e6edf3;font-size:16px;outline:none;" oninput="let v=this.value.replace(/\D/g,'');if(v.length>2)v=v.slice(0,2)+'/'+v.slice(2);this.value=v;" onfocus="this.style.borderColor='#6366f1'" onblur="this.style.borderColor='rgba(255,255,255,0.1)'"/>
          </div>
          <div>
            <label style="font-size:12px;color:#8b949e;font-weight:500;display:block;margin-bottom:6px;">CVV</label>
            <input type="text" placeholder="000" maxlength="4" style="width:100%;padding:12px 14px;background:rgba(255,255,255,0.06);border:1px solid rgba(255,255,255,0.1);border-radius:12px;color:#e6edf3;font-size:16px;outline:none;" oninput="this.value=this.value.replace(/\D/g,'')" onfocus="this.style.borderColor='#6366f1'" onblur="this.style.borderColor='rgba(255,255,255,0.1)'"/>
          </div>
        </div>
        <div>
          <label style="font-size:12px;color:#8b949e;font-weight:500;display:block;margin-bottom:8px;">Parcelas</label>
          <select style="width:100%;padding:12px 14px;background:rgba(255,255,255,0.06);border:1px solid rgba(255,255,255,0.1);border-radius:12px;color:#e6edf3;font-size:14px;outline:none;">
            <option>1x de ${formatPrice(getCartTotal())} sem juros</option>
            <option>2x de ${formatPrice(getCartTotal()/2)} sem juros</option>
            <option>3x de ${formatPrice(getCartTotal()/3)} sem juros</option>
          </select>
        </div>
        <button onclick="showSuccess()" style="width:100%;padding:15px;background:linear-gradient(135deg,#38bdf8,#6366f1);border:none;border-radius:14px;color:#fff;font-size:15px;font-weight:700;cursor:pointer;">
          Confirmar pagamento — ${formatPrice(getCartTotal())}
        </button>
        <p style="text-align:center;font-size:11px;color:#8b949e;">🔒 Dados criptografados com SSL</p>
      </div>
    `;
  } else {
    // Boleto
    body.innerHTML = `
      <div style="display:flex;flex-direction:column;align-items:center;gap:16px;text-align:center;padding:8px 0;">
        <div style="width:48px;height:48px;border-radius:12px;background:rgba(99,102,241,0.15);display:flex;align-items:center;justify-content:center;">
          <svg xmlns="http://www.w3.org/2000/svg" width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#6366f1" stroke-width="2"><path d="M3 5v14"/><path d="M7 5v14"/><path d="M11 5v14"/><path d="M15 5v14"/><path d="M19 5v14"/><path d="M21 5H3v14h18z"/></svg>
        </div>
        <div>
          <h3 style="font-family:'Space Grotesk',sans-serif;font-size:18px;font-weight:700;">Boleto Bancário</h3>
          <p style="font-size:13px;color:#8b949e;margin-top:4px;">Vencimento em 3 dias úteis</p>
        </div>
        <div style="width:100%;padding:14px;background:rgba(255,255,255,0.04);border:1px solid rgba(255,255,255,0.08);border-radius:12px;">
          <p style="font-size:11px;color:#8b949e;margin-bottom:8px;font-weight:500;">LINHA DIGITÁVEL</p>
          <p id="boleto-code" style="font-family:monospace;font-size:12px;word-break:break-all;color:#e6edf3;line-height:1.6;">34191.09376 49500.012282 60000.001222 6 99999999999999</p>
        </div>
        <div style="display:flex;gap:10px;width:100%;">
          <button onclick="copyBoleto()" style="flex:1;padding:12px;background:rgba(99,102,241,0.15);border:1px solid rgba(99,102,241,0.3);border-radius:12px;color:#6366f1;font-size:13px;font-weight:600;cursor:pointer;">Copiar código</button>
          <button onclick="showSuccess()" style="flex:1;padding:12px;background:linear-gradient(135deg,#38bdf8,#6366f1);border:none;border-radius:12px;color:#fff;font-size:13px;font-weight:700;cursor:pointer;">Baixar boleto</button>
        </div>
        <p style="font-size:12px;color:#f97316;">⚠️ Após o pagamento, as moedas serão liberadas em até 3 dias úteis após a confirmação bancária.</p>
        <button onclick="showCartView()" style="background:none;border:none;color:#8b949e;font-size:13px;cursor:pointer;">Cancelar</button>
      </div>
    `;
  }

  if (footer) footer.style.display = 'none';
}

let pixTimerInterval = null;
function startPixTimer() {
  let secs = 14 * 60 + 59;
  clearInterval(pixTimerInterval);
  pixTimerInterval = setInterval(() => {
    secs--;
    const el = document.getElementById('pix-countdown');
    if (!el) { clearInterval(pixTimerInterval); return; }
    if (secs <= 0) {
      clearInterval(pixTimerInterval);
      el.textContent = 'Expirado';
      return;
    }
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    el.textContent = `${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`;
  }, 1000);
}

function copyPix() {
  navigator.clipboard.writeText('09.376.495/0001-22').catch(()=>{});
  showToast('Chave Pix copiada!');
}

function copyBoleto() {
  navigator.clipboard.writeText('34191.09376 49500.012282 60000.001222 6 99999999999999').catch(()=>{});
  showToast('Código do boleto copiado!');
}

function showSuccess() {
  clearInterval(pixTimerInterval);
  checkoutStep = 'success';
  const body = document.getElementById('cart-body');
  const footer = document.getElementById('cart-footer');
  if (!body) return;

  body.innerHTML = `
    <div style="display:flex;flex-direction:column;align-items:center;gap:20px;text-align:center;padding:24px 0;">
      <div style="width:72px;height:72px;border-radius:50%;background:linear-gradient(135deg,#22c55e,#16a34a);display:flex;align-items:center;justify-content:center;animation:pulse 2s infinite;">
        <svg xmlns="http://www.w3.org/2000/svg" width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2.5"><polyline points="20 6 9 17 4 12"/></svg>
      </div>
      <div>
        <h3 style="font-family:'Space Grotesk',sans-serif;font-size:22px;font-weight:700;color:#e6edf3;">Pedido confirmado!</h3>
        <p style="font-size:14px;color:#8b949e;margin-top:8px;line-height:1.6;">Suas moedas estão sendo processadas.<br/>Você receberá a confirmação no seu e-mail.</p>
      </div>
      <div style="width:100%;padding:16px;background:rgba(34,197,94,0.08);border:1px solid rgba(34,197,94,0.2);border-radius:14px;">
        <div style="display:flex;justify-content:space-between;font-size:13px;margin-bottom:8px;">
          <span style="color:#8b949e;">Total pago</span>
          <span style="font-weight:700;color:#22c55e;">${formatPrice(getCartTotal())}</span>
        </div>
        <div style="display:flex;justify-content:space-between;font-size:13px;">
          <span style="color:#8b949e;">Entrega estimada</span>
          <span style="font-weight:600;">Imediata ⚡</span>
        </div>
      </div>
      <p style="font-size:12px;color:#8b949e;">Em caso de dúvidas, fale com nosso suporte pelo WhatsApp</p>
      <button onclick="finishOrder()" style="width:100%;padding:14px;background:linear-gradient(135deg,#38bdf8,#6366f1);border:none;border-radius:14px;color:#fff;font-size:15px;font-weight:700;cursor:pointer;">
        Fechar
      </button>
    </div>
  `;
  if (footer) footer.style.display = 'none';
}

function finishOrder() {
  cart = [];
  saveCart();
  renderCart();
  closeCart();
}

// ── MOBILE NAV ────────────────────────────────────────────────────────────────
function toggleMobileNav() {
  const nav = document.getElementById('mobile-nav');
  if (!nav) return;
  nav.style.display = nav.style.display === 'block' ? 'none' : 'block';
}

function closeMobileNav() {
  const nav = document.getElementById('mobile-nav');
  if (nav) nav.style.display = 'none';
}

// ── BOTTOM BAR ────────────────────────────────────────────────────────────────
function updateBottomBar() {
  const bar      = document.getElementById('bottom-cart-bar');
  const totalEl  = document.getElementById('bottom-cart-total');
  const countEl  = document.getElementById('bottom-cart-count');
  if (!bar) return;
  const count = getCartCount();
  if (count > 0) {
    bar.style.display = 'flex';
    if (totalEl) totalEl.textContent = formatPrice(getCartTotal());
    if (countEl) { countEl.textContent = count; countEl.style.display = 'inline'; }
  } else {
    bar.style.display = 'none';
  }
}

// ── INIT ──────────────────────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  renderCart();

  // Close cart on escape
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape') closeCart();
  });
});
