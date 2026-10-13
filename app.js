/* =============================================
   NITROCOINS - app.js
   Carrinho, Checkout, Carrossel, FAQ, Mobile Nav
   ============================================= */

'use strict';

// ── ESTADO DO CARRINHO ──────────────────────────────────────────────────────
let cart = JSON.parse(localStorage.getItem('nc_cart') || '[]');

function saveCart() {
  localStorage.setItem('nc_cart', JSON.stringify(cart));
}

function addToCart(id, name, game, price, icon, qty = 1) {
  const existing = cart.find(i => i.id === id);
  if (existing) {
    existing.qty += qty;
  } else {
    cart.push({ id, name, game, price, icon, qty });
  }
  saveCart();
  updateCartUI();
  showToast(`✅ ${name} adicionado ao carrinho!`);
  // Abre o carrinho brevemente
  openCart();
}

function removeFromCart(id) {
  cart = cart.filter(i => i.id !== id);
  saveCart();
  updateCartUI();
}

function changeQty(id, delta) {
  const item = cart.find(i => i.id === id);
  if (!item) return;
  item.qty += delta;
  if (item.qty <= 0) {
    removeFromCart(id);
    return;
  }
  saveCart();
  updateCartUI();
}

function clearCart() {
  cart = [];
  saveCart();
  updateCartUI();
}

function getCartTotal() {
  return cart.reduce((sum, i) => sum + i.price * i.qty, 0);
}

function getCartCount() {
  return cart.reduce((sum, i) => sum + i.qty, 0);
}

function formatPrice(val) {
  return 'R$ ' + val.toFixed(2).replace('.', ',');
}

// ── CARRINHO UI ─────────────────────────────────────────────────────────────
function updateCartUI() {
  const badge = document.getElementById('cart-badge');
  const count = getCartCount();

  if (badge) {
    if (count > 0) {
      badge.textContent = count;
      badge.style.display = 'flex';
    } else {
      badge.style.display = 'none';
    }
  }

  renderCartItems();
}

function renderCartItems() {
  const empty = document.getElementById('cart-empty');
  const itemsEl = document.getElementById('cart-items');
  const footer = document.getElementById('cart-footer');
  const totalEl = document.getElementById('cart-total');

  if (!itemsEl) return;

  if (cart.length === 0) {
    if (empty) empty.style.display = 'flex';
    itemsEl.style.display = 'none';
    if (footer) footer.style.display = 'none';
    return;
  }

  if (empty) empty.style.display = 'none';
  itemsEl.style.display = 'flex';
  if (footer) footer.style.display = 'block';

  if (totalEl) totalEl.textContent = formatPrice(getCartTotal());

  itemsEl.innerHTML = cart.map(item => `
    <div class="cart-item" data-id="${item.id}">
      <div class="cart-item-icon">${item.icon}</div>
      <div class="cart-item-info">
        <div class="cart-item-name">${item.name}</div>
        <div class="cart-item-sub">${item.game}</div>
        <div class="cart-item-qty">
          <button class="cart-qty-btn" onclick="changeQty('${item.id}', -1)">−</button>
          <span class="cart-qty-num">${item.qty}</span>
          <button class="cart-qty-btn" onclick="changeQty('${item.id}', 1)">+</button>
        </div>
      </div>
      <div style="display:flex;flex-direction:column;align-items:flex-end;gap:8px;">
        <div class="cart-item-price">${formatPrice(item.price * item.qty)}</div>
        <button class="cart-remove" aria-label="Remover item" onclick="removeFromCart('${item.id}')">
          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
        </button>
      </div>
    </div>
  `).join('');
}

// ── ABRIR / FECHAR CARRINHO ────────────────────────────────────────────────
let cartOpen = false;

function openCart() {
  cartOpen = true;
  const drawer = document.getElementById('cart-drawer');
  const overlay = document.getElementById('cart-overlay');
  if (drawer) drawer.classList.add('cart-drawer--open');
  if (overlay) overlay.style.display = 'block';
  document.body.style.overflow = 'hidden';
  renderCartItems();
}

