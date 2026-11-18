/* Katwal Store — Nepali grocery app. Data lives in data.json (edited from admin.html). */
(function () {
'use strict';
const C = window.CONFIG, CUR = C.currency || 'AUD';
const $ = s => document.querySelector(s), $$ = s => [...document.querySelectorAll(s)];
const app = $('#app');
const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const money = n => '$' + (Math.round(n * 100) / 100).toFixed(2);
const LS = { get(k, d) { try { const v = JSON.parse(localStorage.getItem(k)); return v == null ? d : v; } catch (e) { return d; } }, set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} } };

/* ---------- language ---------- */
let lang = LS.get('ks-lang', 'en');
const NE = { 'Delivery': 'डेलिभरी', 'Pick up': 'पसलबाट लिने', 'Shop': 'किनमेल', 'Help': 'सहायता', 'Hours': 'खुल्ने समय', 'Home': 'गृह', 'Kits': 'किट', 'Cart': 'कार्ट', 'Store': 'पसल', 'View cart': 'कार्ट हेर्नुहोस्', 'Store, hours & map': 'पसल, समय र नक्सा', 'Delivery & returns': 'डेलिभरी र फिर्ता', 'Add': 'थप्नुहोस्', 'Out of stock': 'सकियो', 'Shop by category': 'वर्ग अनुसार', 'This week’s specials': 'यस हप्ताको छुट', 'Meal kits — one tap, whole meal': 'खाना किट — एक क्लिकमा पूरा खाना', 'Popular in Darwin': 'डार्विनमा लोकप्रिय', 'Buy again': 'फेरि किन्नुहोस्', 'See all': 'सबै हेर्नुहोस्', 'Your cart': 'तपाईंको कार्ट', 'Checkout': 'भुक्तानी', 'Open now': 'अहिले खुला', 'Closed': 'बन्द', 'Search results': 'खोज नतिजा', 'All products': 'सबै सामान', 'Specials': 'छुट', 'My list': 'मेरो सूची', 'Add kit to cart': 'किट कार्टमा थप्नुहोस्' };
const T = s => lang === 'ne' && NE[s] ? NE[s] : s;
const applyLang = () => { $('#lang').textContent = lang === 'ne' ? 'English' : 'नेपाली'; document.documentElement.lang = lang === 'ne' ? 'ne' : 'en'; $$('[data-t]').forEach(e => e.textContent = T(e.dataset.t)); };
const nm = p => lang === 'ne' ? `<span class="np">${esc(p.nepali || p.name)}</span>` : esc(p.name);
const sub = p => lang === 'ne' ? esc(p.name) : `<span class="np">${esc(p.nepali || '')}</span>`;

/* ---------- data & state ---------- */
let D = { store: {}, categories: [], banners: [], kits: [], products: [] }, P = [];
const byId = id => P.find(p => p.id === +id);
const priceOf = p => p.salePrice && p.salePrice < p.price ? p.salePrice : p.price;
const onSale = p => p.salePrice && p.salePrice < p.price;
const cat = id => D.categories.find(c => c.id === id) || { name: id, nepali: '', icon: '🛒' };
let cart = LS.get('ks-cart', {}), favs = LS.get('ks-favs', []), orders = LS.get('ks-orders', []);
let mode = LS.get('ks-mode', 'delivery'), promo = LS.get('ks-promo', null);
let lastOrder = null; try { lastOrder = JSON.parse(sessionStorage.getItem('ks-last') || 'null'); } catch (e) {}
const save = () => { Object.keys(cart).forEach(k => { if (!byId(k) || cart[k] < 1) delete cart[k]; }); LS.set('ks-cart', cart); LS.set('ks-favs', favs); updateCart(); };
const items = () => Object.entries(cart).map(([id, q]) => ({ p: byId(id), q })).filter(x => x.p);
const count = () => items().reduce((a, x) => a + x.q, 0);
const subtotal = () => items().reduce((a, x) => a + priceOf(x.p) * x.q, 0);
const savings = () => items().reduce((a, x) => a + (onSale(x.p) ? (x.p.price - x.p.salePrice) * x.q : 0), 0);
const discount = () => promo && C.promoCodes[promo] ? Math.round(subtotal() * C.promoCodes[promo]) / 100 : 0;
const fee = () => mode === 'pickup' ? 0 : (subtotal() - discount() >= D.store.freeDeliveryOver ? 0 : D.store.deliveryFee);
const total = () => subtotal() - discount() + fee();
const unitPrice = p => {
  const pr = priceOf(p), q = +p.qty;
  if (!q) return '';
  if (p.unit === 'kg') return money(pr / q) + ' / kg';
  if (p.unit === 'g') return money(pr / q * 100) + ' / 100 g';
  if (p.unit === 'L') return money(pr / q) + ' / L';
  if (p.unit === 'ml') return money(pr / q * 100) + ' / 100 ml';
  if (q > 1) return money(pr / q) + ' each';
  return '';
};
const sizeTxt = p => `${p.qty} ${p.unit === 'pcs' ? 'pieces' : p.unit}`;

/* ---------- Darwin time & opening hours ---------- */
const darwinNow = () => { const s = new Date().toLocaleString('en-US', { timeZone: 'Australia/Darwin' }); return new Date(s); };
const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const hoursFor = d => (D.store.hours || []).find(h => h[0] === DAYS[d.getDay()]);
const toMin = t => { const [h, m] = t.split(':').map(Number); return h * 60 + m; };
const fmtT = t => { let [h, m] = t.split(':').map(Number); const ap = h >= 12 ? 'pm' : 'am'; h = h % 12 || 12; return h + (m ? ':' + String(m).padStart(2, '0') : '') + ' ' + ap; };
function openState() {
  const n = darwinNow(), h = hoursFor(n), mins = n.getHours() * 60 + n.getMinutes();
  if (h && mins >= toMin(h[1]) && mins < toMin(h[2])) return { open: true, txt: `${T('Open now')} · closes ${fmtT(h[2])}` };
  const t = new Date(n); for (let i = 0; i < 7; i++) { const hh = hoursFor(t); if (hh && (i > 0 || mins < toMin(hh[1]))) return { open: false, txt: `${T('Closed')} · opens ${i === 0 ? '' : i === 1 ? 'tomorrow ' : DAYS[t.getDay()] + ' '}${fmtT(hh[1])}` }; t.setDate(t.getDate() + 1); }
  return { open: false, txt: T('Closed') };
}
function slots() {
  const n = darwinNow(), out = [];
  for (let d = 0; d < 3; d++) {
    const day = new Date(n); day.setDate(n.getDate() + d); const h = hoursFor(day); if (!h) continue;
    const label = d === 0 ? 'Today' : d === 1 ? 'Tomorrow' : DAYS[day.getDay()];
    const start = toMin(h[1]) + (mode === 'pickup' ? 0 : 60), end = toMin(h[2]);
    for (let m = start; m + 120 <= end + 1; m += 120) {
      const lead = mode === 'pickup' ? 60 : 120, nowM = n.getHours() * 60 + n.getMinutes();
      if (d === 0 && m < nowM + lead) continue;
      if (d === 0 && mode === 'delivery' && nowM > 14 * 60) continue;
      const f = x => fmtT(String(Math.floor(x / 60)).padStart(2, '0') + ':' + String(x % 60).padStart(2, '0'));
      out.push(`${label} ${f(m)}–${f(Math.min(m + 120, end))}`);
    }
  }
  return out.slice(0, 12);
}

