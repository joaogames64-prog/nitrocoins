// api/webhook-masterfy.js — Recebe webhook da Masterfy e dispara sale.approved no LowTrack
// Configurado como notificationUrl na criação do PIX

const { sendToLowtrack } = require('./lowtrack');

// Set para evitar duplicatas
const processedIds = new Set();

module.exports = async function handler(req, res) {
  // Responde 200 imediatamente (evita que a Masterfy reenvie desnecessariamente)
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
      await sendToLowtrack('sale.approved', charge, {
        product_id: charge.externalRef || charge.id,
        tracking:   {},
      });
    }

  } catch (err) {
    console.error('[webhook-masterfy] Error:', err?.message || err);
  }
};
