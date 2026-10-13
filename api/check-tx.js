// api/check-tx.js — Polling de status (GET /api/check-tx?hash={id}&ext={ref})
// Chamado pelo frontend a cada 5s

const { sendToLowtrack } = require('./lowtrack');

const MASTERFY_API_KEY  = 'RCVLPJq4NcyslJZIGiI-b5FXwgHySnLvWiuUF5wPoD8';
const MASTERFY_BASE_URL = 'https://api.masterfypagamentos.com/v1';

// Evita sale.approved duplicado por instância Vercel
const approvedIds = new Set();

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin',  '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'GET')    return res.status(405).json({ error: 'Method not allowed' });

  const { hash: paymentId, ext: externalRef } = req.query;
  if (!paymentId) return res.status(400).json({ error: 'Parâmetro hash obrigatório.' });

  try {
    const masterfyRes = await fetch(`${MASTERFY_BASE_URL}/payment/${paymentId}`, {
      headers: { 'Authorization': `Bearer ${MASTERFY_API_KEY}` },
    });

    const charge = await masterfyRes.json().catch(() => null);

    if (!masterfyRes.ok || !charge?.id) {
      return res.status(502).json({ error: 'Falha ao consultar pagamento.' });
    }

    // Responde imediatamente ao frontend
    res.status(200).json({
      paymentId,
      status:      charge.status,
      amount:      charge.amount,
      externalRef: charge.externalRef || externalRef,
    });

    // Dispara sale.approved se PAID e ainda não enviado
    if (charge.status === 'PAID' && !approvedIds.has(paymentId)) {
      approvedIds.add(paymentId);
      // description contém o productName salvo na criação
      sendToLowtrack('sale.approved', charge, {
        product_id: externalRef || charge.externalRef,
        items: [{
          name:     charge.description || 'NitroCoins',
          quantity: 1,
          price:    (charge.amount || 0) / 100,
        }],
        tracking: {},
      });
    }

  } catch (err) {
    console.error('[check-tx] Error:', err);
    if (!res.headersSent) res.status(500).json({ error: 'Erro interno.' });
  }
};
