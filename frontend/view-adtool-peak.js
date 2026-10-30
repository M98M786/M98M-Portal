/* view-adtool-peak.js — Advertising · Peak time listings (owner's Change Spec, 28 Oct 2026:
 * "Peak Time Listings — adtoolPeak: the system switches management's peak list on/off").
 *
 * One page, two tabs. "System suggested" is every advertised listing whose units land mostly in one
 * part of the day, with the money it spends outside that part. "Management's list" is the list the
 * team keeps by hand, and THAT is the list the system now switches: at the start of a listing's
 * hours its ad goes ACTIVE, at the end it goes PAUSED.
 *
 * Switching an ad is a write to eBay, so it goes through the only sanctioned path there is: the
 * per-account live-apply switch. On an account whose switch is off nothing is sent — the change is
 * written down as what WOULD have been sent — and every row on this page says which of the two it
 * is, in plain words, rather than leaving a reader to assume.
 *
 * The hours are picked, never typed: each range is a pair of dropdowns, and the page shows the
 * exact text it will send. The thresholds behind the suggestions are printed from the live config
 * the answer carries, never typed in here.
 *
 * Engine actions: adtoolPeak, adtoolPeakAdd, adtoolPeakRemove. Own class prefix: .pkt-
 */
(function () {
  var ROLES = ['Management', 'Ops Head', 'Advertising Manager'];
  var LOSS = '#e0563f';
  var PK = { tab: 'suggested', account: '', data: null, busy: false, edit: null, ranges: [] };

  VIEW_CSS.push([
    '.pkt-wrap{max-width:1420px}',
    '.pkt-top{display:flex;gap:10px;flex-wrap:wrap;align-items:center;margin:0 0 12px;font-size:12px;color:var(--text-2);font-weight:600}',
    '.pkt-banner{border:1px solid var(--gold-b);border-radius:14px;padding:13px 16px;margin-bottom:12px;background:rgba(242,176,53,.08);color:var(--text);font-size:12.5px;line-height:1.6}',
    '.pkt-banner b{color:var(--text)}',
    '.pkt-banner.off{border-color:rgba(224,86,63,.5);background:rgba(224,86,63,.09)}',
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
    '.pkt-tag.quiet{color:var(--text-3);border-style:dashed}',
    '.pkt-acts{margin-top:6px;display:flex;gap:6px;flex-wrap:wrap}.pkt-mark{display:inline-block;margin-left:6px;padding:1px 7px;border-radius:6px;font-size:10px;font-weight:800;letter-spacing:.04em;border:1px solid var(--gold-line-hi);color:var(--gold-a);white-space:nowrap}',
    '.pkt-neg{color:' + LOSS + ';font-weight:800}.pkt-pos{color:var(--gold-a);font-weight:700}',
    '.pkt-btn{background:var(--gold-b);color:var(--gold-ink);border:0;border-radius:8px;padding:6px 13px;font:inherit;font-size:11.5px;font-weight:800;cursor:pointer;white-space:nowrap}',
    '.pkt-btn.ghost{background:transparent;color:var(--text-2);border:1px solid var(--gold-line)}',
    '.pkt-btn[disabled]{opacity:.5;cursor:default}',
    '.pkt-form{border:1px solid var(--gold-line);border-radius:12px;padding:12px 14px;margin-bottom:12px;background:var(--panel-2)}',
    '.pkt-form h4{margin:0 0 8px;font-size:13px;font-weight:800;color:var(--text)}',
    '.pkt-add{display:flex;gap:10px;flex-wrap:wrap;align-items:flex-end}',
    '.pkt-add label{display:flex;flex-direction:column;gap:4px;font-size:10.5px;text-transform:uppercase;letter-spacing:.07em;color:var(--text-3);font-weight:800}',
    '.pkt-add input{background:var(--bg0);border:1px solid var(--gold-line);border-radius:8px;color:var(--text);font:inherit;font-size:12px;padding:6px 9px;min-width:150px}',
    '.pkt-rng{display:flex;flex-direction:column;gap:7px;margin:8px 0}',
    '.pkt-rngrow{display:flex;gap:7px;align-items:center;flex-wrap:wrap;font-size:12px;color:var(--text-2);font-weight:700}',
    '.pkt-rngrow select{background:var(--bg0);border:1px solid var(--gold-line);border-radius:8px;color:var(--text);font:inherit;font-size:12px;padding:5px 8px}',
    '.pkt-rngrow .x{background:transparent;border:1px solid var(--gold-line);color:var(--text-3);border-radius:7px;padding:3px 9px;font:inherit;font-size:11px;font-weight:800;cursor:pointer}',
    '.pkt-preset{display:flex;gap:6px;flex-wrap:wrap;margin:6px 0 2px}',
    '.pkt-preset button{background:var(--panel);border:1px solid var(--gold-line);border-radius:99px;padding:3px 11px;font:inherit;font-size:11px;color:var(--text-2);font-weight:700;cursor:pointer}',
    '.pkt-preset button:hover{color:var(--gold-a);border-color:var(--gold-line-hi)}',
    '.pkt-out{font-size:12px;color:var(--text-2);line-height:1.6;margin-top:6px}',
    '.pkt-out b{color:var(--text)}',
    '.pkt-out code{font-family:ui-monospace,SFMono-Regular,Menlo,monospace;font-size:12px;color:var(--gold-a);background:rgba(242,176,53,.1);border-radius:6px;padding:1px 6px}',
    '.pkt-bad{color:' + LOSS + ';font-weight:700}',
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
  /* the explainer hook. Only these labels have a pattern of their own in the register map. */
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

  /* ── THE HOURS. Picked from dropdowns, never typed, and the page shows the exact text it sends.
     hh(n) is the two-digit hour the engine's parser reads; a range whose end is at or before its
     start runs past midnight and is said so in words, which is the one case a reader gets wrong. ── */
  function hh(n) { n = Math.max(0, Math.min(23, Math.round(Number(n) || 0))); return (n < 10 ? '0' : '') + n; }
  function clock(n) { return hh(n) + ':00'; }
  function rangesText(ranges) {
    return (ranges || []).filter(function (r) { return r && r.from != null && r.to != null; })
      .map(function (r) { return hh(r.from) + '-' + hh(r.to); }).join(',');
  }
  function rangesWords(ranges) {
    var list = (ranges || []).filter(function (r) { return r && r.from != null && r.to != null; });
    if (!list.length) return '';
    return list.map(function (r) {
      var over = Number(r.to) <= Number(r.from);
      return 'on at ' + clock(r.from) + ', off at ' + clock(r.to) + (over ? ' the next morning' : '');
    }).join('; ');
  }
  function rangesBad(ranges) {
    var list = (ranges || []).filter(function (r) { return r && r.from != null && r.to != null; });
    if (!list.length) return 'Pick at least one range, or leave the hours out altogether.';
    for (var i = 0; i < list.length; i++) {
      if (Number(list[i].from) === Number(list[i].to)) return 'A range cannot start and end on the same hour.';
    }
    return '';
  }
  /* the engine sends hours_parsed for a row it understood; where it did not, the row says so rather
     than showing the text as though it were in force */
  function parsedRanges(r) {
    var p = r && r.hours_parsed;
    if (!Array.isArray(p)) return null;
    return p.map(function (x) { return Array.isArray(x) && x.length >= 2 ? { from: Number(x[0]), to: Number(x[1]) } : null; })
      .filter(Boolean);
  }
  function hourOptions(sel) {
    var out = '';
    for (var i = 0; i < 24; i++) out += '<option value="' + i + '"' + (Number(sel) === i ? ' selected' : '') + '>' + clock(i) + '</option>';
    return out;
  }
  /* the four parts of the day the rest of the tool already talks in, offered as a starting point */
  var PRESETS = [
    ['Evening', [{ from: 17, to: 23 }]],
    ['Afternoon', [{ from: 12, to: 17 }]],
    ['Morning', [{ from: 9, to: 13 }]],
    ['Late evening into the night', [{ from: 22, to: 2 }]],
    ['Lunch and evening', [{ from: 11, to: 14 }, { from: 18, to: 22 }]]
  ];

  VIEWS.adtoolPeak = {
    label: 'Peak time listings',
    /* NOT hidden. Every other advertising-tool page is hidden here and lives only in the /ads/
       portal, but the owner asked for this one "on portal" as well, so it is carried by both builds
       and appears in both sidebars. */
    hidden: false, order: 93, roles: ROLES,
    icon: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/><path d="M4 4l2 2M20 4l-2 2"/>',
    render: function () {
      return '<div class="pkt-wrap">' +
        adtHgroup('Peak time listings', 'The hours each listing should advertise in, and who switches it', 'pktFresh') +
        '<div id="pktAcct" class="pkt-chips"></div>' +
        '<div id="pktBody"><div class="pkt-empty">Loading…</div></div></div>';
    },
    init: function () {
      PK.data = null; PK.edit = null; PK.ranges = [{ from: 17, to: 23 }];
      /* #adtoolPeak?tab=manual opens on the hand-kept list, so a link can point at either tab and a
         second tab of the browser keeps its own */
      var q = (window.adtRoute ? (adtRoute().query || {}) : {}).tab;
      if (q === 'manual' || q === 'suggested') PK.tab = q;
      acctChips();
      load(false).catch(function () {});
    }
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
      PK.edit = null;
      acctChips();
      load(false).catch(function () {});
    };
  }

  /* ── which accounts the system may actually send on ───────────────────────────────────────── */
  function liveSwitchOf(r) {
    if (r && r.live_switch_on != null) return !!r.live_switch_on;
    return null;
  }
  /* `live_switches` is adtoolPeak's own read of portal_config adtool_apply_live_<account>, for the
     whole fleet and not only the accounts on the list below, and `accounts_live` is the same thing
     as a list of the ones that are on. Where either is present the page may speak for the fleet,
     and an account the engine names but the map does not carry has no switch row at all, which is
     off. With neither, all the page has is the `live_switch_on` carried by the rows in front of it,
     and it may only speak for the accounts on this list — which is what `fleet` is for. */
  function switchMap() {
    var map = {}, D = PK.data || {}, fleet = false;
    var sent = D.live_switches || D.live_switch_by_account || null;
    if (sent && typeof sent === 'object' && !Array.isArray(sent)) {
      fleet = true;
      Object.keys(sent).forEach(function (a) { map[a] = !!sent[a]; });
    } else if (Array.isArray(sent)) {
      fleet = true;
      sent.forEach(function (x) { if (x && x.account) map[String(x.account)] = !!(x.live_switch_on != null ? x.live_switch_on : x.on); });
    }
    if (Array.isArray(D.accounts_live)) {
      fleet = true;
      D.accounts_live.forEach(function (a) { if (a) map[String(a)] = true; });
    }
    if (fleet) {
      accountNames().forEach(function (a) { if (map[a] === undefined) map[a] = false; });
    }
    manual().forEach(function (r) {
      var v = liveSwitchOf(r);
      if (v != null && r.account) map[String(r.account)] = v;
    });
    return { map: map, fleet: fleet };
  }
  function switchOf(a) { return switchMap().map[String(a)]; }
  function switchWords() {
    var M = switchMap(), map = M.map, names = Object.keys(map);
    if (!names.length) return null;
    var on = names.filter(function (a) { return map[a]; });
    return { names: names, on: on, off: names.filter(function (a) { return !map[a]; }), fleet: M.fleet };
  }

  /* ── the banner, and the live thresholds ──────────────────────────────────────────────────── */
  /* the ceiling and how often it runs come from the answer, never from this file: a number typed
     here would go on being printed after somebody changed it */
  function capWords() {
    var C = (PK.data && PK.data.switch_caps) || null;
    if (!C || typeof C !== 'object') return '';
    var n = num(C.per_account_per_day), runs = String(C.runs == null ? '' : C.runs).trim();
    if (n == null && !runs) return '';
    return ' It is checked ' + esc(runs || 'on a timer') +
      (n == null ? '.' : ', and an account is held to <b>' + cnt(n) + '</b> ' + plural(n, 'switch', 'switches') + ' a day; past that the change waits for tomorrow.');
  }
  function banner() {
    var s = switchWords();
    var allOff = s && !s.on.length;
    return '<div class="pkt-banner' + (allOff ? ' off' : '') + '">' +
      '<b>The system switches these listings itself.</b> At the start of a listing\'s hours its ad is put back on; ' +
      'at the end it is paused. That is a change on eBay, so it only happens on an account whose live-apply switch ' +
      'is on. <b>Where that switch is off nothing is sent:</b> the change is written down as what would have been ' +
      'sent, and the row says so.' +
      (s
        ? ' ' + (s.fleet ? '' : 'For the accounts on this list, ') + (s.on.length
          ? (s.fleet ? 'Live apply is on for <b>' : 'live apply is on for <b>') + esc(s.on.join(', ')) + '</b>' + (s.off.length ? ' and off for ' + esc(s.off.join(', ')) + '.' : '.')
          : (s.fleet ? 'Live apply is off on every account, so nothing on this page reaches eBay at all.'
            : 'live apply is off on every one of them, so nothing on this page reaches eBay. The page cannot say here what the other accounts are set to.'))
        : ' Which accounts have that switch on is not in this answer, so the page cannot say here.') +
      capWords() +
      '</div>';
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

  /* ── tabs ─────────────────────────────────────────────────────────────────────────────────── */
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
      '<button class="pkt-tab' + (PK.tab === 'manual' ? ' on' : '') + '" data-pkt="manual">Management\'s list<span class="n">' +
      cnt(C.manual) + '</span></button>' +
      (n0(C.both) > 0 ? '<span class="pkt-sm" style="align-self:center">' + cnt(C.both) + ' ' +
        plural(C.both, 'listing is', 'listings are') + ' on both lists</span>' : '') + '</div>';
  }

  /* ── tab 1 · system suggested, the biggest spend outside the peak first ───────────────────── */
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
          (r.already_manual ? '<div style="margin-top:4px"><span class="pkt-mark" title="this listing is on the hand-kept list as well">on the list</span></div>' : '') + '</td>' +
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
          (r.already_manual ? 'On the list' : 'Add to the list') + '</button></td></tr>';
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

  /* ── the hours picker, shared by the add form and the per-row edit ────────────────────────── */
  function pickerHtml(title, idPrefix, withItem, withNote) {
    var bad = rangesBad(PK.ranges), txt = rangesText(PK.ranges);
    var h = '<div class="pkt-form"><h4>' + esc(title) + '</h4>';
    if (withItem) {
      h += '<div class="pkt-add" style="margin-bottom:8px">' +
        '<label>Item number<input type="text" id="' + idPrefix + 'Item" inputmode="numeric" placeholder="item number"></label>' +
        (withNote ? '<label>Note, optional<input type="text" id="' + idPrefix + 'Note" placeholder="why it belongs on the list"></label>' : '') +
        '</div>';
    } else if (withNote) {
      h += '<div class="pkt-add" style="margin-bottom:8px">' +
        '<label>Note, optional<input type="text" id="' + idPrefix + 'Note" placeholder="why it belongs on the list"></label></div>';
    }
    h += '<div class="pkt-preset">' + PRESETS.map(function (p, i) {
      return '<button type="button" data-pkpreset="' + i + '">' + esc(p[0]) + '</button>';
    }).join('') + '</div>';
    h += '<div class="pkt-rng">' + PK.ranges.map(function (r, i) {
      return '<div class="pkt-rngrow">On at <select data-pkfrom="' + i + '">' + hourOptions(r.from) + '</select>' +
        ' off at <select data-pkto="' + i + '">' + hourOptions(r.to) + '</select>' +
        (PK.ranges.length > 1 ? ' <button type="button" class="x" data-pkdel="' + i + '">Remove</button>' : '') + '</div>';
    }).join('') + '</div>';
    h += '<button type="button" class="pkt-btn ghost" data-pkmore="1">Add another range</button>';
    h += '<div class="pkt-out">' + (bad
      ? '<span class="pkt-bad">' + esc(bad) + '</span>'
      : 'The system will be told <code>' + esc(txt) + '</code>, which means <b>' + esc(rangesWords(PK.ranges)) + '</b>, UK time.') + '</div>';
    h += '<div class="pkt-add" style="margin-top:10px">' +
      '<button class="pkt-btn" id="' + idPrefix + 'Save"' + (bad ? ' disabled' : '') + '>' + (withItem ? 'Add to the list' : 'Save these hours') + '</button>' +
      (withItem ? '' : '<button class="pkt-btn ghost" id="' + idPrefix + 'Cancel">Cancel</button>') + '</div>';
    return h + '</div>';
  }

  /* ── tab 2 · management's list, the one the system switches ───────────────────────────────── */
  /* "the system switches it" has to be true, not armed. Three things have to hold: the row is set to
     switch itself, its hours could be read, and there is a pay-per-click ad on it to switch at all.
     The engine sends all three (`auto`, `hours_parsed`, `switchable`), and a row with no switchable
     ad would otherwise have read as switching itself while nothing ever happened to it. */
  function autoCell(r) {
    var a = r.auto;
    if (a == null) return '<span class="pkt-sm2">the system has not recorded this yet</span>';
    if (!Number(a)) return '<span class="pkt-tag quiet">left to a person</span>';
    var p = parsedRanges(r);
    if (!p || !p.length) return '<span class="pkt-tag quiet">set to switch itself</span>' +
      '<div class="pkt-sm2">but its hours cannot be read, so nothing is switched</div>';
    if (r.switchable === false) return '<span class="pkt-tag quiet">set to switch itself</span>' +
      '<div class="pkt-sm2">but it has no pay-per-click ad to switch, so nothing happens</div>';
    return '<span class="pkt-tag live">the system switches it</span>';
  }
  function hoursCell(r) {
    var txt = String(r.hours || '').trim();
    if (!txt) return '<span class="pkt-sm2">no hours set, so nothing is switched</span>';
    var p = parsedRanges(r);
    if (p && p.length) {
      return '<b>' + esc(txt) + '</b><div class="pkt-sm">' + esc(rangesWords(p)) + ', UK time</div>';
    }
    if (r.hours_parsed === null) {
      /* the engine says in plain words WHY it could not read them (hours_problem); printing the
         reason is the difference between a row somebody can fix and a row somebody re-types */
      var why = String(r.hours_problem == null ? '' : r.hours_problem).trim();
      return '<b>' + esc(txt) + '</b><div class="pkt-sm2 pkt-bad">The system could not read these hours, so it switches nothing for this listing.' +
        (why ? ' ' + esc(why) + '. Change them above.' : '') + '</div>';
    }
    return '<b>' + esc(txt) + '</b><div class="pkt-sm2">the system has not said whether it can read these yet</div>';
  }
  function nextCell(r) {
    var t = String(r.next_change == null ? '' : r.next_change).trim();
    if (!t) return '<span class="pkt-sm2">nothing due</span>';
    return '<span class="pkt-sm"><b>' + esc(t) + '</b></span>';
  }
  function lastCell(r) {
    var L = r.last_switch;
    if (!L || typeof L !== 'object') return '<span class="pkt-sm2">never switched</span>';
    var to = String(L.to || '').toUpperCase(), mode = String(L.mode || '').toLowerCase();
    var word = to === 'ACTIVE' ? 'switched on' : (to === 'PAUSED' ? 'switched off' : 'changed');
    if (L.refused) {
      /* eBay answered the request with a refusal: nothing changed, and the job will not ask again until the hours change */
      return '<span class="pkt-sm2">eBay refused ' + (to === 'ACTIVE' ? 'switching on' : 'switching off') + ' (HTTP ' + esc(String(L.http_status || '')) + ')' + (L.at ? ' at ' + esc(String(L.at).slice(11, 16)) + ' UTC' : '') + '; not asked again until the hours change</span>';
    }
    var how = mode === 'live' ? 'sent to eBay'
      : mode === 'blocked' ? 'held back, so nothing was sent'
      : mode ? 'written down, not sent to eBay' : 'mode not recorded';
    return '<div class="pkt-sm"><b>' + esc(word) + '</b> ' + esc(whenTxt(L.at)) + '</div>' +
      '<div class="pkt-sm2">' + esc(how) + '</div>';
  }
  /* THE ACCOUNT SWITCH IS NOT THE WHOLE ANSWER. `switch_state` is what this row would actually do
     on this tick, and it has a third value the account switch on its own cannot show: 'blocked', an
     account that IS live whose own daily ceiling of peak switches is used up. A blocked row printed
     as "on, so changes are sent" says the opposite of what is happening, and the change is still
     owed rather than done. The engine's `switch_note` says why in its own words. */
  var SWITCH_STATE = {
    'live': ['pkt-tag live', 'on, so changes are sent'],
    'would-send': ['pkt-tag off', 'off, so nothing is sent'],
    'blocked': ['pkt-tag quiet', 'held at this account\'s daily ceiling']
  };
  function switchCell(r) {
    var st = String((r && r.switch_state) || '').toLowerCase().trim();
    var S = SWITCH_STATE[st];
    if (S) {
      var note = String((r && r.switch_note) || '').trim();
      return '<span class="' + S[0] + '">' + esc(S[1]) + '</span>' +
        (note ? '<div class="pkt-sm2">' + esc(note) + '</div>' : '');
    }
    var v = liveSwitchOf(r);
    if (v == null && r && r.account) { var m = switchOf(r.account); if (m !== undefined) v = !!m; }
    if (v == null) return '<span class="pkt-sm2">not in this answer</span>';
    return v ? '<span class="pkt-tag live">on, so changes are sent</span>'
      : '<span class="pkt-tag off">off, so nothing is sent</span>';
  }

  function manualPanel() {
    var rows = manual(), sugg = {};
    suggested().forEach(function (r) { if (r.item_id) sugg[String(r.item_id)] = r; });
    var h = '<div class="pkt-panel"><h3>Management\'s list' + reg('the peak hours work list', 'how') + '</h3>' +
      '<div class="pkt-sub">The list the team keeps by hand, and the one the system switches. A removal keeps the ' +
      'row as a record, so the list stays a history of what was decided.</div>';
    h += PK.edit === '' || PK.edit == null ? pickerHtml('Add a listing to the list', 'pktAdd', true, true) : '';
    if (!rows.length) {
      return h + '<div class="pkt-empty">Nothing on the list' + (PK.account ? ' for ' + esc(PK.account) : '') +
        ' yet. Add an item above, or add one from the suggested tab.</div></div>';
    }
    h += '<div class="pkt-scroll"><table class="pkt-tbl"><thead><tr>' +
      '<th>Listing</th><th>Hours, UK time' + reg('the hours for this listing', 'how') + '</th><th>Who switches it' + reg('who switches it', 'how') + '</th><th>Next change</th><th>Last change</th>' +
      '<th>Live apply on this account</th><th>Note</th><th>Added by</th><th>Live now</th>' +
      '<th class="r">Spend, 7 days</th>' +
      '</tr></thead><tbody>' + rows.map(function (r) {
        var id = String(r.item_id || '');
        var editing = PK.edit === id;
        if (editing) {
          return '<tr><td colspan="11">' + pickerHtml('New hours for ' + id, 'pktEd', false, false) + '</td></tr>';
        }
        var s = sugg[id];
        /* the row's two actions live under the listing, in the first column: at the far right of an eleven-column
           table they sat behind the horizontal scroll on an ordinary window, and the owner read that as the
           remove option having been taken away (30 Oct). */
        return '<tr><td>' + adtProductCell(r) +
          (s ? '<div style="margin-top:4px"><span class="pkt-mark" title="the system suggests this one too">system suggested</span></div>' : '') +
          '<div class="pkt-acts"><button class="pkt-btn ghost" data-pkedit="' + esc(id) + '">Change hours</button><button class="pkt-btn ghost" data-pkrm="' + esc(id) + '">Remove</button></div></td>' +
          '<td>' + hoursCell(r) + '</td>' +
          '<td>' + autoCell(r) + '</td>' +
          '<td>' + nextCell(r) + '</td>' +
          '<td>' + lastCell(r) + '</td>' +
          '<td>' + switchCell(r) + '</td>' +
          '<td class="pkt-why">' + (r.note ? esc(String(r.note)) : '<span class="pkt-sm2">no note</span>') + '</td>' +
          '<td><div class="pkt-sm">' + esc(String(r.added_by || 'not recorded')) + '</div>' +
          '<div class="pkt-sm2">' + esc(whenTxt(r.added_at)) + '</div></td>' +
          '<td>' + liveTag(r.live_now) + '</td>' +
          '<td class="r">' + gbp(r.spend_7d) + '</td></tr>';
      }).join('') + '</tbody></table></div>';
    return h + '</div>';
  }

  /* ── draw and wire ────────────────────────────────────────────────────────────────────────── */
  function draw() {
    var box = $('pktBody'); if (!box) return;
    var D = PK.data || {}, C = counts();
    var h = '<div class="pkt-top"><span><b>Peak time listings</b></span><span>·</span>' +
      '<span>' + esc(PK.account || 'all accounts') + '</span><span>·</span>' +
      '<span>' + cnt(C.suggested) + ' suggested · ' + cnt(C.manual) + ' on the list</span>' +
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
    var i;
    var ts = box.querySelectorAll('[data-pkt]');
    for (i = 0; i < ts.length; i++) ts[i].onclick = function () { PK.tab = this.getAttribute('data-pkt'); PK.edit = null; draw(); };

    var as = box.querySelectorAll('[data-pkadd]');
    for (i = 0; i < as.length; i++) as[i].onclick = function () {
      var id = this.getAttribute('data-pkadd');
      if (!id) { toast('This row has no item number.'); return; }
      /* a listing added from the suggested tab arrives with no hours: the team picks them on the
         list, where the hours picker is, rather than having a guess written for them */
      add({ item_id: id }, this);
    };

    /* the hours picker: every control redraws the picker from PK.ranges, so the text the page shows
       and the text it sends are the same string */
    var froms = box.querySelectorAll('[data-pkfrom]');
    for (i = 0; i < froms.length; i++) froms[i].onchange = function () {
      var n = Number(this.getAttribute('data-pkfrom'));
      if (PK.ranges[n]) { PK.ranges[n].from = Number(this.value); draw(); }
    };
    var tos = box.querySelectorAll('[data-pkto]');
    for (i = 0; i < tos.length; i++) tos[i].onchange = function () {
      var n = Number(this.getAttribute('data-pkto'));
      if (PK.ranges[n]) { PK.ranges[n].to = Number(this.value); draw(); }
    };
    var dels = box.querySelectorAll('[data-pkdel]');
    for (i = 0; i < dels.length; i++) dels[i].onclick = function () {
      var n = Number(this.getAttribute('data-pkdel'));
      if (PK.ranges.length > 1) { PK.ranges.splice(n, 1); draw(); }
    };
    var more = box.querySelectorAll('[data-pkmore]');
    for (i = 0; i < more.length; i++) more[i].onclick = function () { PK.ranges.push({ from: 9, to: 13 }); draw(); };
    var pres = box.querySelectorAll('[data-pkpreset]');
    for (i = 0; i < pres.length; i++) pres[i].onclick = function () {
      var p = PRESETS[Number(this.getAttribute('data-pkpreset'))];
      if (p) { PK.ranges = p[1].map(function (r) { return { from: r.from, to: r.to }; }); draw(); }
    };

    var save = $('pktAddSave');
    if (save) save.onclick = function () {
      var it = $('pktAddItem'), nt = $('pktAddNote');
      var id = it ? String(it.value || '').replace(/\s+/g, '') : '';
      if (!/^\d{9,13}$/.test(id)) { toast('Type the item number first.'); return; }
      var bad = rangesBad(PK.ranges);
      if (bad) { toast(bad); return; }
      add({ item_id: id, hours: rangesText(PK.ranges), note: nt ? String(nt.value || '').trim() : '' }, this);
    };
    var edSave = $('pktEdSave');
    if (edSave) edSave.onclick = function () {
      var id = PK.edit;
      var bad = rangesBad(PK.ranges);
      if (bad) { toast(bad); return; }
      var row = null;
      manual().forEach(function (r) { if (String(r.item_id || '') === id) row = r; });
      add({ item_id: id, hours: rangesText(PK.ranges), note: row ? String(row.note || '') : '' }, this);
    };
    var edCancel = $('pktEdCancel');
    if (edCancel) edCancel.onclick = function () { PK.edit = null; draw(); };

    var eds = box.querySelectorAll('[data-pkedit]');
    for (i = 0; i < eds.length; i++) eds[i].onclick = function () {
      var id = this.getAttribute('data-pkedit');
      var row = null;
      manual().forEach(function (r) { if (String(r.item_id || '') === id) row = r; });
      var p = row ? parsedRanges(row) : null;
      PK.ranges = (p && p.length) ? p : [{ from: 17, to: 23 }];
      PK.edit = id;
      draw();
    };

    var rs = box.querySelectorAll('[data-pkrm]');
    for (i = 0; i < rs.length; i++) rs[i].onclick = function () {
      var id = this.getAttribute('data-pkrm');
      if (!id) { toast('This row has no item number.'); return; }
      if (!confirm('Take ' + id + ' off the peak times list?\n\nThe row is kept as a record of what was decided, and the system stops switching it.')) return;
      remove(id, this);
    };
  }

  function add(payload, el) {
    if (PK.busy) return;
    PK.busy = true;
    if (el) el.disabled = true;
    api('adtoolPeakAdd', payload).then(function () {
      toast(payload.hours ? 'Saved: the system will switch it at ' + payload.hours : 'Added to the peak times list');
      PK.tab = 'manual';
      PK.edit = null;
      PK.busy = false;
      return load(false);
    }).catch(function (e) {
      PK.busy = false;
      if (el) el.disabled = false;
      /* the engine refuses hours it cannot read, with its own words: show them rather than a
         general failure, because the reader can act on them */
      toast((e && e.message) || 'That could not be saved.');
    });
  }
  function remove(id, el) {
    if (PK.busy) return;
    PK.busy = true;
    if (el) el.disabled = true;
    api('adtoolPeakRemove', { item_id: id }).then(function () {
      toast('Taken off the list');
      PK.edit = null;
      PK.busy = false;
      return load(false);
    }).catch(function (e) {
      PK.busy = false;
      if (el) el.disabled = false;
      toast((e && e.message) || 'That could not be removed.');
    });
  }
})();