function closeCart() {
  cartOpen = false;
  const drawer = document.getElementById('cart-drawer');
  const overlay = document.getElementById('cart-overlay');
  if (drawer) drawer.classList.remove('cart-drawer--open');
  if (overlay) overlay.style.display = 'none';
  document.body.style.overflow = '';
}

function toggleCart() {
  if (cartOpen) closeCart();
  else openCart();
}

// ── CHECKOUT ────────────────────────────────────────────────────────────────
let currentPayment = 'pix';

function checkout() {
  if (cart.length === 0) return;
  closeCart();
  openCheckoutModal();
}

function openCheckoutModal() {
  // Remove modal anterior se existir
  const old = document.getElementById('checkout-modal-overlay');
  if (old) old.remove();

  const orderItemsHTML = cart.map(item => `
    <div class="checkout-order-item">
      <div class="checkout-order-item-left">
        <span class="checkout-order-item-icon">${item.icon}</span>
        <div class="checkout-order-item-info">
          <div class="checkout-order-item-name">${item.name}</div>
          <div class="checkout-order-item-qty">Qtd: ${item.qty}</div>
        </div>
      </div>
      <span class="checkout-order-item-price">${formatPrice(item.price * item.qty)}</span>
    </div>
  `).join('');

  const total = getCartTotal();

  const modal = document.createElement('div');
  modal.id = 'checkout-modal-overlay';
  modal.className = 'checkout-modal-overlay';
  modal.innerHTML = `
    <div class="checkout-modal" id="checkout-modal-box">
      <div class="checkout-modal-header">
        <h2 class="checkout-modal-title">Finalizar Pedido</h2>
        <button class="cart-close" onclick="closeCheckoutModal()" aria-label="Fechar">
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
        </button>
      </div>
      <div class="checkout-modal-body" id="checkout-modal-body">
        <!-- Resumo do pedido -->
        <p class="checkout-section-title">Resumo do pedido</p>
        <div class="checkout-order-items">${orderItemsHTML}</div>
        <div class="checkout-total-row">
          <span class="checkout-total-label">Total</span>
          <span class="checkout-total-value">${formatPrice(total)}</span>
        </div>

        <!-- Dados do jogador -->
        <p class="checkout-section-title">Seus dados</p>
        <div class="form-group">
          <label class="form-label" for="co-nome">Nome completo *</label>
          <input class="form-input" type="text" id="co-nome" placeholder="Seu nome" required/>
        </div>
        <div class="form-group">
          <label class="form-label" for="co-email">E-mail *</label>
          <input class="form-input" type="email" id="co-email" placeholder="seu@email.com" required/>
        </div>
        <div class="form-group">
          <label class="form-label" for="co-userid">ID do jogador (nick ou ID no jogo) *</label>
          <input class="form-input" type="text" id="co-userid" placeholder="Ex: 123456789" required/>
        </div>

        <!-- Pagamento -->
        <p class="checkout-section-title" style="margin-top:20px;">Forma de pagamento</p>
        <div class="payment-methods" id="payment-methods">
          <button class="payment-btn payment-btn--active" id="pay-pix" onclick="selectPayment('pix')">
            <span style="font-size:20px;">⚡</span>
            Pix
            <span style="font-size:10px;color:var(--success)">Instantâneo</span>
          </button>
          <button class="payment-btn" id="pay-card" onclick="selectPayment('card')">
            <span style="font-size:20px;">💳</span>
            Cartão
          </button>
          <button class="payment-btn" id="pay-boleto" onclick="selectPayment('boleto')">
            <span style="font-size:20px;">🧾</span>
            Boleto
          </button>
        </div>

        <!-- Campos de pagamento -->
        <div id="payment-fields"></div>

        <button class="btn-confirm-order" onclick="confirmOrder()">
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z"/><path d="m9 12 2 2 4-4"/></svg>
          Confirmar Pedido
        </button>
      </div>
    </div>
  `;

  document.body.appendChild(modal);
  document.body.style.overflow = 'hidden';

  // Fecha ao clicar fora
  modal.addEventListener('click', (e) => {
    if (e.target === modal) closeCheckoutModal();
  });

  // Renderiza campos PIX por padrão
  selectPayment('pix');
}

function selectPayment(method) {
  currentPayment = method;
  ['pix', 'card', 'boleto'].forEach(m => {
    const btn = document.getElementById('pay-' + m);
    if (btn) btn.classList.toggle('payment-btn--active', m === method);
  });
  renderPaymentFields(method);
}

