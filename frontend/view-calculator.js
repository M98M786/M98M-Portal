/* view-calculator.js — V2 req 20: the Order-Earning calculator.
 *
 * This is a FAITHFUL PORT of Sir Hasib's own M98M-Order-Earning-Calculator-v18.0-Management.html
 * ("even I gave you the whole file"). The previous portal version asked the backend Brain for a
 * flat per-account FVF and knew nothing of his category bands, the 40p per-order fee above £10,
 * sale discounts, the Promoted-General ad rate, CPC's own VAT, or the VAT-to-HMRC section — every
 * number it printed disagreed with the tool his team actually uses. The maths below is his file's
 * maths, symbol for symbol: banded (marginal) FVF per category, per-order fee 10p/30p/40p,
 * 0.35% regulatory, ad rate % of sale, 20% VAT on all fees, CPC × 1.2, and the sheet's own VAT
 * convention S = C − G − J − Priority VAT. */
(function () {

  var OC_ROLES = ['Management', 'Ops Head', 'Team Lead', 'Advertising Manager',
    'Product Hunter', 'Item Lister', 'Listing Manager', 'Order Processor', 'Pricing', 'CS'];

  var INF = Infinity;
  var CATS = [
    {g:"M98M top categories", list:[
      {n:"Home, Furniture & DIY (lighting, etc.)", t:[[500,11.9],[INF,7.9]], red:1},
      {n:"Home › Appliances / DIY Tools & Workshop", t:[[400,6.9],[INF,3]], red:1},
      {n:"Home › Power Strips & Surge Protectors", t:[[250,9.9],[INF,7.9]], red:1},
      {n:"Home › Furniture / Bath / Plumbing", t:[[500,10.9],[1000,7.9],[INF,3]], red:1},
      {n:"Vehicle Parts & Accessories (auto electrical)", t:[[750,9.5],[INF,3]]},
      {n:"Vehicle › Tyres / GPS Sat Nav / Power Tools", t:[[750,6.9],[INF,3]]},
      {n:"Computers, Tablets & Networking (mouse, keyboard, USB)", t:[[INF,9.9]]},
      {n:"Health & Beauty (personal care)", t:[[INF,10.9]]},
      {n:"Health › Hair Extensions & Wigs", t:[[INF,11.9]]},
      {n:"Health › Electronic Smoking", t:[[INF,12.9]]},
      {n:"Garden & Patio", t:[[INF,10.9]]}
    ]},
    {g:"All other categories", list:[
      {n:"Antiques", t:[[INF,10.9]]},
      {n:"Art", t:[[INF,10.9]]},
      {n:"Baby", t:[[INF,10.9]]},
      {n:"Books, Comics & Magazines", t:[[INF,9.9]]},
      {n:"Business, Office & Industrial", t:[[INF,12.5]]},
      {n:"Cameras & Photography", t:[[INF,9.9]]},
      {n:"Cameras › Camcorders/Digital/Film/Lenses", t:[[1000,6.9],[INF,3]]},
      {n:"Clothes, Shoes & Accessories", t:[[INF,11.9]]},
      {n:"Clothes › Women's Bags & Handbags", t:[[800,12.9],[INF,7]]},
      {n:"Coins", t:[[450,10.9],[INF,3]]},
      {n:"Collectables", t:[[INF,10.9]], red:1},
      {n:"Computers › Laptops/Desktops/Tablets/Drives/Printers", t:[[1000,6.9],[INF,3]]},
      {n:"Crafts", t:[[INF,12.9]]},
      {n:"Dolls & Bears", t:[[INF,10.9]]},
      {n:"Event Tickets", t:[[INF,12.9]]},
      {n:"Films & TV", t:[[INF,9.9]]},
      {n:"Holidays & Travel", t:[[650,7.9],[INF,3]]},
      {n:"Jewellery & Watches", t:[[1000,14.9],[INF,4]]},
      {n:"Jewellery › Watches, Parts & Accessories", t:[[750,12.9],[INF,3]]},
      {n:"Mobile Phones & Communication", t:[[INF,9.9]]},
      {n:"Mobile › Mobile & Smart Phones", t:[[1000,6.9],[INF,3]]},
      {n:"Music", t:[[INF,9.9]]},
      {n:"Musical Instruments & DJ Equipment", t:[[INF,10.9]]},
      {n:"Pet Supplies", t:[[INF,12.9]]},
      {n:"Pottery, Ceramics & Glass", t:[[INF,10.9]]},
      {n:"Sound & Vision", t:[[INF,9.9]]},
      {n:"Sound › TVs/Headphones/HiFi/Home Cinema", t:[[1000,6.9],[INF,3]]},
      {n:"Sporting Goods", t:[[INF,10.9]]},
      {n:"Sports Memorabilia", t:[[INF,10.9]]},
      {n:"Stamps", t:[[INF,10.9]]},
      {n:"Toys & Games", t:[[INF,10.9]]},
      {n:"Toys › Tents", t:[[250,10.9],[INF,7.9]]},
      {n:"Video Games & Consoles", t:[[INF,9.9]]},
      {n:"Video Games › Consoles", t:[[400,6.9],[INF,2]]},
      {n:"Wholesale & Job Lots", t:[[INF,12.9]]},
      {n:"Everything Else", t:[[INF,12.9]]}
    ]}
  ];

  var OC_FLAT = [];
  CATS.forEach(function (g) { g.list.forEach(function (c) { c._g = g.g; OC_FLAT.push(c); }); });

  VIEW_CSS.push(
    '.oc-grid{display:grid;gap:14px;grid-template-columns:repeat(auto-fit,minmax(170px,1fr))}' +
    '.oc-out{margin-top:18px;display:grid;gap:12px;grid-template-columns:repeat(auto-fit,minmax(190px,1fr))}' +
    '.oc-tile{padding:16px;border:1px solid var(--gold-line);border-radius:12px;text-align:center}' +
    '.oc-tile .k{font-size:10.5px;text-transform:uppercase;letter-spacing:.09em;color:var(--text-3);font-weight:800}' +
    '.oc-tile .v{font-size:25px;font-weight:800;margin-top:6px;font-variant-numeric:tabular-nums}' +
    '.oc-tile .s{font-size:11px;color:var(--text-3);font-weight:600;margin-top:5px}' +
    '.oc-tile.gold .v{color:var(--gold-a)}.oc-tile.good .v{color:var(--ok)}.oc-tile.bad .v{color:var(--bad)}' +
    '.oc-fees{margin-top:14px;border:1px solid var(--gold-line);border-radius:12px;overflow:hidden}' +
    '.oc-fees h3{font-size:11px;text-transform:uppercase;letter-spacing:.08em;color:var(--text-3);padding:10px 14px 4px;font-weight:800}' +
    '.oc-fees .r{display:flex;justify-content:space-between;gap:10px;padding:8px 14px;font-size:12.5px}' +
    '.oc-fees .r:nth-child(even){background:rgba(120,132,152,.07)}' +
    '.oc-fees .r em{font-style:normal;color:var(--text-3);font-size:11px;display:block}' +
    '.oc-fees .r b{font-variant-numeric:tabular-nums;white-space:nowrap}' +
    '.oc-fees .r.total{border-top:1px solid var(--gold-line);font-weight:800}' +
    '.oc-fees .r.big{font-weight:800;font-size:13.5px;color:var(--gold-a)}' +
    '.oc-fees .r.neg b{color:var(--bad)}' +
    '.oc-hint{font-size:11.5px;color:var(--text-3);font-weight:600;margin-top:6px;line-height:1.55}'
  );

  function ocN(id) { var v = parseFloat(($(id) || {}).value); return isFinite(v) && v > 0 ? v : 0; }
  function ocR2(v) { return Math.round(v * 100) / 100; }
  function ocGBP(v) { return '£' + ocR2(v).toFixed(2); }

  /* His tierFee, verbatim: the FVF is MARGINAL — the first £500 at one rate, the remainder at
     the next — never the whole price at one rate. */
  function ocTierFee(S, tiers) {
    var fee = 0, prev = 0;
    for (var i = 0; i < tiers.length; i++) {
      var cap = tiers[i][0], rate = tiers[i][1] / 100;
      var portion = Math.min(S, cap) - prev;
      if (portion > 0) { fee += portion * rate; }
      prev = cap;
      if (S <= cap) { break; }
    }
    return fee;
  }

  var OC_DISC_MODE = 'pct';

  /* Hasib item 17: paste the listing title, the calculator picks the category itself. Rules are
     ordered most-specific first; every name on the right is an exact CATS entry. The pick is a
     suggestion the seller can always override — the select stays live. */
  var OC_AUTO = [
    [/\b(wig|hair extension|toupee|hairpiece)\b/, "Health › Hair Extensions & Wigs"],
    [/\b(vape|e-?cig|e-?liquid|smoking)\b/, "Health › Electronic Smoking"],
    [/\b(extension lead|power strip|surge protect|extension socket|usb socket|wall socket|plug adaptor|plug adapter)\b/, "Home › Power Strips & Surge Protectors"],
    [/\b(drill|grinder|sander|saw|screwdriver set|tool kit|heat gun|welder|air compressor|kettle|toaster|microwave|air fryer|blender|vacuum|hoover|dehumidifier|heater|iron\b)/, "Home › Appliances / DIY Tools & Workshop"],
    [/\b(tap|faucet|shower head|basin|toilet|plumbing|radiator|towel rail|sofa|wardrobe|drawer|bookshelf|cabinet)\b/, "Home › Furniture / Bath / Plumbing"],
    [/\b(tyre|tire|sat ?nav|gps)\b/, "Vehicle › Tyres / GPS Sat Nav / Power Tools"],
    [/\b(car|van|motorbike|motorcycle|vehicle|number plate|wing mirror|bumper|headlight|12v|24v)\b/, "Vehicle Parts & Accessories (auto electrical)"],
    [/\b(laptop|desktop pc|macbook|chromebook|tablet\b|ssd|hard drive|printer)\b/, "Computers › Laptops/Desktops/Tablets/Drives/Printers"],
    [/\b(mouse|keyboard|usb|hdmi|ethernet|router|webcam|monitor stand|laptop stand|hub\b|network)\b/, "Computers, Tablets & Networking (mouse, keyboard, USB)"],
    [/\b(iphone|samsung galaxy|smartphone|smart phone)\b/, "Mobile › Mobile & Smart Phones"],
    [/\b(phone case|phone holder|phone mount|screen protector|charger|charging cable|power bank|sim\b)\b/, "Mobile Phones & Communication"],
    [/\b(headphone|earphone|earbud|speaker|soundbar|tv\b|television|home cinema|hi-?fi)\b/, "Sound › TVs/Headphones/HiFi/Home Cinema"],
    [/\b(camera|camcorder|lens|tripod)\b/, "Cameras & Photography"],
    [/\b(watch\b|watches|bracelet|necklace|ring\b|earring|jewellery|jewelry)\b/, "Jewellery & Watches"],
    [/\b(dog|cat\b|pet\b|puppy|kitten|bird cage|aquarium|hamster)\b/, "Pet Supplies"],
    [/\b(garden|patio|plant pot|planter|lawn|hose|greenhouse|parasol|gazebo|bbq|barbecue)\b/, "Garden & Patio"],
    [/\b(toy|lego|doll house|puzzle|board game|kids game)\b/, "Toys & Games"],
    [/\b(games? console|playstation|\bps[45]\b|xbox|nintendo)\b/, "Video Games & Consoles"],
    [/\b(baby|pram|pushchair|stroller|cot\b|nappy)\b/, "Baby"],
    [/\b(dress|shirt|jacket|shoes|trainers|boots|jeans|hoodie|clothing)\b/, "Clothes, Shoes & Accessories"],
    [/\b(handbag|shoulder bag|tote bag|clutch)\b/, "Clothes › Women's Bags & Handbags"],
    [/\b(massager|trimmer|shaver|epilator|nail\b|makeup|skincare|toothbrush|hair dryer|straightener|curler)\b/, "Health & Beauty (personal care)"],
    [/\b(tent\b|tents)\b/, "Toys › Tents"],
    [/\b(bike|bicycle|dumbbell|yoga|fishing|golf|tennis|gym\b|fitness)\b/, "Sporting Goods"],
    [/\b(office chair|desk\b|stationery|filing|warehouse|packaging)\b/, "Business, Office & Industrial"],
    [/\b(lamp|light|lighting|led strip|bulb|chandelier|curtain|rug\b|cushion|mirror|shelf|shelving|storage box|clock)\b/, "Home, Furniture & DIY (lighting, etc.)"]
  ];

  function ocAutoPick(title) {
    var t = ' ' + String(title || '').toLowerCase() + ' ';
    for (var i = 0; i < OC_AUTO.length; i++) {
      if (OC_AUTO[i][0].test(t)) {
        for (var k = 0; k < OC_FLAT.length; k++) {
          if (OC_FLAT[k].n === OC_AUTO[i][1]) { return k; }
        }
      }
    }
    return -1;
  }

  function ocRow(label, val, cls, hint, sign) {
    return '<div class="r ' + (cls || '') + '"><span>' + esc(label) +
      (hint ? '<em>' + esc(hint) + '</em>' : '') + '</span><b>' + (sign || '') + ocGBP(val) + '</b></div>';
  }

  function ocCalc() {
    var out = $('ocOut');
    if (!out) { return; }
    var price = ocN('ocPrice'), ali = ocN('ocAli'), cpc = ocN('ocCpc'), adRate = ocN('ocAdRate');
    var cat = OC_FLAT[parseInt(($('ocCat') || {}).value, 10) || 0];

    // sale discount — % and £ mirror each other, everything downstream runs on the final price
    var discPct = 0, discAmt = 0, finalPrice = price;
    if (price > 0) {
      if (OC_DISC_MODE === 'amt') {
        discAmt = Math.min(Math.max(ocN('ocDiscAmt'), 0), price);
        discPct = discAmt / price * 100;
        if ($('ocDiscPct')) { $('ocDiscPct').value = discAmt > 0 ? String(ocR2(discPct)) : ''; }
      } else {
        discPct = Math.min(Math.max(ocN('ocDiscPct'), 0), 100);
        discAmt = ocR2(price * discPct / 100);
        if ($('ocDiscAmt')) { $('ocDiscAmt').value = discAmt > 0 ? discAmt.toFixed(2) : ''; }
      }
      finalPrice = ocR2(price - discAmt);
    }
    var onSale = price > 0 && discAmt > 0;
    var S = finalPrice;

    if (!S || S <= 0) {
      out.innerHTML = '<div class="oc-hint">' + (price > 0 ? 'The discount reduces the sale price to £0.00.' : 'Enter a sale price to begin.') + '</div>';
      return;
    }

    var fvf = ocTierFee(S, cat.t);
    var perOrder = (S <= 10) ? (cat.red ? 0.10 : 0.30) : 0.40;
    var reg = S * 0.0035;
    var adFee = S * adRate / 100;
    var feesEx = fvf + perOrder + reg + adFee;
    var feeVAT = feesEx * 0.20;
    var deduct = feesEx + feeVAT;
    var earn = S - deduct;
    var cpcTot = cpc * 1.2;
    var net = earn - ali - cpcTot;

    var rateTxt = cat.t.length === 1
      ? 'FVF ' + cat.t[0][1] + '% flat'
      : cat.t.map(function (x) { return x[1] + '%' + (x[0] === INF ? ' above' : ' to £' + x[0]); }).join(', ');

    var h = '<div class="oc-out">' +
      '<div class="oc-tile gold"><div class="k">eBay order earning</div><div class="v">' + ocGBP(earn) + '</div>' +
        '<div class="s">eBay deducted ' + ocGBP(deduct) + ' — ' + (deduct / S * 100).toFixed(1) + '% of the sale</div></div>' +
      ((ali > 0 || cpc > 0)
        ? '<div class="oc-tile ' + (net >= 0 ? 'good' : 'bad') + '"><div class="k">Net profit</div><div class="v">' + ocGBP(net) + '</div>' +
          '<div class="s">after AliExpress' + (cpc > 0 ? ' and ad cost incl VAT' : '') + '</div></div>'
        : '') +
      '</div>';

    var rows = '';
    if (onSale) {
      rows += ocRow('Original price', price, 'sub', 'listing price before the sale discount');
      rows += ocRow('Sale discount', discAmt, 'sub', ocR2(discPct) + '% markdown', '−');
    }
    rows += ocRow('Total sale value', S, 'total', onSale ? 'discounted price — every fee below is calculated on this' : '');
    rows += ocRow('Final value fee (variable)', fvf, '', rateTxt + ' on total sale', '−');
    rows += ocRow('Per-order fee', perOrder, '',
      (S <= 10 ? (cat.red ? 'reduced 10p — order ≤ £10, this category' : '30p — order ≤ £10') : '40p — order over £10'), '−');
    rows += ocRow('Regulatory operating fee', reg, '', '0.35% of total sale', '−');
    if (adFee > 0) { rows += ocRow('Ad fee (Promoted General)', adFee, '', adRate + '% of total sale — matches the eBay order page', '−'); }
    rows += ocRow('eBay fees subtotal (ex VAT)', feesEx, '');
    rows += ocRow('VAT on fees (20%)', feeVAT, '', 'eBay fees are quoted ex-VAT; 20% added', '−');
    rows += ocRow('Total eBay deduction', deduct, 'total', '', '−');
    rows += ocRow('eBay Order Earning', earn, 'big');
    if (ali > 0) { rows += ocRow('AliExpress cost', ali, '', 'full cost deducted; VAT reclaim shown below', '−'); }
    if (cpc > 0) { rows += ocRow('Priority ad cost + 20% VAT', cpcTot, '', ocGBP(cpc) + ' × 1.2 — billed separately via the dashboard', '−'); }
    if (ali > 0 || cpc > 0) { rows += ocRow('Net Profit', net, 'big' + (net < 0 ? ' neg' : '')); }

    // VAT to HMRC — the Sales Analysis sheet's own convention: S = C − G − J − Priority VAT
    var vatC = S * 0.2, vatG = deduct * 0.2, vatJ = ali * 0.2, vatCPC = cpc * 0.2;
    var vatS = vatC - vatG - vatJ - vatCPC;
    var vrows = '';
    vrows += ocRow('Output VAT on sale', vatC, '', 'sale ' + ocGBP(S) + ' × 20% (column C)', '+');
    vrows += ocRow('VAT reclaimable on eBay fees', vatG, '', 'total eBay deduction × 20% (column G)', '−');
    if (ali > 0) { vrows += ocRow('VAT reclaimable on AliExpress', vatJ, '', ocGBP(ali) + ' × 20% (column J)', '−'); }
    if (cpc > 0) { vrows += ocRow('VAT reclaimable on priority ads', vatCPC, '', ocGBP(cpc) + ' × 20%', '−'); }
    vrows += ocRow('VAT owed to HMRC on this order', vatS, 'total ' + (vatS < 0 ? 'neg' : ''));

    h += '<div class="oc-fees">' + rows + '</div>';
    h += '<div class="oc-fees"><h3>VAT to HMRC (column S)</h3>' + vrows + '</div>';
    if (cat._g) { h += '<div class="oc-hint">' + esc(cat.n) + ' — ' + rateTxt + (cat.red ? ' · reduced 10p per-order (≤ £10)' : '') + '</div>'; }
    out.innerHTML = h;
  }

  VIEWS.calculator = {
    label: 'Order earning calculator',
    order: 21,
    roles: OC_ROLES,
    icon: '<rect x="4" y="2" width="16" height="20" rx="2"/><path d="M8 6h8"/><path d="M8 11h.01M12 11h.01M16 11h.01M8 15h.01M12 15h.01M16 15h.01M8 19h.01M12 19h.01M16 19h.01"/>',
    render: function () {
      var opts = '';
      CATS.forEach(function (g) {
        opts += '<optgroup label="' + esc(g.g) + '">';
        g.list.forEach(function (c) {
          opts += '<option value="' + OC_FLAT.indexOf(c) + '">' + esc(c.n) + '</option>';
        });
        opts += '</optgroup>';
      });
      return '<div class="hgroup enter d1"><h1>Order <span class="goldtext">earning</span></h1>' +
          '<span class="sub">Sir Hasib’s v18 calculator, exactly — banded FVF per category, VAT on every fee, the sheet’s own HMRC column</span></div>' +
        '<div class="card enter d2"><div class="bd">' +
          '<div class="oc-grid">' +
            '<div class="field"><label>Sale price £</label><input class="tk-in" id="ocPrice" type="number" step="0.01" min="0" placeholder="19.99"></div>' +
            '<div class="field"><label>Sale discount %</label><input class="tk-in" id="ocDiscPct" type="number" step="0.01" min="0" max="100" placeholder="0"></div>' +
            '<div class="field"><label>Sale discount £</label><input class="tk-in" id="ocDiscAmt" type="number" step="0.01" min="0" placeholder="0"></div>' +
            '<div class="field"><label>AliExpress cost £</label><input class="tk-in" id="ocAli" type="number" step="0.01" min="0" placeholder="3.20"></div>' +
            '<div class="field"><label>CPC ad cost £ (ex VAT)</label><input class="tk-in" id="ocCpc" type="number" step="0.01" min="0" placeholder="0"></div>' +
            '<div class="field"><label>Promoted General %</label><input class="tk-in" id="ocAdRate" type="number" step="0.1" min="0" placeholder="0"></div>' +
          '</div>' +
          '<div class="field" style="margin-top:12px"><label>Item title — paste it and the category picks itself</label>' +
            '<input class="tk-in" id="ocTitle" maxlength="120" placeholder="e.g. LED Strip Lights 5M RGB Colour Changing…">' +
            '<div class="oc-hint" id="ocAutoHint"></div></div>' +
          '<div class="field" style="margin-top:12px"><label>eBay category</label>' +
            '<select class="tk-in" id="ocCat">' + opts + '</select></div>' +
          '<div id="ocOut"><div class="oc-hint">Enter a sale price to begin — every figure updates as you type.</div></div>' +
        '</div></div>';
    },
    init: function () {
      ['ocPrice', 'ocAli', 'ocCpc', 'ocAdRate', 'ocCat'].forEach(function (id) {
        var el = $(id);
        if (el) { el.oninput = ocCalc; el.onchange = ocCalc; }
      });
      var dp = $('ocDiscPct'), da = $('ocDiscAmt');
      if (dp) { dp.oninput = function () { OC_DISC_MODE = 'pct'; ocCalc(); }; }
      if (da) { da.oninput = function () { OC_DISC_MODE = 'amt'; ocCalc(); }; }
      var tt = $('ocTitle');
      if (tt) {
        tt.oninput = function () {
          var hint = $('ocAutoHint'), sel = $('ocCat');
          var pick = ocAutoPick(this.value);
          if (pick >= 0 && sel) {
            sel.value = String(pick);
            if (hint) { hint.textContent = 'Auto-picked: ' + OC_FLAT[pick].n + ' — change it below if that’s wrong.'; }
            ocCalc();
          } else if (hint) {
            hint.textContent = this.value ? 'No confident match — pick the category below.' : '';
          }
        };
      }
    }
  };
})();
