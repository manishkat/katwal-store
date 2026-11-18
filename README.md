# Katwal Store — Nepali groceries, Darwin

Live store: **https://manishkat.github.io/katwal-store/**
Owner admin: **https://manishkat.github.io/katwal-store/admin.html**

20 Lemke Street, Muirhead NT 0810 · (08) 5550 1234 (placeholder number — change it in admin → Store & delivery)

## Features
- **Products:** 57 authentic Nepali products in 10 categories. Each shows its English and नेपाली name, pack size and unit price.
- **Language:** one tap switches the whole store between English and नेपाली.
- **Fast shopping:** search in English or Nepali, plus filters (on special, in stock) and sorting (price, A–Z, best unit-price value).
- **Easy cart:** a big **+ Add** button turns into a quantity stepper. On phones, a floating "View cart" bar and a bottom navigation bar are always in reach.
- **Meal kits:** add a whole meal in one tap — Dal Bhat, Momo Night, Morning Chiya, Khaja Set.
- **Remembering customers:** "My list" saves favourites, "Buy again" shows past orders, and checkout details are saved on the customer's phone.
- **Delivery or pick up:** choose delivery or click & collect, then pick a 2-hour time slot. Slots come from the store hours in Darwin time.
- **Delivery costs:** a free-delivery progress bar, a minimum order amount and a promo code (`NAMASTE10`).
- **Payment:** pay online with card or PayPal, or pay on delivery or pick up. Pay-later orders are sent to the store by SMS or email.
- **Store page:** map, tap-to-call, directions, opening hours with a live "Open now / Closed" badge, and the delivery suburbs.
- **Installable:** customers can add it to their phone's home screen like an app.

## Owner admin
Create an admin key (the sign-in page shows the steps), then use these tabs:
- **Products:** add, edit, copy or delete products, set special prices, upload photos, and switch an item in or out of stock with one tap.
- **Meal kits:** build bundles from your products.
- **Homepage:** change the banners.
- **Store & delivery:** edit the phone number, address, map location, opening hours, delivery fee, free-delivery amount, delivery suburbs and announcement bar.

Click **Publish changes**, and the live store updates in about 1 minute.

## Payments
`config.js` → `paypalClientId: 'sb'` means TEST mode.

To take real payments:
1. Create a free PayPal Business account.
2. Go to developer.paypal.com → Apps & Credentials → Live, and copy the Client ID.
3. Paste it into `config.js`.

## Photos
Demo photos are from Unsplash (Unsplash License). See the Photo credits page. Replace them with your own photos from the admin page.