function renderPaymentFields(method) {
  const el = document.getElementById('payment-fields');
  if (!el) return;

  if (method === 'pix') {
    el.innerHTML = `
      <div class="pix-code-box">
        <p>Após confirmar, copie o código Pix e realize o pagamento:</p>
        <div class="pix-code-value" id="pix-code">00020126360014BR.GOV.BCB.PIX0114+5511999999999520400005303986540${getCartTotal().toFixed(2)}5802BR5913NitroCoins6009SAO PAULO62070503***6304ABCD</div>
        <button class="btn-copy-pix" onclick="copyPix()">📋 Copiar Pix</button>
      </div>
    `;
  } else if (method === 'card') {
    el.innerHTML = `
      <div class="form-group">
        <label class="form-label" for="co-card-num">Número do cartão *</label>
        <input class="form-input" type="text" id="co-card-num" placeholder="0000 0000 0000 0000" maxlength="19" oninput="maskCard(this)"/>
      </div>
      <div class="form-group">
        <label class="form-label" for="co-card-name">Nome no cartão *</label>
        <input class="form-input" type="text" id="co-card-name" placeholder="NOME SOBRENOME"/>
      </div>
      <div class="form-row">
        <div class="form-group">
          <label class="form-label" for="co-card-exp">Validade *</label>
          <input class="form-input" type="text" id="co-card-exp" placeholder="MM/AA" maxlength="5" oninput="maskExpiry(this)"/>
        </div>
        <div class="form-group">
          <label class="form-label" for="co-card-cvv">CVV *</label>
          <input class="form-input" type="text" id="co-card-cvv" placeholder="123" maxlength="3"/>
        </div>
      </div>
      <div class="form-group">
        <label class="form-label" for="co-card-parcelas">Parcelas</label>
        <select class="form-input" id="co-card-parcelas">
          <option>1x de ${formatPrice(getCartTotal())} (sem juros)</option>
          <option>2x de ${formatPrice(getCartTotal()/2)} (sem juros)</option>
          <option>3x de ${formatPrice(getCartTotal()/3)} (sem juros)</option>
        </select>
      </div>
    `;
  } else if (method === 'boleto') {
    el.innerHTML = `
      <div class="pix-code-box">
        <p style="margin-bottom:8px;">O boleto será gerado após a confirmação e enviado para seu e-mail.</p>
        <p style="font-size:12px;color:var(--fg3);">⚠️ Compensação em até 3 dias úteis. O acesso é liberado após confirmação do banco.</p>
      </div>
    `;
  }
}

function copyPix() {
  const code = document.getElementById('pix-code');
  if (!code) return;
  navigator.clipboard.writeText(code.textContent).then(() => {
    showToast('📋 Código Pix copiado!');
  }).catch(() => {
    showToast('📋 Copie o código manualmente');
  });
}

function maskCard(input) {
  let v = input.value.replace(/\D/g,'').slice(0,16);
  input.value = v.replace(/(.{4})/g,'$1 ').trim();
}

function maskExpiry(input) {
  let v = input.value.replace(/\D/g,'').slice(0,4);
  if (v.length >= 2) v = v.slice(0,2) + '/' + v.slice(2);
  input.value = v;
}

function validateCheckoutForm() {
  const nome = document.getElementById('co-nome');
  const email = document.getElementById('co-email');
  const userid = document.getElementById('co-userid');

  if (!nome || !nome.value.trim()) { nome && nome.focus(); showToast('⚠️ Informe seu nome'); return false; }
  if (!email || !email.value.includes('@')) { email && email.focus(); showToast('⚠️ Informe um e-mail válido'); return false; }
  if (!userid || !userid.value.trim()) { userid && userid.focus(); showToast('⚠️ Informe seu ID do jogador'); return false; }

  if (currentPayment === 'card') {
    const cardNum = document.getElementById('co-card-num');
    const cardName = document.getElementById('co-card-name');
    const cardExp = document.getElementById('co-card-exp');
    const cardCvv = document.getElementById('co-card-cvv');
    if (!cardNum || cardNum.value.replace(/\s/g,'').length < 16) { cardNum && cardNum.focus(); showToast('⚠️ Número do cartão inválido'); return false; }
    if (!cardName || !cardName.value.trim()) { cardName && cardName.focus(); showToast('⚠️ Informe o nome no cartão'); return false; }
    if (!cardExp || cardExp.value.length < 5) { cardExp && cardExp.focus(); showToast('⚠️ Validade inválida'); return false; }
    if (!cardCvv || cardCvv.value.length < 3) { cardCvv && cardCvv.focus(); showToast('⚠️ CVV inválido'); return false; }
  }

  return true;
}