/* ---------- small UI ---------- */
const toast = t => { const e = $('#toast'); e.innerHTML = t; e.classList.add('show'); clearTimeout(e._t); e._t = setTimeout(() => e.classList.remove('show'), 2200); };
const KS = window.KS = {
  go: h => { location.hash = h; },
  modal: html => { $('#mbody').innerHTML = html; $('#modal').classList.add('open'); },
  closeModal: () => $('#modal').classList.remove('open')
};
$('#modal').onclick = e => { if (e.target.id === 'modal') KS.closeModal(); };
function updateCart() {
  const n = count(), t = money(subtotal());
  $('#cnum').textContent = n; $('#ctot').textContent = t; $('#bnum').textContent = n || '';
  $('#fcn').textContent = n + (n === 1 ? ' item' : ' items'); $('#fct').textContent = t;
  const h = location.hash || '#home';
  $('#floatcart').hidden = !n || ['#cart', '#checkout', '#order-confirmed'].includes(h);
  $$('[data-ctl]').forEach(el => el.outerHTML = ctl(byId(el.dataset.ctl), el.classList.contains('lg')));
}
const ctl = (p, lg) => {
  if (!p) return '';
  if (!p.inStock) return `<div data-ctl="${p.id}" class="${lg ? 'lg' : ''}"><button class="addbtn" disabled>${T('Out of stock')}</button></div>`;
  const q = cart[p.id] || 0;
  return q ? `<div data-ctl="${p.id}" class="stepper ${lg ? 'lg' : ''}"><button data-dec="${p.id}" aria-label="Remove one">−</button><span>${q} in cart</span><button data-inc="${p.id}" aria-label="Add one">+</button></div>`
           : `<div data-ctl="${p.id}" class="${lg ? 'lg' : ''}"><button class="addbtn" data-inc="${p.id}" ${lg ? 'style="height:52px;font-size:16px"' : ''}>+ ${T('Add')}</button></div>`;
};
const card = p => `<article class="pc"><a class="im" href="#product-${p.id}"><img src="${esc(p.images[0])}" alt="${esc(p.name)}" loading="lazy">
  <div class="badges">${onSale(p) ? `<span class="bdg sale">Save ${money(p.price - p.salePrice)}</span>` : ''}${!p.inStock ? '<span class="bdg out">Out of stock</span>' : ''}${(p.tags || []).includes('Fresh') ? '<span class="bdg fresh">Fresh</span>' : (p.tags || [])[0] && !onSale(p) ? `<span class="bdg">${esc(p.tags[0])}</span>` : ''}</div></a>
  <button class="fav" data-fav="${p.id}" aria-label="Save to my list">${favs.includes(p.id) ? '❤️' : '🤍'}</button>
  <div class="bd"><div class="pr"><span class="now ${onSale(p) ? 's' : ''}">${money(priceOf(p))}</span>${onSale(p) ? `<span class="was">${money(p.price)}</span>` : ''}</div>
  <a href="#product-${p.id}" class="nm">${nm(p)}</a><div class="npn">${sub(p)}</div><div class="sz">${esc(sizeTxt(p))}${unitPrice(p) ? ' · ' + unitPrice(p) : ''}</div>
  <div class="add">${ctl(p)}</div></div></article>`;
const kitPrice = k => k.items.reduce((a, [id, q]) => { const p = byId(id); return a + (p ? priceOf(p) * q : 0); }, 0);
const kitCard = k => { const ok = k.items.every(([id]) => byId(id) && byId(id).inStock); return `<article class="kit"><div class="im"><img src="${esc(k.image)}" alt="${esc(k.name)}" loading="lazy"><span class="save">${k.items.length} items</span></div>
  <div class="bd"><h3>${esc(k.name)}<small>${esc(k.nepali || '')}</small></h3><p>${esc(k.description)}</p>
  <ul>${k.items.map(([id, q]) => { const p = byId(id); return p ? `<li>${q > 1 ? q + '× ' : ''}${esc(lang === 'ne' ? p.nepali : p.name)}</li>` : ''; }).join('')}</ul>
  <div class="ft"><b>${money(kitPrice(k))}</b><button class="btn" data-kit="${esc(k.id)}" ${ok ? '' : 'disabled'}>${ok ? T('Add kit to cart') : 'Some items out of stock'}</button></div></div></article>`; };
const sh = (title, link, linkTxt, np) => `<div class="sh"><h2>${title}${np ? `<small>${np}</small>` : ''}</h2>${link ? `<a href="${link}">${linkTxt || T('See all')} →</a>` : ''}</div>`;

