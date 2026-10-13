// api/webhook-masterfy.js — Recebe webhook da Masterfy e dispara sale.approved no LowTrack

const { sendToLowtrack } = require('./lowtrack');

const processedIds = new Set();

module.exports = async function handler(req, res) {
  // Responde 200 imediatamente à Masterfy
  res.status(200).json({ received: true });

  if (req.method !== 'POST') return;

  try {
    const charge = req.body;

    if (!charge?.id || !charge?.status) {
      console.warn('[webhook-masterfy] Payload inválido:', charge);
      return;
    }

    const key = `${charge.id}:${charge.status}`;
    if (processedIds.has(key)) {
      console.log(`[webhook-masterfy] Duplicado ignorado: ${key}`);
      return;
    }
    processedIds.add(key);

    console.log(`[webhook-masterfy] ${charge.id} → ${charge.status}`);

    if (charge.status === 'PAID') {
      sendToLowtrack('sale.approved', charge, {
        product_id: charge.externalRef || charge.id,
        items: [{
          name:     charge.description || 'NitroCoins',
          quantity: 1,
          price:    (charge.amount || 0) / 100,
        }],
        tracking: {},
      });
    }

  } catch (err) {
    console.error('[webhook-masterfy] Error:', err?.message || err);
  }
};
