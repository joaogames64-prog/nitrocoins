// api/check-tx.js — Polling de status do pagamento (chamado pelo frontend a cada 5s)
// GET /api/check-tx?hash={paymentId}&ext={externalRef}
// Quando o status for PAID, dispara sale.approved no LowTrack (evita duplicatas com flag simples)

const { sendToLowtrack } = require('./lowtrack');

const MASTERFY_API_KEY  = process.env.MASTERFY_API_KEY;
const MASTERFY_BASE_URL = 'https://api.masterfypagamentos.com/v1';

// Set em memória para evitar enviar sale.approved duplicado por instância Vercel
// (O webhook garante o envio definitivo; este é o backup)
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
    // Consulta status na Masterfy
    const masterfyRes = await fetch(`${MASTERFY_BASE_URL}/payment/${paymentId}`, {
      headers: {
        'Authorization': `Bearer ${MASTERFY_API_KEY}`,
      },
    });

    const charge = await masterfyRes.json().catch(() => null);

    if (!masterfyRes.ok || !charge?.id) {
      console.error('[check-tx] Masterfy error:', masterfyRes.status, charge);
      return res.status(502).json({ error: 'Falha ao consultar pagamento.' });
    }

    const status = charge.status; // PENDING | PROCESSING | PAID | REFUSED | REFUNDED

    // Se pago e ainda não enviamos approved nesta instância → dispara LowTrack
    if (status === 'PAID' && !approvedIds.has(paymentId)) {
      approvedIds.add(paymentId);
      sendToLowtrack('sale.approved', charge, {
        product_id: externalRef || charge.externalRef,
        tracking:   {},
      });
    }

    return res.status(200).json({
      paymentId,
      status,
      amount:      charge.amount,
      externalRef: charge.externalRef || externalRef,
    });

  } catch (err) {
    console.error('[check-tx] Unexpected error:', err);
    return res.status(500).json({ error: 'Erro interno.' });
  }
};