/* ---------- pages ---------- */
const V = {};
V.home = () => {
  const B = D.banners || [], specials = P.filter(onSale), pop = P.filter(p => (p.tags || []).includes('Popular'));
  const again = [...new Set(orders.flatMap(o => o.items.map(i => i.id)))].map(byId).filter(Boolean).slice(0, 12);
  const s = D.store;
  return `<div class="wrap">
  <section class="hero">${B.map((b, i) => `<div class="hslide ${i ? '' : 'on'}"><img src="${esc(b.image)}" alt="" ${i ? 'loading="lazy"' : ''}><div class="htxt"><h1>${esc(b.title)}</h1><p>${esc(b.subtitle)}</p><a class="btn" href="${esc(b.link)}">${esc(b.button || 'Shop now')}</a></div></div>`).join('')}
   <div class="hdots">${B.map((b, i) => `<button class="${i ? '' : 'on'}" data-slide="${i}" aria-label="Slide ${i + 1}"></button>`).join('')}</div></section>
  <div class="trust"><div><span>🚚</span><span><b>Same-day delivery</b><small>Order before 2 pm · free over $${s.freeDeliveryOver}</small></span></div><div><span>🛍️</span><span><b>Click &amp; collect</b><small>Ready in 1 hour · Muirhead</small></span></div><div><span>🇳🇵</span><span><b>Authentic Nepali</b><small>Timur, jimbu, gundruk &amp; more</small></span></div><div><span>📞</span><span><b>Call or text us</b><small><a href="tel:${esc(s.phoneIntl)}">${esc(s.phone)}</a></small></span></div></div>
  ${again.length ? `<section class="sec">${sh(T('Buy again'), '#favourites', T('My list'))}<div class="rail">${again.map(card).join('')}</div></section>` : ''}
  <section class="sec">${sh(T('Shop by category'), '#shop', T('All products'), lang === 'en' ? 'वर्ग अनुसार किनमेल' : '')}<div class="cats">${D.categories.map(c => `<a class="ct" href="#cat-${c.id}"><span class="em">${c.icon}</span><b>${esc(lang === 'ne' ? c.nepali : c.name)}</b><small class="np">${esc(lang === 'ne' ? c.name : c.nepali)}</small></a>`).join('')}</div></section>
  ${specials.length ? `<section class="sec">${sh('🔥 ' + T('This week’s specials'), '#specials', '', lang === 'en' ? 'यस हप्ताको छुट' : '')}<div class="rail">${specials.map(card).join('')}</div></section>` : ''}
  <section class="sec">${sh('🍱 ' + T('Meal kits — one tap, whole meal'), '#kits', '', lang === 'en' ? 'एक क्लिकमा पूरा खाना' : '')}<div class="kits">${D.kits.slice(0, 3).map(kitCard).join('')}</div></section>
  <section class="sec">${sh('⭐ ' + T('Popular in Darwin'), '#shop', T('All products'))}<div class="grid">${pop.slice(0, 10).map(card).join('')}</div></section></div>`;
};
const listPage = (title, np, list, opts = {}) => `<div class="wrap"><div class="ph"><h1>${title}${np ? `<small>${np}</small>` : ''}</h1>
  <div class="tools"><label class="chk"><input type="checkbox" id="fsale"> On special</label><label class="chk"><input type="checkbox" id="fstock"> In stock</label>
  <select class="sel" id="fsort" aria-label="Sort"><option value="pop">Sort: Popular</option><option value="low">Price: low to high</option><option value="high">Price: high to low</option><option value="az">Name A–Z</option><option value="unit">Best value (unit price)</option></select></div></div>
  <div class="grid" id="grid"></div><p class="note" id="rc" style="margin:18px 0 30px;text-align:center"></p></div>`;
