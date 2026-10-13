// api/create-pix.js — Cria um pagamento PIX na Masterfy e envia sale.pending ao LowTrack
// Chamado pelo checkout.html via POST /api/create-pix

const { sendToLowtrack } = require('./lowtrack');

const MASTERFY_API_KEY  = process.env.MASTERFY_API_KEY;
const MASTERFY_BASE_URL = 'https://api.masterfypagamentos.com/v1';

// Determina a URL base do site dinamicamente (Vercel injeta VERCEL_URL)
function siteUrl(req) {
  if (process.env.NEXT_PUBLIC_SITE_URL) return process.env.NEXT_PUBLIC_SITE_URL;
  const proto = req.headers['x-forwarded-proto'] || 'https';
  const host  = req.headers['x-forwarded-host'] || req.headers.host;
  return `${proto}://${host}`;
}

module.exports = async function handler(req, res) {
  // CORS para o frontend estático
  res.setHeader('Access-Control-Allow-Origin',  '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'POST')   return res.status(405).json({ error: 'Method not allowed' });

  try {
    const {
      orderId,        // ex: "NC-ABC123"
      name,           // nome do cliente
      email,          // email
      phone,          // telefone formatado "(11) 99999-9999"
      taxId,          // CPF (11 dígitos, apenas números)
      amountCents,    // valor em centavos (ex: 4799)
      productName,    // ex: "3.500.000 Robux — Roblox"
      productId,      // ex: "roblox-0"
      items,          // array de { name, quantity, price } com price em centavos
      tracking,       // { utm_source, utm_medium, utm_campaign, ... }
    } = req.body;

    // Validação básica
    if (!name || !amountCents || !orderId) {
      return res.status(400).json({ error: 'Campos obrigatórios: name, amountCents, orderId' });
    }

    // Limpa telefone para apenas dígitos
    const phoneClean = (phone || '').replace(/\D/g, '');

    // Monta payload para a Masterfy
    const payload = {
      amount:          amountCents,
      currency:        'BRL',
      method:          'PIX',
      description:     productName || 'NitroCoins — Moedas virtuais',
      externalRef:     orderId,
      notificationUrl: `${siteUrl(req)}/api/webhook-masterfy`,
      payer: {
        name,
        email:  email || '',
        phone:  phoneClean || '00000000000',
        taxId:  (taxId || '00000000000').replace(/\D/g, ''),
      },
      items: (items || []).map(i => ({
        name:     i.name,
        quantity: i.quantity || 1,
        price:    i.price,
        type:     'DIGITAL',
      })),
    };

    // Chama a Masterfy
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

    // Envia sale.pending ao LowTrack (não bloqueia a resposta)
    sendToLowtrack('sale.pending', charge, {
      product_id: productId || orderId,
      tracking:   tracking  || {},
    });

    // Retorna o código PIX para o frontend
    return res.status(200).json({
      paymentId:  charge.id,
      externalRef: orderId,
      pixCode:    charge.data?.copypaste || '',
      status:     charge.status,
    });

  } catch (err) {
    console.error('[create-pix] Unexpected error:', err);
    return res.status(500).json({ error: 'Erro interno. Tente novamente.' });
  }
};