function confirmOrder() {
  if (!validateCheckoutForm()) return;

  // Simula processamento
  const btn = document.querySelector('.btn-confirm-order');
  if (btn) {
    btn.disabled = true;
    btn.innerHTML = `<span style="display:inline-block;animation:spin 1s linear infinite;border:2px solid rgba(255,255,255,0.3);border-top-color:#fff;border-radius:50%;width:16px;height:16px;"></span> Processando...`;
  }

  setTimeout(() => {
    showOrderSuccess();
  }, 2000);
}

function showOrderSuccess() {
  const body = document.getElementById('checkout-modal-body');
  if (!body) return;

  const orderId = 'NC-' + Date.now().toString(36).toUpperCase();
  const email = (document.getElementById('co-email') || {}).value || 'seu e-mail';

  body.innerHTML = `
    <div class="order-success">
      <span class="order-success-icon">🎮</span>
      <h3 class="order-success-title">Pedido realizado!</h3>
      <p class="order-success-desc">
        Suas moedas serão entregues em instantes diretamente na sua conta.<br/>
        Um comprovante foi enviado para <strong>${email}</strong>.
      </p>
      <div class="order-id">#${orderId}</div>
      <br/>
      <button class="btn-back-home" onclick="closeCheckoutModal(); clearCart();">
        Voltar ao início
      </button>
    </div>
  `;

  // Adiciona CSS de spin se não existir
  if (!document.getElementById('spin-style')) {
    const s = document.createElement('style');
    s.id = 'spin-style';
    s.textContent = '@keyframes spin{to{transform:rotate(360deg)}}';
    document.head.appendChild(s);
  }
}

function closeCheckoutModal() {
  const modal = document.getElementById('checkout-modal-overlay');
  if (modal) modal.remove();
  if (cart.length === 0) {
    document.body.style.overflow = '';
  }
}

// ── TOAST ───────────────────────────────────────────────────────────────────
let toastTimer;
function showToast(msg, type = 'success') {
  const existing = document.getElementById('nc-toast');
  if (existing) existing.remove();
  clearTimeout(toastTimer);

  const toast = document.createElement('div');
  toast.id = 'nc-toast';
  toast.className = `toast toast-${type}`;
  toast.innerHTML = `<span>${msg}</span>`;
  document.body.appendChild(toast);

  toastTimer = setTimeout(() => {
    toast.style.animation = 'fade-in 0.3s ease reverse';
    setTimeout(() => toast.remove(), 300);
  }, 2500);
}

// ── CARROSSEL ───────────────────────────────────────────────────────────────
let currentSlide = 0;
const totalSlides = 4;
let carouselInterval;
let isDragging = false;
let dragStartX = 0;

function goToSlide(idx) {
  currentSlide = ((idx % totalSlides) + totalSlides) % totalSlides;
  const track = document.getElementById('carousel-track');
  if (track) track.style.transform = `translateX(-${currentSlide * 100}%)`;
  updateDots();
  restartAutoplay();
}

function carouselNext() { goToSlide(currentSlide + 1); }
function carouselPrev() { goToSlide(currentSlide - 1); }

function updateDots() {
  document.querySelectorAll('.carousel-dot').forEach((dot, i) => {
    dot.classList.toggle('carousel-dot--active', i === currentSlide);
    dot.setAttribute('aria-current', i === currentSlide ? 'true' : 'false');
  });
}

function startAutoplay() {
  carouselInterval = setInterval(carouselNext, 5000);
}

function restartAutoplay() {
  clearInterval(carouselInterval);
  startAutoplay();
}

