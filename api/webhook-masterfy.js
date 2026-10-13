// api/webhook-masterfy.js — Recebe webhook da Masterfy e dispara sale.approved no LowTrack
// POST /api/webhook-masterfy
// Configurado como notificationUrl na criação do PIX

const { sendToLowtrack } = require('./lowtrack');

// Set para evitar processar o mesmo evento duplicado
const processedIds = new Set();

module.exports = async function handler(req, res) {
  // Responde 200 imediatamente para a Masterfy (evita retentativas desnecessárias)
  res.status(200).json({ received: true });

  if (req.method !== 'POST') return;

  try {
    const charge = req.body;

    // Validação mínima
    if (!charge?.id || !charge?.status) {
      console.warn('[webhook-masterfy] Payload inválido:', charge);
      return;
    }

    const key = `${charge.id}:${charge.status}`;

    // Evita reprocessar o mesmo evento
    if (processedIds.has(key)) {
      console.log(`[webhook-masterfy] Evento duplicado ignorado: ${key}`);
      return;
    }
    processedIds.add(key);

    console.log(`[webhook-masterfy] Recebido: ${charge.id} → ${charge.status}`);

    if (charge.status === 'PAID') {
      await sendToLowtrack('sale.approved', charge, {
        product_id: charge.externalRef || charge.id,
        tracking:   {},
      });
    }

    // Outros status que podem ter utilidade futura:
    // REFUSED / REFUNDED → poderiam disparar outros eventos
    if (charge.status === 'REFUSED') {
      console.warn(`[webhook-masterfy] Pagamento recusado: ${charge.id}`);
    }

  } catch (err) {
    console.error('[webhook-masterfy] Error:', err?.message || err);
  }
};