V.kits = () => `<div class="wrap"><div class="ph"><h1>${T('Meal kits — one tap, whole meal')}<small>Everything you need for a Nepali meal, added to your cart in one tap. You can remove anything you already have.</small></h1></div><div class="kits" style="margin-bottom:40px">${D.kits.map(kitCard).join('')}</div></div>`;
V.product = id => {
  const p = byId(id); if (!p) return `<div class="wrap empty"><span class="big">🤔</span><p>Sorry, this product isn’t available.</p><a class="btn" href="#shop">Keep shopping</a></div>`;
  const c = cat(p.category), rel = P.filter(x => x.category === p.category && x.id !== p.id).slice(0, 10), s = D.store;
  return `<div class="wrap"><div class="pd"><div class="img"><img src="${esc(p.images[0].replace(/w=\d+/, 'w=1000'))}" alt="${esc(p.name)}"><div class="badges">${onSale(p) ? `<span class="bdg sale">Save ${money(p.price - p.salePrice)}</span>` : ''}</div></div>
  <div class="inf"><div class="crumb"><a href="#home">Home</a> › <a href="#cat-${c.id}">${esc(c.name)}</a></div>
   <h1>${esc(p.name)}</h1><div class="npn">${esc(p.nepali || '')}</div>
   <div class="prc"><b class="${onSale(p) ? 's' : ''}">${money(priceOf(p))}</b>${onSale(p) ? `<span class="was" style="text-decoration:line-through;color:var(--mute)">${money(p.price)}</span>` : ''}</div>
   <div class="unitp">${esc(sizeTxt(p))}${unitPrice(p) ? ' · ' + unitPrice(p) : ''} · Price includes GST where applicable</div>
   ${ctl(p, true)}
   <button class="btn ghost" data-fav="${p.id}">${favs.includes(p.id) ? '❤️ In my list' : '🤍 Save to my list'}</button>
   <p class="desc">${esc(p.description)}</p>
   ${(p.tags || []).length ? `<div class="tags">${p.tags.map(t => `<span class="bdg">${esc(t)}</span>`).join('')}</div>` : ''}
   <div class="infobox"><div>🚚 <span><b>Delivery today</b> if you order before 2 pm (Darwin suburbs). Free over $${s.freeDeliveryOver}.</span></div><div>🛍️ <span><b>Click &amp; collect</b> from ${esc(s.address)} — ready in 1 hour.</span></div><div>📞 <span>Questions? <a href="tel:${esc(s.phoneIntl)}" style="color:var(--red);font-weight:700">${esc(s.phone)}</a></span></div></div>
   ${p.credit ? `<div class="credit">Photo: ${esc(p.credit)}</div>` : ''}
  </div></div>
  ${rel.length ? `<section class="sec">${sh('You might also need', '#cat-' + c.id)}<div class="rail">${rel.map(card).join('')}</div></section>` : ''}</div>`;
};
V.cart = () => {
  const it = items();
  if (!it.length) return `<div class="wrap empty"><span class="big">🛒</span><h2>Your cart is empty</h2><p>Add your favourite Nepali groceries, or start with a meal kit.</p><div style="display:flex;gap:10px;flex-wrap:wrap;justify-content:center"><a class="btn" href="#shop">Start shopping</a><a class="btn ghost" href="#kits">Browse meal kits</a></div></div>`;
  const s = D.store, st = subtotal(), left = Math.max(0, s.freeDeliveryOver - (st - discount()));
  return `<div class="wrap"><div class="ph"><h1>${T('Your cart')}<small>${count()} items</small></h1><button class="btn ghost" id="clearcart" style="min-height:40px;padding:8px 14px">Empty cart</button></div>
  <div class="cartgrid"><div class="card">${it.map(({ p, q }) => `<div class="ci"><a href="#product-${p.id}"><img src="${esc(p.images[0].replace(/w=\d+/, 'w=200'))}" alt=""></a><div><div class="nm">${esc(p.name)}<small>${esc(p.nepali || '')}</small></div><div class="note">${esc(sizeTxt(p))} · ${money(priceOf(p))} each${!p.inStock ? ' · <b style="color:#C0392B">now out of stock</b>' : ''}</div></div>
   <div class="r"><b>${money(priceOf(p) * q)}</b>${ctl(p)}</div></div>`).join('')}</div>
  <div class="card sumcard"><h2 style="font-size:18px">Order summary</h2>
   ${mode === 'delivery' ? `<div class="note">${left ? `Add <b>${money(left)}</b> more for <b>free delivery</b>` : '🎉 You’ve unlocked <b>free delivery</b>'}</div><div class="prog"><i style="width:${Math.min(100, (st - discount()) / s.freeDeliveryOver * 100)}%"></i></div>` : ''}
   <div class="line"><span>Groceries</span><span>${money(st)}</span></div>${savings() ? `<div class="line"><span>You saved</span><span class="g">${money(savings())}</span></div>` : ''}
   ${discount() ? `<div class="line"><span>Promo ${esc(promo)}</span><span class="g">−${money(discount())}</span></div>` : ''}
   <div class="line"><span>${mode === 'pickup' ? 'Click & collect' : 'Delivery'}</span><span>${fee() ? money(fee()) : '<span class="g">Free</span>'}</span></div>
   <div class="line tot"><span>Total</span><span>${money(total())}</span></div>
   ${mode === 'delivery' && st < s.minOrder ? `<div class="err">Minimum order for delivery is ${money(s.minOrder)}. Add ${money(s.minOrder - st)} more, or switch to pick up.</div>` : ''}
   <a class="btn block ${mode === 'delivery' && st < s.minOrder ? '' : 'green'}" href="#checkout" ${mode === 'delivery' && st < s.minOrder ? 'style="pointer-events:none;opacity:.45"' : ''}>${T('Checkout')} →</a>
   <a class="btn ghost block" href="#shop">Keep shopping</a></div></div></div>`;
};
V.checkout = () => {
  if (!items().length) return V.cart();
  const s = D.store, sl = slots(), f = (l, n, a = '', full) => `<label class="fl ${full ? 'full' : ''}">${l}<input class="in" name="${n}" ${a}></label>`;
  const saved = LS.get('ks-details', {});
  const v = n => saved[n] ? `value="${esc(saved[n])}"` : '';
  return `<div class="wrap"><div class="ph"><h1>${T('Checkout')}<small>${mode === 'pickup' ? 'Click & collect from ' + esc(s.address) : 'Delivery to your door'}</small></h1></div>
  <div class="cartgrid"><form class="card form" id="cform" novalidate>
   <h2><i>1</i> How would you like it?</h2>
   <div class="opts"><label class="opt"><input type="radio" name="mode" value="delivery" ${mode === 'delivery' ? 'checked' : ''}><span class="g"><b>🚚 Home delivery</b><small>Darwin suburbs · ${money(s.deliveryFee)}, free over $${s.freeDeliveryOver}</small></span></label>
   <label class="opt"><input type="radio" name="mode" value="pickup" ${mode === 'pickup' ? 'checked' : ''}><span class="g"><b>🛍️ Click &amp; collect — free</b><small>${esc(s.address)}</small></span></label></div>
   <h2><i>2</i> Your details</h2>
   <div class="fg">${f('Full name', 'name', 'required autocomplete="name" ' + v('name'))}${f('Mobile', 'phone', 'type="tel" required autocomplete="tel" placeholder="04xx xxx xxx" ' + v('phone'))}${f('Email', 'email', 'type="email" required autocomplete="email" ' + v('email'), 1)}</div>
   ${mode === 'delivery' ? `<h2><i>3</i> Delivery address</h2><div class="fg">${f('Street address', 'address1', 'required autocomplete="address-line1" ' + v('address1'), 1)}
    <label class="fl">Suburb<select class="in" name="suburb" required><option value="">Choose suburb…</option>${s.deliveryAreas.map(a => `<option ${saved.suburb === a ? 'selected' : ''}>${esc(a)}</option>`).join('')}</select></label>${f('Postcode', 'postcode', 'required inputmode="numeric" pattern="08[0-9]{2}" maxlength="4" placeholder="08xx" ' + v('postcode'))}
    ${f('Delivery note (optional)', 'note', 'placeholder="e.g. leave at front door, gate code" ' + v('note'), 1)}</div><p class="note">Not on the list? Call us on ${esc(s.phone)} — we may still deliver.</p>` : ''}
   <h2><i>${mode === 'delivery' ? 4 : 3}</i> Choose a time</h2>
   ${sl.length ? `<div class="slots" id="slots">${sl.map((t, i) => `<button type="button" class="slot ${i ? '' : 'on'}" data-slot="${esc(t)}">${esc(t)}</button>`).join('')}</div>` : '<p class="err">No time slots available right now — please call us.</p>'}
   <h2><i>${mode === 'delivery' ? 5 : 4}</i> Payment</h2>
   <div class="opts"><label class="opt"><input type="radio" name="pay" value="online" checked><span class="g"><b>💳 Pay now online</b><small>Card or PayPal — secure checkout by PayPal</small></span></label>
   <label class="opt"><input type="radio" name="pay" value="later"><span class="g"><b>💵 Pay on ${mode === 'pickup' ? 'pick up' : 'delivery'}</b><small>Cash or card when you get your groceries</small></span></label></div>
   <div class="err" id="cerr" role="alert"></div>
   <div id="paynow" class="paybox"><div id="paypal-buttons"></div><p class="note" id="paystatus">Loading secure payment…</p></div>
   <button type="button" class="btn green block" id="placelater" hidden>Place order — pay on ${mode === 'pickup' ? 'pick up' : 'delivery'}</button>
   <p class="note">By placing your order you agree to our <a href="#help" style="text-decoration:underline">store policies</a>.</p>
  </form><aside class="card sumcard" id="csum"></aside></div></div>`;
};
V['order-confirmed'] = () => {
  if (!lastOrder) return V.home();
  const o = lastOrder, s = D.store;
  const msg = encodeURIComponent(`New Katwal Store order ${o.id}\n${o.name} · ${o.phone}\n${o.mode === 'pickup' ? 'CLICK & COLLECT' : 'DELIVERY to ' + o.address}\nTime: ${o.slot}\nPayment: ${o.paid ? 'PAID online (PayPal ' + o.payId + ')' : 'PAY ON ' + (o.mode === 'pickup' ? 'PICKUP' : 'DELIVERY')}\n\n${o.items.map(i => `${i.qty} x ${i.name} — ${money(i.total)}`).join('\n')}\n\nTOTAL ${money(o.total)}`);
  return `<div class="wrap"><div class="confirm"><span class="big">🙏</span><h1 style="font-size:30px;font-weight:800">Dhanyabad, ${esc(o.name.split(' ')[0])}!</h1>
  <p>Order <b>${esc(o.id)}</b> — ${o.paid ? '<b style="color:var(--green)">paid online</b>' : `pay on ${o.mode === 'pickup' ? 'pick up' : 'delivery'}`}.</p>
  ${!o.paid ? `<div class="card" style="width:100%;border-color:var(--red);background:#FFF5F6"><b>Last step — send your order to the store</b><p class="note" style="margin:6px 0 12px">Tap one button so Katwal Store receives your order.</p><div class="cta"><a class="btn" href="sms:${esc(s.phoneIntl)}?&body=${msg}">💬 Send by SMS</a><a class="btn ghost" href="mailto:${esc(s.email)}?subject=${encodeURIComponent('Order ' + o.id)}&body=${msg}">✉️ Send by email</a></div></div>` : ''}
  <div class="card" style="width:100%;text-align:left">${o.items.map(i => `<div class="line"><span>${i.qty} × ${esc(i.name)}</span><span>${money(i.total)}</span></div>`).join('')}
   ${o.discount ? `<div class="line"><span>Promo</span><span class="g">−${money(o.discount)}</span></div>` : ''}<div class="line"><span>${o.mode === 'pickup' ? 'Click & collect' : 'Delivery'}</span><span>${o.fee ? money(o.fee) : 'Free'}</span></div><div class="line tot"><span>Total</span><span>${money(o.total)}</span></div>
   <p class="note" style="margin-top:10px">${o.mode === 'pickup' ? '🛍️ Pick up at ' + esc(s.address) : '🚚 Delivering to ' + esc(o.address)}<br>🕑 ${esc(o.slot)}</p></div>
  <p class="note">Questions? Call <a href="tel:${esc(s.phoneIntl)}" style="color:var(--red);font-weight:700">${esc(s.phone)}</a></p>
  <a class="btn" href="#home">Back to shopping</a></div></div>`;
};
V.store = () => {
  const s = D.store, st = openState(), today = DAYS[darwinNow().getDay()];
  const bb = [s.lng - 0.012, s.lat - 0.008, s.lng + 0.012, s.lat + 0.008].join(',');
  const q = encodeURIComponent(s.address);
  return `<div class="wrap"><div class="ph"><h1>Visit Katwal Store<small>हाम्रो पसलमा स्वागत छ</small></h1><span class="status ${st.open ? '' : 'closed'}" style="display:flex"><i></i>${esc(st.txt)}</span></div>
  <div class="storegrid"><div class="map"><iframe title="Map showing Katwal Store" loading="lazy" src="https://www.openstreetmap.org/export/embed.html?bbox=${bb}&layer=mapnik&marker=${s.lat},${s.lng}"></iframe></div>
  <div class="card" style="display:flex;flex-direction:column;gap:14px"><div><b style="font-size:18px">📍 ${esc(s.address)}</b><p class="note">Free customer parking out front.</p></div>
   <div class="cta"><a class="btn" href="tel:${esc(s.phoneIntl)}">📞 Call ${esc(s.phone)}</a><a class="btn ghost" href="https://www.google.com/maps/dir/?api=1&destination=${q}" target="_blank" rel="noopener">🧭 Directions</a></div>
   <div class="cta"><a class="btn ghost" href="sms:${esc(s.phoneIntl)}">💬 Text us</a><a class="btn ghost" href="mailto:${esc(s.email)}">✉️ Email</a></div>
   <table class="hours">${(s.hours || []).map(h => `<tr class="${h[0] === today ? 'today' : ''}"><td>${h[0] === today ? 'Today' : h[0]}</td><td>${fmtT(h[1])} – ${fmtT(h[2])}</td></tr>`).join('')}</table>
   <div><b>We deliver to</b><div class="areas" style="margin-top:8px">${s.deliveryAreas.map(a => `<span>${esc(a)}</span>`).join('')}</div></div></div></div></div>`;
};
const textPage = (t, body) => `<div class="wrap"><div class="ph"><h1>${t}</h1></div><div class="text">${body}</div></div>`;
V.help = () => { const s = D.store; return textPage('Delivery, pick up &amp; help', `<h2>Delivery</h2><ul><li>Same-day delivery when you order before 2 pm. Later orders arrive the next day.</li><li>Delivery fee ${money(s.deliveryFee)} — <b>free over $${s.freeDeliveryOver}</b>. Minimum order ${money(s.minOrder)}.</li><li>We deliver across Darwin’s northern suburbs and city — see the <a href="#store" style="text-decoration:underline">store page</a> for areas.</li></ul>
 <h2>Click &amp; collect</h2><p>Free. Your order is packed and ready within 1 hour during opening hours at ${esc(s.address)}.</p>
 <h2>Payment</h2><p>Pay online by card or PayPal, or pay by cash or card when you collect or receive your order.</p>
 <h2>Freshness promise</h2><p>Not happy with a fresh or frozen item? Tell us within 24 hours and we’ll replace or refund it. This doesn’t affect your rights under the Australian Consumer Law.</p>
 <h2>Can’t find something?</h2><p>We can order in most Nepali products. Call <a href="tel:${esc(s.phoneIntl)}" style="color:var(--red);font-weight:700">${esc(s.phone)}</a> or email ${esc(s.email)}.</p>
 <h2>Promo code</h2><p>Use <b>NAMASTE10</b> for 10% off your first order.</p>`); };
