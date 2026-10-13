// ── NITROCOINS app.js ─────────────────────────────────────────────────────────
// Exactly mirrors the original nitrocoins.store CartDrawer + CartProvider logic

const CART_KEY = 'nc_cart';

// ── Cart State ────────────────────────────────────────────────────────────────
function getCart() {
  try { return JSON.parse(localStorage.getItem(CART_KEY) || '[]').filter(i => i && i.id && i.quantity > 0); }
  catch(e) { return []; }
}
function saveCart(cart) {
  localStorage.setItem(CART_KEY, JSON.stringify(cart));
}
function formatBRL(n) {
  return 'R$ ' + Number(n).toFixed(2).replace('.', ',').replace(/\B(?=(\d{3})+(?!\d))/g, '.');
}
function getSubtotal() {
  return getCart().reduce((s, i) => s + i.price * i.quantity, 0);
}
// Savings not applicable without real originalPrice — return 0 to avoid NaN
function getSavings() {
  return 0;
}
function getCount() {
  return getCart().reduce((s, i) => s + i.quantity, 0);
}

// ── Derive category image from game name ──────────────────────────────────────
function gameImage(game) {
  if (!game) return 'categories/roblox.webp';
  const slug = game.toLowerCase().replace(/ /g, '-').replace(/[^a-z0-9-]/g, '');
  return 'categories/' + slug + '.webp';
}

// ── Add to Cart ──────────────────────────────────────────────────────────────
// Called from game pages as: addToCart(id, amount, game, price, icon)
// 5th param is an emoji/letter icon — NOT originalPrice, NOT image
function addToCart(id, amount, game, price, _icon) {
  let cart = getCart();
  const existing = cart.find(i => i.id === id);
  if (existing) {
    existing.quantity += 1;
  } else {
    // Derive image from game name (category image)
    const image = gameImage(game);
    cart.push({ id, amount, game, price, image, quantity: 1 });
  }
  saveCart(cart);
  updateBadge();
  updateBottomBar();
  openCart();
  showToast(amount + ' adicionado!');
}

// ── Update Quantity ───────────────────────────────────────────────────────────
function updateQuantity(id, newQty) {
  let cart = getCart();
  if (newQty <= 0) {
    cart = cart.filter(i => i.id !== id);
  } else {
    const item = cart.find(i => i.id === id);
    if (item) item.quantity = newQty;
  }
  saveCart(cart);
  renderCartDrawer();
  updateBadge();
  updateBottomBar();
}

// ── Remove Item ───────────────────────────────────────────────────────────────
function removeItem(id) {
  saveCart(getCart().filter(i => i.id !== id));
  renderCartDrawer();
  updateBadge();
  updateBottomBar();
}

// ── Badge counter ─────────────────────────────────────────────────────────────
function updateBadge() {
  const count = getCount();
  document.querySelectorAll('#cart-badge').forEach(el => {
    el.textContent = count;
    el.style.display = count > 0 ? 'inline-flex' : 'none';
  });
}

// ── Bottom mobile bar ─────────────────────────────────────────────────────────
function updateBottomBar() {
  const bar = document.getElementById('bottom-cart-bar');
  if (!bar) return;
  const count = getCount();
  if (count > 0) {
    bar.style.display = 'flex';
    const t = document.getElementById('bottom-cart-total');
    const c = document.getElementById('bottom-cart-count');
    if (t) t.textContent = formatBRL(getSubtotal());
    if (c) { c.textContent = count; c.style.display = 'inline'; }
  } else {
    bar.style.display = 'none';
  }
}

