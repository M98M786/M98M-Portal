/* view-adtool-peak.js — Advertising · Peak times only (owner's batch, 22 Oct 2026: "make a page on
 * portal for selecting items that should be running in peak times only; there will be two pages:
 * system suggested, manually added").
 *
 * One page, two tabs. "System suggested" is every advertised listing whose units land mostly in one
 * part of the day, with the money it spends outside that part. "Manually added" is the list the team
 * keeps by hand, with who added each row and when, and a removal keeps the row as a record.
 *
 * eBay cannot schedule an ad by the hour, so this page is a work list for pausing and resuming by
 * hand, and a record of what the team decided. Nothing on it is ever sent to eBay. The hours come
 * from the same function Running today uses, never a second rule, and the thresholds are printed
 * from the live config rather than typed in here.
 *
 * Engine actions: adtoolPeak, adtoolPeakAdd, adtoolPeakRemove. Own class prefix: .pkt-
 */
(function () {
  var ROLES = ['Management', 'Ops Head', 'Advertising Manager'];
  var LOSS = '#e0563f';
  var PK = { tab: 'suggested', account: '', data: null, busy: false };

  VIEW_CSS.push([
    '.pkt-wrap{max-width:1420px}',
    '.pkt-top{display:flex;gap:10px;flex-wrap:wrap;align-items:center;margin:0 0 12px;font-size:12px;color:var(--text-2);font-weight:600}',
    '.pkt-banner{border:1px solid var(--gold-b);border-radius:14px;padding:13px 16px;margin-bottom:12px;background:rgba(242,176,53,.08);color:var(--text);font-size:12.5px;line-height:1.6}',
    '.pkt-banner b{color:var(--text)}',
    '.pkt-rules{background:var(--panel-2);border:1px dashed var(--gold-line);border-radius:12px;padding:11px 14px;margin-bottom:12px;color:var(--text-2);font-size:12px;line-height:1.6}',
    '.pkt-rules b{color:var(--text)}',
    '.pkt-tabs{display:flex;gap:8px;flex-wrap:wrap;margin:0 0 12px}',
    '.pkt-tab{background:var(--panel);border:1px solid var(--gold-line);border-radius:99px;padding:6px 16px;font:inherit;font-size:12.5px;color:var(--text-2);font-weight:700;cursor:pointer;white-space:nowrap}',
    '.pkt-tab.on{color:var(--gold-ink);background:var(--gold-b);border-color:var(--gold-b);font-weight:800}',
    '.pkt-tab .n{opacity:.75;margin-left:7px;font-variant-numeric:tabular-nums}',
    '.pkt-chips{display:flex;gap:6px;flex-wrap:wrap;margin:0 0 12px}',
    '.pkt-chip{background:var(--panel);border:1px solid var(--gold-line);border-radius:99px;padding:4px 12px;font:inherit;font-size:11.5px;color:var(--text-2);font-weight:700;cursor:pointer;white-space:nowrap}',
    '.pkt-chip.on{color:var(--gold-ink);background:var(--gold-b);border-color:var(--gold-b);font-weight:800}',
    '.pkt-panel{background:var(--panel);border:1px solid var(--gold-line);border-radius:14px;padding:14px 16px;margin-bottom:12px}',
    '.pkt-panel h3{margin:0 0 4px;font-size:15px;font-weight:800;color:var(--text)}',
    '.pkt-sub{font-size:12px;color:var(--text-2);margin:0 0 10px;line-height:1.55}',
    '.pkt-tbl{width:100%;border-collapse:collapse;font-size:12px;font-variant-numeric:tabular-nums}',
    '.pkt-tbl th{text-align:left;font-size:10px;letter-spacing:.06em;text-transform:uppercase;color:var(--text-3);font-weight:800;padding:6px 8px;border-bottom:1px solid var(--gold-line);white-space:nowrap}',
    '.pkt-tbl th.r{text-align:right}',
    '.pkt-tbl td{padding:9px 8px;border-bottom:1px solid rgba(255,255,255,.05);color:var(--text);vertical-align:top}',
    '.pkt-tbl td.r{text-align:right;white-space:nowrap}',
    '.pkt-scroll{overflow-x:auto}',
    '.pkt-why{max-width:360px;min-width:220px;font-size:11.5px;color:var(--text-2);line-height:1.55}',
    '.pkt-slot{font-weight:800;color:var(--text)}',
    '.pkt-sm{font-size:11px;color:var(--text-2);line-height:1.5}.pkt-sm b{color:var(--text)}',
    '.pkt-sm2{font-size:10.5px;color:var(--text-3);line-height:1.45}',
    '.pkt-tag{display:inline-block;padding:2px 8px;border-radius:999px;font-size:11px;border:1px solid var(--gold-line);color:var(--text-2);white-space:nowrap}',
    '.pkt-tag.live{color:var(--gold-a);border-color:rgba(242,176,53,.45)}',
    '.pkt-tag.off{color:' + LOSS + ';border-color:rgba(224,86,63,.5)}',
    '.pkt-mark{display:inline-block;margin-left:6px;padding:1px 7px;border-radius:6px;font-size:10px;font-weight:800;letter-spacing:.04em;border:1px solid var(--gold-line-hi);color:var(--gold-a);white-space:nowrap}',
    '.pkt-neg{color:' + LOSS + ';font-weight:800}.pkt-pos{color:var(--gold-a);font-weight:700}',
    '.pkt-btn{background:var(--gold-b);color:var(--gold-ink);border:0;border-radius:8px;padding:6px 13px;font:inherit;font-size:11.5px;font-weight:800;cursor:pointer;white-space:nowrap}',
    '.pkt-btn.ghost{background:transparent;color:var(--text-2);border:1px solid var(--gold-line)}',
    '.pkt-btn[disabled]{opacity:.5;cursor:default}',
    '.pkt-add{display:flex;gap:8px;flex-wrap:wrap;align-items:flex-end}',
    '.pkt-add label{display:flex;flex-direction:column;gap:4px;font-size:10.5px;text-transform:uppercase;letter-spacing:.07em;color:var(--text-3);font-weight:800}',
    '.pkt-add input{background:var(--bg0);border:1px solid var(--gold-line);border-radius:8px;color:var(--text);font:inherit;font-size:12px;padding:6px 9px;min-width:150px}',
    '.pkt-empty{color:var(--text-3);font-size:13px;padding:10px 0}',
    '.pkt-reg{font-size:9.5px;letter-spacing:.06em;text-transform:uppercase;color:var(--text-3);font-weight:800;border:1px solid var(--gold-line);border-radius:6px;padding:1px 6px;margin-left:6px;white-space:nowrap}'
  ].join(''));

  /* adtSlot in the engine: 0 night 00-06, 1 morning 06-12, 2 afternoon 12-17, 3 evening 17-24, UK hours */
  var SLOT_NAMES = ['night', 'morning', 'afternoon', 'evening'];
  var SLOT_HOURS = ['00:00 to 06:00', '06:00 to 12:00', '12:00 to 17:00', '17:00 to midnight'];

  function num(n) { return n == null || n === '' || isNaN(Number(n)) ? null : Number(n); }
  function gbp(n) { var v = num(n); if (v == null) return '—'; return (v < 0 ? '−£' : '£') + Math.abs(v).toFixed(2); }
  function cnt(n) { var v = num(n); return v == null ? '—' : Math.round(v).toLocaleString('en-GB'); }
  function n0(n) { var v = num(n); return v == null ? 0 : v; }
  function plural(n, one, many) { return Math.round(n0(n)) === 1 ? one : many; }
  /* A SHARE IS A FRACTION on every field that carries one: rules.share is 0.5 and peak_share is 0.71.
     The engine also sends the whole number beside the row's own share, as peak_share_pct, and that is
     the one to print where it is there, so the percentage on the page and the percentage inside the
     sentence beside it can never be worked out two different ways and disagree. */
  function shareTxt(n) {
    var v = num(n); if (v == null) return '—';
    return Math.round(v * 100) + '%';
  }
  function shareOf(r) {
    var pct = num(r && r.peak_share_pct);
    return pct == null ? shareTxt(r && r.peak_share) : Math.round(pct) + '%';
  }
  /* the explainer hook. Only these three labels have a pattern of their own in the register map. */
  function reg(label, shown) {
    return '<span class="pkt-reg" data-adtreg="' + esc(label) + '" title="how is this worked out">' + esc(shown || label) + '</span>';
  }
  function slotName(r) {
    var n = String((r && r.peak_slot_name) || '').trim();
    if (n) return n;
    var s = num(r && r.peak_slot);
    return s != null && SLOT_NAMES[s] ? SLOT_NAMES[s] : 'one part of the day';
  }
  function slotHours(r) {
    var bands = (r && r.run) || [];
    if (bands.length) {
      var t = adtHourBandText({ run: bands, avoid: (r && r.avoid) || [] });
      if (t && t.run) return t.run;
    }
    var s = num(r && r.peak_slot);
    return s != null && SLOT_HOURS[s] ? SLOT_HOURS[s] : '';
  }
  function liveTag(v) {
    if (v == null) return '<span class="pkt-sm2">not known</span>';
    return '<span class="pkt-tag ' + (v ? 'live' : 'off') + '">' + (v ? 'live now' : 'not live') + '</span>';
  }
  function campCell(r) {
    var name = String((r && (r.campaign_name || r.campaign_id)) || '');
    if (!name) return '<span class="pkt-sm2">no campaign recorded</span>';
    return adtCampaignLink(r.campaign_id, name);
  }
  function whenTxt(at) {
    var s = String(at == null ? '' : at);
    if (!s) return '';
    var d = new Date(s.replace(' ', 'T') + (/[Zz]|[+-]\d\d:?\d\d$/.test(s) ? '' : 'Z'));
    if (isNaN(d.getTime())) return s.slice(0, 16);
    try {
      return d.toLocaleDateString('en-GB', { timeZone: 'Europe/London', day: 'numeric', month: 'short' }) + ' ' +
        d.toLocaleTimeString('en-GB', { timeZone: 'Europe/London', hour: '2-digit', minute: '2-digit' });
    } catch (e) { return s.slice(0, 16); }
  }

  VIEWS.adtoolPeak = {
    label: 'Peak times only', hidden: true, order: 93, roles: ROLES,
    icon: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/><path d="M4 4l2 2M20 4l-2 2"/>',
    render: function () {
      return '<div class="pkt-wrap">' +
        adtHgroup('Peak times only', 'Listings that sell in one part of the day, and the hand-kept list', 'pktFresh') +
        '<div id="pktAcct" class="pkt-chips"></div>' +
        '<div id="pktBody"><div class="pkt-empty">Loading…</div></div></div>';
    },
    init: function () { acctChips(); load(false).catch(function () {}); }
  };

  function load(quiet) {
    return api('adtoolPeak', PK.account ? { account: PK.account } : {}).then(function (D) {
      PK.data = D || {};
      if (!$('pktBody')) return;
      acctChips();
      draw();
      adtFreshShow('pktFresh', PK.data.fresh);
    }).catch(function (e) {
      if (!quiet && $('pktBody')) {
        $('pktBody').innerHTML = '<div class="pkt-panel"><h3>Not available</h3><div class="pkt-sub">' +
          esc((e && e.message) || 'This page could not load.') + '</div></div>';
      }
      throw e;
    });
  }

  function suggested() { return ((PK.data && PK.data.suggested) || []).filter(function (r) { return r && typeof r === 'object'; }); }
  function manual() { return ((PK.data && PK.data.manual) || []).filter(function (r) { return r && typeof r === 'object'; }); }

  function accountNames() {
    var A = ((PK.data && PK.data.accounts) || []).map(function (a) { return typeof a === 'string' ? a : (a && a.account); }).filter(Boolean);
    if (!A.length) {
      var seen = {};
      suggested().concat(manual()).forEach(function (r) { if (r.account && !seen[r.account]) { seen[r.account] = 1; A.push(r.account); } });
      A.sort();
    }
    return A;
  }
  function acctChips() {
    var el = $('pktAcct'); if (!el) return;
    el.innerHTML = '<button class="pkt-chip' + (PK.account ? '' : ' on') + '" data-pka="">All accounts</button>' +
      accountNames().map(function (a) {
        return '<button class="pkt-chip' + (PK.account === a ? ' on' : '') + '" data-pka="' + esc(a) + '">' + esc(a) + '</button>';
      }).join('');
    var bs = el.querySelectorAll('[data-pka]');
    for (var i = 0; i < bs.length; i++) bs[i].onclick = function () {
      PK.account = this.getAttribute('data-pka') || '';
      acctChips();
      load(false).catch(function () {});
    };
  }

  /* ── the banner and the live thresholds ──────────────────────────────────────────────────────── */
  function banner() {
    return '<div class="pkt-banner"><b>eBay cannot schedule an ad by the hour.</b> This list is for pausing and ' +
      'resuming by hand, and for the tool on the accounts where live apply is switched on. ' +
      '<b>Nothing on this page is sent to eBay.</b></div>';
  }
  function rulesLine() {
    var R = (PK.data && PK.data.rules) || {};
    var share = num(R.share), minU = num(R.min_units), win = num(R.window_days);
    if (share == null && minU == null && win == null) {
      return '<div class="pkt-rules">The thresholds behind the suggestions are not in this answer, so none is shown here.</div>';
    }
    return '<div class="pkt-rules"><b>What the system suggests.</b> A listing is suggested when it is advertised now, ' +
      'has sold at least <b>' + cnt(minU) + ' ' + plural(minU, 'unit', 'units') + '</b> over the last <b>' + cnt(win) + ' ' +
      plural(win, 'day', 'days') + '</b>, and at least <b>' + shareTxt(share) + '</b> of those units land in one part of the day.</div>';
  }

  /* ── tabs ────────────────────────────────────────────────────────────────────────────────────── */
  function counts() {
    var C = (PK.data && PK.data.counts) || {};
    var s = suggested(), m = manual();
    var both = num(C.both);
    if (both == null) {
      var ids = {}; m.forEach(function (r) { if (r.item_id) ids[String(r.item_id)] = 1; });
      both = s.filter(function (r) { return r.already_manual || ids[String(r.item_id)]; }).length;
    }
    return {
      suggested: num(C.suggested) == null ? s.length : num(C.suggested),
      manual: num(C.manual) == null ? m.length : num(C.manual),
      both: both
    };
  }
  function tabs(C) {
    return '<div class="pkt-tabs">' +
      '<button class="pkt-tab' + (PK.tab === 'suggested' ? ' on' : '') + '" data-pkt="suggested">System suggested<span class="n">' +
      cnt(C.suggested) + '</span></button>' +
      '<button class="pkt-tab' + (PK.tab === 'manual' ? ' on' : '') + '" data-pkt="manual">Manually added<span class="n">' +
      cnt(C.manual) + '</span></button>' +
      (n0(C.both) > 0 ? '<span class="pkt-sm" style="align-self:center">' + cnt(C.both) + ' ' +
        plural(C.both, 'listing is', 'listings are') + ' on both lists</span>' : '') + '</div>';
  }

  /* ── tab 1 · system suggested, the biggest spend outside the peak first ──────────────────────── */
  function suggestedRows() {
    var ids = {};
    manual().forEach(function (r) { if (r.item_id) ids[String(r.item_id)] = 1; });
    return suggested().slice().map(function (r) {
      if (r.already_manual == null && ids[String(r.item_id)]) { r.already_manual = true; }
      return r;
    }).sort(function (a, b) { return n0(b.spend_off_peak_7d) - n0(a.spend_off_peak_7d); });
  }
  function suggestedPanel() {
    var rows = suggestedRows();
    var D = PK.data || {};
    var held = num(D.suggested_held_back), tot = num(D.suggested_total);
    var h = '<div class="pkt-panel"><h3>System suggested</h3>' +
      '<div class="pkt-sub">Listings whose units land mostly in one part of the day, with the money they spend ' +
      'outside it over the last 7 days. The biggest spend outside the peak comes first.' +
      /* the engine caps this list. Two hundred rows with nothing said about it reads as all of them. */
      (held != null && held > 0
        ? ' <b>' + cnt(tot) + ' ' + plural(tot, 'listing is', 'listings are') + ' suggested in all and the ' +
          cnt(rows.length) + ' with the most units in their peak are shown; choose one account to see more of them.</b>'
        : '') + '</div>';
    if (!rows.length) {
      return h + '<div class="pkt-empty">No listing meets the thresholds above' +
        (PK.account ? ' on ' + esc(PK.account) : '') + ' yet.</div></div>';
    }
    var R = (PK.data && PK.data.rules) || {}, win = num(R.window_days);
    h += '<div class="pkt-scroll"><table class="pkt-tbl"><thead><tr>' +
      '<th>Listing</th><th>Live now</th><th>Campaign</th><th>Peak hours</th>' +
      '<th class="r">Share in the peak' + reg('one part of the day', 'how') + '</th>' +
      '<th class="r">Units' + (win == null ? '' : ' in ' + cnt(win) + ' days') + '</th>' +
      '<th class="r" title="of the sampled hours of the last 7 days, the money that fell outside the hours it sells in">Spend outside the peak' + reg('spend outside the peak', 'how') + '</th>' +
      '<th class="r" title="ad spend over the last 7 finished days, all hours, from the day figures">Spend, 7 days</th>' +
      '<th>Why</th><th></th>' +
      '</tr></thead><tbody>' + rows.map(function (r) {
        var off = num(r.spend_off_peak_7d), hoursTxt = slotHours(r), judged = num(r.hours_judged);
        /* THREE DIFFERENT BASES, and the page must not read one as a share of another. The money
           outside the peak sits inside the SAMPLED hours of the last 7 days; the day figure is the
           whole of those days and is always the larger, so it gets its own column rather than being
           printed under the first where it reads as its denominator. Where no hour was sampled at
           all, both of the first two are nothing-known, and saying so beats printing £0.00. */
        var samp = num(r.spend_sampled_7d), seen = num(r.hours_sampled_7d);
        return '<tr><td>' + adtProductCell(r) +
          (r.already_manual ? '<div style="margin-top:4px"><span class="pkt-mark" title="this listing is on the hand-kept list as well">on my list</span></div>' : '') + '</td>' +
          '<td>' + liveTag(r.live_now) + '</td>' +
          '<td>' + campCell(r) + '</td>' +
          '<td><div class="pkt-slot">' + esc(slotName(r)) + '</div>' +
          (hoursTxt ? '<div class="pkt-sm">' + esc(hoursTxt) + '</div>' : '') +
          (judged == null ? '' : '<div class="pkt-sm2">' + cnt(judged) + ' ' + plural(judged, 'hour', 'hours') + ' judged</div>') +
          '<div style="margin-top:4px">' + adtHourStrip({ run: r.run || [], avoid: r.avoid || [], basis: String(r.hour_basis || '') }, { text: false }) + '</div></td>' +
          '<td class="r"><b>' + shareOf(r) + '</b><div class="pkt-sm2">' + cnt(r.units_in_peak) + ' ' +
          plural(r.units_in_peak, 'unit', 'units') + '</div></td>' +
          '<td class="r">' + cnt(r.units_28d) + '</td>' +
          '<td class="r">' + (off == null
            ? '<span class="pkt-sm2">no hours sampled</span>'
            : '<span class="' + (off > 0 ? 'pkt-neg' : '') + '">' + gbp(off) + '</span>' +
              '<div class="pkt-sm2">of ' + gbp(samp) + ' in the ' + (seen == null ? 'hours' : cnt(seen) + ' ' + plural(seen, 'hour', 'hours')) + ' we can see</div>') + '</td>' +
          '<td class="r">' + gbp(r.spend_7d) + '<div class="pkt-sm2">all hours</div></td>' +
          '<td class="pkt-why">' + esc(String(r.why || '')) + '</td>' +
          '<td><button class="pkt-btn" data-pkadd="' + esc(String(r.item_id || '')) + '"' +
          (r.already_manual ? ' disabled title="already on the hand-kept list"' : '') + '>' +
          (r.already_manual ? 'On my list' : 'Add to my list') + '</button></td></tr>';
      }).join('') + '</tbody></table></div>';
    /* the same figure as the Spend outside the peak column, drawn so the worst rows read at a glance */
    var bars = rows.filter(function (r) { return n0(r.spend_off_peak_7d) > 0; }).slice(0, 12).map(function (r) {
      return {
        label: String(r.item_id || '').slice(-4), value: n0(r.spend_off_peak_7d),
        title: String(r.title || r.item_id || '') + ': ' + gbp(r.spend_off_peak_7d) + ' outside the ' + slotName(r) + ' over 7 days'
      };
    });
    if (bars.length > 1) {
      h += '<div class="pkt-sub" style="margin:12px 0 4px">Spend outside the peak, last 7 days, worst ' + bars.length + '</div>' +
        chartBars(bars, { height: 150, everyNth: 1 });
    }
    return h + '</div>';
  }

  /* ── tab 2 · manually added ──────────────────────────────────────────────────────────────────── */
  function manualPanel() {
    var rows = manual(), sugg = {};
    suggested().forEach(function (r) { if (r.item_id) sugg[String(r.item_id)] = r; });
    var h = '<div class="pkt-panel"><h3>Manually added' + reg('the peak hours work list', 'how') + '</h3>' +
      '<div class="pkt-sub">The list the team keeps by hand. A removal keeps the row as a record, so the list ' +
      'stays a history of what was decided.</div>';
    h += '<div class="pkt-add" style="margin-bottom:12px">' +
      '<label>Item number<input type="text" id="pktItem" inputmode="numeric" placeholder="item number"></label>' +
      '<label>Hours, optional<input type="text" id="pktHours" placeholder="17-23"></label>' +
      '<label>Note, optional<input type="text" id="pktNote" placeholder="why it belongs on the list"></label>' +
      '<button class="pkt-btn" id="pktAddBtn">Add by item number</button></div>';
    if (!rows.length) {
      return h + '<div class="pkt-empty">Nothing on the hand-kept list' + (PK.account ? ' for ' + esc(PK.account) : '') +
        ' yet. Add an item above, or add one from the suggested tab.</div></div>';
    }
    h += '<div class="pkt-scroll"><table class="pkt-tbl"><thead><tr>' +
      '<th>Listing</th><th>Hours</th><th>Note</th><th>Added by</th><th>Live now</th>' +
      '<th>Campaign</th><th class="r">Spend, 7 days</th><th class="r">Units</th><th></th>' +
      '</tr></thead><tbody>' + rows.map(function (r) {
        var s = sugg[String(r.item_id)];
        return '<tr><td>' + adtProductCell(r) +
          (s ? '<div style="margin-top:4px"><span class="pkt-mark" title="the system suggests this one too">system suggested</span></div>' : '') + '</td>' +
          '<td>' + (r.hours ? '<b>' + esc(String(r.hours)) + '</b>' : '<span class="pkt-sm2">no hours set</span>') + '</td>' +
          '<td class="pkt-why">' + (r.note ? esc(String(r.note)) : '<span class="pkt-sm2">no note</span>') + '</td>' +
          '<td><div class="pkt-sm">' + esc(String(r.added_by || 'not recorded')) + '</div>' +
          '<div class="pkt-sm2">' + esc(whenTxt(r.added_at)) + '</div></td>' +
          '<td>' + liveTag(r.live_now) + '</td>' +
          '<td>' + campCell(r) + '</td>' +
          '<td class="r">' + gbp(r.spend_7d) + '</td>' +
          '<td class="r">' + cnt(r.units_28d) + '</td>' +
          '<td><button class="pkt-btn ghost" data-pkrm="' + esc(String(r.item_id || '')) + '">Remove</button></td></tr>';
      }).join('') + '</tbody></table></div>';
    return h + '</div>';
  }

  /* ── draw and wire ───────────────────────────────────────────────────────────────────────────── */
  function draw() {
    var box = $('pktBody'); if (!box) return;
    var D = PK.data || {}, C = counts();
    var h = '<div class="pkt-top"><span><b>Peak times only</b></span><span>·</span>' +
      '<span>' + esc(PK.account || 'all accounts') + '</span><span>·</span>' +
      '<span>' + cnt(C.suggested) + ' suggested · ' + cnt(C.manual) + ' added by hand</span>' +
      (D.computed_at ? '<span>·</span><span>worked out at ' + esc(String(D.computed_at).slice(11, 16)) + ' UTC</span>' : '') + '</div>';
    h += banner();
    h += rulesLine();
    h += tabs(C);
    h += PK.tab === 'manual' ? manualPanel() : suggestedPanel();
    box.innerHTML = h;
    wire();
  }

  function wire() {
    var box = $('pktBody'); if (!box) return;
    var ts = box.querySelectorAll('[data-pkt]');
    for (var i = 0; i < ts.length; i++) ts[i].onclick = function () { PK.tab = this.getAttribute('data-pkt'); draw(); };

    var as = box.querySelectorAll('[data-pkadd]');
    for (var a = 0; a < as.length; a++) as[a].onclick = function () {
      var id = this.getAttribute('data-pkadd');
      if (!id) { toast('This row has no item number.'); return; }
      add({ item_id: id }, this);
    };

    var btn = $('pktAddBtn');
    if (btn) btn.onclick = function () {
      var it = $('pktItem'), hr = $('pktHours'), nt = $('pktNote');
      var id = it ? String(it.value || '').replace(/\s+/g, '') : '';
      if (!/^\d{9,13}$/.test(id)) { toast('Type the item number first.'); return; }
      add({ item_id: id, hours: hr ? String(hr.value || '').trim() : '', note: nt ? String(nt.value || '').trim() : '' }, this);
    };

    var rs = box.querySelectorAll('[data-pkrm]');
    for (var r = 0; r < rs.length; r++) rs[r].onclick = function () {
      var id = this.getAttribute('data-pkrm');
      if (!id) { toast('This row has no item number.'); return; }
      if (!confirm('Take ' + id + ' off the peak times list?\n\nThe row is kept as a record of what was decided. Nothing is sent to eBay.')) return;
      remove(id, this);
    };
  }

  function add(payload, el) {
    if (PK.busy) return;
    PK.busy = true;
    if (el) el.disabled = true;
    api('adtoolPeakAdd', payload).then(function () {
      toast('Added to the peak times list');
      PK.tab = 'manual';
      PK.busy = false;
      return load(false);
    }).catch(function (e) {
      PK.busy = false;
      if (el) el.disabled = false;
      toast((e && e.message) || 'That could not be added.');
    });
  }
  function remove(id, el) {
    if (PK.busy) return;
    PK.busy = true;
    if (el) el.disabled = true;
    api('adtoolPeakRemove', { item_id: id }).then(function () {
      toast('Taken off the list');
      PK.busy = false;
      return load(false);
    }).catch(function (e) {
      PK.busy = false;
      if (el) el.disabled = false;
      toast((e && e.message) || 'That could not be removed.');
    });
  }
})();