V.privacy = () => textPage('Privacy', `<p>We collect only what we need to fill your order: your name, phone, email and delivery address. Online payments are handled by PayPal — we never see your card details. Your cart, list and saved details are stored only on your own device. We never sell your information. Contact ${esc(D.store.email)} with any privacy questions.</p>`);
V.credits = () => textPage('Photo credits', `<p>Photos from <a href="https://unsplash.com" style="text-decoration:underline">Unsplash</a>, used under the Unsplash License. Thank you to the photographers:</p><ul>${[...new Set(P.map(p => p.credit).filter(Boolean))].map(c => `<li>${esc(c)}</li>`).join('')}</ul>`);

/* ---------- listing behaviour ---------- */
function bindList(base) {
  const pop = p => ((p.tags || []).includes('Popular') ? 2 : 0) + (onSale(p) ? 1 : 0);
  const uv = p => { const pr = priceOf(p), q = +p.qty || 1; return p.unit === 'kg' || p.unit === 'L' ? pr / (q * 1000) : p.unit === 'g' || p.unit === 'ml' ? pr / q : pr / q * 1000; };
  const draw = () => {
    let l = base.filter(p => (!$('#fsale').checked || onSale(p)) && (!$('#fstock').checked || p.inStock));
    const s = $('#fsort').value;
    l = [...l].sort(s === 'low' ? (a, b) => priceOf(a) - priceOf(b) : s === 'high' ? (a, b) => priceOf(b) - priceOf(a) : s === 'az' ? (a, b) => a.name.localeCompare(b.name) : s === 'unit' ? (a, b) => uv(a) - uv(b) : (a, b) => pop(b) - pop(a));
    $('#grid').innerHTML = l.length ? l.map(card).join('') : `<div class="empty" style="grid-column:1/-1"><span class="big">🔍</span><p>Nothing found. Try another word, or call us — we can order it in.</p></div>`;
    $('#rc').textContent = l.length + ' products';
  };
  ['#fsale', '#fstock', '#fsort'].forEach(s => $(s).onchange = draw); draw();
}
const norm = s => String(s || '').toLowerCase().normalize('NFKD').replace(/[̀-ͯ]/g, '');
function searchList(q) {
  const w = norm(q).split(/\s+/).filter(Boolean);
  return P.filter(p => { const h = norm([p.name, p.nepali, p.description, cat(p.category).name, cat(p.category).nepali, (p.tags || []).join(' ')].join(' ')); return w.every(x => h.includes(x) || h.includes(x.replace(/s$/, ''))); });
}

