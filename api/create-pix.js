// api/create-pix.js — Cria pagamento PIX na Masterfy + envia sale.pending ao LowTrack
//
// Otimizações de velocidade:
//   1. sendToLowtrack é disparado APÓS res.json() (não bloqueia a resposta)
//   2. Payload enviado à Masterfy é mínimo e direto
//   3. Geração de CPF/contatos é síncrona e instantânea
//
// Lógica de contato:
//   - deliveryMode 'whatsapp' → phone fornecido, email gerado automaticamente
//   - deliveryMode 'email'    → email fornecido, phone gerado automaticamente
//   - deliveryMode 'ambos'    → ambos fornecidos pelo lead

const { sendToLowtrack } = require('./lowtrack');

const MASTERFY_API_KEY  = 'RCVLPJq4NcyslJZIGiI-b5FXwgHySnLvWiuUF5wPoD8';
const MASTERFY_BASE_URL = 'https://api.masterfypagamentos.com/v1';

// ── CPF válido ────────────────────────────────────────────────────────────────
function gerarCPF() {
  let digits;
  do {
    digits = Array.from({ length: 9 }, () => Math.floor(Math.random() * 10));
  } while (new Set(digits).size === 1);

  let sum = digits.reduce((acc, d, i) => acc + d * (10 - i), 0);
  digits.push((sum * 10) % 11 >= 10 ? 0 : (sum * 10) % 11);

  sum = digits.reduce((acc, d, i) => acc + d * (11 - i), 0);
  digits.push((sum * 10) % 11 >= 10 ? 0 : (sum * 10) % 11);

  return digits.join('');
}

// ── Celular aleatório (11 dígitos) ────────────────────────────────────────────
function gerarCelular() {
  const ddds = [11,12,13,14,15,16,17,18,19,21,22,24,27,28,31,32,33,34,35,37,38,
                41,42,43,44,45,46,47,48,49,51,53,54,55,61,62,64,65,66,67,68,69,
                71,73,74,75,77,79,81,82,83,84,85,86,87,88,89,91,92,93,94,95,96,97,98,99];
  const ddd  = ddds[Math.floor(Math.random() * ddds.length)];
  const rest = Array.from({ length: 8 }, () => Math.floor(Math.random() * 10)).join('');
  return `${ddd}9${rest}`;
}

// ── Email aleatório ───────────────────────────────────────────────────────────
function gerarEmail() {
  const p = ['user','cliente','gamer','player','nitro','cobra','fox','ace','wolf','neo'];
  const d = ['gmail.com','hotmail.com','outlook.com','yahoo.com.br','icloud.com'];
  return `${p[Math.floor(Math.random()*p.length)]}${Math.floor(Math.random()*90000)+10000}@${d[Math.floor(Math.random()*d.length)]}`;
}

// ── URL base do site ──────────────────────────────────────────────────────────
function siteUrl(req) {
  const proto = req.headers['x-forwarded-proto'] || 'https';
  const host  = req.headers['x-forwarded-host']  || req.headers['host'] || 'nitrocoins.store';
  return `${proto}://${host}`;
}

// ── Handler ───────────────────────────────────────────────────────────────────
module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin',  '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'POST')   return res.status(405).json({ error: 'Method not allowed' });

  try {
    const {
      orderId, name, email, phone, deliveryMode,
      amountCents, productName, productId, items, tracking,
    } = req.body;

    if (!name || !amountCents || !orderId) {
      return res.status(400).json({ error: 'Campos obrigatórios: name, amountCents, orderId' });
    }

    // ── Resolve contatos ──────────────────────────────────────────────────────
    const phoneClean = (phone || '').replace(/\D/g, '');
    const hasEmail   = email     && email.trim().length > 0;
    const hasPhone   = phoneClean.length >= 10;

    const finalEmail = hasEmail ? email.trim()  : gerarEmail();
    const finalPhone = hasPhone ? phoneClean     : gerarCelular();
    const cpf        = gerarCPF();

    if (!hasEmail) console.log(`[create-pix] Email gerado: ${finalEmail}`);
    if (!hasPhone) console.log(`[create-pix] Phone gerado: ${finalPhone}`);

    // ── Payload Masterfy (mínimo necessário) ──────────────────────────────────
    const payload = {
      amount:          amountCents,
      currency:        'BRL',
      method:          'PIX',
      description:     productName || 'NitroCoins',
      externalRef:     orderId,
      notificationUrl: `${siteUrl(req)}/api/webhook-masterfy`,
      payer: {
        name:  name.trim(),
        email: finalEmail,
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

    // ── Chama Masterfy ────────────────────────────────────────────────────────
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
      console.error('[Masterfy] error:', masterfyRes.status, charge);
      return res.status(502).json({
        error: charge?.message || 'Falha ao gerar o PIX. Tente novamente.',
      });
    }

    // ── Responde IMEDIATAMENTE ao frontend ────────────────────────────────────
    // sendToLowtrack é disparado depois, sem bloquear a resposta
    res.status(200).json({
      paymentId:   charge.id,
      externalRef: orderId,
      pixCode:     charge.data?.copypaste || '',
      status:      charge.status,
    });

    // ── LowTrack sale.pending (fire & forget — não bloqueia) ──────────────────
    const chargeWithPayer = {
      ...charge,
      payer: { name, email: finalEmail, phone: finalPhone },
    };

    // Formata items com nome legível e quantidade para o LowTrack
    const ltItems = (items || []).map(i => ({
      name:     i.name,                         // ex: "50.000 Gemas — Brawl Stars"
      quantity: i.quantity || 1,
      price:    (i.price || 0) / 100,           // centavos → BRL float
    }));

    sendToLowtrack('sale.pending', chargeWithPayer, {
      product_id: productId || orderId,
      items:      ltItems,
      tracking:   tracking  || {},
    });

  } catch (err) {
    console.error('[create-pix] Error:', err);
    // Se res ainda não foi enviada, envia erro
    if (!res.headersSent) {
      res.status(500).json({ error: 'Erro interno. Tente novamente.' });
    }
  }
};
