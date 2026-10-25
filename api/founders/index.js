// Founder spots counter. Reads how many times the FOUNDER coupon was used in Stripe.
// Needs a READ-ONLY Stripe key saved in Azure app settings as STRIPE_READ_KEY.
const TOTAL = 50;
const COUPON = 'MAMASAID_FOUNDER';
let cache = { at: 0, left: TOTAL };

module.exports = async function (context) {
  const send = (left) => {
    context.res = {
      headers: { 'Content-Type': 'application/json', 'Cache-Control': 'public, max-age=60' },
      body: { left }
    };
  };
  const key = process.env.STRIPE_READ_KEY;
  if (!key) return send(TOTAL);
  if (Date.now() - cache.at < 60000) return send(cache.left);
  try {
    const r = await fetch('https://api.stripe.com/v1/coupons/' + COUPON, {
      headers: { Authorization: 'Bearer ' + key }
    });
    if (!r.ok) return send(cache.left);
    const c = await r.json();
    const max = c.max_redemptions || TOTAL;
    const left = Math.max(0, max - (c.times_redeemed || 0));
    cache = { at: Date.now(), left };
    send(left);
  } catch (e) {
    send(cache.left);
  }
};