// ── Render Cart Drawer ────────────────────────────────────────────────────────
// Mirrors exactly the CartDrawer JSX from the original site
function renderCartDrawer() {
  const body = document.getElementById('cart-drawer-body');
  const footer = document.getElementById('cart-drawer-footer');
  if (!body) return;

  const cart = getCart();

  if (cart.length === 0) {
    // Empty state — rounded-full bg-secondary circle with ShoppingCart icon inside
    body.innerHTML = `
      <div style="display:flex;flex:1;flex-direction:column;align-items:center;justify-content:center;gap:12px;padding:24px;text-align:center;height:100%;">
        <span style="display:flex;width:64px;height:64px;align-items:center;justify-content:center;border-radius:9999px;background:rgba(255,255,255,0.08);color:#8b949e;">
          <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="8" cy="21" r="1"/><circle cx="19" cy="21" r="1"/><path d="M2.05 2.05h2l2.66 12.42a2 2 0 0 0 2 1.58h9.78a2 2 0 0 0 1.95-1.57l1.65-7.43H5.12"/></svg>
        </span>
        <p style="font-weight:500;font-size:15px;">Seu carrinho está vazio</p>
        <p style="font-size:13px;color:#8b949e;">Adicione moedas e aproveite os descontos.</p>
        <button onclick="closeCart()" style="margin-top:8px;padding:8px 20px;background:rgba(255,255,255,0.08);border:none;border-radius:12px;color:#e6edf3;font-size:13px;font-weight:500;cursor:pointer;">Ver ofertas</button>
      </div>`;
    if (footer) footer.style.display = 'none';
    return;
  }

  // Items list — each item: rounded-xl border border-border bg-background p-3
  body.innerHTML = `<ul style="display:flex;flex-direction:column;gap:12px;padding:16px 20px;">
    ${cart.map(item => `
      <li style="display:flex;gap:12px;border-radius:12px;border:1px solid rgba(255,255,255,0.08);background:#0d1117;padding:12px;">
        <img src="${item.image}"
             alt=""
             style="width:64px;height:64px;flex-shrink:0;border-radius:10px;background:rgba(255,255,255,0.06);object-fit:cover;"
             onerror="this.src='${gameImage(item.game)}'"/>
        <div style="display:flex;flex:1;flex-direction:column;">
          <div style="display:flex;align-items:flex-start;justify-content:space-between;gap:8px;">
            <div>
              <p style="font-size:11px;font-weight:500;color:#38bdf8;">${item.game}</p>
              <p style="font-size:13px;font-weight:600;line-height:1.3;margin-top:2px;">${item.amount}</p>
            </div>
            <!-- Trash2 icon button — exactly like original -->
            <button onclick="removeItem('${item.id}')"
                    aria-label="Remover item"
                    style="color:#8b949e;background:none;border:none;cursor:pointer;padding:2px;flex-shrink:0;transition:color .2s;"
                    onmouseenter="this.style.color='#ef4444'"
                    onmouseleave="this.style.color='#8b949e'">
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/></svg>
            </button>
          </div>
          <div style="margin-top:8px;display:flex;align-items:center;justify-content:space-between;">
            <!-- Qty controls: rounded-lg border border-border, size-7 buttons -->
            <div style="display:flex;align-items:center;gap:0;border:1px solid rgba(255,255,255,0.1);border-radius:8px;overflow:hidden;">
              <button onclick="updateQuantity('${item.id}', ${item.quantity - 1})"
                      aria-label="Diminuir quantidade"
                      style="display:flex;width:28px;height:28px;align-items:center;justify-content:center;background:transparent;border:none;color:#8b949e;cursor:pointer;transition:color .2s;"
                      onmouseenter="this.style.color='#e6edf3'"
                      onmouseleave="this.style.color='#8b949e'">
                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M5 12h14"/></svg>
              </button>
              <span style="width:24px;text-align:center;font-size:13px;font-weight:500;">${item.quantity}</span>
              <button onclick="updateQuantity('${item.id}', ${item.quantity + 1})"
                      aria-label="Aumentar quantidade"
                      style="display:flex;width:28px;height:28px;align-items:center;justify-content:center;background:transparent;border:none;color:#8b949e;cursor:pointer;transition:color .2s;"
                      onmouseenter="this.style.color='#e6edf3'"
                      onmouseleave="this.style.color='#8b949e'">
                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M5 12h14"/><path d="M12 5v14"/></svg>
              </button>
            </div>
            <!-- Price: font-display font-bold (Space Grotesk) -->
            <p style="font-family:'Space Grotesk',sans-serif;font-weight:700;font-size:15px;">${formatBRL(item.price * item.quantity)}</p>
          </div>
        </div>
      </li>`).join('')}
  </ul>`;

  // Footer — exact structure from original
  if (footer) {
    footer.style.display = 'block';
    const subtotal = getSubtotal();
    const savings  = getSavings();
    footer.innerHTML = `
      <!-- Total row -->
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:16px;">
        <span style="color:#8b949e;font-size:14px;">Total</span>
        <span style="font-family:'Space Grotesk',sans-serif;font-size:24px;font-weight:700;">${formatBRL(subtotal)}</span>
      </div>
      <!-- CTA button: "Ir para o pagamento" with gradient from-accent to-primary -->
      <button onclick="goToCheckout()"
              style="width:100%;display:flex;align-items:center;justify-content:center;padding:14px;background:linear-gradient(90deg,#38bdf8,#6366f1);border:none;border-radius:12px;color:#fff;font-size:15px;font-weight:600;cursor:pointer;box-shadow:0 4px 16px rgba(99,102,241,0.35);">
        Ir para o pagamento
      </button>
      <!-- Sub-text: "Pagamento 100% seguro · Entrega instantânea" -->
      <p style="margin-top:8px;text-align:center;font-size:12px;color:#8b949e;">Pagamento 100% seguro · Entrega instantânea</p>
    `;
  }
}

