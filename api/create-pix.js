// api/create-pix.js — Cria pagamento PIX na Masterfy + envia sale.pending ao LowTrack
// Lógica:
//   - Gera CPF válido automaticamente para cada venda
//   - Se lead enviou só email  → gera celular aleatório
//   - Se lead enviou só phone  → gera email aleatório
//   - Se lead enviou ambos     → usa os dois fornecidos

const { sendToLowtrack } = require('./lowtrack');

// ⚠️ Credenciais hardcoded (sem Vercel env vars no plano free)
const MASTERFY_API_KEY  = 'RCVLPJq4NcyslJZIGiI-b5FXwgHySnLvWiuUF5wPoD8';
const MASTERFY_BASE_URL = 'https://api.masterfypagamentos.com/v1';

// ─────────────────────────────────────────────────────────────────────────────
// Geração de CPF válido (dígitos verificadores reais)
// ─────────────────────────────────────────────────────────────────────────────
function gerarCPF() {
  // CPFs com todos os dígitos iguais são inválidos — garante variação
  let digits;
  do {
    digits = Array.from({ length: 9 }, () => Math.floor(Math.random() * 10));
  } while (new Set(digits).size === 1);

  // Primeiro dígito verificador
  let sum = digits.reduce((acc, d, i) => acc + d * (10 - i), 0);
  const d1 = (sum * 10) % 11 >= 10 ? 0 : (sum * 10) % 11;
  digits.push(d1);

  // Segundo dígito verificador
  sum = digits.reduce((acc, d, i) => acc + d * (11 - i), 0);
  const d2 = (sum * 10) % 11 >= 10 ? 0 : (sum * 10) % 11;
  digits.push(d2);

  return digits.join(''); // 11 dígitos, ex: "04567891234"
}

// ─────────────────────────────────────────────────────────────────────────────
// Geração de celular brasileiro aleatório (11 dígitos)
// Formato: {DDD}{9}{8 dígitos}   ex: "11987654321"
// ─────────────────────────────────────────────────────────────────────────────
function gerarCelular() {
  const ddds = [11, 12, 13, 14, 15, 16, 17, 18, 19,
                21, 22, 24, 27, 28,
                31, 32, 33, 34, 35, 37, 38,
                41, 42, 43, 44, 45, 46, 47, 48, 49,
                51, 53, 54, 55,
                61, 62, 64, 65, 66, 67,
                68, 69, 71, 73, 74, 75, 77, 79,
                81, 82, 83, 84, 85, 86, 87, 88, 89,
                91, 92, 93, 94, 95, 96, 97, 98, 99];
  const ddd  = ddds[Math.floor(Math.random() * ddds.length)];
  const rest = Array.from({ length: 8 }, () => Math.floor(Math.random() * 10)).join('');
  return `${ddd}9${rest}`; // ex: "11987654321"
}

// ─────────────────────────────────────────────────────────────────────────────
// Geração de email aleatório plausível
// ─────────────────────────────────────────────────────────────────────────────
function gerarEmail() {
  const prefixes  = ['user', 'cliente', 'gamer', 'player', 'nitro', 'cobra', 'fox', 'ace'];
  const domains   = ['gmail.com', 'hotmail.com', 'outlook.com', 'yahoo.com.br', 'icloud.com'];
  const prefix    = prefixes[Math.floor(Math.random() * prefixes.length)];
  const num       = Math.floor(Math.random() * 90000) + 10000;
  const domain    = domains[Math.floor(Math.random() * domains.length)];
  return `${prefix}${num}@${domain}`;
}

// ─────────────────────────────────────────────────────────────────────────────
// Determina URL base do site (necessário para notificationUrl)
// ─────────────────────────────────────────────────────────────────────────────
function siteUrl(req) {
  const proto = req.headers['x-forwarded-proto'] || 'https';
  const host  = req.headers['x-forwarded-host']  || req.headers['host'] || 'nitrocoins.store';
  return `${proto}://${host}`;
}