/* ---------- checkout ---------- */
function drawSum() {
  const s = D.store;
  $('#csum').innerHTML = `<h2 style="font-size:18px">Your order</h2>${items().map(({ p, q }) => `<div class="line"><span>${q} × ${esc(p.name)}</span><span>${money(priceOf(p) * q)}</span></div>`).join('')}
   <form id="pf" style="display:flex;gap:8px;margin:8px 0"><input class="in" id="pc" placeholder="Promo code" value="${esc(promo || '')}" aria-label="Promo code"><button class="btn ghost" style="min-height:44px;padding:8px 14px">${promo ? 'Remove' : 'Apply'}</button></form><div class="err" id="perr"></div>
   <div class="line"><span>Groceries</span><span>${money(subtotal())}</span></div>${discount() ? `<div class="line"><span>Promo ${esc(promo)}</span><span class="g">−${money(discount())}</span></div>` : ''}
   <div class="line"><span>${mode === 'pickup' ? 'Click & collect' : 'Delivery'}</span><span>${fee() ? money(fee()) : '<span class="g">Free</span>'}</span></div><div class="line tot"><span>Total</span><span>${money(total())} ${CUR}</span></div>
   ${mode === 'delivery' && subtotal() < s.minOrder ? `<div class="err">Minimum delivery order is ${money(s.minOrder)}.</div>` : ''}`;
  $('#pf').onsubmit = e => { e.preventDefault(); if (promo) promo = null; else { const c = $('#pc').value.trim().toUpperCase(); if (!C.promoCodes[c]) { $('#perr').textContent = 'That code isn’t valid.'; return; } promo = c; } LS.set('ks-promo', promo); drawSum(); updateCart(); };
}
const fd = () => { const d = {}; new FormData($('#cform')).forEach((v, k) => d[k] = String(v).trim()); return d; };
function validate() {
  const f = $('#cform'); $$('#cform .in').forEach(i => i.classList.add('t'));
  if (mode === 'delivery' && subtotal() < D.store.minOrder) { $('#cerr').textContent = `Minimum delivery order is ${money(D.store.minOrder)}.`; return false; }
  if (!f.checkValidity()) { $('#cerr').textContent = 'Please fill in your details' + (mode === 'delivery' ? ' and delivery address.' : '.'); const b = f.querySelector(':invalid'); if (b) b.focus(); return false; }
  if (!$('.slot.on')) { $('#cerr').textContent = 'Please choose a time.'; return false; }
  $('#cerr').textContent = ''; const d = fd(); LS.set('ks-details', { name: d.name, phone: d.phone, email: d.email, address1: d.address1, suburb: d.suburb, postcode: d.postcode, note: d.note }); return true;
}
function finish(paid, payId) {
  const d = fd(), it = items();
  const o = { id: 'KS' + Date.now().toString().slice(-6), name: d.name, phone: d.phone, email: d.email, mode, slot: ($('.slot.on') || {}).dataset ? $('.slot.on').dataset.slot : '', paid, payId: payId || '',
    address: mode === 'delivery' ? [d.address1, d.suburb, 'NT', d.postcode].filter(Boolean).join(', ') + (d.note ? ' (' + d.note + ')' : '') : '',
    items: it.map(({ p, q }) => ({ id: p.id, name: p.name, qty: q, total: priceOf(p) * q })), discount: discount(), fee: fee(), total: total(), date: new Date().toISOString() };
  lastOrder = o; try { sessionStorage.setItem('ks-last', JSON.stringify(o)); } catch (e) {}
  orders = [o, ...orders].slice(0, 20); LS.set('ks-orders', orders);
  cart = {}; promo = null; LS.set('ks-promo', null); save(); location.hash = '#order-confirmed';
}
let sdk = null;
const loadPP = () => window.paypal ? Promise.resolve() : (sdk = sdk || new Promise((res, rej) => { const s = document.createElement('script'); s.src = `https://www.paypal.com/sdk/js?client-id=${encodeURIComponent(C.paypalClientId)}&currency=${CUR}&intent=capture&components=buttons`; s.onload = res; s.onerror = () => { sdk = null; rej(); }; document.head.appendChild(s); }));
function bindCheckout() {
  drawSum();
  $$('#cform input[name=mode]').forEach(r => r.onchange = () => { mode = r.value; LS.set('ks-mode', mode); setMode(); route(); });
  const sl = $('#slots'); if (sl) sl.onclick = e => { const b = e.target.closest('.slot'); if (!b) return; $$('.slot').forEach(x => x.classList.toggle('on', x === b)); };
  const payToggle = () => { const later = $('#cform input[name=pay]:checked').value === 'later'; $('#paynow').hidden = later; $('#placelater').hidden = !later; };
  $$('#cform input[name=pay]').forEach(r => r.onchange = payToggle); payToggle();
  $('#placelater').onclick = () => { if (validate()) finish(false); };
  const st = $('#paystatus');
  if (!C.paypalClientId) { st.textContent = 'Online payment isn’t set up yet — choose pay on ' + (mode === 'pickup' ? 'pick up.' : 'delivery.'); return; }
  loadPP().then(() => {
    if (location.hash !== '#checkout') return; st.textContent = '';
    window.paypal.Buttons({
      style: { layout: 'vertical', color: 'gold', shape: 'pill', label: 'pay', height: 48 },
      onClick: (d, a) => validate() ? a.resolve() : a.reject(),
      createOrder: (d, a) => { const f = fd(), sb = subtotal(), dc = discount(), fe = fee();
        return a.order.create({ intent: 'CAPTURE', purchase_units: [{ description: 'Katwal Store order — ' + (mode === 'pickup' ? 'Click & collect' : 'Delivery') + ' — ' + ($('.slot.on') ? $('.slot.on').dataset.slot : ''),
          amount: { currency_code: CUR, value: (sb - dc + fe).toFixed(2), breakdown: { item_total: { currency_code: CUR, value: sb.toFixed(2) }, shipping: { currency_code: CUR, value: fe.toFixed(2) }, discount: { currency_code: CUR, value: dc.toFixed(2) } } },
          items: items().map(({ p, q }) => ({ name: (p.name + ' ' + sizeTxt(p)).slice(0, 127), sku: 'KS-' + p.id, quantity: String(q), unit_amount: { currency_code: CUR, value: priceOf(p).toFixed(2) }, category: 'PHYSICAL_GOODS' })),
          ...(mode === 'delivery' ? { shipping: { name: { full_name: f.name.slice(0, 300) }, address: { address_line_1: f.address1, admin_area_2: f.suburb, admin_area_1: 'NT', postal_code: f.postcode, country_code: 'AU' } } } : {}) }],
          application_context: { brand_name: 'Katwal Store', shipping_preference: mode === 'delivery' ? 'SET_PROVIDED_ADDRESS' : 'NO_SHIPPING', user_action: 'PAY_NOW' } }); },
      onApprove: (d, a) => a.order.capture().then(det => finish(true, det.id)),
      onCancel: () => { $('#cerr').textContent = 'Payment cancelled — your cart is still saved.'; },
      onError: () => { $('#cerr').textContent = 'Payment didn’t go through. Try again, or choose pay on ' + (mode === 'pickup' ? 'pick up.' : 'delivery.'); }
    }).render('#paypal-buttons').catch(() => { st.textContent = 'Secure payment couldn’t load. Refresh, or choose pay on ' + (mode === 'pickup' ? 'pick up.' : 'delivery.'); });
  }).catch(() => { st.textContent = 'Secure payment couldn’t load. Check your connection, or choose pay on ' + (mode === 'pickup' ? 'pick up.' : 'delivery.'); });
}

