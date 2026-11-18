/* Katwal Store owner admin — edits data.json in the GitHub repo through the GitHub API. */
(function () {
'use strict';
const G = window.CONFIG.github;
const API = `https://api.github.com/repos/${G.owner}/${G.repo}/contents/`;
const root = document.getElementById('root');
const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const money = n => '$' + Number(n).toFixed(2);
const UNITS = ['kg', 'g', 'L', 'ml', 'pcs', 'each', 'bunch', 'pack', 'set', 'sticks'];
const TAGS = ['Popular', 'Nepali favourite', 'Fresh', 'Frozen', 'Vegetarian', 'Himalayan', 'Product of Nepal', 'Weekend only', 'Festival', 'Homemade style'];

let token = sessionStorage.getItem('ks-admin-token') || localStorage.getItem('ks-admin-token') || '';
let D = null, SHA = null, dirty = false, tab = 'products', q = '', fcat = '', msg = null;

/* ---------- GitHub ---------- */
const b64ToText = b => new TextDecoder().decode(Uint8Array.from(atob(b.replace(/\n/g, '')), c => c.charCodeAt(0)));
const textToB64 = t => { const by = new TextEncoder().encode(t); let s = ''; for (let i = 0; i < by.length; i += 0x8000) s += String.fromCharCode.apply(null, by.subarray(i, i + 0x8000)); return btoa(s); };
async function gh(path, o = {}) {
  const r = await fetch(API + path + (o.method ? '' : `?ref=${G.branch}&t=${Date.now()}`), { method: o.method || 'GET',
    headers: { Authorization: 'Bearer ' + token, Accept: 'application/vnd.github+json', 'X-GitHub-Api-Version': '2022-11-28', ...(o.body ? { 'Content-Type': 'application/json' } : {}) },
    body: o.body ? JSON.stringify(o.body) : undefined });
  const j = await r.json().catch(() => ({}));
  if (!r.ok) { const e = new Error(j.message || 'GitHub error ' + r.status); e.status = r.status; throw e; }
  return j;
}
async function load() { const j = await gh('data.json'); SHA = j.sha; D = JSON.parse(b64ToText(j.content)); dirty = false; }
async function publish() {
  const b = document.getElementById('publish'); if (b) { b.disabled = true; b.textContent = 'Publishing…'; }
  try { const j = await gh('data.json', { method: 'PUT', body: { message: 'Update store from owner admin', content: textToB64(JSON.stringify(D, null, 1)), sha: SHA, branch: G.branch } }); SHA = j.content.sha; dirty = false; msg = ['ok', '✅ Published! Your live store updates within about 1 minute.']; }
  catch (e) { msg = ['err', e.status === 409 ? 'The store was changed somewhere else since you loaded it. Click Reload and redo your change.' : 'Could not publish: ' + e.message]; }
  render();
}
async function uploadImage(file) {
  const img = await new Promise((res, rej) => { const i = new Image(); i.onload = () => res(i); i.onerror = rej; i.src = URL.createObjectURL(file); });
  const max = 1200, sc = Math.min(1, max / Math.max(img.width, img.height)), c = document.createElement('canvas');
  c.width = Math.round(img.width * sc); c.height = Math.round(img.height * sc); c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
  const name = 'images/' + (file.name.replace(/\.[^.]+$/, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').slice(0, 40) || 'photo') + '-' + Date.now() + '.jpg';
  await gh(name, { method: 'PUT', body: { message: 'Upload photo ' + name, content: c.toDataURL('image/jpeg', 0.85).split(',')[1], branch: G.branch } });
  return name;
}
const thumb = s => !s ? '' : s.startsWith('images/') ? './' + s : s.replace(/w=\d+/, 'w=160');
const change = () => { dirty = true; const r = document.querySelector('.top .r'); if (r && !r.querySelector('.dirty')) r.insertAdjacentHTML('afterbegin', '<span class="dirty">Unpublished changes</span>'); const p = document.getElementById('publish'); if (p) p.disabled = false; };
const nextId = () => Math.max(0, ...D.products.map(p => p.id)) + 1;

/* ---------- login ---------- */
function loginView(err) {
  root.innerHTML = `<div class="wrap"><div class="card login"><h1>🛒 Katwal Store — owner sign-in</h1><p class="hint">Manage products, prices, stock, meal kits and store details. Changes go live on your website.</p>
   ${err ? `<div class="msg err" style="margin-top:14px">${esc(err)}</div>` : ''}
   <p style="margin-top:16px"><b>First time? Create your admin key (2 minutes):</b></p>
   <ol><li>Open <a href="https://github.com/settings/personal-access-tokens/new" target="_blank" rel="noopener">GitHub → New fine-grained token</a> (signed in as <b>${esc(G.owner)}</b>).</li><li>Name: <i>Katwal admin</i>. Expiration: up to 1 year.</li><li>Repository access: <b>Only select repositories</b> → <b>${esc(G.repo)}</b>.</li><li>Repository permissions → <b>Contents: Read and write</b>.</li><li>Click <b>Generate token</b>, copy it, paste it below. Keep it private like a password.</li></ol>
   <form id="lf" style="display:flex;flex-direction:column;gap:12px"><label>Admin key<input type="password" id="tok" required autocomplete="off" placeholder="github_pat_…"></label><label class="chk"><input type="checkbox" id="rem"> Keep me signed in on this device</label><button class="btn" type="submit">Sign in</button></form>
   <p class="hint" style="margin-top:14px">Your key stays in this browser and is only sent to GitHub. <a href="./">← Back to store</a></p></div></div>`;
  document.getElementById('lf').onsubmit = async e => {
    e.preventDefault(); token = document.getElementById('tok').value.trim(); const rem = document.getElementById('rem').checked; e.target.querySelector('button').textContent = 'Signing in…';
    try { await load(); (rem ? localStorage : sessionStorage).setItem('ks-admin-token', token); render(); }
    catch (er) { token = ''; loginView(er.status === 401 ? 'That key wasn’t accepted. Check you copied all of it.' : er.status === 404 ? `The key works but can’t see ${G.repo}/data.json. Check “Repository access” and “Contents: Read and write”.` : er.message); }
  };
}

/* ---------- main ---------- */
function render() {
  if (!D) return loginView();
  const P = D.products, cats = D.categories;
  const top = `<div class="top"><b>🛒 KATWAL STORE · ADMIN</b><div class="r">${dirty ? '<span class="dirty">Unpublished changes</span>' : ''}<button class="btn green" id="publish" ${dirty ? '' : 'disabled'}>Publish changes</button><a class="btn ghost" href="./" target="_blank" rel="noopener">View store ↗</a><button class="btn ghost" id="reload">Reload</button><button class="btn ghost" id="out">Sign out</button></div></div>`;
  const m = msg ? `<div class="msg ${msg[0]}">${esc(msg[1])}</div>` : ''; msg = null;
  let body = '';
  if (tab === 'products') {
    const list = P.filter(p => (!fcat || p.category === fcat) && (!q || (p.name + ' ' + p.nepali + ' ' + (p.tags || []).join(' ')).toLowerCase().includes(q.toLowerCase())));
    body = `<div class="stat"><div><b>${P.length}</b>Products</div><div><b>${P.filter(p => p.inStock && !p.hidden).length}</b>In stock</div><div><b>${P.filter(p => !p.inStock).length}</b>Out of stock</div><div><b>${P.filter(p => p.salePrice).length}</b>On special</div></div>
    <div class="bar"><input type="text" id="q" placeholder="Search products (English or नेपाली)…" value="${esc(q)}"><select id="fcat"><option value="">All categories</option>${cats.map(c => `<option value="${c.id}" ${fcat === c.id ? 'selected' : ''}>${c.icon} ${esc(c.name)}</option>`).join('')}</select><button class="btn" id="addp">+ Add product</button></div>
    <div class="card" style="padding:0;overflow:auto"><table><thead><tr><th></th><th>Product</th><th class="hide-m">Category</th><th>Price</th><th>In stock</th><th></th></tr></thead><tbody>
    ${list.map(p => `<tr><td><img src="${esc(thumb(p.images[0]))}" alt=""></td><td><b>${esc(p.name)}</b><div class="np hint">${esc(p.nepali)}</div><div class="hint">${esc(p.qty + ' ' + p.unit)} · #${p.id}</div><div>${p.salePrice ? '<span class="tag sale">Special</span>' : ''}${p.hidden ? '<span class="tag hid">Hidden</span>' : ''}</div></td>
     <td class="hide-m">${(cats.find(c => c.id === p.category) || {}).icon || ''} ${esc((cats.find(c => c.id === p.category) || {}).name || p.category)}</td>
     <td>${p.salePrice ? `<s class="hint">${money(p.price)}</s><br><b style="color:#b00020">${money(p.salePrice)}</b>` : money(p.price)}</td>
     <td><label class="sw" title="Tap to change stock"><input type="checkbox" data-stock="${p.id}" ${p.inStock ? 'checked' : ''}><span></span></label></td>
     <td><div class="acts"><button class="btn out" data-edit="${p.id}">Edit</button><button class="btn out" data-dup="${p.id}">Copy</button><button class="btn red" data-del="${p.id}">Delete</button></div></td></tr>`).join('') || '<tr><td colspan="6" class="hint" style="padding:30px;text-align:center">No products found.</td></tr>'}
    </tbody></table></div><p class="hint" style="margin-top:10px">Tip: flip the switch to mark something out of stock — then click Publish.</p>`;
  } else if (tab === 'kits') {
    body = `<div class="card"><h2 style="font-size:16px;margin-bottom:4px">Meal kits</h2><p class="hint">Bundles customers add to their cart in one tap. The kit price is worked out from the products inside it.</p>
     ${D.kits.map((k, i) => `<div class="slide"><img src="${esc(thumb(k.image))}" alt=""><div><div class="row"><label>Kit name<input type="text" data-k="${i}" data-f="name" value="${esc(k.name)}"></label><label>Nepali name<input type="text" class="np" data-k="${i}" data-f="nepali" value="${esc(k.nepali)}"></label><label>Image link<input type="url" data-k="${i}" data-f="image" value="${esc(k.image)}"></label></div>
      <label style="margin-top:10px">Description<input type="text" data-k="${i}" data-f="description" value="${esc(k.description)}"></label>
      <div style="margin-top:10px;font-size:12px;font-weight:500;color:#555">Products in this kit</div>
      ${k.items.map(([id, qty], j) => `<div class="kitrow"><select data-ki="${i}" data-j="${j}">${D.products.map(p => `<option value="${p.id}" ${p.id === id ? 'selected' : ''}>${esc(p.name)} (${esc(p.qty + ' ' + p.unit)})</option>`).join('')}</select><input type="number" min="1" max="20" value="${qty}" data-kq="${i}" data-j="${j}"><button class="btn red" data-kx="${i}" data-j="${j}">✕</button></div>`).join('')}
      <div class="acts" style="justify-content:flex-start;margin-top:8px"><button class="btn out" data-kadd="${i}">+ Add product</button><button class="btn red" data-kdel="${i}">Delete kit</button></div></div></div>`).join('')}
     <div style="margin-top:14px"><button class="btn" id="addkit">+ New meal kit</button></div></div>`;
  } else if (tab === 'store') {
    const s = D.store;
    const f = (l, k, t = 'text', cls = '') => `<label>${l}<input type="${t}" class="${cls}" data-s="${k}" value="${esc(s[k])}"></label>`;
    body = `<div class="card"><h2 style="font-size:16px;margin-bottom:12px">Store details</h2><div class="row">${f('Store name', 'name')}${f('Tagline', 'tagline')}${f('Address', 'address')}${f('Phone (as shown)', 'phone')}${f('Phone for tap-to-call (+61…)', 'phoneIntl')}${f('Email', 'email', 'email')}${f('Map latitude', 'lat', 'number')}${f('Map longitude', 'lng', 'number')}</div>
     <label style="margin-top:14px">Announcement bar (top of every page)<input type="text" data-s="announcement" value="${esc(s.announcement)}"></label></div>
     <div class="card" style="margin-top:16px"><h2 style="font-size:16px;margin-bottom:12px">Delivery</h2><div class="row">${f('Delivery fee ($)', 'deliveryFee', 'number')}${f('Free delivery over ($)', 'freeDeliveryOver', 'number')}${f('Minimum delivery order ($)', 'minOrder', 'number')}</div>
     <label style="margin-top:14px">Suburbs you deliver to (comma separated)<textarea data-areas>${esc(s.deliveryAreas.join(', '))}</textarea></label></div>
     <div class="card" style="margin-top:16px"><h2 style="font-size:16px;margin-bottom:6px">Opening hours</h2><p class="hint">Used for the “Open now” badge and delivery time slots. Delete a day’s times to mark it closed.</p>
     ${['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map(d => { const h = s.hours.find(x => x[0] === d) || [d, '', '']; return `<div class="hrs"><b>${d}</b><input type="time" data-h="${d}" data-i="1" value="${h[1]}"><input type="time" data-h="${d}" data-i="2" value="${h[2]}"></div>`; }).join('')}</div>`;
  } else if (tab === 'home') {
    body = `<div class="card"><h2 style="font-size:16px;margin-bottom:6px">Homepage banners</h2><p class="hint">The big slideshow at the top of the home page.</p>
     ${D.banners.map((b, i) => `<div class="slide"><img src="${esc(thumb(b.image))}" alt=""><div class="row"><label>Image link<input type="url" data-b="${i}" data-f="image" value="${esc(b.image)}"></label><label>Title<input type="text" data-b="${i}" data-f="title" value="${esc(b.title)}"></label><label>Subtitle<input type="text" data-b="${i}" data-f="subtitle" value="${esc(b.subtitle)}"></label><label>Button text<input type="text" data-b="${i}" data-f="button" value="${esc(b.button)}"></label>
      <label>Button goes to<select data-b="${i}" data-f="link">${[['#shop', 'All products'], ['#specials', 'Specials'], ['#kits', 'Meal kits'], ['#store', 'Store & map'], ...D.categories.map(c => ['#cat-' + c.id, c.name])].map(([v, t]) => `<option value="${v}" ${b.link === v ? 'selected' : ''}>${esc(t)}</option>`).join('')}</select></label>
      <div class="acts" style="align-items:end"><button class="btn out" data-bm="${i}" data-d="-1">↑</button><button class="btn out" data-bm="${i}" data-d="1">↓</button><button class="btn red" data-bdel="${i}">Remove</button></div></div></div>`).join('')}
     <div style="margin-top:14px"><button class="btn" id="addban">+ Add banner</button></div></div>`;
  } else {
    body = `<div class="card"><h2 style="font-size:16px;margin-bottom:10px">Orders</h2>
     <p><b>Paid online:</b> every card/PayPal order (with items, customer and delivery address) appears in your PayPal account.</p><p style="margin-top:10px"><a class="btn" href="https://www.paypal.com/activities" target="_blank" rel="noopener">Open PayPal activity ↗</a> <a class="btn out" href="https://www.sandbox.paypal.com/activities" target="_blank" rel="noopener">Test orders ↗</a></p>
     <p style="margin-top:16px"><b>Pay on delivery / pick up:</b> the customer sends the order to your phone (${esc(D.store.phone)}) by SMS or to ${esc(D.store.email)} by email from the confirmation screen.</p>
     <p class="hint" style="margin-top:14px">Payment mode: <b>${window.CONFIG.paypalClientId === 'sb' ? 'TEST — no real money' : 'LIVE'}</b>. To take real payments, put your PayPal Live Client ID in <code>config.js</code> on GitHub.</p></div>
     <div class="card" style="margin-top:16px"><h2 style="font-size:16px;margin-bottom:10px">Backup</h2><button class="btn out" id="backup">Download data.json</button></div>`;
  }
  root.innerHTML = top + `<div class="wrap">${m}<div class="tabs">${[['products', '🛒 Products'], ['kits', '🍱 Meal kits'], ['home', '🖼️ Homepage'], ['store', '🏪 Store & delivery'], ['orders', '📦 Orders']].map(([k, t]) => `<button class="tab ${tab === k ? 'on' : ''}" data-tab="${k}">${t}</button>`).join('')}</div>${body}</div><div class="overlay" id="ov"></div>`;
  bind();
}

function bind() {
  const $ = id => document.getElementById(id), all = s => document.querySelectorAll(s);
  $('publish').onclick = publish;
  $('out').onclick = () => { if (dirty && !confirm('You have unpublished changes. Sign out anyway?')) return; sessionStorage.removeItem('ks-admin-token'); localStorage.removeItem('ks-admin-token'); token = ''; D = null; loginView(); };
  $('reload').onclick = async () => { if (dirty && !confirm('Discard unpublished changes?')) return; try { await load(); msg = ['info', 'Reloaded the latest store data.']; } catch (e) { msg = ['err', e.message]; } render(); };
  all('[data-tab]').forEach(b => b.onclick = () => { tab = b.dataset.tab; render(); });
  if (tab === 'products') {
    $('q').oninput = e => { q = e.target.value; const pos = e.target.selectionStart; render(); const n = $('q'); n.focus(); n.setSelectionRange(pos, pos); };
    $('fcat').onchange = e => { fcat = e.target.value; render(); };
    $('addp').onclick = () => editor(null);
    all('[data-stock]').forEach(i => i.onchange = () => { D.products.find(p => p.id === +i.dataset.stock).inStock = i.checked; change(); });
    all('[data-edit]').forEach(b => b.onclick = () => editor(+b.dataset.edit));
    all('[data-dup]').forEach(b => b.onclick = () => { const p = D.products.find(x => x.id === +b.dataset.dup), c = JSON.parse(JSON.stringify(p)); c.id = nextId(); c.name += ' (copy)'; c.hidden = true; D.products.unshift(c); change(); msg = ['info', `Copied “${p.name}”. The copy is hidden until you edit it.`]; render(); });
    all('[data-del]').forEach(b => b.onclick = () => { const p = D.products.find(x => x.id === +b.dataset.del); if (!confirm(`Delete “${p.name}”?`)) return; D.products = D.products.filter(x => x !== p); D.kits.forEach(k => k.items = k.items.filter(([id]) => id !== p.id)); change(); render(); });
  } else if (tab === 'kits') {
    all('[data-k]').forEach(i => i.onchange = () => { D.kits[+i.dataset.k][i.dataset.f] = i.value; change(); if (i.dataset.f === 'image') render(); });
    all('[data-ki]').forEach(s => s.onchange = () => { D.kits[+s.dataset.ki].items[+s.dataset.j][0] = +s.value; change(); });
    all('[data-kq]').forEach(s => s.onchange = () => { D.kits[+s.dataset.kq].items[+s.dataset.j][1] = Math.max(1, +s.value || 1); change(); });
    all('[data-kx]').forEach(b => b.onclick = () => { D.kits[+b.dataset.kx].items.splice(+b.dataset.j, 1); change(); render(); });
    all('[data-kadd]').forEach(b => b.onclick = () => { D.kits[+b.dataset.kadd].items.push([D.products[0].id, 1]); change(); render(); });
    all('[data-kdel]').forEach(b => b.onclick = () => { if (!confirm('Delete this kit?')) return; D.kits.splice(+b.dataset.kdel, 1); change(); render(); });
    $('addkit').onclick = () => { D.kits.push({ id: 'kit' + Date.now(), name: 'New kit', nepali: '', description: '', image: D.banners[0].image, items: [[D.products[0].id, 1]] }); change(); render(); };
  } else if (tab === 'store') {
    all('[data-s]').forEach(i => i.onchange = () => { D.store[i.dataset.s] = i.type === 'number' ? +i.value : i.value; change(); });
    document.querySelector('[data-areas]').onchange = e => { D.store.deliveryAreas = e.target.value.split(',').map(s => s.trim()).filter(Boolean); change(); };
    all('[data-h]').forEach(i => i.onchange = () => {
      const d = i.dataset.h; let h = D.store.hours.find(x => x[0] === d); if (!h) { h = [d, '', '']; D.store.hours.push(h); }
      h[+i.dataset.i] = i.value; D.store.hours = D.store.hours.filter(x => x[1] && x[2]); const order = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']; D.store.hours.sort((a, b) => order.indexOf(a[0]) - order.indexOf(b[0])); change();
    });
  } else if (tab === 'home') {
    all('[data-b]').forEach(i => i.onchange = () => { D.banners[+i.dataset.b][i.dataset.f] = i.value; change(); if (i.dataset.f === 'image') render(); });
    all('[data-bm]').forEach(b => b.onclick = () => { const i = +b.dataset.bm, j = i + +b.dataset.d; if (j < 0 || j >= D.banners.length) return; [D.banners[i], D.banners[j]] = [D.banners[j], D.banners[i]]; change(); render(); });
    all('[data-bdel]').forEach(b => b.onclick = () => { if (D.banners.length <= 1) return alert('Keep at least one banner.'); D.banners.splice(+b.dataset.bdel, 1); change(); render(); });
    $('addban').onclick = () => { D.banners.push({ image: D.banners[0].image, title: 'New banner', subtitle: '', link: '#shop', button: 'Shop now' }); change(); render(); };
  } else {
    $('backup').onclick = () => { const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([JSON.stringify(D, null, 1)], { type: 'application/json' })); a.download = 'katwal-data-backup.json'; a.click(); };
  }
}

/* ---------- product editor ---------- */
function editor(id) {
  const isNew = id == null;
  const p = isNew ? { id: nextId(), name: '', nepali: '', category: D.categories[0].id, price: '', salePrice: null, qty: 1, unit: 'kg', images: [], description: '', tags: [], inStock: true, hidden: false, credit: '' } : JSON.parse(JSON.stringify(D.products.find(x => x.id === id)));
  const ov = document.getElementById('ov');
  const draw = err => {
    ov.innerHTML = `<div class="panel"><h2>${isNew ? 'Add product' : 'Edit product'}<button class="btn out" data-x>✕</button></h2>${err ? `<div class="msg err">${esc(err)}</div>` : ''}
     <div class="row"><label>Name (English) *<input type="text" id="e-name" value="${esc(p.name)}" placeholder="e.g. Masoor Dal"></label><label>Name (नेपाली)<input type="text" id="e-np" class="np" value="${esc(p.nepali)}" placeholder="e.g. मसुरको दाल"></label></div>
     <div class="row"><label>Category *<select id="e-cat">${D.categories.map(c => `<option value="${c.id}" ${p.category === c.id ? 'selected' : ''}>${c.icon} ${esc(c.name)}</option>`).join('')}</select></label>
      <label>Price ($) *<input type="number" id="e-price" min="0" step="0.01" value="${esc(p.price)}"></label><label>Special price ($)<input type="number" id="e-sale" min="0" step="0.01" value="${esc(p.salePrice || '')}" placeholder="Empty = no special"></label>
      <label>Pack size *<input type="number" id="e-qty" min="0" step="any" value="${esc(p.qty)}"></label><label>Unit<select id="e-unit">${UNITS.map(u => `<option ${p.unit === u ? 'selected' : ''}>${u}</option>`).join('')}</select></label></div>
     <label>Description<textarea id="e-desc" placeholder="What it is and how to use it">${esc(p.description)}</textarea></label>
     <div><div style="font-size:12px;font-weight:500;color:#555;margin-bottom:6px">Labels (tap to turn on/off)</div><div class="chips">${TAGS.map(t => `<button class="chip ${p.tags.includes(t) ? 'on' : ''}" data-tag="${esc(t)}">${esc(t)}</button>`).join('')}</div></div>
     <div><div style="font-size:12px;font-weight:500;color:#555;margin-bottom:6px">Photo * (first photo is shown in the shop)</div>
      <div class="imgs">${p.images.map((s, i) => `<div class="imgbox"><img src="${esc(thumb(s))}" alt=""><div class="ctl"><button data-im="${i}" data-d="-1">←</button><button data-im="${i}" data-d="1">→</button><button data-imx="${i}">✕</button></div></div>`).join('')}</div>
      <div class="row" style="margin-top:10px"><label>Take or upload a photo<input type="file" id="e-file" accept="image/*" multiple></label><label>…or paste an image link<span style="display:flex;gap:6px"><input type="url" id="e-url" placeholder="https://…"><button class="btn out" data-addurl>Add</button></span></label></div><div class="hint" id="e-up"></div></div>
     <div style="display:flex;gap:20px;flex-wrap:wrap"><label class="chk"><input type="checkbox" id="e-stock" ${p.inStock ? 'checked' : ''}> In stock</label><label class="chk"><input type="checkbox" id="e-hid" ${p.hidden ? 'checked' : ''}> Hide from store</label></div>
     <div class="foot"><button class="btn out" data-x>Cancel</button><button class="btn" data-save>${isNew ? 'Add product' : 'Save product'}</button></div><p class="hint">After saving, click <b>Publish changes</b> at the top.</p></div>`;
    ov.classList.add('open');
  };
  const read = () => { const v = i => document.getElementById(i);
    p.name = v('e-name').value.trim(); p.nepali = v('e-np').value.trim(); p.category = v('e-cat').value;
    p.price = v('e-price').value === '' ? '' : Math.round(+v('e-price').value * 100) / 100; p.salePrice = v('e-sale').value === '' ? null : Math.round(+v('e-sale').value * 100) / 100;
    p.qty = +v('e-qty').value || 1; p.unit = v('e-unit').value; p.description = v('e-desc').value.trim(); p.inStock = v('e-stock').checked; p.hidden = v('e-hid').checked; };
  draw();
  ov.onclick = e => {
    const t = e.target;
    if (t.closest('[data-x]') || t === ov) { ov.classList.remove('open'); return; }
    if (t.closest('[data-tag]')) { read(); const g = t.closest('[data-tag]').dataset.tag; p.tags = p.tags.includes(g) ? p.tags.filter(x => x !== g) : [...p.tags, g]; draw(); return; }
    if (t.closest('[data-im]')) { read(); const b = t.closest('[data-im]'), i = +b.dataset.im, j = i + +b.dataset.d; if (j >= 0 && j < p.images.length) [p.images[i], p.images[j]] = [p.images[j], p.images[i]]; draw(); return; }
    if (t.closest('[data-imx]')) { read(); p.images.splice(+t.closest('[data-imx]').dataset.imx, 1); draw(); return; }
    if (t.closest('[data-addurl]')) { read(); const u = document.getElementById('e-url').value.trim(); if (/^https:\/\//.test(u)) { p.images.push(u); draw(); } else draw('Image links must start with https://'); return; }
    if (t.closest('[data-save]')) {
      read();
      if (!p.name) return draw('Please enter a name.');
      if (p.price === '' || !(p.price > 0)) return draw('Please enter a price.');
      if (p.salePrice != null && !(p.salePrice > 0 && p.salePrice < p.price)) return draw('Special price must be lower than the normal price.');
      if (!p.images.length) return draw('Add at least one photo.');
      if (isNew) D.products.unshift(p); else D.products[D.products.findIndex(x => x.id === p.id)] = p;
      ov.classList.remove('open'); change(); msg = ['info', `“${p.name}” saved. Click “Publish changes” to put it live.`]; render();
    }
  };
  ov.onchange = async e => {
    if (e.target.id !== 'e-file') return;
    read(); const files = [...e.target.files], up = document.getElementById('e-up');
    for (const [i, f] of files.entries()) { up.textContent = `Uploading photo ${i + 1} of ${files.length}…`; try { p.images.push(await uploadImage(f)); } catch (er) { draw('Photo upload failed: ' + er.message); return; } }
    draw(); document.getElementById('e-up').textContent = 'Photo uploaded — it can take a minute to appear on the live store.';
  };
}

window.addEventListener('beforeunload', e => { if (dirty) { e.preventDefault(); e.returnValue = ''; } });
if (token) { root.innerHTML = '<div class="wrap"><p class="hint">Loading…</p></div>'; load().then(render).catch(e => { token = ''; sessionStorage.removeItem('ks-admin-token'); localStorage.removeItem('ks-admin-token'); loginView(e.status === 401 ? 'Your key has expired or was removed. Please sign in again.' : e.message); }); }
else loginView();
})();