// ─────────────────────────────────────────────────────────────────────────────
// Handler principal
// ─────────────────────────────────────────────────────────────────────────────
module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin',  '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'POST')   return res.status(405).json({ error: 'Method not allowed' });

  try {
    const {
      orderId,       // "NC-XXXXXX"
      name,          // nome completo do cliente
      email,         // email (pode estar vazio dependendo do canal de entrega)
      phone,         // telefone formatado "(11) 99999-9999" (pode estar vazio)
      deliveryMode,  // 'whatsapp' | 'email' | 'ambos'
      amountCents,   // valor em centavos (ex: 4799)
      productName,   // "50.000 Gemas — Brawl Stars"
      productId,     // "brawl-stars-1"
      items,         // [{ name, quantity, price }] com price em centavos
      tracking,      // { utm_source, utm_medium, ... }
    } = req.body;

    // Validação básica
    if (!name || !amountCents || !orderId) {
      return res.status(400).json({ error: 'Campos obrigatórios: name, amountCents, orderId' });
    }

    // ── Resolve email e phone conforme deliveryMode ───────────────────────────
    const phoneClean = (phone || '').replace(/\D/g, '');
    const hasEmail   = email   && email.trim().length > 0;
    const hasPhone   = phoneClean.length >= 10;

    let finalEmail = email   || '';
    let finalPhone = phoneClean;

    if (!hasEmail) {
      // Lead só forneceu celular (ou canal é 'whatsapp') → gera email aleatório
      finalEmail = gerarEmail();
      console.log(`[create-pix] Email gerado automaticamente: ${finalEmail}`);
    }
    if (!hasPhone) {
      // Lead só forneceu email (ou canal é 'email') → gera celular aleatório
      finalPhone = gerarCelular();
      console.log(`[create-pix] Celular gerado automaticamente: ${finalPhone}`);
    }

    // Sempre gera CPF válido único por venda
    const cpf = gerarCPF();

    // ── Monta payload para a Masterfy ─────────────────────────────────────────
    const payload = {
      amount:          amountCents,
      currency:        'BRL',
      method:          'PIX',
      description:     productName || 'NitroCoins — Moedas virtuais',
      externalRef:     orderId,
      notificationUrl: `${siteUrl(req)}/api/webhook-masterfy`,
      payer: {
        name:  name.trim(),
        email: finalEmail.trim(),
        phone: finalPhone,
        taxId: cpf,
      },
      items: (items || []).map(i => ({
        name:     i.name,
        quantity: i.quantity || 1,
        price:    i.price,
        type:     'DIGITAL',
      })),
    };

    // ── Chama a Masterfy ──────────────────────────────────────────────────────
    const masterfyRes = await fetch(`${MASTERFY_BASE_URL}/payment`, {
      method:  'POST',
      headers: {
        'Authorization': `Bearer ${MASTERFY_API_KEY}`,
        'Content-Type':  'application/json',
      },
      body: JSON.stringify(payload),
    });

    const charge = await masterfyRes.json().catch(() => null);

    if (!masterfyRes.ok || !charge?.id) {
      console.error('[Masterfy] create-pix error:', masterfyRes.status, charge);
      return res.status(502).json({
        error: charge?.message || 'Falha ao gerar o PIX. Tente novamente.',
      });
    }

    // ── Envia sale.pending ao LowTrack (não bloqueia resposta) ───────────────
    // Injeta email/phone resolvidos no payer para o LowTrack receber correto
    const chargeWithPayer = {
      ...charge,
      payer: { ...charge.payer, email: finalEmail, phone: finalPhone, name },
    };
    sendToLowtrack('sale.pending', chargeWithPayer, {
      product_id: productId || orderId,
      tracking:   tracking  || {},
    });

    // ── Retorna código PIX para o frontend ────────────────────────────────────
    return res.status(200).json({
      paymentId:   charge.id,
      externalRef: orderId,
      pixCode:     charge.data?.copypaste || '',
      status:      charge.status,
    });

  } catch (err) {
    console.error('[create-pix] Unexpected error:', err);
    return res.status(500).json({ error: 'Erro interno. Tente novamente.' });
  }
};
