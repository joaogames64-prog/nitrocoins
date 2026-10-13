// api/check-tx.js — Polling de status do pagamento (GET /api/check-tx?hash={id}&ext={ref})
// Chamado pelo frontend a cada 5s após gerar o PIX

const { sendToLowtrack } = require('./lowtrack');

// ⚠️ Credenciais hardcoded
const MASTERFY_API_KEY  = 'RCVLPJq4NcyslJZIGiI-b5FXwgHySnLvWiuUF5wPoD8';
const MASTERFY_BASE_URL = 'https://api.masterfypagamentos.com/v1';

// Set em memória para evitar sale.approved duplicado por instância
// (O webhook é o canal primário; este é o backup)
const approvedIds = new Set();

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin',  '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'GET')    return res.status(405).json({ error: 'Method not allowed' });

  const { hash: paymentId, ext: externalRef } = req.query;

  if (!paymentId) {
    return res.status(400).json({ error: 'Parâmetro hash (paymentId) obrigatório.' });
  }

  try {
    const masterfyRes = await fetch(`${MASTERFY_BASE_URL}/payment/${paymentId}`, {
      headers: { 'Authorization': `Bearer ${MASTERFY_API_KEY}` },
    });

    const charge = await masterfyRes.json().catch(() => null);

    if (!masterfyRes.ok || !charge?.id) {
      return res.status(502).json({ error: 'Falha ao consultar pagamento.' });
    }

    // Se PAID e ainda não disparamos approved nesta instância
    if (charge.status === 'PAID' && !approvedIds.has(paymentId)) {
      approvedIds.add(paymentId);
      sendToLowtrack('sale.approved', charge, {
        product_id: externalRef || charge.externalRef,
        tracking:   {},
      });
    }

    return res.status(200).json({
      paymentId,
      status:      charge.status,
      amount:      charge.amount,
      externalRef: charge.externalRef || externalRef,
    });

  } catch (err) {
    console.error('[check-tx] Error:', err);
    return res.status(500).json({ error: 'Erro interno.' });
  }
};