// ── Go to checkout — closes drawer then navigates to checkout.html ─────────────
function goToCheckout() {
  closeCart();
  window.location.href = 'checkout.html';
}

// ── Open/Close Cart Drawer ────────────────────────────────────────────────────
function openCart() {
  renderCartDrawer();
  const drawer  = document.getElementById('cart-drawer');
  const overlay = document.getElementById('cart-overlay');
  if (!drawer) return;
  drawer.style.transform = 'translateX(0)';
  if (overlay) { overlay.style.opacity = '1'; overlay.style.pointerEvents = 'auto'; }
  document.body.style.overflow = 'hidden';
}

function closeCart() {
  const drawer  = document.getElementById('cart-drawer');
  const overlay = document.getElementById('cart-overlay');
  if (!drawer) return;
  drawer.style.transform = 'translateX(100%)';
  if (overlay) { overlay.style.opacity = '0'; overlay.style.pointerEvents = 'none'; }
  document.body.style.overflow = '';
}

function toggleCart() {
  const drawer = document.getElementById('cart-drawer');
  if (!drawer) return;
  if (drawer.style.transform === 'translateX(0px)' || drawer.style.transform === 'translateX(0)') {
    closeCart();
  } else {
    openCart();
  }
}

// ── Mobile nav ────────────────────────────────────────────────────────────────
function toggleMobileNav() {
  const nav = document.getElementById('mobile-nav');
  if (!nav) return;
  nav.style.display = nav.style.display === 'block' ? 'none' : 'block';
}
function closeMobileNav() {
  const nav = document.getElementById('mobile-nav');
  if (nav) nav.style.display = 'none';
}

// ── Toast ─────────────────────────────────────────────────────────────────────
function showToast(msg) {
  let t = document.getElementById('nc-toast');
  if (!t) {
    t = document.createElement('div');
    t.id = 'nc-toast';
    t.style.cssText = 'position:fixed;top:76px;left:50%;transform:translateX(-50%);z-index:9999;padding:10px 20px;background:#6366f1;color:#fff;border-radius:12px;font-size:13px;font-weight:600;box-shadow:0 8px 24px rgba(99,102,241,0.4);transition:opacity .3s;pointer-events:none;white-space:nowrap;';
    document.body.appendChild(t);
  }
  t.textContent = msg;
  t.style.opacity = '1';
  clearTimeout(t._to);
  t._to = setTimeout(() => { t.style.opacity = '0'; }, 2200);
}

// ── Init ──────────────────────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  updateBadge();
  updateBottomBar();

  // Escape to close cart
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape') closeCart();
  });
});
