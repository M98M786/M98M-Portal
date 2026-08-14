/* §13.1 the business dashboard, built to the standard of the Running Score sheet Hasib uses:
   a KPI strip, profit read against ad spend with the N/T line, then the ledger per account.
   All figures come from the DASH_CACHE the 15-minute trigger fills from the Sales Analysis
   sheets — the screen computes nothing of its own, so what it shows is what the sheets say. */
(function () {
'use strict';

var DB_VIEW_ROLES = ['Management', 'Ops Head', 'Team Lead', 'Advertising Manager', 'CS'];

/* The workbook's own labels. Never invent one — a renamed figure is a wrong figure. */
var T_SOLD   = 'Sold';
var T_PROFIT = 'ACTUAL PROFIT (after old returns)';
var T_ALI    = 'AliExpress Cost';
var T_ADS    = 'All Ads incl VAT (waste inside)';
var T_RET    = 'RETURNS';
var T_MARGIN = 'Margin';
var C_ORDERS = 'Orders';
var C_UNITS  = 'Units';
var C_RAW    = 'Raw Profit (T)';
var C_RATIO  = 'Ratio N/T';
var C_ACTUAL = 'Actual Profit (V)';
var C_WASTE  = 'Ad Waste';

var dbData = null;

VIEW_CSS.push(
  '.db-kpis{display:grid;grid-template-columns:repeat(6,1fr);gap:1px;background:var(--gold-line);' +
    'border:1px solid var(--gold-line);border-radius:12px;overflow:hidden;margin:18px 0 20px}' +
  '.db-kpi{background:var(--panel);padding:15px 16px 14px;min-width:0}' +
  '.db-kpi .lab{font-size:10.5px;letter-spacing:.11em;text-transform:uppercase;color:var(--text-3)}' +
  '.db-kpi .val{font-size:22px;font-weight:800;margin-top:7px;letter-spacing:-.02em;' +
    'font-variant-numeric:tabular-nums;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}' +
  '.db-kpi .note{font-size:11.5px;color:var(--text-3);margin-top:3px}' +
  '.db-kpi.gold .val{background:linear-gradient(110deg,var(--gold-c),var(--gold-a) 30%,var(--gold-b) 70%,var(--gold-c));' +
    '-webkit-background-clip:text;background-clip:text;color:transparent}' +
  '.db-kpi.blue .val{color:var(--blue-2)}' +
  '.db-chart{margin-top:12px;position:relative}' +
  '.db-chart svg{display:block;width:100%;height:auto;overflow:visible}' +
  '.db-gl{stroke:var(--gold-line);stroke-width:1}' +
  '.db-ax{font-size:10px;fill:var(--text-3);font-variant-numeric:tabular-nums}' +
  '.db-plab{font-size:11.5px;fill:var(--text-2);font-weight:700}' +
  '.db-ntline{fill:none;stroke:var(--gold-a);stroke-width:2;stroke-linejoin:round}' +
  '.db-ntdot{fill:var(--panel);stroke:var(--gold-a);stroke-width:2}' +
  '.db-legend{display:flex;gap:18px;flex-wrap:wrap;font-size:11.5px;color:var(--text-2);margin-top:10px}' +
  '.db-legend i{width:11px;height:11px;border-radius:3px;display:inline-block;margin-right:7px;vertical-align:-1px}' +
  '.db-nt{display:inline-block;font-size:12.5px;padding:3px 9px;border-radius:20px;border:1px solid;font-variant-numeric:tabular-nums}' +
  '.db-nt.good{color:var(--ok);border-color:rgba(63,207,142,.4);background:var(--ok-soft)}' +
  '.db-nt.mid{color:var(--warn);border-color:rgba(255,159,67,.4);background:var(--warn-soft)}' +
  '.db-nt.bad{color:var(--bad);border-color:rgba(240,96,90,.4);background:var(--bad-soft)}' +
  '.db-note{display:flex;gap:9px;align-items:flex-start;padding:9px 12px;border-radius:9px;' +
    'background:var(--warn-soft);border:1px solid rgba(255,159,67,.3);margin-top:9px;font-size:12.5px;color:var(--text-2)}' +
  '.db-note b{color:var(--warn)}' +
  '.db-stamp{font-size:11.5px;color:var(--text-3);white-space:nowrap}' +
  '.db-stamp.stale{color:var(--warn)}' +
  '@media(max-width:940px){.db-kpis{grid-template-columns:repeat(3,1fr)}}' +
  '@media(max-width:560px){.db-kpis{grid-template-columns:repeat(2,1fr)}}'
);

function gbp(n) {
  var v = Number(n);
  if (!isFinite(v)) return '—';
  return '£' + v.toLocaleString('en-GB', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}
function num(n) {
  var v = Number(n);
  return isFinite(v) ? v.toLocaleString('en-GB') : '—';
}
function pct(n) { var v = Number(n); return isFinite(v) ? v.toFixed(1) + '%' : '—'; }
function tile(obj, key) { return obj && obj[key] !== undefined && obj[key] !== null ? Number(obj[key]) : NaN; }
function ntClass(v) { return !isFinite(v) ? 'mid' : v < 1 ? 'good' : v < 1.5 ? 'mid' : 'bad'; }

/* Margin and N/T are ratios: recomputed from the summed parts, because an average of ratios
   across accounts is not the ratio of the whole. */
function marginOf(sold, profit) {
  return (isFinite(sold) && sold > 0 && isFinite(profit)) ? (profit / sold) * 100 : NaN;
}

function kpiStrip(d) {
  var m = (d.collective && d.collective.month) || {};
  var sold = tile(m, T_SOLD), profit = tile(m, T_PROFIT), ads = tile(m, T_ADS);
  var ali = tile(m, T_ALI), units = tile(m, C_UNITS), orders = tile(m, C_ORDERS);
  var lastProfit = tile((d.collective && d.collective.last_month) || {}, T_PROFIT);
  var margin = isFinite(tile(m, T_MARGIN)) ? tile(m, T_MARGIN) : marginOf(sold, profit);
  var nt = (isFinite(ads) && isFinite(profit) && profit > 0) ? ads / profit : NaN;

  return '<div class="db-kpis">' +
    kpi('Orders', num(orders), d.period.current_label, '') +
    kpi('Units sold', num(units), '', '') +
    kpi('Sold', gbp(sold), d.period.current_label, 'gold') +
    kpi('Actual profit', gbp(profit), isFinite(lastProfit) ? 'last month ' + gbp(lastProfit) : '', 'gold') +
    kpi('Margin', isFinite(margin) ? margin.toFixed(1) + '%' : '—',
        isFinite(ali) ? 'AliExpress ' + gbp(ali) : '', '') +
    kpi('Ads incl VAT', gbp(ads), isFinite(nt) ? 'N/T ' + nt.toFixed(2) : '', 'blue') +
  '</div>';
}
function kpi(lab, val, note, cls) {
  return '<div class="db-kpi ' + cls + '"><div class="lab">' + esc(lab) + '</div>' +
    '<div class="val">' + esc(val) + '</div>' +
    '<div class="note">' + esc(note || '') + '</div></div>';
}

/* Profit against ad spend, one pair of bars per account, with the N/T ratio as a line on its
   own right-hand scale and a dashed break-even mark at 1.00 — below it, profit outran the ads. */
function chart(d) {
  var rows = (d.accounts || []).map(function (a) {
    var mo = (a.month && a.month.tiles) || {};
    return {
      name: a.account,
      profit: tile(mo, T_PROFIT),
      ads: tile(mo, T_ADS),
      nt: (function () {
        var r = tile(mo, C_RATIO);
        if (isFinite(r)) return r;
        var p = tile(mo, T_PROFIT), s = tile(mo, T_ADS);
        return (isFinite(p) && p > 0 && isFinite(s)) ? s / p : NaN;
      })()
    };
  }).filter(function (r) { return isFinite(r.profit) || isFinite(r.ads); });

  if (!rows.length) {
    return '<div class="bd" style="color:var(--text-3);font-weight:600;padding:24px;text-align:center">' +
      'No figures yet for ' + esc(d.period.current_label) + '.</div>';
  }

  var W = 900, H = 320, mL = 58, mR = 46, mT = 16, mB = 54;
  var iw = W - mL - mR, ih = H - mT - mB;
  var max = 0;
  rows.forEach(function (r) {
    if (isFinite(r.profit)) max = Math.max(max, r.profit);
    if (isFinite(r.ads)) max = Math.max(max, r.ads);
  });
  var top = Math.max(25, Math.ceil(max / 25) * 25);
  var ntMax = 2;
  var y = function (v) { return mT + ih - (v / top) * ih; };
  var yn = function (v) { return mT + ih - (Math.min(v, ntMax) / ntMax) * ih; };
  var band = iw / rows.length;
  var bw = Math.min(30, band * 0.26);
  var gap = 7;

  var g = '';
  for (var v = 0; v <= top; v += top / 4) {
    g += '<line class="db-gl" x1="' + mL + '" y1="' + y(v) + '" x2="' + (mL + iw) + '" y2="' + y(v) + '"/>' +
      '<text class="db-ax" x="' + (mL - 10) + '" y="' + (y(v) + 3.5) + '" text-anchor="end">' +
      (v === 0 ? '0' : '£' + Math.round(v)) + '</text>';
  }
  for (var r2 = 0; r2 <= ntMax; r2 += 0.5) {
    g += '<text class="db-ax" x="' + (mL + iw + 10) + '" y="' + (yn(r2) + 3.5) + '" fill="#E9A93C">' + r2.toFixed(1) + '</text>';
  }
  g += '<line x1="' + mL + '" y1="' + yn(1) + '" x2="' + (mL + iw) + '" y2="' + yn(1) + '" ' +
    'stroke="#E9A93C" stroke-width="1" stroke-dasharray="3 5" opacity=".45"/>' +
    '<text class="db-ax" x="' + (mL + iw - 4) + '" y="' + (yn(1) - 7) + '" text-anchor="end" fill="#E9A93C" opacity=".75">N/T 1.00</text>';

  var bars = '', line = '', dots = '', started = false;
  rows.forEach(function (r, i) {
    var cx = mL + band * i + band / 2;
    if (isFinite(r.profit)) {
      bars += '<rect x="' + (cx - bw - gap / 2) + '" y="' + y(r.profit) + '" width="' + bw +
        '" height="' + Math.max(1, mT + ih - y(r.profit)) + '" rx="3" fill="url(#dbGold)"><title>' +
        esc(r.name) + ' profit ' + gbp(r.profit) + '</title></rect>';
    }
    if (isFinite(r.ads)) {
      bars += '<rect x="' + (cx + gap / 2) + '" y="' + y(r.ads) + '" width="' + bw +
        '" height="' + Math.max(1, mT + ih - y(r.ads)) + '" rx="3" fill="#3D9BF0" opacity=".82"><title>' +
        esc(r.name) + ' ads ' + gbp(r.ads) + '</title></rect>';
    }
    bars += '<text class="db-plab" x="' + cx + '" y="' + (mT + ih + 22) + '" text-anchor="middle">' +
      esc(r.name.length > 14 ? r.name.slice(0, 13) + '…' : r.name) + '</text>';
    if (isFinite(r.nt)) {
      line += (started ? 'L' : 'M') + cx + ',' + yn(r.nt);
      started = true;
      dots += '<circle class="db-ntdot" cx="' + cx + '" cy="' + yn(r.nt) + '" r="4.5"><title>N/T ' + r.nt.toFixed(2) + '</title></circle>';
    }
  });

  return '<div class="db-chart"><svg viewBox="0 0 ' + W + ' ' + H + '" role="img" ' +
    'aria-label="Profit against ad spend by account">' +
    '<defs><linearGradient id="dbGold" x1="0" y1="0" x2="0" y2="1">' +
    '<stop offset="0%" stop-color="#F6D06B"/><stop offset="100%" stop-color="#B66F1F"/>' +
    '</linearGradient></defs>' + g + bars +
    (started ? '<path class="db-ntline" d="' + line + '"/>' : '') + dots + '</svg></div>' +
    '<div class="db-legend">' +
      '<span><i style="background:linear-gradient(180deg,#F6D06B,#B66F1F)"></i>Actual profit</span>' +
      '<span><i style="background:var(--blue)"></i>Ads incl VAT</span>' +
      '<span><i style="background:var(--gold-a);border-radius:50%"></i>N/T — ad pounds per profit pound</span>' +
    '</div>';
}

function ledger(d) {
  var rows = (d.accounts || []).map(function (a) {
    var mo = (a.month && a.month.tiles) || {};
    var yd = (a.yesterday && a.yesterday.tiles) || {};
    var sold = tile(mo, T_SOLD), profit = tile(mo, T_PROFIT), ads = tile(mo, T_ADS);
    var margin = isFinite(tile(mo, T_MARGIN)) ? tile(mo, T_MARGIN) : marginOf(sold, profit);
    var nt = isFinite(tile(mo, C_RATIO)) ? tile(mo, C_RATIO)
      : (isFinite(profit) && profit > 0 && isFinite(ads) ? ads / profit : NaN);
    var quiet = a.reason ? '<div style="font-size:11.5px;color:var(--text-3);font-weight:600">' + esc(a.reason) + '</div>' : '';
    return '<tr>' +
      '<td><b>' + esc(a.account) + '</b>' + quiet + '</td>' +
      '<td class="num">' + num(tile(mo, C_ORDERS)) + '</td>' +
      '<td class="num">' + num(tile(mo, C_UNITS)) + '</td>' +
      '<td class="num">' + gbp(sold) + '</td>' +
      '<td class="num" style="color:var(--text-3)">' + gbp(tile(mo, T_ALI)) + '</td>' +
      '<td class="num" style="color:var(--gold-a)">' + gbp(profit) + '</td>' +
      '<td class="num">' + pct(margin) + '</td>' +
      '<td class="num" style="color:var(--blue-2)">' + gbp(ads) + '</td>' +
      '<td class="num"><span class="db-nt ' + ntClass(nt) + '">' + (isFinite(nt) ? nt.toFixed(2) : '—') + '</span></td>' +
      '<td class="num" style="color:var(--gold-a)">' + gbp(tile(yd, C_ACTUAL)) + '</td>' +
    '</tr>';
  }).join('');

  var m = (d.collective && d.collective.month) || {};
  var cSold = tile(m, T_SOLD), cProfit = tile(m, T_PROFIT), cAds = tile(m, T_ADS);
  var cMargin = isFinite(tile(m, T_MARGIN)) ? tile(m, T_MARGIN) : marginOf(cSold, cProfit);
  var cNt = (isFinite(cAds) && isFinite(cProfit) && cProfit > 0) ? cAds / cProfit : NaN;

  return '<div class="scroll"><table>' +
    '<thead><tr><th>Account</th><th style="text-align:right">Orders</th><th style="text-align:right">Units</th>' +
    '<th style="text-align:right">Sold</th><th style="text-align:right">AliExpress</th>' +
    '<th style="text-align:right">Actual profit</th><th style="text-align:right">Margin</th>' +
    '<th style="text-align:right">Ads incl VAT</th><th style="text-align:right">N/T</th>' +
    '<th style="text-align:right">Profit yesterday</th></tr></thead>' +
    '<tbody>' + (rows || '<tr><td colspan="10" style="text-align:center;color:var(--text-3);padding:20px">No accounts yet.</td></tr>') + '</tbody>' +
    '<tfoot><tr style="border-top:2px solid var(--gold-b)">' +
      '<td><b>All accounts</b></td>' +
      '<td class="num">' + num(tile(m, C_ORDERS)) + '</td>' +
      '<td class="num">' + num(tile(m, C_UNITS)) + '</td>' +
      '<td class="num">' + gbp(cSold) + '</td>' +
      '<td class="num" style="color:var(--text-3)">' + gbp(tile(m, T_ALI)) + '</td>' +
      '<td class="num" style="color:var(--gold-a)">' + gbp(cProfit) + '</td>' +
      '<td class="num">' + pct(cMargin) + '</td>' +
      '<td class="num" style="color:var(--blue-2)">' + gbp(cAds) + '</td>' +
      '<td class="num"><span class="db-nt ' + ntClass(cNt) + '">' + (isFinite(cNt) ? cNt.toFixed(2) : '—') + '</span></td>' +
      '<td class="num"></td>' +
    '</tr></tfoot></table></div>';
}

/* §13.1: where a workbook disagrees with itself, both numbers are shown. Hiding it would mean
   quietly choosing which of your own figures to believe. */
function notes(d) {
  var list = d.discrepancies || [];
  if (!list.length) return '';
  return list.map(function (n) {
    var txt = typeof n === 'string' ? n : (n.message || n.note || JSON.stringify(n));
    return '<div class="db-note"><b>⚠</b><div>' + esc(txt) + '</div></div>';
  }).join('');
}

function paint() {
  var d = dbData;
  if (!d) return;
  var host = $('dbBody');
  if (!host) return;
  var stamp = $('dbStamp');
  if (stamp) {
    stamp.textContent = d.last_updated ? 'figures as at ' + fmtPkt(d.last_updated, true) : 'not computed yet';
    stamp.className = 'db-stamp' + (d.stale ? ' stale' : '');
  }
  var btn = $('dbRefresh');
  if (btn) btn.classList.toggle('hidden', !d.may_refresh);

  host.innerHTML =
    kpiStrip(d) +
    notes(d) +
    '<div class="card enter d2"><div class="hd">Profit against ad spend ' +
      '<span class="hint">gold is what the business kept · blue is what the ads took · below N/T 1.00 profit outran the ads</span></div>' +
      '<div class="bd">' + chart(d) + '</div></div>' +
    '<div class="card enter d3" style="margin-top:16px"><div class="hd">The ledger ' +
      '<span class="hint">' + esc(d.period.current_label) + ' · straight from your Sales Analysis sheets</span></div>' +
      '<div class="bd">' + ledger(d) + '</div></div>' +
    (d.scoped ? '<div class="db-note" style="margin-top:12px"><b>i</b><div>Some accounts are hidden because your access is limited to certain accounts.</div></div>' : '');
}

function load(force) {
  var host = $('dbBody');
  // Only show a spinner when there is genuinely nothing to look at. If this screen has been
  // opened before, it paints the previous figures at once and swaps in the fresh ones when the
  // backend answers — the stamp line says which of the two you are reading.
  if (!force && typeof apiCached === 'function' && cacheRead('dashboard', {}) != null) {
    apiCached('dashboard', {}, function (d, stale) {
      dbData = d;
      paint();
      var s = $('dbStamp');
      if (s && stale) { s.textContent = s.textContent + ' · updating…'; }
    }).catch(function () { /* apiCached already fell back to the cached figures */ });
    return;
  }
  if (host) host.innerHTML = '<div class="spinner"></div>';
  api(force ? 'refreshDashboard' : 'dashboard').then(function (d) {
    dbData = d;
    if (typeof cacheWrite === 'function') { cacheWrite('dashboard', {}, d); }
    paint();
  }).catch(function (e) {
    if (host) {
      host.innerHTML = '<div class="card"><div class="bd" style="padding:26px;text-align:center;color:var(--text-3);font-weight:600">' +
        esc(e.message === 'auth' ? 'Please sign in again.' : e.message) +
        '<div style="margin-top:8px;font-size:12.5px">If this says "not computed yet", the 15-minute refresh has not run since setup.</div></div></div>';
    }
  });
}

VIEWS.dashboard = {
  label: 'Sales analysis',
  order: 5,
  roles: DB_VIEW_ROLES,
  icon: '<path d="M4 13h6V4H4zM14 20h6V4h-6zM4 20h6v-4H4z"/>',
  prefetch: function () {
    return api('dashboard').then(function (d) {
      if (typeof cacheWrite === 'function') { cacheWrite('dashboard', {}, d); }
      return d;
    });
  },
  render: function () {
    return '<div class="hgroup enter d1"><h1>Business <span class="goldtext">overview</span></h1>' +
      '<span class="sub" id="dbStamp">loading…</span>' +
      '<button class="btn-ghost hidden" id="dbRefresh" style="margin-left:auto">Refresh now</button></div>' +
      '<div id="dbBody"><div class="spinner"></div></div>';
  },
  init: function () {
    var b = $('dbRefresh');
    if (b) b.onclick = function () { b.disabled = true; b.textContent = 'Refreshing…';
      api('refreshDashboard').then(function (d) { dbData = d; paint(); })
        .catch(function (e) { toast('Could not refresh: ' + e.message); })
        .then(function () { b.disabled = false; b.textContent = 'Refresh now'; }); };
    load(false);
  }
};
})();