function initCarousel() {
  const wrapper = document.getElementById('carousel-wrapper');
  if (!wrapper) return;

  // Touch/swipe
  wrapper.addEventListener('touchstart', (e) => {
    isDragging = true;
    dragStartX = e.touches[0].clientX;
    clearInterval(carouselInterval);
  }, { passive: true });

  wrapper.addEventListener('touchend', (e) => {
    if (!isDragging) return;
    isDragging = false;
    const diff = dragStartX - e.changedTouches[0].clientX;
    if (Math.abs(diff) > 50) {
      diff > 0 ? carouselNext() : carouselPrev();
    } else {
      startAutoplay();
    }
  });

  // Mouse drag
  wrapper.addEventListener('mousedown', (e) => {
    isDragging = true;
    dragStartX = e.clientX;
    clearInterval(carouselInterval);
    e.preventDefault();
  });

  window.addEventListener('mouseup', (e) => {
    if (!isDragging) return;
    isDragging = false;
    const diff = dragStartX - e.clientX;
    if (Math.abs(diff) > 50) {
      diff > 0 ? carouselNext() : carouselPrev();
    } else {
      startAutoplay();
    }
  });

  // Pause on hover
  wrapper.addEventListener('mouseenter', () => clearInterval(carouselInterval));
  wrapper.addEventListener('mouseleave', startAutoplay);

  startAutoplay();
}

// ── FAQ ACCORDION ────────────────────────────────────────────────────────────
function toggleFaq(btn) {
  const item = btn.closest('.faq-item');
  const body = item.querySelector('.faq-body');
  const icon = item.querySelector('.faq-icon');
  const isOpen = btn.getAttribute('aria-expanded') === 'true';

  // Fecha todos
  document.querySelectorAll('.faq-item').forEach(i => {
    i.querySelector('.faq-btn').setAttribute('aria-expanded', 'false');
    i.querySelector('.faq-body').classList.remove('faq-body--open');
    i.querySelector('.faq-icon').classList.remove('faq-icon--open');
    i.classList.remove('faq-item--open');
  });

  // Abre o clicado (se estava fechado)
  if (!isOpen) {
    btn.setAttribute('aria-expanded', 'true');
    body.classList.add('faq-body--open');
    icon.classList.add('faq-icon--open');
    item.classList.add('faq-item--open');
  }
}

// ── MOBILE NAV ──────────────────────────────────────────────────────────────
function toggleMobileNav() {
  const nav = document.getElementById('mobile-nav');
  const btn = document.getElementById('btn-menu');
  if (!nav) return;
  const isOpen = nav.style.display === 'block';
  nav.style.display = isOpen ? 'none' : 'block';
  if (btn) btn.setAttribute('aria-expanded', String(!isOpen));
}

function closeMobileNav() {
  const nav = document.getElementById('mobile-nav');
  const btn = document.getElementById('btn-menu');
  if (nav) nav.style.display = 'none';
  if (btn) btn.setAttribute('aria-expanded', 'false');
}

// ── REVEAL ANIMATION ─────────────────────────────────────────────────────────
function initReveal() {
  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('reveal--visible');
        observer.unobserve(entry.target);
      }
    });
  }, { threshold: 0.1, rootMargin: '0px 0px -40px 0px' });

  document.querySelectorAll('.reveal').forEach(el => observer.observe(el));
}

// ── SMOOTH ANCHOR SCROLL ──────────────────────────────────────────────────────
function initSmoothScroll() {
  document.querySelectorAll('a[href^="#"]').forEach(a => {
    a.addEventListener('click', (e) => {
      const target = document.querySelector(a.getAttribute('href'));
      if (target) {
        e.preventDefault();
        target.scrollIntoView({ behavior: 'smooth', block: 'start' });
        closeMobileNav();
      }
    });
  });
}

// ── INIT ─────────────────────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  updateCartUI();
  initCarousel();
  initReveal();
  initSmoothScroll();

  // Header scroll effect
  const header = document.getElementById('site-header');
  if (header) {
    window.addEventListener('scroll', () => {
      header.style.borderBottomColor = window.scrollY > 20
        ? 'rgba(255,255,255,0.1)'
        : 'rgba(255,255,255,0.06)';
    }, { passive: true });
  }
});
