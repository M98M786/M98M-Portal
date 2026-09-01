/* §13.1 the business dashboard, built to the standard of the Running Score sheet Hasib uses:
   a KPI strip, profit read against ad spend with the N/T line, then the ledger per account.
   All figures come from the DASH_CACHE the 15-minute trigger fills from the Sales Analysis
   sheets — the screen computes nothing of its own, so what it shows is what the sheets say. */
(function () {
'use strict';

var DB_VIEW_ROLES = ['Management', 'Ops Head', 'Advertising Manager', 'CS']; /* review 4: no sales analysis for Team Lead */

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
var DB_ACC = '';   /* '' = all accounts; chips on the tiles set this */
var DB_TRUTH = null; /* TRUTH v2: pageMetrics for the month scope */

VIEW_CSS.push(
  '.db-excl{border:1px solid rgba(240,96,90,.45);background:var(--bad-soft);border-radius:11px;' +
    'padding:11px 14px;margin:-8px 0 18px;font-size:12.5px;font-weight:700;line-height:1.55;color:var(--text-2)}' +
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
  /* dashCollective_ answers {tiles, accounts_included} — the metrics live one level down. Reading
     the wrapper made every figure undefined, which is why this whole strip sat on '—' while the
     per-account rows below it (which do hop through .tiles) showed real money. */
  var m = (d.collective && d.collective.month && d.collective.month.tiles) || {};
  var sold = tile(m, T_SOLD), profit = tile(m, T_PROFIT), ads = tile(m, T_ADS);
  var ali = tile(m, T_ALI), units = tile(m, C_UNITS), orders = tile(m, C_ORDERS);
  var lastProfit = tile((d.collective && d.collective.last_month && d.collective.last_month.tiles) || {}, T_PROFIT);
  // The workbook stores Margin as a fraction (0.099 = 9.9%), so it needs scaling; marginOf already returns percent.
  var margin = isFinite(tile(m, T_MARGIN)) ? tile(m, T_MARGIN) * 100 : marginOf(sold, profit);
  var nt = (isFinite(ads) && isFinite(profit) && profit > 0) ? ads / profit : NaN;

  /* 30 Aug (owner: "still same") — when the engine's month truth is present, THE TILES show
     eBay's own live month (orders, units, sold, Actual by the law) and the books' card value
     drops to the sub-line. The books' per-account cards below stay as they are. */
  /* TRUTH v2 WO-04 (money module LIVE): the month tiles come from the register — SOLD_SHEET,
     ACTUAL_PROFIT (Σ Raw Profit), VAT_TO_HMRC_MTD, MARGIN, ROWS_COVERAGE — with SOLD_API as the
     eBay sub-line. The ads tile stays on the old path until the ads module flips (Phase 4). */
  if (DB_TRUTH && DB_TRUTH.metrics) {
    var M = DB_TRUTH.metrics;
    var cov = M.ROWS_COVERAGE.value || {};
    var soldApi = (M.SOLD_API.value || {}).all;
    var t0 = d.engine_truth || {};
    var adsOld = Number(t0.n_ads) > 0 ? Number(t0.n_ads) : NaN;
    var accs2 = Object.keys((M.MONEY_BY_ACCOUNT.value) || {});
    var chips2 = '<div class="acct-chips" style="margin-bottom:12px">' +
      '<button class="minibtn' + (!DB_ACC ? ' on' : '') + '" data-db-acc="">All accounts</button>' +
      accs2.map(function (a) { return '<button class="minibtn' + (DB_ACC === a ? ' on' : '') + '" data-db-acc="' + esc(a).replace(/"/g, '&quot;') + '">' + esc(a) + '</button>'; }).join('') + '</div>';
    var pickM = DB_ACC ? (M.MONEY_BY_ACCOUNT.value || {})[DB_ACC] : null;
    var vSold = pickM ? pickM.sold : M.SOLD_SHEET.value;
    var vAct = pickM ? pickM.actual : M.ACTUAL_PROFIT.value;
    var vVat = pickM ? pickM.vat : M.VAT_TO_HMRC.value;
    var vAli = pickM ? pickM.ali : M.ALI_COST.value;
    var vMargin = pickM ? pickM.margin : M.MARGIN.value;
    var apiSub = DB_ACC ? (((M.SOLD_API.value || {}).by || {})[DB_ACC] || {}).sold : soldApi;
    var rowsSub = DB_ACC ? (pickM ? pickM.rows : 0) : cov.rows;
    var ordSub = DB_ACC ? (((M.SOLD_API.value || {}).by || {})[DB_ACC] || {}).orders : cov.orders;
    return chips2 + '<div class="db-kpis">' +
      kpi('Sold (books)', gbp(vSold), 'eBay: ' + gbp(apiSub || 0) + ' · rows ' + (rowsSub || 0) + ' of ' + (ordSub || 0), 'gold') + 
      kpi('Actual profit', gbp(vAct), 'Σ Raw Profit — the day tabs\' own column', 'gold') +
      kpi('VAT to HMRC', gbp(vVat), 'Σ VAT to HMRC — the calculator writes it, the portal reads it', 'blue') +
      kpi('AliExpress cost', gbp(vAli), 'Σ Total AliExpress Cost incl VAT', '') +
      kpi('Margin', vMargin == null ? '—' : (vMargin + '%'), 'actual ÷ sold (books)', '') +
      kpi('Ads (N) incl VAT', isFinite(adsOld) ? gbp(adsOld) : '—', 'old path · flips with the ads module', '') +
    '</div>' +
    '<div class="db-note" style="border-color:var(--gold-line)"><b>i</b><div>rows written ' + (cov.rows || 0) + ' of ' + (cov.orders || 0) + ' orders this month · figures as at ' + esc(String(DB_TRUTH.asOf).slice(11, 16)) + ' UTC ' + mChip(M.ACTUAL_PROFIT) + '</div></div>';
  }
  var t = d.engine_truth;
  if (t && isFinite(Number(t.sold)) && t.orders !== undefined) {
    /* 30 Aug (owner): "give options in sales analysis for account to account data" — chips pick
       one seller; the tiles, VAT and the note below all follow. */
    var accs = t.accounts || [];
    var pick = null;
    if (DB_ACC) { accs.some(function (a) { if (a.account === DB_ACC) { pick = a; return true; } return false; }); }
    var chips = accs.length ? '<div class="acct-chips" style="margin-bottom:12px">' +
      '<button class="minibtn' + (!DB_ACC ? ' on' : '') + '" data-db-acc="">All accounts</button>' +
      accs.map(function (a) {
        return '<button class="minibtn' + (DB_ACC === a.account ? ' on' : '') + '" data-db-acc="' + esc(a.account).replace(/"/g, '&quot;') + '">' + esc(a.account) + '</button>';
      }).join('') + '</div>' : '';
    var src = pick || t;
    var tSold = Number(pick ? pick.sold : t.sold), tActual = Number(pick ? pick.actual : t.actual);
    var tMargin = tSold > 0 ? (tActual / tSold * 100) : NaN;
    var tAds = Number(src.n_ads) > 0 ? Number(src.n_ads) : Number(t.cpc_ads || 0) * 1.2;
    var tEst = Number(pick ? pick.est_days : t.provisional_days) > 0;
    var tVat = pick ? pick.vat_due : t.vat_due;
    var tOrders = Number(pick ? pick.orders : t.orders), tUnits = Number(pick ? pick.units : t.units);
    return chips + '<div class="db-kpis">' +
      kpi('Orders', num(tOrders), d.period.current_label + ' · eBay live' + (pick ? ' · ' + pick.account : ''), '') +
      kpi('Units sold', num(tUnits), 'eBay live', '') +
      kpi('Sold', gbp(tSold), 'eBay\'s own data' + (!pick && isFinite(sold) && sold ? ' · cards say ' + gbp(sold) : ''), 'gold') +
      kpi('Actual profit', gbp(tActual), 'T = 0.8×(OE−Ali) − CPC − returns · the sheet law', 'gold') +
      kpi('Margin', isFinite(tMargin) ? tMargin.toFixed(1) + '%' : '—', 'actual ÷ sold', '') +
      kpi('Ads (N) incl VAT', gbp(tAds), (isFinite(tActual) && tActual > 0 ? 'N/T ' + (tAds / tActual).toFixed(2) : '') + (tEst ? ' · ⏳ est. days inside' : ''), 'blue') +
      kpi('VAT to pay · MTD', tVat == null ? '—' : gbp(tVat), tVat == null ? 'history still building' : 'the calculator\'s HMRC line', 'blue') +
    '</div>' + (pick ? '' : truthNote(d, sold) + excludedNote(d));
  }
  return '<div class="db-kpis">' +
    kpi('Orders', num(orders), d.period.current_label, '') +
    kpi('Units sold', num(units), '', '') +
    kpi('Sold', gbp(sold), d.period.current_label, 'gold') +
    kpi('Actual profit', gbp(profit), isFinite(lastProfit) ? 'last month ' + gbp(lastProfit) : '', 'gold') +
    kpi('Margin', isFinite(margin) ? margin.toFixed(1) + '%' : '—',
        isFinite(ali) ? 'AliExpress ' + gbp(ali) : '', '') +
    kpi('Ads incl VAT', gbp(ads), isFinite(nt) ? 'N/T ' + nt.toFixed(2) : '', 'blue') +
  '</div>' + truthNote(d, sold) + excludedNote(d);
}
/* 27 Aug (owner: "validate numbers") — the tiles above are the account books' own cards; the
   engine's sales_daily is eBay's own daily money. When the two part company by more than 2%,
   say so in plain words and name the books that have gone quiet, with their last fresh day. */
function truthNote(d, sheetSold) {
  return '';   /* TRUTH v2 WO-04: banner retired */

  var t = d.engine_truth;
  if (!t || !isFinite(t.sold) || !isFinite(sheetSold) || !sheetSold) { return ''; }
  var gap = t.sold - sheetSold;
  if (Math.abs(gap) < t.sold * 0.02) {
    return '<div class="db-excl" style="border-color:rgba(63,207,142,.4);color:var(--ok)">✓ Checked against eBay\'s own order data: ' +
      gbp(t.sold) + ' this month — the cards above agree within 2%.</div>';
  }
  /* 30 Aug (owner: "pop ups and errors in sales analysis are wrong — remove") — a books-behind
     gap smaller than ~a day's takings is just yesterday's rows not written up yet, and the
     nightly corrector closes it on its own. Say that calmly instead of shouting. */
  var dayish = t.sold / 26;                                     // a rough single day of the month
  if (gap > 0 && gap < dayish * 1.8) {
    return '<div class="db-excl" style="border-color:var(--gold-line-hi);color:var(--text-2)">ℹ The books are ' + gbp(gap) +
      ' behind eBay — that is yesterday\'s rows not written up yet. The nightly corrector aligns every closed day; nothing is wrong.</div>';
  }
  var stale = Object.keys(t.last_fresh_day || {}).filter(function (a) {
    return (Date.now() - Date.parse(t.last_fresh_day[a])) > 2 * 86400000;   // quiet for 2+ days
  }).map(function (a) { return esc(a) + ' (last real sales day ' + esc(t.last_fresh_day[a]) + ')'; });
  return '<div class="db-excl">⚠ eBay\'s own order data says this month is <b>' + gbp(t.sold) + '</b> — the account books\' cards above ' +
    (gap > 0 ? 'UNDERSTATE' : 'overstate') + ' it by <b>' + gbp(Math.abs(gap)) + '</b>' +
    (stale.length ? ' — quiet books: ' + stale.join(' · ') : '') + '. The nightly corrector will close what it can; a gap this size deserves a look.</div>';
}
/* A broken workbook cell no longer poisons these tiles — but the reader must be TOLD, or the
   fleet total silently under-reports (Amna Baji's August Returns read -2.2 trillion). */
function excludedNote(d) {
  return '';   /* TRUTH v2 WO-04: banner retired */

  var ex = (d.collective && d.collective.month && d.collective.month.excluded) || [];
  if (!ex.length) { return ''; }
  var who = {};
  ex.forEach(function (e) { (who[e.account] = who[e.account] || []).push(e.metric); });
  var lines = Object.keys(who).map(function (a) { return esc(a) + ' (' + esc(who[a].join(', ')) + ')'; }).join(' · ');
  return '<div class="db-excl">⚠ Some figures were left out of these totals because the workbook returned an impossible value: ' +
    lines + '. Fix the formula in that sheet — the rest of the numbers above are unaffected.</div>';
}
function kpi(lab, val, note, cls) {
  return '<div class="db-kpi ' + cls + '"><div class="lab">' + esc(lab) + '</div>' +
    '<div class="val">' + esc(val) + '</div>' +
    '<div class="note">' + esc(note || '') + '</div></div>';
}

/* Profit against ad spend, one pair of bars per account, with the N/T ratio as a line on its
   own right-hand scale and a dashed break-even mark at 1.00 — below it, profit outran the ads. */
function chart(d) {
  /* 30 Aug (owner: "Saif Bhai's ad-fee bar not getting updated · ad fees wrong") — the bars used
     to read each BOOK's monthly card, which lags and sometimes lies. They now read the engine's
     own month per account: profit = Actual by the law, ads = N (CPC × 1.2), live. */
  var truth = d.engine_truth;
  var rows;
  if (truth && (truth.accounts || []).length) {
    rows = truth.accounts.map(function (a) {
      return { name: a.account, profit: Number(a.actual), ads: Number(a.n_ads),
        nt: Number(a.actual) > 0 && Number(a.n_ads) > 0 ? Number(a.n_ads) / Number(a.actual) : NaN };
    }).filter(function (r) { return isFinite(r.profit) || isFinite(r.ads); });
  } else {
    rows = (d.accounts || []).map(function (a) {
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
  }

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
    // The card's key is profit_yesterday and it carries .values — there is no a.yesterday, so this
    // column read undefined for every account, every load.
    var yd = (a.profit_yesterday && a.profit_yesterday.values) || {};
    var ydLate = !!(a.profit_yesterday && a.profit_yesterday.latest_available);
    var ydWhen = String((a.profit_yesterday && a.profit_yesterday.period) || '');
    var sold = tile(mo, T_SOLD), profit = tile(mo, T_PROFIT), ads = tile(mo, T_ADS);
    var margin = isFinite(tile(mo, T_MARGIN)) ? tile(mo, T_MARGIN) * 100 : marginOf(sold, profit);
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
      '<td class="num" style="color:var(--gold-a)">' + gbp(tile(yd, C_ACTUAL)) +
        // when the workbook has no row for yesterday this is the newest day it holds — say which
        (ydLate && ydWhen ? '<div style="font-size:10.5px;color:var(--text-3);font-weight:600">' + esc(ydWhen) + '</div>' : '') +
      '</td>' +
    '</tr>';
  }).join('');

  var m = (d.collective && d.collective.month && d.collective.month.tiles) || {};
  var cSold = tile(m, T_SOLD), cProfit = tile(m, T_PROFIT), cAds = tile(m, T_ADS);
  var cMargin = isFinite(tile(m, T_MARGIN)) ? tile(m, T_MARGIN) * 100 : marginOf(cSold, cProfit);
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
  host.onclick = function (ev) {
    var b = ev.target && ev.target.closest ? ev.target.closest('[data-db-acc]') : null;
    if (!b) { return; }
    DB_ACC = b.getAttribute('data-db-acc') || '';
    paint();
  };
  var stamp = $('dbStamp');
  if (stamp) {
    stamp.textContent = d.last_updated ? 'figures as at ' + fmtPkt(d.last_updated, true) : 'not computed yet';
    stamp.className = 'db-stamp' + (d.stale ? ' stale' : '');
  }
  var btn = $('dbRefresh');
  if (btn) btn.classList.toggle('hidden', !d.may_refresh);

  host.innerHTML =
    kpiStrip(d) +
    /* TRUTH v2 WO-04: the reconciliation banners are deleted — ROWS_COVERAGE replaces them at the money flip */
    '<div class="card enter d2"><div class="hd">Profit against ad spend ' +
      '<span class="hint">gold is what the business kept · blue is what the ads took · below N/T 1.00 profit outran the ads</span></div>' +
      '<div class="bd">' + chart(d) + '</div></div>' +
    '<div class="card enter d3" style="margin-top:16px"><div class="hd">Item-by-item P&L ' +
      '<span class="hint">the Sales Analysis sheet\u2019s own columns \u00b7 real fees, real costs, both ad families</span></div>' +
      '<div class="bd">' +
        '<div class="pnl-chips">' +
          '<button class="minibtn" data-pnl-r="1">Today</button>' +
          '<button class="minibtn" data-pnl-r="2">Yesterday</button>' +
          '<button class="minibtn on" data-pnl-r="7">7 days</button>' +
          '<button class="minibtn" data-pnl-r="30">30 days</button>' +
          '<select class="alx-sel" id="pnlSort" title="Order of the rows">' +
            '<option value="asc">Profit: min \u2192 max (losses first)</option>' +
            '<option value="desc">Profit: max \u2192 min</option>' +
            '<option value="rev">Revenue: biggest first</option>' +
          '</select>' +
          '<select class="alx-sel" id="pnlAcc"><option value="">All accounts</option></select>' +
          '<span id="pnlWhen" style="margin-left:auto;font-size:11px;color:var(--text-3);font-weight:700"></span>' +
        '</div>' +
        '<div id="pnlBody"><div class="spinner"></div></div>' +
      '</div></div>' +
    '<div class="card enter d3" style="margin-top:16px"><div class="hd">The ledger ' +
      '<span class="hint">' + esc(d.period.current_label) + ' · straight from your Sales Analysis sheets</span></div>' +
      '<div class="bd">' + ledger(d) + '</div></div>' +
    (d.scoped ? '<div class="db-note" style="margin-top:12px"><b>i</b><div>Some accounts are hidden because your access is limited to certain accounts.</div></div>' : '');
}

function loadTruth() {
  var from = pkDayStr(0).slice(0, 8) + '01';
  truthPage({ from: from, to: pkDayStr(0) }).then(function (d) {
    DB_TRUTH = d;
    paint();
  }).catch(function () { /* the old tiles still render */ });
}

function load(force) {
  loadTruth();
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
    return '<div class="hgroup enter d1"><h1>Sales <span class="goldtext">analysis</span></h1>' +
      '<span class="sub" id="dbStamp">loading…</span>' +
      '<button class="btn-ghost hidden" id="dbRefresh" style="margin-left:auto">Refresh now</button></div>' +
      '<div id="dbBody"><div class="spinner"></div></div>' +
      '<div class="card enter d3" style="margin-top:16px"><div class="hd">The Monthly Sheet itself ' +
        '<span class="hint">day rows, headers verbatim — what the workbook actually holds (Management only)</span></div>' +
        '<div class="bd"><div style="display:flex;gap:10px;flex-wrap:wrap;align-items:center;margin-bottom:10px">' +
          '<select class="alx-sel" id="dbRowsAcc"><option value="">Choose an account…</option></select>' +
          '<button class="minibtn" id="dbRowsGo">Show the day rows</button></div>' +
        '<div id="dbRowsBody"></div></div></div>';
  },
  init: function () {
    var b = $('dbRefresh');
    if (b) b.onclick = function () { b.disabled = true; b.textContent = 'Refreshing…';
      api('refreshDashboard').then(function (d) { dbData = d; paint(); })
        .catch(function (e) { toast('Could not refresh: ' + e.message); })
        .then(function () { b.disabled = false; b.textContent = 'Refresh now'; }); };
    cachedCall('accountList', {}, function (d) {
      var sel = $('dbRowsAcc');
      if (!sel) { return; }
      sel.innerHTML = '<option value="">Choose an account…</option>' + (((d && d.accounts) || []).map(function (a) {
        var n = String(a.account || '').trim();
        return n ? '<option>' + esc(n) + '</option>' : '';
      }).join(''));
    });
    var go = $('dbRowsGo');
    if (go) {
      go.onclick = function () {
        var acc = $('dbRowsAcc') ? $('dbRowsAcc').value : '';
        var host = $('dbRowsBody');
        if (!acc) { toast('Choose an account first.'); return; }
        host.innerHTML = '<div class="spinner"></div>';
        api('salesAnalysisRows', { account: acc }).then(function (r) {
          if (!r || r.ok === false) { host.innerHTML = '<div style="color:var(--text-2);font-weight:700;padding:12px 0">' + esc(String((r && r.reason) || 'Could not read it.')) + '</div>'; return; }
          var heads = r.headers || [];
          var h = '<div class="scroll"><table class="cw-tbl" style="min-width:900px"><thead><tr>' +
            heads.map(function (x) { return '<th>' + esc(String(x)) + '</th>'; }).join('') + '</tr></thead><tbody>';
          (r.rows || []).slice().reverse().forEach(function (row) {
            h += '<tr>' + heads.map(function (x) { return '<td>' + esc(String(row[x] == null ? '' : row[x])) + '</td>'; }).join('') + '</tr>';
          });
          host.innerHTML = h + '</tbody></table></div><p style="font-size:11px;color:var(--text-3);font-weight:600;margin-top:6px">Newest first · read straight from “' + esc(String(r.tab || 'Monthly Sheet')) + '” — the portal computes nothing here.</p>';
        }).catch(function (e) { host.innerHTML = '<div style="color:var(--text-2);font-weight:700;padding:12px 0">' + esc(e.message) + '</div>'; });
      };
    }
    load(false);
  }
};

  /* ---- the per-item P&L (Hasib item 4/21): his sheet's chain, verified to the penny ----
     True OE = OE − AliExpress − Priority ads incl VAT · Raw = True OE − VAT to HMRC.
     Rows missing real fees or costs carry a flag instead of quietly pretending. */
  var PNL = { days: 7, account: '' };

  function pnlGBP(v) { var n = Number(v) || 0; return (n < 0 ? '−£' + Math.abs(n).toFixed(2) : '£' + n.toFixed(2)); }

  function pnlLoad() {
    var box = $('pnlBody');
    if (!box) { return; }
    box.innerHTML = '<div class="spinner"></div>';
    var ukDay = function (off) { return new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/London' }).format(new Date(Date.now() - off * 86400000)); };
    var from, to;
    if (PNL.days === 2) { from = to = ukDay(1); }
    else if (PNL.days === 1) { from = to = ukDay(0); }
    else { from = ukDay(PNL.days - 1); to = ukDay(0); }
    var payload = { from: from, to: to };
    if (PNL.account) { payload.account = PNL.account; }
    api('itemPnl', payload).then(function (d) {
      d = d || {};
      var when = $('pnlWhen');
      if (when) { when.textContent = d.from + ' \u2192 ' + d.to; }
      var rows = d.rows || [];
      if (!rows.length) { box.innerHTML = '<div style="color:var(--text-2);font-weight:700;padding:12px 0">No orders in this range.</div>'; return; }
      /* Hasib's night list, verbatim: "i need profits calculated from min to max" — losses lead
         by default, so the money leaks are the first thing every morning. */
      var sortKey = PNL.sort || 'asc';
      rows.sort(function (a, b) {
        if (sortKey === 'rev') { return (Number(b.revenue) || 0) - (Number(a.revenue) || 0); }
        var d2 = (Number(a.actual_profit) || 0) - (Number(b.actual_profit) || 0);
        return sortKey === 'desc' ? -d2 : d2;
      });
      var head = '<tr><th>Item</th><th class="pnl-g-sale">Sold</th><th>Qty</th><th class="pnl-g-sale">HMRC VAT</th>' +
        '<th class="pnl-g-fee">eBay fees (real)</th><th class="pnl-g-fee">Fee VAT</th><th class="pnl-g-fee">Order earning</th>' +
        '<th class="pnl-g-ali">AliExpress</th><th class="pnl-g-ali">Ali VAT</th>' +
        '<th>Qty via Priority</th><th class="pnl-g-pri">Priority fees</th><th class="pnl-g-pri">Priority incl VAT</th>' +
        '<th>Qty via General</th><th class="pnl-g-gen">General incl VAT</th>' +
        '<th class="pnl-g-out">True earning</th><th>VAT to HMRC</th><th class="pnl-g-out">Raw profit</th>' +
        '<th class="pnl-g-ali">Returns</th><th class="pnl-g-out">Actual profit</th></tr>';
      var body = rows.map(function (r) {
        var flags = [];
        if (!r.fees_complete) { flags.push('fees partial'); }
        if (!r.cost_complete) { flags.push('cost partial'); }
        return '<tr><td><a href="https://www.ebay.co.uk/itm/' + esc(String(r.item_id)) + '" target="_blank" rel="noopener noreferrer" style="color:inherit">' +
            esc(String(r.title || r.item_id).slice(0, 90)) + '</a>' +
            '<div class="mono" style="font-size:9.5px;color:var(--text-3)">' + esc(String(r.item_id)) + ' \u00b7 ' + esc(String(r.account)) +
            (flags.length ? ' \u00b7 <span class="pnl-flag">' + flags.join(' \u00b7 ') + '</span>' : '') + '</div></td>' +
          '<td class="pnl-g-sale">' + pnlGBP(r.revenue) + '</td><td>' + (r.qty || 0) + '</td><td class="pnl-g-sale">' + pnlGBP(r.vat_out) + '</td>' +
          '<td class="pnl-g-fee">' + pnlGBP(r.fees) + '</td><td class="pnl-g-fee">' + pnlGBP(r.fees_vat) + '</td><td class="pnl-g-fee">' + pnlGBP(r.oe) + '</td>' +
          '<td class="pnl-g-ali">' + pnlGBP(r.ali_cost) + '</td><td class="pnl-g-ali">' + pnlGBP(r.ali_vat) + '</td>' +
          '<td>' + (r.pri_qty || 0) + '</td><td class="pnl-g-pri">' + pnlGBP(r.pri_fees) + '</td><td class="pnl-g-pri">' + pnlGBP(r.pri_incl) + '</td>' +
          '<td>' + (r.gen_qty || 0) + '</td><td class="pnl-g-gen">' + pnlGBP(r.gen_incl) + '</td>' +
          '<td class="pnl-g-out">' + pnlGBP(r.true_oe) + '</td><td>' + pnlGBP(r.vat_hmrc) + '</td>' +
          '<td class="pnl-g-out' + (Number(r.raw_profit) < 0 ? ' pnl-neg' : '') + '">' + pnlGBP(r.raw_profit) + '</td>' +
          '<td class="pnl-g-ali">' + pnlGBP(r.returns) + '</td>' +
          '<td class="pnl-g-out' + (Number(r.actual_profit) < 0 ? ' pnl-neg' : '') + '">' + pnlGBP(r.actual_profit) + '</td></tr>';
      }).join('');
      /* 30 Aug (owner: "you didn't update the sales analysis tab according to my sales
         analysis sheet") — the sheet dashboard's own four blocks, computed live from the same
         P&L rows: Top earners · Losing products FIX THESE · High ad cost WATCH · Ad waste. */
      var intel = (function () {
        var acos = function (r) { var rev = Number(r.revenue) || 0; return rev > 0 ? (Number(r.pri_incl) || 0) / rev * 100 : 0; };
        var by = rows.slice();
        var earners = by.filter(function (r) { return Number(r.actual_profit) > 0; })
          .sort(function (a, b) { return Number(b.actual_profit) - Number(a.actual_profit); }).slice(0, 6);
        var losers = by.filter(function (r) { return Number(r.actual_profit) < -0.5; })
          .sort(function (a, b) { return Number(a.actual_profit) - Number(b.actual_profit); }).slice(0, 6);
        var watch = by.filter(function (r) { return Number(r.actual_profit) >= -0.5 && acos(r) >= 35 && Number(r.pri_incl) > 3; })
          .sort(function (a, b) { return acos(b) - acos(a); }).slice(0, 6);
        var waste = by.filter(function (r) { return !(Number(r.qty) > 0) && Number(r.pri_incl) > 1; })
          .sort(function (a, b) { return Number(b.pri_incl) - Number(a.pri_incl); }).slice(0, 6);
        var li = function (r, extra, tone) {
          return '<div style="display:flex;gap:8px;align-items:baseline;font-size:11.5px;padding:3px 0;border-bottom:1px solid var(--gold-line)">' +
            '<span style="flex:1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-weight:600" title="' + esc(String(r.title || r.item_id)) + '">' + esc(String(r.title || r.item_id).slice(0, 46)) + '</span>' +
            '<span class="num" style="font-weight:800;color:var(--' + tone + ');white-space:nowrap">' + extra + '</span></div>';
        };
        var card = function (title, tone, items, mk, empty) {
          return '<div style="border:1px solid var(--gold-line);border-radius:12px;padding:10px 13px;background:var(--panel-2)">' +
            '<div style="font-size:10.5px;font-weight:800;letter-spacing:.07em;text-transform:uppercase;color:var(--' + tone + ');margin-bottom:5px">' + title + '</div>' +
            (items.length ? items.map(mk).join('') : '<div style="font-size:11.5px;color:var(--text-3);font-weight:600;padding:4px 0">' + empty + '</div>') + '</div>';
        };
        return '<div style="display:grid;gap:10px;grid-template-columns:repeat(auto-fit,minmax(250px,1fr));margin-bottom:14px">' +
          card('🏆 Top earners', 'ok', earners, function (r) { return li(r, pnlGBP(r.actual_profit) + ' · ' + (r.qty || 0) + 'u', 'ok'); }, 'no profitable item in this range yet') +
          card('🔻 Losing — fix these', 'bad', losers, function (r) { return li(r, pnlGBP(r.actual_profit) + (Number(r.pri_incl) > Math.abs(Number(r.actual_profit)) ? ' · KILL ADS' : ' · TRIM'), 'bad'); }, 'no losing item — clean') +
          card('⚠ High ad cost — watch', 'warn', watch, function (r) { return li(r, Math.round(acos(r)) + '% ACOS', 'warn'); }, 'nothing above 35% ACOS') +
          card('🗑 Ad waste — paid, sold nothing', 'bad', waste, function (r) { return li(r, pnlGBP(r.pri_incl) + ' wasted', 'bad'); }, 'no waste in this range') +
          '</div>';
      })();
      var t = d.total || {};
      var totalRow = '<tr class="pnl-total"><td>GRAND TOTAL \u00b7 ' + rows.length + ' item(s)</td>' +
        '<td>' + pnlGBP(t.revenue) + '</td><td>' + (t.qty || 0) + '</td><td>' + pnlGBP(t.vat_out) + '</td>' +
        '<td>' + pnlGBP(t.fees) + '</td><td>' + pnlGBP(t.fees_vat) + '</td><td>' + pnlGBP(t.oe) + '</td>' +
        '<td>' + pnlGBP(t.ali_cost) + '</td><td>' + pnlGBP(t.ali_vat) + '</td>' +
        '<td>' + (t.pri_qty || 0) + '</td><td>' + pnlGBP(t.pri_fees) + '</td><td>' + pnlGBP(t.pri_incl) + '</td>' +
        '<td>' + (t.gen_qty || 0) + '</td><td>' + pnlGBP(t.gen_incl) + '</td>' +
        '<td>' + pnlGBP(t.true_oe) + '</td><td>' + pnlGBP(t.vat_hmrc) + '</td>' +
        '<td class="' + (Number(t.raw_profit) < 0 ? 'pnl-neg' : '') + '">' + pnlGBP(t.raw_profit) + '</td>' +
        '<td>' + pnlGBP(t.returns) + '</td>' +
        '<td class="' + (Number(t.actual_profit) < 0 ? 'pnl-neg' : '') + '">' + pnlGBP(t.actual_profit) + '</td></tr>';
      box.innerHTML = intel + '<div class="scroll"><table class="pnl-tbl"><thead>' + head + '</thead><tbody>' + body + totalRow + '</tbody></table></div>' +
        '<p style="font-size:11px;color:var(--text-3);font-weight:600;margin-top:6px">True earning = order earning \u2212 AliExpress \u2212 Priority ads incl VAT \u00b7 Raw profit = true earning \u2212 VAT to HMRC \u00b7 General ad fees already sit inside the eBay fees.</p>';
    }).catch(function (e) {
      box.innerHTML = '<div style="color:var(--text-2);font-weight:700;padding:12px 0">Could not compute the P&L.<span style="display:block;color:var(--text-3);font-weight:600;font-size:12px;margin-top:4px">' + esc(e.message) + '</span></div>';
    });
  }

  (function wirePnl() {
    var orig = VIEWS.dashboard.init;
    VIEWS.dashboard.init = function () {
      if (orig) { orig.apply(this, arguments); }
      var srt = $('pnlSort');
      if (srt) { srt.onchange = function () { PNL.sort = String(this.value || 'asc'); pnlLoad(); }; }
      document.querySelectorAll('[data-pnl-r]').forEach(function (b) {
        b.onclick = function () {
          document.querySelectorAll('[data-pnl-r]').forEach(function (x) { x.classList.remove('on'); });
          this.classList.add('on');
          PNL.days = Number(this.getAttribute('data-pnl-r')) || 7;
          pnlLoad();
        };
      });
      cachedCall('accountList', {}, function (d) {
        var sel = $('pnlAcc');
        if (!sel) { return; }
        sel.innerHTML = '<option value="">All accounts</option>' + (((d && d.accounts) || []).map(function (a) {
          var n = String(a.account || '').trim();
          return n ? '<option>' + esc(n) + '</option>' : '';
        }).join(''));
        sel.onchange = function () { PNL.account = String(this.value || ''); pnlLoad(); };
      });
      pnlLoad();
    };
  })();

})();