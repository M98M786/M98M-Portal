/* view-advertisingMoney.js — review 3: "advertising page is still failed and doing nothing,
 * i need it to be proper money showing graph". Loads AFTER view-advertising.js (alphabetical
 * splice order) and re-registers VIEWS.advertising, so the sheet-bound PPC screen is replaced
 * by an Engine-fed money dashboard: spend vs eBay-attributed ad revenue per day, ROAS line
 * against the SOP 5× target, per account or combined, any window. */
(function () {

  var AM = { days: 14, acct: '', from: '', to: '' };

  VIEW_CSS.push(
    '.am-tiles{display:flex;gap:10px;flex-wrap:wrap;margin-bottom:14px}' +
    '.am-tile{flex:1 1 150px;border:1px solid var(--gold-line);border-radius:12px;padding:10px 14px;background:var(--panel-2)}' +
    '.am-tile .k{font-size:10.5px;text-transform:uppercase;letter-spacing:.08em;color:var(--text-3);font-weight:800}' +
    '.am-tile .v{font-size:20px;font-weight:800;font-variant-numeric:tabular-nums;margin-top:2px}' +
    '.am-tile.gold .v{color:var(--gold-a)}.am-tile.bad .v{color:var(--bad)}.am-tile.ok .v{color:var(--ok)}' +
    '.am-legend{display:flex;gap:14px;font-size:11px;font-weight:800;color:var(--text-3);margin:6px 0 2px;flex-wrap:wrap}' +
    '.am-legend i{display:inline-block;width:10px;height:10px;border-radius:3px;margin-right:5px;vertical-align:-1px}'
  );

  function amGBP(v) { var n = Number(v) || 0; return '£' + (Math.abs(n) >= 1000 ? (n / 1000).toFixed(1) + 'k' : n.toFixed(2)); }
  function amROAS(rev, sp) { return Number(sp) > 0.005 ? (Number(rev) / Number(sp)).toFixed(1) + '×' : '—'; }

  function amChart(ser) {
    /* oldest → newest left to right */
    var rows = ser.slice().reverse();
    if (!rows.length) { return '<div class="empty">No ad days in this window yet.</div>'; }
    var W = 940, H = 260, padL = 44, padR = 44, padB = 30, padT = 12;
    var iw = (W - padL - padR) / rows.length;
    var maxM = 1;
    rows.forEach(function (r) { maxM = Math.max(maxM, Number(r.spend) || 0, Number(r.rev) || 0); });
    var maxR = 1;
    rows.forEach(function (r) { if (Number(r.spend) > 0.005) { maxR = Math.max(maxR, (Number(r.rev) || 0) / Number(r.spend)); } });
    maxR = Math.max(maxR, 6);
    var y = function (v) { return H - padB - (v / maxM) * (H - padT - padB); };
    var yr = function (v) { return H - padB - (v / maxR) * (H - padT - padB); };
    var s = '<svg viewBox="0 0 ' + W + ' ' + H + '" style="width:100%;height:auto" preserveAspectRatio="none">';
    /* money gridlines */
    [0.25, 0.5, 0.75, 1].forEach(function (f) {
      s += '<line x1="' + padL + '" y1="' + y(maxM * f) + '" x2="' + (W - padR) + '" y2="' + y(maxM * f) + '" stroke="rgba(120,132,152,.18)" stroke-width="1"/>' +
        '<text x="' + (padL - 6) + '" y="' + (y(maxM * f) + 3) + '" text-anchor="end" font-size="9" fill="rgba(120,132,152,.8)">£' + Math.round(maxM * f) + '</text>';
    });
    /* the SOP target line at 5× on the ROAS axis */
    s += '<line x1="' + padL + '" y1="' + yr(5) + '" x2="' + (W - padR) + '" y2="' + yr(5) + '" stroke="rgba(240,96,90,.5)" stroke-width="1" stroke-dasharray="5 4"/>' +
      '<text x="' + (W - padR + 4) + '" y="' + (yr(5) + 3) + '" font-size="9" fill="rgba(240,96,90,.8)">5×</text>';
    var line = '';
    rows.forEach(function (r, i) {
      var x0 = padL + i * iw;
      var bw = Math.max(3, iw * 0.28);
      var sp = Number(r.spend) || 0, rv = Number(r.rev) || 0;
      var tt = '<title>' + r.date + ' — spend £' + sp.toFixed(2) + ' · ad revenue £' + rv.toFixed(2) + ' · ROAS ' + amROAS(rv, sp) + '</title>';
      s += '<rect x="' + (x0 + iw * 0.16) + '" y="' + y(sp) + '" width="' + bw + '" height="' + (y(0) - y(sp)) + '" rx="2" fill="#e8a33d" opacity=".9">' + tt + '</rect>';
      s += '<rect x="' + (x0 + iw * 0.16 + bw + 2) + '" y="' + y(rv) + '" width="' + bw + '" height="' + (y(0) - y(rv)) + '" rx="2" fill="#3fcf8e" opacity=".85">' + tt + '</rect>';
      if (sp > 0.005) {
        var px = x0 + iw / 2, py = yr(rv / sp);
        line += (line ? ' L' : 'M') + px.toFixed(1) + ' ' + py.toFixed(1);
        s += '<circle cx="' + px + '" cy="' + py + '" r="2.6" fill="#d9b64e">' + tt + '</circle>';
      }
      if (rows.length <= 32 && (rows.length <= 14 || i % 2 === 0)) {
        s += '<text x="' + (x0 + iw / 2) + '" y="' + (H - padB + 14) + '" text-anchor="middle" font-size="8.5" fill="rgba(120,132,152,.85)">' + String(r.date).slice(5) + '</text>';
      }
    });
    s += '<path d="' + line + '" fill="none" stroke="#d9b64e" stroke-width="2"/>';
    /* ROAS axis on the right */
    [2, 5, Math.round(maxR)].forEach(function (v) {
      s += '<text x="' + (W - padR + 4) + '" y="' + (yr(v) + 3) + '" font-size="9" fill="rgba(217,182,78,.85)">' + v + '×</text>';
    });
    s += '</svg>';
    return s;
  }

  function amLoad() {
    var box = $('amBody');
    if (!box) { return; }
    var payload = { days: AM.days };
    if (AM.acct) { payload.account = AM.acct; }
    if (AM.from && AM.to) { payload.from = AM.from; payload.to = AM.to; }
    api('adsBoard', payload).then(function (d) {
      var ser = (d && d.series) || [];
      var sp = 0, rv = 0, sold = 0;
      ser.forEach(function (r) { sp += Number(r.spend) || 0; rv += Number(r.rev) || 0; sold += Number(r.sold) || 0; });
      var roas = sp > 0.005 ? rv / sp : 0;
      var h = '<div class="am-tiles">' +
        '<div class="am-tile gold"><div class="k">Ad spend · window</div><div class="v">' + amGBP(sp) + '</div></div>' +
        '<div class="am-tile ok"><div class="k">eBay-attributed ad revenue</div><div class="v">' + amGBP(rv) + '</div></div>' +
        '<div class="am-tile ' + (roas && roas < 5 ? 'bad' : 'ok') + '"><div class="k">ROAS · target ≥ 5×</div><div class="v">' + (roas ? roas.toFixed(2) + '×' : '—') + '</div></div>' +
        '<div class="am-tile"><div class="k">Sold via ads</div><div class="v">' + sold + '</div></div>' +
        '<div class="am-tile"><div class="k">Spend incl VAT</div><div class="v">' + amGBP(sp * 1.2) + '</div></div>' +
        '</div>' +
        '<div class="am-legend"><span><i style="background:#e8a33d"></i>Spend</span>' +
        '<span><i style="background:#3fcf8e"></i>Ad revenue</span>' +
        '<span><i style="background:#d9b64e"></i>ROAS line · dashed red = the 5× SOP target</span></div>' +
        amChart(ser) +
        '<p style="font-size:11px;color:var(--text-3);font-weight:600;margin-top:8px">' +
        (AM.acct ? esc(AM.acct) : 'All accounts') + ' · ' + esc(String((d && d.from) || '')) + ' → ' + esc(String((d && d.to) || '')) +
        ' · spend and revenue are eBay’s own report figures (ex VAT) · the per-item board lives on the Ads command centre</p>';
      box.innerHTML = h;
    }).catch(function (e) {
      box.innerHTML = '<div style="color:var(--text-2);font-weight:700;padding:12px 0">Could not load the money board.<span style="display:block;color:var(--text-3);font-weight:600;font-size:12px;margin-top:4px">' + esc(e.message) + '</span></div>';
    });
  }

  var AM_ROLES = ['Advertising Manager', 'Management', 'Ops Head']; /* review 4 */

  VIEWS.advertising = {
    label: 'Advertising',
    icon: '<path d="M4 10v4a1 1 0 0 0 1 1h2.5l4.5 4V5L7.5 9H5a1 1 0 0 0-1 1z"/><path d="M16 9a4 4 0 0 1 0 6"/><path d="M18.8 6a8 8 0 0 1 0 12"/>',
    roles: AM_ROLES,
    order: 23,
    prefetch: function () { return api('adsBoard', { days: 14 }); },
    render: function () {
      return '<div class="hgroup enter d1"><h1>Advertising <span class="goldtext">money</span></h1>' +
        '<span class="sub">what the ads cost against what they brought back — per day, per account, against the 5× target</span>' +
        '<span style="margin-left:auto;display:flex;gap:6px;flex-wrap:wrap">' +
        [7, 14, 30, 60].map(function (n) {
          return '<button class="minibtn' + (AM.days === n && !AM.from ? ' on' : '') + '" data-am-d="' + n + '">' + n + 'd</button>';
        }).join('') +
        '<select id="amAcct" class="minibtn" style="padding:6px 8px"><option value="">All accounts</option></select>' +
        '<input type="date" id="amFrom" class="minibtn" style="padding:5px 6px"><input type="date" id="amTo" class="minibtn" style="padding:5px 6px">' +
        '<button class="minibtn" id="amApply">Apply</button></span></div>' +
        '<div class="card enter d2"><div class="bd" id="amBody"><div class="spinner"></div></div></div>';
    },
    init: function () {
      document.querySelectorAll('[data-am-d]').forEach(function (b) {
        b.onclick = function () {
          document.querySelectorAll('[data-am-d]').forEach(function (x) { x.classList.remove('on'); });
          this.classList.add('on');
          AM.days = Number(this.getAttribute('data-am-d')) || 14; AM.from = ''; AM.to = '';
          amLoad();
        };
      });
      var sel = $('amAcct');
      if (sel) {
        ['AZHAR ABRT', 'Amna Baji', 'Azhar Bhai', 'HAFIZA BHAJI', 'Saif Bhai'].forEach(function (a) {
          var o = document.createElement('option'); o.value = a; o.textContent = a; sel.appendChild(o);
        });
        sel.value = AM.acct || '';
        sel.onchange = function () { AM.acct = sel.value; amLoad(); };
      }
      var ap = $('amApply');
      if (ap) {
        ap.onclick = function () {
          var f = $('amFrom'), t = $('amTo');
          if (f && t && f.value && t.value) { AM.from = f.value; AM.to = t.value; amLoad(); }
          else { toast('Pick both dates first.'); }
        };
      }
      amLoad();
    }
  };
})();