/* ---------- global events ---------- */
document.addEventListener('click', e => {
  const inc = e.target.closest('[data-inc]'), dec = e.target.closest('[data-dec]'), fav = e.target.closest('[data-fav]'), kit = e.target.closest('[data-kit]');
  if (inc) { e.preventDefault(); const id = inc.dataset.inc, p = byId(id); const was = cart[id] || 0; cart[id] = Math.min(50, was + 1); save(); if (!was) toast(`✅ ${esc(p.name)} added`); if (location.hash === '#cart') route(); if (location.hash === '#checkout') drawSum(); return; }
  if (dec) { e.preventDefault(); const id = dec.dataset.dec; cart[id] = (cart[id] || 0) - 1; save(); if (location.hash === '#cart' || (location.hash === '#checkout' && !count())) route(); else if (location.hash === '#checkout') drawSum(); return; }
  if (fav) { e.preventDefault(); const id = +fav.dataset.fav, i = favs.indexOf(id); if (i > -1) favs.splice(i, 1); else favs.push(id); save(); toast(i > -1 ? 'Removed from your list' : '❤️ Saved to <a href="#favourites" style="text-decoration:underline">your list</a>'); $$(`[data-fav="${id}"]`).forEach(b => b.innerHTML = b.classList.contains('btn') ? (favs.includes(id) ? '❤️ In my list' : '🤍 Save to my list') : (favs.includes(id) ? '❤️' : '🤍')); if (location.hash === '#favourites') route(); return; }
  if (kit) { const k = D.kits.find(x => x.id === kit.dataset.kit); k.items.forEach(([id, q]) => { if (byId(id)) cart[id] = (cart[id] || 0) + q; }); save(); toast(`🍱 ${esc(k.name)} added — <a href="#cart" style="text-decoration:underline">view cart</a>`); return; }
  const cl = e.target.closest('#clearcart'); if (cl) { if (confirm('Remove everything from your cart?')) { cart = {}; save(); route(); } }
});
let qT;
$('#q').addEventListener('input', e => { $('#qclear').hidden = !e.target.value; clearTimeout(qT); qT = setTimeout(() => { const v = e.target.value.trim(); if (v) { if (location.hash !== '#search') location.hash = '#search'; else route(); } else if (location.hash === '#search') location.hash = '#shop'; }, 200); });
$('#q').addEventListener('keydown', e => { if (e.key === 'Enter') e.target.blur(); });
$('#qclear').onclick = () => { $('#q').value = ''; $('#qclear').hidden = true; if (location.hash === '#search') location.hash = '#shop'; };
$('#lang').onclick = () => { lang = lang === 'ne' ? 'en' : 'ne'; LS.set('ks-lang', lang); applyLang(); setMode(); navs(); route(); };
$('#modeseg').onclick = e => { const b = e.target.closest('[data-mode]'); if (!b) return; mode = b.dataset.mode; LS.set('ks-mode', mode); setMode(); if (['#cart', '#checkout'].includes(location.hash)) route(); };
function setMode() {
  $$('#modeseg button').forEach(b => b.classList.toggle('on', b.dataset.mode === mode));
  const s = D.store; $('#modeinfo').innerHTML = mode === 'delivery' ? `Same-day delivery before 2 pm · <b>free over $${s.freeDeliveryOver}</b>` : `Ready in <b>1 hour</b> at ${esc(s.address)}`;
}
let heroT;
function bindHome() {
  const sl = $$('.hslide'), dt = $$('.hdots button'); let i = 0;
  const go = n => { i = (n + sl.length) % sl.length; sl.forEach((s, k) => s.classList.toggle('on', k === i)); dt.forEach((d, k) => d.classList.toggle('on', k === i)); };
  dt.forEach(d => d.onclick = () => { go(+d.dataset.slide); clearInterval(heroT); heroT = setInterval(() => go(i + 1), 6000); });
  clearInterval(heroT); if (sl.length > 1) heroT = setInterval(() => go(i + 1), 6000);
}

