// api/lowtrack.js — Módulo compartilhado para envio de eventos ao LowTrack

const LOWTRACK_TOKEN    = 'lt_77780716080c05debb7987b61b30403526f84f3465eff859';
const LOWTRACK_ENDPOINT = 'https://lowtrack.com.br/api/webhook';

/**
 * Envia evento de conversão para o LowTrack.
 * @param {string} event       - 'sale.pending' | 'sale.approved'
 * @param {object} chargeData  - dados da Masterfy (id, amount, description, payer, externalRef)
 * @param {object} extraMeta   - { product_id, items, tracking }
 *   items: [{ name: "50.000 Gemas — Brawl Stars", quantity: 1, price: 43.99 }]
 */
async function sendToLowtrack(event, chargeData, extraMeta = {}) {
  try {
    const amountFloat = (chargeData.amount || 0) / 100;

    // Monta product_name legível com todos os itens e quantidades
    // Ex: "2x 50.000 Gemas — Brawl Stars | 1x 400 Robux — Roblox"
    let productName = chargeData.description || 'NitroCoins';
    if (extraMeta.items && extraMeta.items.length > 0) {
      productName = extraMeta.items
        .map(i => `${i.quantity}x ${i.name}`)
        .join(' | ');
    }

    const body = {
      event,
      transaction_id:  chargeData.id,
      amount:          amountFloat,
      currency:        'BRL',
      payment_method:  'pix',
      product_name:    productName,
      product_id:      extraMeta.product_id || chargeData.externalRef || 'nitrocoins',
      customer: {
        name:    chargeData.payer?.name    || '',
        email:   chargeData.payer?.email   || '',
        phone:   chargeData.payer?.phone   || '',
        country: 'br',
      },
      tracking: extraMeta.tracking || {},
      // Items detalhados (campo extra para visibilidade no painel)
      items: (extraMeta.items || []).map(i => ({
        name:     i.name,
        quantity: i.quantity,
        price:    i.price,
      })),
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
      console.error(`[LowTrack] ${event} failed ${res.status}:`, await res.text().catch(() => ''));
    } else {
      console.log(`[LowTrack] ${event} ok — tx:${chargeData.id} produto:"${productName}"`);
    }
  } catch (err) {
    console.error('[LowTrack] Error:', err?.message || err);
  }
}

module.exports = { sendToLowtrack };
