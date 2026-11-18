/* KATWAL STORE — technical settings.
   Products, prices, store hours, phone, delivery fees and kits are edited on the owner page: /admin.html */
window.CONFIG = {
  currency: 'AUD',
  /* GitHub repo the owner page saves to */
  github: { owner: 'manishkat', repo: 'katwal-store', branch: 'main' },
  /* PAYMENTS — PayPal Checkout (PayPal + debit/credit cards).
     'sb' = TEST mode (no real money). Replace with your LIVE Client ID from developer.paypal.com */
  paypalClientId: 'sb',
  /* Promo codes: percent off groceries */
  promoCodes: { NAMASTE10: 10 }
};