/* ---------- router ---------- */
function route() {
  const h = (location.hash || '#home').slice(1);
  let html, after;
  if (h.startsWith('product-')) html = V.product(+h.split('-')[1]);
  else if (h.startsWith('cat-')) { const c = cat(h.slice(4)), list = P.filter(p => p.category === c.id); html = listPage(`${c.icon} ${esc(lang === 'ne' ? c.nepali : c.name)}`, esc(lang === 'ne' ? c.name : c.nepali), list); after = () => bindList(list); }
  else if (h === 'shop') { html = listPage(T('All products'), lang === 'en' ? 'सबै सामान' : '', P); after = () => bindList(P); }
  else if (h === 'specials') { const l = P.filter(onSale); html = listPage('🔥 ' + T('Specials'), lang === 'en' ? 'यस हप्ताको छुट' : '', l); after = () => bindList(l); }
  else if (h === 'favourites') { const l = [...new Set([...favs, ...orders.flatMap(o => o.items.map(i => i.id))])].map(byId).filter(Boolean); html = l.length ? listPage('❤️ ' + T('My list'), 'Saved items and things you’ve bought before', l) : `<div class="wrap empty"><span class="big">🤍</span><h2>Your list is empty</h2><p>Tap the heart on any product to save it here for quick re-ordering.</p><a class="btn" href="#shop">Browse products</a></div>`; if (l.length) after = () => bindList(l); }
  else if (h === 'search') { const q = $('#q').value.trim(), l = searchList(q); html = listPage(`${T('Search results')}: “${esc(q)}”`, '', l); after = () => bindList(l); }
  else if (h === 'checkout') { html = V.checkout(); if (items().length) after = bindCheckout; }
  else if (V[h]) { html = V[h](); if (h === 'home') after = bindHome; }
  else { html = V.home(); after = bindHome; }
  app.innerHTML = html;
  if (h !== 'search') { $('#q').value = ''; $('#qclear').hidden = true; }
  $$('#catbar a').forEach(a => a.classList.toggle('on', a.getAttribute('href') === '#' + h));
  $$('.bnav a').forEach(a => a.classList.toggle('on', a.dataset.nav === h || (a.dataset.nav === 'shop' && /^(cat-|shop|specials|search|product-)/.test(h))));
  const p = h.startsWith('product-') && byId(+h.split('-')[1]);
  document.title = (p ? p.name + ' — ' : '') + 'Katwal Store — Authentic Nepali Groceries in Darwin';
  if (after) after();
  if (h !== 'search') window.scrollTo(0, 0);
  updateCart(); applyLang();
}
function navs() {
  $('#catbar').innerHTML = `<a href="#specials">🔥 ${T('Specials')}</a><a href="#kits">🍱 ${T('Kits')}</a>` + D.categories.map(c => `<a href="#cat-${c.id}">${c.icon} ${esc(lang === 'ne' ? c.nepali : c.name)}</a>`).join('') + `<a href="#favourites">❤️ ${T('My list')}</a>`;
  $('#fcats').innerHTML = D.categories.map(c => `<a href="#cat-${c.id}">${esc(c.name)}</a>`).join('');
}
function storeBits() {
  const s = D.store, st = openState();
  $('#announce').textContent = s.announcement || ''; $('#announce').hidden = !s.announcement;
  $('#status').className = 'status' + (st.open ? '' : ' closed'); $('#status').innerHTML = `<i></i>${esc(st.txt)}`;
  $('#faddr').textContent = s.address; $('#fphone').textContent = '📞 ' + s.phone; $('#fphone').href = 'tel:' + s.phoneIntl; $('#femail').textContent = s.email;
  $('#fhours').innerHTML = (s.hours || []).map(h => `${h[0]} ${fmtT(h[1])}–${fmtT(h[2])}`).join('<br>');
}

/* ---------- start ---------- */
if (C.paypalClientId === 'sb') $('#testbar').hidden = false;
fetch('data.json?v=' + Date.now()).then(r => { if (!r.ok) throw new Error(r.status); return r.json(); }).then(d => {
  D = d; P = (d.products || []).filter(p => !p.hidden && p.images && p.images.length);
  navs(); storeBits(); setMode(); applyLang(); save(); route();
  window.addEventListener('hashchange', route);
  setInterval(storeBits, 60000);
}).catch(() => { app.innerHTML = '<div class="wrap empty"><span class="big">📶</span><p>Sorry, the store couldn’t load. Please check your connection and refresh.</p></div>'; });
if ('serviceWorker' in navigator && location.protocol === 'https:') navigator.serviceWorker.register('sw.js').catch(() => {});
})();
