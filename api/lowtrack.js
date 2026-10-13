// api/lowtrack.js — Módulo compartilhado para envio de eventos ao LowTrack

// ⚠️ Credenciais hardcoded (sem Vercel env vars no plano free)
const LOWTRACK_TOKEN    = 'lt_77780716080c05debb7987b61b30403526f84f3465eff859';
const LOWTRACK_ENDPOINT = 'https://lowtrack.com.br/api/webhook';

/**
 * Envia um evento de conversão para o LowTrack.
 * @param {string} event       - 'sale.pending' ou 'sale.approved'
 * @param {object} chargeData  - objeto retornado/recebido da Masterfy
 * @param {object} extraMeta   - { product_id, tracking }
 */
async function sendToLowtrack(event, chargeData, extraMeta = {}) {
  try {
    const amountFloat = (chargeData.amount || 0) / 100; // centavos → BRL float

    const body = {
      event,
      transaction_id: chargeData.id,
      amount:         amountFloat,
      currency:       'BRL',
      payment_method: 'pix',
      product_name:   chargeData.description || extraMeta.product_name || 'NitroCoins',
      product_id:     extraMeta.product_id   || chargeData.externalRef  || 'nitrocoins',
      customer: {
        name:    chargeData.payer?.name    || '',
        email:   chargeData.payer?.email   || '',
        phone:   chargeData.payer?.phone   || '',
        country: 'br',
      },
      tracking: extraMeta.tracking || {},
    };

    const res = await fetch(LOWTRACK_ENDPOINT, {
      method:  'POST',
      headers: {
        'Authorization': `Bearer ${LOWTRACK_TOKEN}`,
        'Content-Type':  'application/json',
      },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      const text = await res.text().catch(() => '');
      console.error(`[LowTrack] ${event} failed ${res.status}:`, text);
    } else {
      console.log(`[LowTrack] ${event} sent — tx:${chargeData.id}`);
    }
  } catch (err) {
    console.error('[LowTrack] Error:', err?.message || err);
  }
}

module.exports = { sendToLowtrack };
