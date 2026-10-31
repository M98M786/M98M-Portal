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
 * 31 Oct: a listing's hours now say WHICH CAMPAIGN they switch (owner: "give option in peak
 * listings to select campaign, in which campaign we need to run this product?"). The picker offers
 * the running pay-per-click campaigns that listing has an ad in, read from the engine so the page
 * can never offer one the save would turn down, and left alone it means every pay-per-click
 * campaign the listing is in, which is what this list has always done.
 *
 * 31 Oct, section 2 of the owner's brief: a PEAK-TIME OVERVIEW sits at the top of this page.
 * "Our Overview already exists. We need a replica of it on a smaller level, where the only focus
 * is the listings that are playing on peak time." It is not a second Overview: it draws the
 * Overview's own blocks (window.adtOverviewBlocks, from view-adtool-overview.js, which both builds
 * splice before this file) from the same two engine actions asked for one cohort, so there is one
 * code path, one set of tiles and one set of graphs. Under them sits one row of tiles that belong
 * to this list and to nothing else, each with the stamp of the read it stands on.
 * The account chips at the top of the page drive BOTH halves. Two account controls on one page is
 * the exact fault the Overview's own notes record: a reader picks an account, one half follows and
 * the other goes on answering for the whole fleet with nothing saying so.
 *
 * Engine actions: adtoolPeak, adtoolPeakAdd, adtoolPeakRemove, adtoolPeakCampaigns, and
 * adtoolPlan / adtoolCommand with cohort:'peak' for the section at the top.
 * Own class prefix: .pkt-  (the blocks above carry .ov-, which is their own file's and travels
 * with them; nothing here borrows a class from a file either build does not splice.)
 */
(function () {
  var ROLES = ['Management', 'Ops Head', 'Advertising Manager'];
  var LOSS = '#e0563f';
  /* `item`, `note` and `pick` are the ADD FORM's own state. They live here and not in the DOM
     because every control on the hours picker redraws the whole form, and a form rebuilt from the
     DOM loses the item number somebody typed a moment ago. `camps` is the campaign list for
     `campFor`, and nothing else: a list read for one listing is never shown against another. */
  var PK = { tab: 'suggested', account: '', data: null, busy: false, edit: null, ranges: [],
    item: '', note: '', pick: '', pickName: '', camps: null, campFor: '', campNote: '', campErr: '', campBusy: false,
    /* the Peak-time overview's own state: the window its period bar is on, the two cohort answers,
       and which tile the reader has opened the listings behind. */
    pkoPeriod: null, pkoPlan: null, pkoCmd: null, pkoList: '',
    /* the 24-hour pattern's own state (owner's brief, 31 Oct, §3). `cell` is the one hour somebody
       has clicked, as 'item|day|hour', so its reason stays on the page instead of living in a
       tooltip nobody can read on a touch screen. `dataFor` is the listing whose data is expanded.
       `holdBy` remembers who set a hold FROM THE WRITE'S OWN ANSWER, because the list read does not
       carry it: a name is shown only where this page watched it being set. */
    cell: '', dataFor: '', holdBy: {}, holdBusy: '',
    /* THE REAL HOURS BEHIND THE DECISION (31 Oct, §3's last open item). The peak list's own answer
       carries the planner's conclusion and not the readings behind it, so the panel asks for them
       the moment it is opened: `prof` keeps one listing's answer by item number, `profBusy` is the
       listing being read, and `profErr` is what to say when the read was refused. Kept by item
       number so re-opening a listing does not ask again. */
    prof: {}, profBusy: '', profErr: {} };
  var campTimer = null;

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
    '.pkt-add select{background:var(--bg0);border:1px solid var(--gold-line);border-radius:8px;color:var(--text);font:inherit;font-size:12px;padding:6px 9px;min-width:250px;max-width:420px}',
    '.pkt-add select[disabled]{color:var(--text-3)}',
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
    '.pkt-reg{font-size:9.5px;letter-spacing:.06em;text-transform:uppercase;color:var(--text-3);font-weight:800;border:1px solid var(--gold-line);border-radius:6px;padding:1px 6px;margin-left:6px;white-space:nowrap}',
    /* the Peak-time overview's own row of tiles. This file's prefix, this file's rules: the blocks
       above it bring their own .ov- styling with them from the file they live in. */
    '.pkt-kpis{display:grid;grid-template-columns:repeat(auto-fit,minmax(215px,1fr));gap:10px;margin:12px 0 8px}',
    '.pkt-kpi{background:var(--panel-2);border:1px solid var(--gold-line);border-radius:12px;padding:10px 12px}',
    '.pkt-kpi.click{cursor:pointer}',
    '.pkt-kpi.click:hover{border-color:var(--gold-line-hi)}',
    '.pkt-kpi .k{font-size:10.5px;text-transform:uppercase;letter-spacing:.08em;color:var(--text-3);font-weight:800}',
    '.pkt-kpi .v{font-size:20px;font-weight:800;font-variant-numeric:tabular-nums;margin-top:2px;color:var(--text)}',
    '.pkt-kpi .v.gold{color:var(--gold-a)}',
    '.pkt-kpi .d{font-size:11.5px;color:var(--text-2);margin-top:3px;line-height:1.5}',
    '.pkt-asof{margin-top:7px;font-size:10px;letter-spacing:.05em;text-transform:uppercase;color:var(--text-3);font-weight:800}',
    '.pkt-badge{display:inline-block;margin-left:6px;padding:1px 7px;border-radius:999px;font-size:10px;font-weight:800;border:1px solid var(--gold-line);color:var(--text-3)}',
    '.pkt-badge.amber{color:var(--gold-a);border-color:rgba(242,176,53,.5)}',
    '.pkt-badge.red{color:' + LOSS + ';border-color:rgba(224,86,63,.55)}',
    '.pkt-recon{font-size:12px;color:var(--text-2);margin:2px 0 10px;line-height:1.55}',
    '.pkt-recon.bad{color:' + LOSS + ';font-weight:700}',
    '.pkt-row{padding:7px 0;border-bottom:1px solid rgba(255,255,255,.05)}',
    /* ── the 24-hour pattern (owner's brief, 31 Oct, §3). This file's own prefix throughout. ── */
    '.pkt-sched{display:flex;gap:18px;flex-wrap:wrap;align-items:flex-start;padding:2px 0 2px}',
    '.pkt-schedb{flex:0 1 430px;min-width:290px}',
    '.pkt-dayk{font-size:9.5px;letter-spacing:.07em;text-transform:uppercase;color:var(--text-3);font-weight:800;margin:0 0 4px}',
    '.pkt-strip{display:grid;grid-template-columns:repeat(24,1fr);gap:2px}',
    '.pkt-strip .c{height:17px;border-radius:3px;background:rgba(255,255,255,.07);border:1px solid transparent;padding:0;font:inherit;cursor:pointer}',
    '.pkt-strip .c.on{background:var(--gold-b)}',
    '.pkt-strip .c.dead{background:rgba(224,86,63,.45);border-color:rgba(224,86,63,.65)}',
    '.pkt-strip .c.held{background:rgba(255,255,255,.3)}',
    '.pkt-strip .c.now{border-color:var(--text);border-width:2px}',
    '.pkt-strip .c.pick{outline:2px solid var(--gold-a);outline-offset:1px}',
    '.pkt-strip .l{font-size:8.5px;color:var(--text-3);text-align:center;font-variant-numeric:tabular-nums;line-height:1.5}',
    '.pkt-legend{display:flex;gap:9px;flex-wrap:wrap;margin-top:5px;font-size:10px;color:var(--text-3);font-weight:700}',
    '.pkt-legend i{display:inline-block;width:9px;height:9px;border-radius:2px;margin-right:3px;vertical-align:-1px}',
    '.pkt-legend i.on{background:var(--gold-b)}.pkt-legend i.off{background:rgba(255,255,255,.07)}',
    '.pkt-legend i.dead{background:rgba(224,86,63,.45)}.pkt-legend i.held{background:rgba(255,255,255,.3)}',
    '.pkt-pick{margin-top:5px;font-size:11px;color:var(--text);line-height:1.5;border-left:2px solid var(--gold-b);padding-left:7px}',
    '.pkt-hold{display:flex;gap:5px;flex-wrap:wrap;margin-top:6px}',
    '.pkt-hold button{background:var(--panel);border:1px solid var(--gold-line);border-radius:99px;padding:3px 11px;font:inherit;font-size:11px;color:var(--text-2);font-weight:700;cursor:pointer;white-space:nowrap}',
    '.pkt-hold button.on{color:var(--gold-ink);background:var(--gold-b);border-color:var(--gold-b);font-weight:800}',
    '.pkt-hold button[disabled]{opacity:.5;cursor:default}',
    '.pkt-link{background:transparent;border:0;padding:0;font:inherit;font-size:11px;font-weight:800;color:var(--gold-a);cursor:pointer;text-decoration:underline;text-underline-offset:2px}',
    '.pkt-data{margin-top:8px;border:1px solid var(--gold-line);border-radius:12px;padding:10px 12px;background:var(--panel-2)}',
    '.pkt-data h5{margin:0 0 6px;font-size:12px;font-weight:800;color:var(--text)}',
    '.pkt-htbl{width:100%;border-collapse:collapse;font-size:11px;font-variant-numeric:tabular-nums}',
    '.pkt-htbl th{text-align:left;font-size:9.5px;letter-spacing:.05em;text-transform:uppercase;color:var(--text-3);font-weight:800;padding:4px 6px;border-bottom:1px solid var(--gold-line);white-space:nowrap}',
    '.pkt-htbl td{padding:4px 6px;border-bottom:1px solid rgba(255,255,255,.05);color:var(--text-2)}',
    '.pkt-htbl td.hr{color:var(--text);font-weight:700;white-space:nowrap}',
    '.pkt-htbl tr.nowrow td{background:rgba(242,176,53,.08)}',
    '.pkt-sub2{background:rgba(255,255,255,.015)}'
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
  /* the END of a stretch, which the engine writes as the hour the ad stops and so may be 24. hh()
     clamps to 23, which would print a window running to midnight as one ending an hour early. */
  function clockTo(n) { var v = Math.round(Number(n) || 0); return v >= 24 ? 'midnight' : clock(v); }
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
      /* the account chips come first and drive BOTH halves of the page. Then the Peak-time overview,
         then the page as it was. */
      return '<div class="pkt-wrap">' +
        adtHgroup('Peak time listings', 'The hours each listing should advertise in, and who switches it', 'pktFresh') +
        '<div id="pktAcct" class="pkt-chips"></div>' +
        pkoHead() +
        '<div id="pkoHero"><div class="pkt-empty">Loading…</div></div>' +
        '<div id="pkoToday"><div class="pkt-empty">Loading…</div></div>' +
        '<div id="pkoExtra"></div>' +
        '<div id="pktBody"><div class="pkt-empty">Loading…</div></div></div>';
    },
    init: function () {
      PK.data = null; PK.edit = null; PK.ranges = [{ from: 17, to: 23 }];
      PK.item = ''; PK.note = ''; PK.pick = ''; PK.pickName = '';
      PK.camps = null; PK.campFor = ''; PK.campNote = ''; PK.campErr = ''; PK.campBusy = false;
      PK.cell = ''; PK.dataFor = ''; PK.holdBy = {}; PK.holdBusy = '';
      /* #adtoolPeak?tab=manual opens on the hand-kept list, so a link can point at either tab and a
         second tab of the browser keeps its own */
      var q = (window.adtRoute ? (adtRoute().query || {}) : {}).tab;
      if (q === 'manual' || q === 'suggested') PK.tab = q;
      acctChips();
      load(false).catch(function () {});
      /* the Peak-time overview. Its own remembered window, under its own page key, so changing it
         here does not move the Overview's and the other way round. */
      PK.pkoPlan = null; PK.pkoCmd = null; PK.pkoList = '';
      PK.pkoPeriod = adtPeriodBar('pkoBar', { page: 'adtoolPeakOverview', def: 'd30', onChange: function (v) { PK.pkoPeriod = v; loadPkoPlan(false).catch(function () {}); } });
      loadPkoPlan(false).catch(function () {});
      loadPkoCmd(false).catch(function () {});
      /* today moves every 5 minutes. adtPoll skips hidden tabs and stops for good on an 'auth'
         refusal, which is the session-expiry law every live page in this portal follows. */
      adtPoll('pkoToday', 300000, function () { return loadPkoCmd(true); });
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
      PK.pkoList = '';
      acctChips();
      load(false).catch(function () {});
      /* ONE chip for the whole page: both halves are re-asked, so the section and the lists under it
         can never be answering for different accounts. */
      loadPkoPlan(false).catch(function () {});
      loadPkoCmd(false).catch(function () {});
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
      /* the one sentence the brief asks for, in plain words. The hours somebody typed stay the
         envelope, so the worst a wrong pattern can do is leave an ad paused in an hour that has
         never sold: it can never put an ad into an hour nobody asked for. */
      ' <b>Inside those hours the system now reads each listing\'s own 24 hours' + reg('the 24-hour pattern', 'how') +
      '</b> and keeps the ad paused through the stretches it has never sold in, so the hours somebody typed are the ' +
      'most a listing can run and never more.' +
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
  /* HOW THE PATTERN DECIDES, in the engine's own sentence. Every figure in it is read out of the
     answer: `plan_rules_text` is built by the engine from the six settings a manager can change, so
     changing one in Management changes these words too. Nothing here is typed, and a figure the
     answer does not carry says so rather than standing in for one. */
  function patternLine() {
    var D = PK.data || {}, R = D.plan_rules || null, C = D.counts || {};
    var txt = String(D.plan_rules_text == null ? '' : D.plan_rules_text).trim();
    var note = String(D.plan_note == null ? '' : D.plan_note).trim();
    var h = '<div class="pkt-rules"><b>How it decides' + reg('dead hours', 'how') + '</b> ';
    h += txt ? esc(txt) + '.' : 'The figures behind the pattern are not in this answer, so none is shown here.';
    if (R && R.plan_time) h += ' The day ahead is worked out at <b>' + esc(String(R.plan_time)) + '</b> UK, and again at each cut between two parts of the day for any listing whose shape has moved.';
    if (note) h += '<br>' + esc(note) + '.';
    /* the same rules counted over the rows in front of the reader, so the sentence above has a tally
       beside it. Each of the five is the engine's own count over this account's rows. */
    var bits = [];
    if (num(C.on_schedule) != null) bits.push('<b>' + cnt(C.on_schedule) + '</b> on a schedule');
    if (num(C.on_pattern) != null) bits.push('<b>' + cnt(C.on_pattern) + '</b> narrowed by the pattern');
    if (num(C.pattern_proposed) != null) bits.push('<b>' + cnt(C.pattern_proposed) + '</b> with dead hours put forward and not acted on');
    if (num(C.held) != null) bits.push('<b>' + cnt(C.held) + '</b> held by hand' + reg('held on or off', 'how'));
    if (num(C.not_tracking) != null) bits.push('<b>' + cnt(C.not_tracking) + '</b> no longer playing on their own pattern');
    if (bits.length) h += '<br>On the hand-kept list: ' + bits.join(' · ') + '.';
    return h + '</div>';
  }

  /* ══ THE 24-HOUR PATTERN, PER ROW (owner's brief, 31 Oct, §3) ═══════════════════════════════
     The planner writes each listing's day and this prints what it wrote. Nothing here works a
     schedule out for itself: reading four weeks of hours for every row on an open page is not a
     page, and two answers to one question is how a screen comes to disagree with the job that
     actually switches the ad. Where the planner has written nothing the row says so, which is a
     listing running on its typed hours exactly as it did before any of this existed. ══ */
  function ukHourNow() {
    try {
      var p = new Intl.DateTimeFormat('en-GB', { timeZone: 'Europe/London', hour: '2-digit', hour12: false }).formatToParts(new Date());
      var v = Number((p.filter(function (x) { return x.type === 'hour'; })[0] || {}).value);
      return isFinite(v) ? (v % 24) : null;
    } catch (e) { return null; }
  }
  /* the words for each source the planner can write, and the sentence behind them. 'hold' carries
     which way somebody held it, so the two holds never read as one. */
  function srcWords(s, hold) {
    var k = String(s == null ? '' : s);
    if (k === 'hold') {
      var w = String(hold || '') === 'off' ? 'held off' : 'held on';
      return [w, 'somebody has held this listing, so neither its hours nor its pattern decides anything today'];
    }
    if (k === 'pattern') return ['from its pattern', 'inside its own hours, with the hours it has never sold in switched off'];
    if (k === 'typed') return ['typed hours', 'its own hours, with nothing taken off them by the pattern'];
    if (k === 'proposal') return ['proposal: not enough days observed yet', 'today runs on the hours somebody typed, and the dead hours the pattern found are put forward for somebody to look at'];
    if (k === 'none') return ['no hours the system can read', 'there is nothing to schedule for this listing, so nothing is switched'];
    return null;
  }
  /* which class an hour's cell wears. The reason the planner wrote beside the hour is what decides
     it, so a cell can never disagree with the line under the strip. */
  function cellKind(state, reason) {
    var r = String(reason == null ? '' : reason);
    if (r.indexOf('held ') === 0) return 'held';
    if (r.indexOf('dead window') === 0) return 'dead';
    return String(state) === 'ON' ? 'on' : '';
  }
  var CELL_WORDS = { on: 'the ad runs', dead: 'the ad is paused: a dead hour', held: 'held by hand', '': 'the ad is paused' };
  function hourStrip(id, sch, label) {
    if (!sch || !Array.isArray(sch.states) || sch.states.length !== 24) {
      return '<div class="pkt-schedb"><div class="pkt-dayk">' + esc(label) + '</div>' +
        '<div class="pkt-sm2">The system has written no schedule for this day, so this listing runs on the hours somebody typed for it.</div></div>';
    }
    var reasons = Array.isArray(sch.reasons) ? sch.reasons : [];
    var day = String(sch.day || '');
    var nowH = day && day === adtUkDay() ? ukHourNow() : null;
    var i, h = '<div class="pkt-schedb"><div class="pkt-dayk">' + esc(label) + (day ? ' · ' + esc(day) : '') + '</div><div class="pkt-strip">';
    for (i = 0; i < 24; i++) {
      var kind = cellKind(sch.states[i], reasons[i]);
      var why = String(reasons[i] == null ? '' : reasons[i]);
      h += '<button type="button" class="c ' + kind + (nowH === i ? ' now' : '') +
        (PK.cell === id + '|' + day + '|' + i ? ' pick' : '') + '" data-pkcell="' + esc(id + '|' + day + '|' + i) + '"' +
        ' title="' + esc(clock(i) + ' UK · ' + CELL_WORDS[kind] + (why ? ' · ' + why : '')) + '"' +
        ' aria-label="' + esc(clock(i) + ' ' + CELL_WORDS[kind]) + '"></button>';
    }
    for (i = 0; i < 24; i++) h += '<div class="l">' + (i % 6 === 0 ? i : '') + '</div>';
    h += '</div>';
    h += '<div class="pkt-legend"><span><i class="on"></i>runs</span><span><i class="off"></i>paused</span>' +
      '<span><i class="dead"></i>dead hour</span><span><i class="held"></i>held</span>' +
      (nowH == null ? '' : '<span>the hour outlined is the one running now</span>') + '</div>';
    /* the clicked hour's reason, kept on the page. A tooltip cannot be read on a touch screen and
       cannot be copied into a message to whoever keeps the list. */
    var key = String(PK.cell || ''), parts = key.split('|');
    if (parts.length === 3 && parts[0] === id && parts[1] === day) {
      var n = Number(parts[2]);
      if (isFinite(n) && n >= 0 && n <= 23) {
        h += '<div class="pkt-pick"><b>' + esc(clock(n)) + ' to ' + esc(clockTo(n + 1)) + ' UK</b> · ' +
          esc(CELL_WORDS[cellKind(sch.states[n], reasons[n])]) +
          (reasons[n] ? '<br>' + esc(String(reasons[n])) : '') + '</div>';
      }
    }
    return h + '</div>';
  }
  /* WHO SET A HOLD. The list read does not carry it, so a name is shown only where this page watched
     the hold being set: the write's own answer names who did it. Anything else would be a guess. */
  function holdByLine(id, hold) {
    if (hold !== 'on' && hold !== 'off') return '';
    var b = PK.holdBy[String(id)];
    if (!b || !b.by) return '<div class="pkt-sm2">Who set this hold is not in this answer.</div>';
    return '<div class="pkt-sm2">Held ' + esc(hold) + ' by <b>' + esc(String(b.by)) + '</b>' + (b.at ? ' · ' + esc(whenTxt(b.at)) : '') + '</div>';
  }
  function holdControl(r) {
    var id = String(r.item_id || '');
    var hold = String(r.hold == null ? '' : r.hold);
    if (!hold) {
      return '<div class="pkt-sm2">This answer does not say whether anybody is holding this listing, so the hold cannot be set from here.</div>';
    }
    var busy = PK.holdBusy === id;
    var opts = [['auto', 'Automatic'], ['on', 'Hold on'], ['off', 'Hold off']];
    return '<div class="pkt-dayk">Hold' + reg('held on or off', 'how') + '</div>' +
      '<div class="pkt-hold">' + opts.map(function (o) {
        return '<button type="button" class="' + (hold === o[0] ? 'on' : '') + '" data-pkhold="' + esc(id + '|' + o[0]) + '"' +
          (busy || hold === o[0] ? ' disabled' : '') + '>' + esc(o[1]) + '</button>';
      }).join('') + '</div>' +
      '<div class="pkt-sm2">Automatic leaves the day to the schedule. A hold keeps the ad running, or paused, all day whatever the hours and the pattern say.' +
      (Number(r.auto) ? '' : ' This listing is not set to switch itself, so a hold is written down and nothing switches it.') + '</div>' +
      holdByLine(id, hold);
  }
  /* THE READINGS BEHIND THE DECISION, asked for one listing when the panel is opened (31 Oct, §3's
     last open item). adtoolPeakProfile hands back what the evidence probe hands back for one
     listing, out of the same assembling function, so this panel and that probe cannot show
     different hours for one listing. It reads and it decides nothing. */
  function loadProfile(id) {
    var key = String(id || '');
    if (!key || PK.prof[key] || PK.profBusy === key) return;
    PK.profBusy = key;
    var done = function () { if (PK.profBusy === key) PK.profBusy = ''; if (PK.dataFor === key) draw(); };
    api('adtoolPeakProfile', { item_id: key, days: 3 }).then(function (D) {
      PK.prof[key] = D || {}; delete PK.profErr[key]; done();
    })['catch'](function (e) {
      PK.profErr[key] = (e && e.message) || 'the hours behind this could not be read';
      done();
    });
  }
  /* the four parts of the day, the SAME 24 readings added up: it is the hours above grouped, and
     the heading says so, rather than a second figure from a second source. */
  var PROF_SLOTS = [['Night', 0, 6], ['Morning', 6, 12], ['Afternoon', 12, 17], ['Evening', 17, 24]];
  function profSlotRow(hours) {
    if (!Array.isArray(hours) || hours.length !== 24) return '';
    var cells = PROF_SLOTS.map(function (s) {
      var sp = 0, cl = 0, or_ = 0, un = 0, i;
      for (i = s[1]; i < s[2]; i++) {
        var h = hours[i] || {};
        sp += num(h.spend_raw) || 0; cl += num(h.clicks_raw) || 0;
        or_ += num(h.orders_raw) || 0; un += num(h.units_raw) || 0;
      }
      return '<td><b>' + esc(s[0]) + '</b> ' + esc(hh(s[1])) + '-' + esc(s[2] >= 24 ? '24' : hh(s[2])) +
        '<div class="pkt-sm2">' + gbp(sp) + ' · ' + cnt(cl) + ' clicks · ' + cnt(or_) + ' orders, ' + cnt(un) + ' units</div></td>';
    }).join('');
    return '<table class="pkt-htbl" style="margin-top:8px"><thead><tr><th colspan="4">The same hours added into the four parts of the day</th></tr></thead>' +
      '<tbody><tr>' + cells + '</tr></tbody></table>';
  }
  /* an hour of the profile, in the words the rest of this page uses. Every figure is the REAL sum
     over the real days, not the weighted pattern: a threshold is a threshold on real money, and a
     weighted figure has counted some days twice. */
  function profRows(P, T, M, tr, mr, nowH) {
    var hours = (P && P.profile && P.profile.hours) || null;
    var dead = {};
    if (P && P.dead_hours && Array.isArray(P.dead_hours.windows)) {
      P.dead_hours.windows.forEach(function (w) {
        if (!w || w.from == null || w.to == null) return;
        for (var k = Number(w.from); k !== Number(w.to); k = (k + 1) % 24) dead[k] = 1;
      });
    }
    var h = '';
    for (var i = 0; i < 24; i++) {
      var hr = hours ? (hours[i] || {}) : null;
      var ts = T && T.states ? String(T.states[i]) : '', ms = M && M.states ? String(M.states[i]) : '';
      h += '<tr' + (nowH === i ? ' class="nowrow"' : '') + '><td class="hr">' + esc(clock(i)) + (nowH === i ? ' · now' : '') + '</td>' +
        (hours
          ? '<td>' + gbp(hr.spend_raw) + '</td><td>' + cnt(hr.clicks_raw) + '</td>' +
            '<td>' + cnt(hr.orders_raw) + (num(hr.units_raw) != null ? ' <span class="pkt-sm2">· ' + cnt(hr.units_raw) + ' units</span>' : '') + '</td>' +
            '<td>' + cnt(hr.days_observed) + (num(hr.days_with_sales) != null ? ' <span class="pkt-sm2">· sold on ' + cnt(hr.days_with_sales) + '</span>' : '') + '</td>' +
            '<td>' + (dead[i] ? '<b>dead</b>' : '<span class="pkt-sm2">no</span>') + '</td>'
          : '<td colspan="5"><span class="pkt-sm2">not read yet</span></td>') +
        '<td>' + (ts ? esc(CELL_WORDS[cellKind(ts, tr[i])]) : '<span class="pkt-sm2">no schedule</span>') + '</td>' +
        '<td>' + (tr[i] ? esc(String(tr[i])) : '<span class="pkt-sm2">not recorded</span>') + '</td>' +
        '<td>' + (ms ? esc(CELL_WORDS[cellKind(ms, mr[i])]) + (mr[i] ? ' <span class="pkt-sm2">· ' + esc(String(mr[i])) + '</span>' : '') : '<span class="pkt-sm2">no schedule yet</span>') + '</td></tr>';
    }
    return h;
  }
  /* the finished days the answer carries, each one's hours summed beside the day eBay published */
  function profDays(P) {
    var L = (P && Array.isArray(P.daily_totals)) ? P.daily_totals : null;
    if (!L || !L.length) return '';
    return '<div class="pkt-scroll" style="margin-top:8px"><table class="pkt-htbl"><thead><tr><th>Finished day</th>' +
      '<th>Its hours added up</th><th>The day eBay published</th><th>Hours with a reading</th></tr></thead><tbody>' +
      L.map(function (d) {
        var s = d.hours_sum || {}, t = d.daily_total || null;
        return '<tr><td class="hr">' + esc(String(d.day || '')) + '</td>' +
          '<td>' + gbp(s.spend) + ' · ' + cnt(s.clicks) + ' clicks · ' + cnt(s.orders) + ' orders</td>' +
          '<td>' + (t ? gbp(t.spend) + ' · ' + cnt(t.clicks) + ' clicks · ' + cnt(t.orders) + ' orders' : '<span class="pkt-sm2">eBay has published no day row for this listing</span>') + '</td>' +
          '<td>' + cnt(d.hours_with_a_reading) + ' of 24' +
          (d.spend_difference != null && Math.abs(num(d.spend_difference)) >= 0.01
            ? '<div class="pkt-sm2">' + gbp(Math.abs(num(d.spend_difference))) + ' apart on spend</div>' : '') + '</td></tr>';
      }).join('') + '</tbody></table></div>';
  }

  /* THE DATA BEHIND THE DECISION. What the planner wrote, hour by hour, for today and tomorrow, and
     the readings it stands on. Until 31 Oct the readings were not here at all: the peak list's own
     answer carries the planner's conclusion and nothing else, so the panel could only print the
     conclusion and name the gap. It now asks adtoolPeakProfile for the one listing it is open on,
     which hands back what the evidence probe hands back, out of the same assembling function. */
  function dataPanel(r, sugg) {
    var id = String(r.item_id || '');
    if (PK.dataFor !== id) return '';
    var T = r.schedule_today, M = r.schedule_tomorrow;
    var tr = Array.isArray(T && T.reasons) ? T.reasons : [], mr = Array.isArray(M && M.reasons) ? M.reasons : [];
    var nowH = T && String(T.day || '') === adtUkDay() ? ukHourNow() : null;
    var P = PK.prof[id] || null, pErr = PK.profErr[id] || '';
    var h = '<div class="pkt-data"><h5>The data behind this' + reg('the 24-hour pattern', 'how') + '</h5>';
    h += '<div class="pkt-sm2" style="margin-bottom:8px">Every hour of the day for this listing: the money that went out in it, ' +
      'the clicks, the orders and the units, on how many days we hold a reading for it and on how many of those it sold, ' +
      'beside what the planner wrote for that hour and why. ' +
      'eBay publishes no ad figures by hour: the hourly money is the portal\'s own reading of eBay\'s running total every few ' +
      'minutes, each difference booked to the hour it arrived in, and a day\'s first reading belongs to no hour of trading ' +
      'and is left out. Today is kept out of the pattern, because a part day reads as quiet in every hour the clock has not reached.</div>';
    if (pErr) h += '<div class="pkt-sm2" style="margin-bottom:8px">The hours behind this could not be read: ' + esc(pErr) + '</div>';
    else if (!P) h += '<div class="pkt-sm2" style="margin-bottom:8px">Reading the hours behind this…</div>';
    h += '<div class="pkt-scroll"><table class="pkt-htbl"><thead><tr><th>Hour, UK</th>' +
      '<th>Spend</th><th>Clicks</th><th>Sales</th><th>Days observed</th><th>Dead?</th>' +
      '<th>Today' + (T && T.day ? ' · ' + esc(String(T.day)) : '') + '</th><th>Why today</th>' +
      '<th>Tomorrow' + (M && M.day ? ' · ' + esc(String(M.day)) : '') + '</th></tr></thead><tbody>' +
      profRows(P, T, M, tr, mr, nowH) + '</tbody></table></div>';
    if (P && P.profile) h += profSlotRow(P.profile.hours);
    if (!T && !M) h += '<div class="pkt-sm2" style="margin-top:6px">The system has written no schedule for this listing, for today or for tomorrow, so the last three columns are empty.</div>';
    h += profDays(P);
    /* ONE "days observed" on this panel. The list row carries it and so does the hourly answer, and
       they are the same figure read twice, so the row's is printed and the answer's is only used to
       say when they disagree, which would mean the planner and this read are not on the same rows. */
    var days = num(r.profile_days), ca = T && T.computed_at ? String(T.computed_at) : '';
    var seen = P && P.profile ? num(P.profile.days_observed) : null;
    h += '<div class="pkt-sm" style="margin-top:8px"><b>Days of hours the pattern was read over:</b> ' +
      (days == null ? (seen == null ? 'not available yet' : cnt(seen) + ' ' + plural(seen, 'day', 'days')) : cnt(days) + ' ' + plural(days, 'day', 'days')) +
      (P && P.rules && P.rules.lookback_days != null ? ' · looked back over ' + cnt(P.rules.lookback_days) + ' ' + plural(P.rules.lookback_days, 'day', 'days') : '') +
      (ca ? ' · <b>worked out</b> ' + esc(whenTxt(ca)) : '') +
      (days != null && seen != null && days !== seen ? ' · <b>the hours read now give ' + cnt(seen) + '</b>, so the schedule was written over a different set of days' : '') + '</div>';
    if (P && P.profile && P.profile.note) h += '<div class="pkt-sm2">' + esc(String(P.profile.note)) + '</div>';
    if (P && P.dead_hours && P.dead_hours.note) h += '<div class="pkt-sm2">' + esc(String(P.dead_hours.note)) + '</div>';
    if (P && P.tracking && P.tracking.note) h += '<div class="pkt-sm2">' + esc(String(P.tracking.note)) + '</div>';
    if (P && P.note) h += '<div class="pkt-sm2">' + esc(String(P.note)) + '</div>';
    h += windowsLine('Switched off today by the pattern', r.dead_windows, 'nothing today');
    h += windowsLine('Put forward and not acted on', r.dead_proposal, 'nothing put forward');
    /* the four parts of the day, where the suggestion list has judged this listing: that row carries
       the part of the day its units land in and the hours its money was sampled over, and this list's
       own rows do not. Where it is not on that list there is nothing to show and the panel says so. */
    if (sugg) {
      h += '<div class="pkt-sm" style="margin-top:6px"><b>The part of the day its units land in:</b> ' +
        esc(slotName(sugg)) + ' · ' + shareOf(sugg) + ' of ' + cnt(sugg.units_28d) + ' ' + plural(sugg.units_28d, 'unit', 'units') +
        (slotHours(sugg) ? ' · ' + esc(slotHours(sugg)) : '') + '</div>' +
        '<div style="margin-top:4px">' + adtHourStrip({ run: sugg.run || [], avoid: sugg.avoid || [], basis: String(sugg.hour_basis || '') }) + '</div>';
    } else {
      h += '<div class="pkt-sm2" style="margin-top:6px">The four parts of the day are not worked out for this listing in this answer: it is not on the suggested list.</div>';
    }
    return h + '<div style="margin-top:8px"><button type="button" class="pkt-btn ghost" data-pkdataclose="1">Close</button></div></div>';
  }
  function windowsLine(label, list, empty) {
    var L = Array.isArray(list) ? list.filter(function (w) { return w && w.from != null && w.to != null; }) : null;
    if (!L) return '<div class="pkt-sm2">' + esc(label) + ': not in this answer</div>';
    if (!L.length) return '<div class="pkt-sm2">' + esc(label) + ': ' + esc(empty) + '</div>';
    return '<div class="pkt-sm"><b>' + esc(label) + ':</b> ' + L.map(function (w) {
      return esc(clock(w.from) + ' to ' + clockTo(w.to));
    }).join(', ') + '</div>';
  }
  /* the whole block that sits under one listing row: the two strips, where the day came from, how
     many days it was read over, the data link, and the hold. */
  function patternBlock(r, sugg) {
    var id = String(r.item_id || '');
    var T = r.schedule_today, M = r.schedule_tomorrow;
    var src = T ? srcWords(T.source, r.hold) : null;
    var days = num(r.profile_days);
    var h = '<div class="pkt-sched">' + hourStrip(id, T, 'Today') + hourStrip(id, M, 'Tomorrow') +
      '<div class="pkt-schedb">' + holdControl(r) + '</div></div>';
    h += '<div class="pkt-sm" style="margin-top:6px">';
    h += src ? '<b>' + esc(src[0]) + '</b> · ' + esc(src[1]) : (T ? '<b>' + esc(String(T.source || 'not recorded')) + '</b>' : '<b>no schedule written</b> · this listing runs on the hours somebody typed for it');
    h += ' · <b>days observed:</b> ' + (days == null ? 'not available yet' : cnt(days) + ' ' + plural(days, 'day', 'days'));
    h += '</div>';
    /* whether the listing is still playing on the shape the pattern was read from, in the engine's
       own words: a listing that has stopped goes back to its typed hours, and that is the difference
       between "typed hours" and "from its pattern" above. */
    var tk = r.tracking;
    if (tk && typeof tk === 'object' && tk.tracking != null) {
      h += '<div class="pkt-sm2">' + (tk.tracking ? 'Still playing on its pattern' : 'No longer playing on its pattern') +
        (tk.note ? ': ' + esc(String(tk.note)) : '') + '</div>';
    } else {
      h += '<div class="pkt-sm2">Whether it is still playing on its pattern is not in this answer.</div>';
    }
    h += nextSwitchLine(r);
    h += '<div style="margin-top:5px"><button type="button" class="pkt-link" data-pkdata="' + esc(id) + '">' +
      (PK.dataFor === id ? 'Hide the data behind this' : 'Data behind this') + '</button></div>';
    h += dataPanel(r, sugg);
    return h;
  }
  /* THE NEXT TIME THE SCHEDULE CHANGES THIS LISTING, which is not the same question as the next time
     its typed hours do: a dead stretch inside those hours changes state where the hours alone would
     not. The Next change column keeps the hours' own answer, and this is the schedule's. */
  function nextSwitchLine(r) {
    var N = r.next_switch;
    if (!N || typeof N !== 'object' || !N.at) {
      return '<div class="pkt-sm2">The schedule has nothing further to change for this listing in the next two days, or there is no schedule to read it from.</div>';
    }
    var to = String(N.to || '').toUpperCase();
    var hrs = num(N.hours_from_now);
    return '<div class="pkt-sm"><b>Next change on the schedule:</b> ' +
      (to === 'ON' ? 'back on' : to === 'OFF' ? 'paused' : esc(to || 'changed')) + ' at <b>' + esc(String(N.at)) + '</b> UK' +
      (hrs == null ? '' : ', in ' + cnt(hrs) + ' ' + plural(hrs, 'hour', 'hours')) +
      (N.reason ? '<div class="pkt-sm2">' + esc(String(N.reason)) + '</div>' : '') + '</div>';
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

  /* ── WHICH CAMPAIGN. The listing's own pay-per-click campaigns, read from the engine so the page
     can only ever offer one the save would accept, and the default is the behaviour this list has
     always had: every pay-per-click campaign the listing is in.
     The picker REDRAWS ITSELF rather than being redrawn by the form. Somebody is typing in the box
     above it, and rebuilding the form under their hands would take away both what they had typed
     and the button they were about to press. ── */
  function formItem() { return (PK.edit && PK.edit !== '') ? String(PK.edit) : String(PK.item || ''); }
  function adStatusWords(v) {
    var t = String(v == null ? '' : v).toUpperCase().trim();
    if (t === 'PAUSED') return 'ad paused';
    /* a pay-per-click ad eBay has not stamped is one eBay is serving, which is how the switching
       itself reads an unstamped ad: the two must not say different things about one ad */
    if (t === 'ACTIVE' || t === '') return 'ad running';
    return 'ad ' + t.toLowerCase();
  }
  /* the campaign's own state, said only where it is something other than plain running: every
     campaign on this list is a running one, so printing "running" against all of them adds nothing,
     while an ending campaign is worth knowing before somebody ties a listing's hours to it. */
  function campWords(v) {
    var t = String(v == null ? '' : v).toUpperCase().trim();
    if (!t || t.indexOf('RUNNING') >= 0) return '';
    return ' · campaign ' + t.toLowerCase().replace(/_/g, ' ');
  }
  /* the campaign this form is set to, where it is NOT one of the ones on offer. The engine offers
     the campaigns the listing has a running pay-per-click ad in, and a listing switched off outside
     its own hours has none in the campaign it runs in until the hours bring it back. The choice is
     kept and said plainly rather than dropped: dropping it would send the next save as every
     campaign, which would silently widen what somebody narrowed on purpose. */
  function campaignKnown() {
    if (!PK.pick) return true;
    return (PK.camps || []).filter(function (c) { return String((c && c.campaign_id) || '') === PK.pick; }).length > 0;
  }
  function campaignSelect(forItem) {
    if (!forItem) return '<select disabled><option>type the item number first</option></select>';
    if (PK.campErr) return '<select disabled><option>' + esc(PK.campErr) + '</option></select>';
    if (PK.campFor !== forItem) {
      return '<select disabled><option>' + (PK.campBusy ? 'reading its campaigns…' : 'type the item number first') + '</option></select>';
    }
    var L = PK.camps || [];
    /* in none of them, and set to none either: the engine says why in its own words */
    if (!L.length && campaignKnown()) return '<select disabled><option>' + esc(PK.campNote || 'it has no pay-per-click campaign to choose from') + '</option></select>';
    return '<select data-pkcamp="1"><option value=""' + (PK.pick ? '' : ' selected') + '>every pay-per-click campaign it is in</option>' +
      (campaignKnown() ? '' : '<option value="' + esc(PK.pick) + '" selected>' +
        esc(String(PK.pickName || PK.pick) + ' · no ad running in it just now') + '</option>') +
      L.map(function (c) {
        var cid = String((c && c.campaign_id) || '');
        return '<option value="' + esc(cid) + '"' + (PK.pick === cid ? ' selected' : '') + '>' +
          esc(String((c && c.campaign_name) || cid) + ' · ' + adStatusWords(c && c.ad_status) + campWords(c && c.status)) + '</option>';
      }).join('') + '</select>';
  }
  function campaignInner(forItem) {
    return '<div class="pkt-add" style="margin-bottom:4px"><label>Which campaign' + reg('which campaign', 'how') +
      campaignSelect(forItem) + '</label></div>' +
      '<div class="pkt-sm2">The hours switch the ad in this campaign only. Its ads in other campaigns are left as they are.' +
      (PK.pick ? '' : ' Left as it is, they switch every pay-per-click campaign it is in.') +
      (campaignKnown() ? '' : '<br><span class="pkt-bad">This listing has no pay-per-click ad running in that campaign just now, so a save will be turned down until you choose another. The row is left as it is either way.</span>') +
      '</div>';
  }
  function paintCamp() {
    var el = $('pktCampWrap'); if (!el) return;
    el.innerHTML = campaignInner(formItem());
    wireCamp();
  }
  function wireCamp() {
    var el = $('pktCampWrap'); if (!el) return;
    var ss = el.querySelectorAll('[data-pkcamp]');
    for (var i = 0; i < ss.length; i++) ss[i].onchange = function () {
      PK.pick = String(this.value || '');
      var hit = (PK.camps || []).filter(function (c) { return String((c && c.campaign_id) || '') === PK.pick; })[0];
      if (hit) PK.pickName = String(hit.campaign_name || '');
      paintCamp();
    };
  }
  function loadCampaigns(id) {
    var want = String(id || '');
    if (!want || PK.campFor === want) { paintCamp(); return; }
    PK.campBusy = true; PK.campErr = ''; PK.camps = null; PK.campNote = '';
    paintCamp();
    api('adtoolPeakCampaigns', { item_id: want }).then(function (D) {
      PK.campBusy = false; PK.campFor = want;
      PK.camps = (D && D.campaigns) || [];
      PK.campNote = String((D && D.note) || '');
      paintCamp();
    }).catch(function (e) {
      PK.campBusy = false; PK.campFor = ''; PK.camps = null;
      PK.campErr = (e && e.message) || 'its campaigns could not be read';
      paintCamp();
    });
  }
  function loadCampaignsSoon(id) {
    if (campTimer) { clearTimeout(campTimer); campTimer = null; }
    campTimer = setTimeout(function () { campTimer = null; loadCampaigns(id); }, 350);
  }

  /* ── the hours picker, shared by the add form and the per-row edit ────────────────────────── */
  function pickerHtml(title, idPrefix, withItem, withNote) {
    var bad = rangesBad(PK.ranges), txt = rangesText(PK.ranges);
    var h = '<div class="pkt-form"><h4>' + esc(title) + '</h4>';
    if (withItem) {
      h += '<div class="pkt-add" style="margin-bottom:8px">' +
        '<label>Item number<input type="text" id="' + idPrefix + 'Item" inputmode="numeric" placeholder="item number" value="' + esc(String(PK.item || '')) + '"></label>' +
        (withNote ? '<label>Note, optional<input type="text" id="' + idPrefix + 'Note" placeholder="why it belongs on the list" value="' + esc(String(PK.note || '')) + '"></label>' : '') +
        '</div>';
    } else if (withNote) {
      h += '<div class="pkt-add" style="margin-bottom:8px">' +
        '<label>Note, optional<input type="text" id="' + idPrefix + 'Note" placeholder="why it belongs on the list" value="' + esc(String(PK.note || '')) + '"></label></div>';
    }
    /* the campaign sits with the item number and above the hours, because it is the same question:
       which ad do these hours belong to */
    h += '<div id="pktCampWrap">' + campaignInner(formItem()) + '</div>';
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
    if (r.switchable === false) {
      /* two different reasons, and they are not interchangeable: a listing with no pay-per-click ad
         at all, and a listing whose ad is in other campaigns but not in the one this row names */
      return '<span class="pkt-tag quiet">set to switch itself</span>' +
        '<div class="pkt-sm2">' + (r.campaign_missing
          ? 'but it has no pay-per-click ad in the campaign named below, so nothing happens'
          : 'but it has no pay-per-click ad to switch, so nothing happens') + '</div>';
    }
    return '<span class="pkt-tag live">the system switches it</span>';
  }
  /* WHICH CAMPAIGN this row runs in. One named, and its hours switch that campaign's ad alone; none
     named, and they switch every pay-per-click campaign the listing is in, which is what every row
     on this list did before the choice existed. */
  function campChosen(r) {
    var cid = String((r && r.campaign_id) || '').trim();
    if (!cid) return '<div class="pkt-sm2">all its pay-per-click campaigns</div>';
    return '<div class="pkt-sm">' + adtCampaignLink(cid, String((r && r.campaign_name) || '') || cid) + '</div>';
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
          '<td>' + autoCell(r) + campChosen(r) + '</td>' +
          '<td>' + nextCell(r) + '</td>' +
          '<td>' + lastCell(r) + '</td>' +
          '<td>' + switchCell(r) + '</td>' +
          '<td class="pkt-why">' + (r.note ? esc(String(r.note)) : '<span class="pkt-sm2">no note</span>') + '</td>' +
          '<td><div class="pkt-sm">' + esc(String(r.added_by || 'not recorded')) + '</div>' +
          '<div class="pkt-sm2">' + esc(whenTxt(r.added_at)) + '</div></td>' +
          '<td>' + liveTag(r.live_now) + '</td>' +
          '<td class="r">' + gbp(r.spend_7d) + '</td></tr>' +
          /* THE DAY THE PLANNER WROTE, under the row it belongs to. A second row rather than an
             eleventh column: two 24-cell strips, where the day came from, the hold and the data
             behind it do not fit in a cell, and the listing above keeps its own History link. */
          '<tr class="pkt-sub2"><td colspan="10">' + patternBlock(r, s) + '</td></tr>';
      }).join('') + '</tbody></table></div>';
    return h + '</div>';
  }

  /* ══ THE PEAK-TIME OVERVIEW ════════════════════════════════════════════════════════════════
     The Overview's own blocks, drawn from the Overview's own two actions asked for one cohort:
     every listing on the by-hand peak list, each counting from the day it joined and stopping on
     the day it was taken off. The engine does the narrowing, with one item filter on the queries it
     already runs, so nothing here adds anything up for itself. ══ */

  /* window.adtOverviewBlocks is view-adtool-overview.js's one set of blocks. Both builds splice that
     file, and both splice it before this one, so it is there; a page that says so when it is not is
     better than a page that throws. */
  function OVB() { return (window.adtOverviewBlocks && typeof window.adtOverviewBlocks.hero === 'function') ? window.adtOverviewBlocks : null; }
  function pkoHead() {
    return '<div class="pkt-panel"><h3>Peak-time overview' + reg('listings on peak', 'how') + '</h3>' +
      '<div class="pkt-sub">The same figures as the Overview, over the listings on the peak list and nothing else. ' +
      'A listing counts from the day somebody put it on the list and stops counting on the day it was taken off, ' +
      'so its history before that stays. The account chips above choose the account for this section and for the ' +
      'lists further down.</div>' +
      '<div id="pkoBar"></div></div>';
  }
  /* listing-hours, to one decimal: one listing switched on for one hour is one. */
  function hrs(v) { var n = num(v); return n == null ? '—' : n.toFixed(1) + ' h'; }
  /* the freshness badge. Both thresholds are read off the answer, so nothing here goes stale when
     somebody changes them, and a stamp nobody could read says so rather than reading as fresh. */
  function pkoFreshBadge(at, rules) {
    if (!at) return '<span class="pkt-badge">not read yet</span>';
    var d = new Date(String(at).replace(' ', 'T') + (/[Zz]|[+-]\d\d:?\d\d$/.test(String(at)) ? '' : 'Z'));
    if (isNaN(d.getTime())) return '<span class="pkt-badge">reading time not understood</span>';
    var mins = Math.round((Date.now() - d.getTime()) / 60000);
    var amber = num(rules && rules.amber_min), red = num(rules && rules.red_min);
    if (red != null && mins > red) return '<span class="pkt-badge red">' + cnt(mins) + ' min old</span>';
    if (amber != null && mins > amber) return '<span class="pkt-badge amber">' + cnt(mins) + ' min old</span>';
    return '';
  }
  /* `label` is what the reader sees; `regLabel` is the LOOKUP the explainer box matches on and must
     stay as it is when the wording changes. `listKey` opens the listings behind the figure. */
  function pkoTile(label, value, detail, regLabel, asOf, asOfAt, rules, listKey) {
    return '<div class="pkt-kpi' + (listKey ? ' click' : '') + '"' +
      (listKey ? ' data-pkolist="' + esc(listKey) + '" title="show the listings behind this figure"' : '') + '>' +
      '<div class="k">' + esc(label) + reg(regLabel, 'how') + '</div>' +
      '<div class="v">' + value + '</div>' +
      '<div class="d">' + detail + '</div>' +
      '<div class="pkt-asof">' + (asOf ? 'as of ' + esc(String(asOf)) + ' UK' : 'no reading yet') +
      pkoFreshBadge(asOfAt, rules) + '</div></div>';
  }

  function pkoParams() {
    var q = adtPeriodParams(PK.pkoPeriod);
    q.cohort = 'peak';
    if (PK.account) q.account = PK.account;
    return q;
  }
  function loadPkoPlan(quiet) {
    return api('adtoolPlan', pkoParams()).then(function (D) {
      PK.pkoPlan = D || {};
      var B = OVB();
      if (!$('pkoHero')) return;
      $('pkoHero').innerHTML = B ? B.hero(PK.pkoPlan) : '<div class="pkt-empty">The Overview blocks are not loaded, so this section cannot draw them.</div>';
      adtPeriodEcho('pkoBar', D && D.period);
    }).catch(function (e) {
      if (!quiet && $('pkoHero')) $('pkoHero').innerHTML = '<div class="pkt-panel"><h3>Not available</h3><div class="pkt-sub">' + esc((e && e.message) || 'This block could not load.') + '</div></div>';
      throw e;
    });
  }
  function loadPkoCmd(quiet) {
    return api('adtoolCommand', PK.account ? { account: PK.account, cohort: 'peak' } : { cohort: 'peak' }).then(function (D) {
      PK.pkoCmd = D || {};
      var B = OVB();
      if ($('pkoToday')) {
        $('pkoToday').innerHTML = B
          ? (B.today(PK.pkoCmd) + B.byAccount(PK.pkoCmd) + B.slots(PK.pkoCmd) + B.hourly(PK.pkoCmd) + B.foot(PK.pkoCmd))
          : '<div class="pkt-empty">The Overview blocks are not loaded, so this section cannot draw them.</div>';
      }
      pkoPaintExtras();
    }).catch(function (e) {
      if (!quiet && $('pkoToday')) $('pkoToday').innerHTML = '<div class="pkt-panel"><h3>Not available</h3><div class="pkt-sub">' + esc((e && e.message) || 'Today could not load.') + '</div></div>';
      throw e;
    });
  }
  function pkoPaintExtras() {
    var el = $('pkoExtra'); if (!el) return;
    el.innerHTML = pkoExtras(PK.pkoCmd || {});
    pkoWire();
  }

  /* ONE extra row of tiles: the four figures that mean something for this list and for nothing else. */
  function pkoExtras(D) {
    var X = D && D.peak_extras;
    if (!X) return '<div class="pkt-panel"><h3>The peak list in figures</h3><div class="pkt-empty">This answer carries no figures of its own for the list, so none is shown.</div></div>';
    var RU = X.freshness_rules || D.freshness_rules || null;
    var L = X.listings || {}, H = X.hours_today || {}, A = X.spend_avoided_off_hours || {}, S = X.sales_in_vs_out || {};
    var W = S.windows || {};
    var byAcct = (L.by_account || []).map(function (a) { return esc(String(a && a.account)) + ' ' + cnt(a && a.n); }).join(' · ');
    var inOut = function (k) { var w = W[k]; return w ? cnt(w.in_orders) + ' in / ' + cnt(w.out_orders) + ' out' : '—'; };
    var inOutUnits = function (k) { var w = W[k]; return w ? cnt(w.in_units) + ' units in / ' + cnt(w.out_units) + ' out' : ''; };
    return '<div class="pkt-panel"><h3>The peak list in figures</h3>' +
      '<div class="pkt-sub">Four figures that belong to this list alone. Each says when it was last read, and a tile ' +
      'opens the listings behind it.</div>' +
      '<div class="pkt-kpis">' +
      pkoTile('Listings on peak', cnt(L.total),
        (byAcct || 'no account on the rows') +
        (L.switching == null ? '' : '<br>' + cnt(L.switching) + ' set to switch ' + plural(L.switching, 'itself', 'themselves') + ' with hours we can read') +
        (n0(L.without_readable_hours) > 0 ? '<br>' + cnt(L.without_readable_hours) + ' with hours we cannot read' : '') +
        (n0(L.taken_off_and_kept) > 0 ? '<br>' + cnt(L.taken_off_and_kept) + ' taken off and kept as a record' : ''),
        'listings on peak', L.as_of, L.as_of_at, RU, 'all') +
      pkoTile('Hours on and off today', hrs(H.on_elapsed) + ' on',
        hrs(H.off_elapsed) + ' off so far, across ' + cnt(H.listings) + ' ' + plural(H.listings, 'listing', 'listings') +
        '<br>' + hrs(H.on_planned) + ' on and ' + hrs(H.off_planned) + ' off still to come' +
        (n0(H.listings_left_to_a_person) > 0 ? '<br>' + cnt(H.listings_left_to_a_person) + ' left to a person, so not counted' : ''),
        'hours on and off', H.as_of, H.as_of_at, RU, 'switching') +
      pkoTile('Spend avoided in off hours', A.avoided_per_day == null ? '—' : gbp(A.avoided_per_day) + ' a day',
        pkoAvoidedDetail(A), 'spend avoided', A.as_of, A.as_of_at, RU, 'avoided') +
      pkoTile('Sales in and out of the peak', inOut('today'),
        (inOutUnits('today') ? inOutUnits('today') + ' today<br>' : '') +
        '7 days ' + inOut('d7') + '<br>28 days ' + inOut('d28') +
        (n0(S.listings_without_readable_hours) > 0 ? '<br>' + cnt(S.listings_without_readable_hours) + ' left out: hours we cannot read' : ''),
        'sales in and out of the peak', S.as_of, S.as_of_at, RU, 'sales') +
      '</div>' +
      pkoRecon(D.reconcile) + pkoNotFromEbay(X) + pkoListPanel() + '</div>';
  }
  function pkoAvoidedDetail(A) {
    var bits = [];
    if (A.before_per_day != null && A.now_per_day_compared != null) {
      bits.push(gbp(A.before_per_day) + ' a day before they joined against ' + gbp(A.now_per_day_compared) + ' a day now');
    }
    if (A.now_per_day != null) bits.push(gbp(A.now_per_day) + ' a day outside their hours across the whole list');
    if (A.today && A.today.off_spend != null) bits.push(gbp(A.today.off_spend) + ' outside their hours today');
    if (A.listings_with_before_data != null && A.listings != null) {
      bits.push(cnt(A.listings_with_before_data) + ' of the ' + cnt(A.listings) + ' we can see hours for have figures from before they joined' +
        (n0(A.days_observed_before) > 0 ? ', up to ' + cnt(A.days_observed_before) + ' ' + plural(A.days_observed_before, 'day', 'days') + ' of them' : ''));
    }
    if (A.note) bits.push('<span class="pkt-sm2">' + esc(String(A.note)) + '</span>');
    return bits.length ? bits.join('<br>') : '<span class="pkt-sm2">Nothing has been read for these listings yet.</span>';
  }
  /* THE CHECK, in one line. The section's claim is that it is the Overview over fewer listings, so
     the same listings' own rows have to come to the same money. The engine works it out; this
     prints it, and prints the difference when there is one rather than only saying no. */
  function pkoRecon(R) {
    if (!R || typeof R !== 'object') return '';
    if (R.equal == null || R.equal2 == null) {
      return '<div class="pkt-recon">These totals could not be checked against the same listings’ figures on the Overview: one of the two reads is not available.</div>';
    }
    var ok = R.equal === true && R.equal2 === true;
    var diff = R.equal === true ? R.difference_period : R.difference;
    return '<div class="pkt-recon' + (ok ? '' : ' bad') + '">These totals equal the same listings’ figures on the Overview: <b>' +
      (ok ? 'yes (to the penny)' : 'no (difference ' + esc(gbp(Math.abs(n0(diff)))) + ')') + '</b>' +
      (R.period && R.period.from ? ' <span class="pkt-sm2">today, and ' + esc(String(R.period.label || 'the window')).toLowerCase() + ' ' + esc(String(R.period.from)) + ' to ' + esc(String(R.period.to)) + '</span>' : '') +
      '</div>';
  }
  /* WHERE eBay GIVES US NOTHING, the page says so rather than letting a figure stand for something
     it is not. The lines come from the engine, so they cannot drift from what it actually did. */
  function pkoNotFromEbay(X) {
    var L = X && X.not_from_ebay;
    if (!Array.isArray(L) || !L.length) return '';
    return '<div class="pkt-rules"><b>What eBay does not give us.</b> ' +
      L.map(function (t) { return esc(String(t)); }).join(' ') + '</div>';
  }
  /* THE LISTINGS BEHIND A FIGURE. The rows are the page's own peak-list rows, narrowed by the same
     condition the engine counted on, and each one is the portal's standard listing cell, so the
     hand-off to a listing is the one route handler every listing row in this tool uses and every
     row keeps its History link. */
  var PKO_LISTS = {
    all: ['Every listing on the list now', function () { return true; }],
    switching: ['The listings set to switch themselves, with hours we can read', function (r) { var p = parsedRanges(r); return !!Number(r.auto) && !!(p && p.length); }],
    avoided: ['The listings whose off-hour money we can see, which needs hours we can read', function (r) { var p = parsedRanges(r); return !!(p && p.length); }],
    sales: ['The listings whose orders we can place inside or outside their hours', function (r) { var p = parsedRanges(r); return !!(p && p.length); }]
  };
  function pkoListPanel() {
    var key = String(PK.pkoList || '');
    var spec = PKO_LISTS[key];
    if (!spec) return '';
    var rows = manual().filter(spec[1]);
    return '<div class="pkt-form"><h4>' + esc(spec[0]) + '</h4>' +
      (rows.length
        ? rows.map(function (r) { return '<div class="pkt-row">' + adtProductCell(r) + '</div>'; }).join('')
        : '<div class="pkt-empty">No listing on the list meets that just now.</div>') +
      '<div style="margin-top:10px"><button type="button" class="pkt-btn ghost" data-pkoclose="1">Close</button></div></div>';
  }
  function pkoWire() {
    var box = $('pkoExtra'); if (!box) return;
    var i, ts = box.querySelectorAll('[data-pkolist]');
    for (i = 0; i < ts.length; i++) ts[i].onclick = function () {
      var k = this.getAttribute('data-pkolist') || '';
      PK.pkoList = (PK.pkoList === k) ? '' : k;
      pkoPaintExtras();
    };
    var cs = box.querySelectorAll('[data-pkoclose]');
    for (i = 0; i < cs.length; i++) cs[i].onclick = function () { PK.pkoList = ''; pkoPaintExtras(); };
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
    h += patternLine();
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

    /* the item number and the note are kept in PK as they are typed, so the next redraw of the
       hours shows them back rather than wiping them, and a whole item number asks the engine for
       that listing's campaigns a moment after the typing stops */
    var itEl = $('pktAddItem');
    if (itEl) itEl.oninput = function () {
      PK.item = String(this.value || '').replace(/\s+/g, '');
      if (/^\d{9,13}$/.test(PK.item)) { loadCampaignsSoon(PK.item); return; }
      if (PK.campFor || PK.campErr || PK.campBusy) {
        PK.campFor = ''; PK.camps = null; PK.campNote = ''; PK.campErr = ''; PK.campBusy = false;
        PK.pick = ''; PK.pickName = '';
        paintCamp();
      }
    };
    var ntEl = $('pktAddNote');
    if (ntEl) ntEl.oninput = function () { PK.note = String(this.value || ''); };
    wireCamp();

    var save = $('pktAddSave');
    if (save) save.onclick = function () {
      var it = $('pktAddItem'), nt = $('pktAddNote');
      var id = it ? String(it.value || '').replace(/\s+/g, '') : '';
      if (!/^\d{9,13}$/.test(id)) { toast('Type the item number first.'); return; }
      var bad = rangesBad(PK.ranges);
      if (bad) { toast(bad); return; }
      add({ item_id: id, hours: rangesText(PK.ranges), note: nt ? String(nt.value || '').trim() : '', campaign_id: campForSave(id, null) }, this);
    };
    var edSave = $('pktEdSave');
    if (edSave) edSave.onclick = function () {
      var id = PK.edit;
      var bad = rangesBad(PK.ranges);
      if (bad) { toast(bad); return; }
      var row = null;
      manual().forEach(function (r) { if (String(r.item_id || '') === id) row = r; });
      add({ item_id: id, hours: rangesText(PK.ranges), note: row ? String(row.note || '') : '', campaign_id: campForSave(id, row) }, this);
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
      /* the change form opens on the campaign the row already runs in, so saving new hours keeps it
         rather than quietly putting the listing back across every campaign */
      PK.pick = String((row && row.campaign_id) || '');
      PK.pickName = String((row && row.campaign_name) || '');
      PK.campFor = ''; PK.camps = null; PK.campNote = ''; PK.campErr = ''; PK.campBusy = false;
      PK.edit = id;
      draw();
      loadCampaigns(id);
    };

    var rs = box.querySelectorAll('[data-pkrm]');
    for (i = 0; i < rs.length; i++) rs[i].onclick = function () {
      var id = this.getAttribute('data-pkrm');
      if (!id) { toast('This row has no item number.'); return; }
      if (!confirm('Take ' + id + ' off the peak times list?\n\nThe row is kept as a record of what was decided, and the system stops switching it.')) return;
      remove(id, this);
    };

    /* ── the 24-hour pattern's own controls ─────────────────────────────────────────────────── */
    var cs = box.querySelectorAll('[data-pkcell]');
    for (i = 0; i < cs.length; i++) cs[i].onclick = function () {
      var k = this.getAttribute('data-pkcell') || '';
      PK.cell = PK.cell === k ? '' : k;
      draw();
    };
    var dts = box.querySelectorAll('[data-pkdata]');
    for (i = 0; i < dts.length; i++) dts[i].onclick = function () {
      var id = this.getAttribute('data-pkdata') || '';
      PK.dataFor = PK.dataFor === id ? '' : id;
      if (PK.dataFor) loadProfile(PK.dataFor);
      draw();
    };
    var dcs = box.querySelectorAll('[data-pkdataclose]');
    for (i = 0; i < dcs.length; i++) dcs[i].onclick = function () { PK.dataFor = ''; draw(); };
    var hs = box.querySelectorAll('[data-pkhold]');
    for (i = 0; i < hs.length; i++) hs[i].onclick = function () {
      var p = String(this.getAttribute('data-pkhold') || '').split('|');
      if (p.length < 2 || !p[0]) { toast('This row has no item number.'); return; }
      setHold(p[0], p[1], this);
    };
  }

  /* HOLDING A LISTING ON OR OFF BY HAND. It sends nothing itself: a hold is a wanted state in a
     column, and the only thing that reaches eBay is the quarter-hourly switch, on an account whose
     own live switch is on. The confirm says which of the two it will be, in the engine's own words
     after the write, so the page cannot promise something the engine did not do. */
  var HOLD_ASK = {
    auto: 'Put this listing back on the schedule?\n\nIts own hours decide the day again, with the hours it has never sold in switched off.',
    on: 'Keep this listing running all day?\n\nIts hours and its pattern stop deciding anything for it until somebody puts it back on the schedule.',
    off: 'Keep this listing paused all day?\n\nIts ad stays off whatever its hours and its pattern say, until somebody puts it back on the schedule.'
  };
  function setHold(id, hold, el) {
    var ask = HOLD_ASK[String(hold)];
    if (!ask) { toast('That is not a hold this page can set.'); return; }
    if (PK.holdBusy) return;
    if (!confirm(ask + '\n\nListing ' + id + '. Nothing is sent to eBay by this on its own: the next quarter-hourly ' +
      'tick puts the ad right, and only on an account whose live-apply switch is on.')) return;
    PK.holdBusy = String(id);
    if (el) el.disabled = true;
    api('adtoolPeakHold', { item_id: id, hold: hold }).then(function (R) {
      PK.holdBusy = '';
      /* who set it comes back on the write and nowhere else, so it is kept here for the rest of this
         visit and shown against the row */
      if (R && R.set_by) PK.holdBy[String(id)] = { by: String(R.set_by), at: new Date().toISOString() };
      toast((R && R.note_to_reader) ? String(R.note_to_reader)
        : (hold === 'auto' ? 'Back on the schedule' : 'Held ' + hold));
      /* a listing nobody armed is not switched by a hold either, and the engine says so in its own
         words rather than leaving somebody to wonder why nothing happened */
      if (R && R.takes_effect === false && R.takes_effect_note) toast(String(R.takes_effect_note));
      return load(false);
    }).catch(function (e) {
      PK.holdBusy = '';
      if (el) el.disabled = false;
      toast((e && e.message) || 'That hold could not be set.');
    });
  }

  /* THE CAMPAIGN A SAVE MAY SEND, which is only ever one the picker was showing FOR THIS LISTING.
     Where its campaigns could not be read, a change keeps the campaign the row already had and an
     add sends none: neither one invents a campaign, and a change never silently puts a listing back
     across every campaign because one read failed. */
  function campForSave(id, row) {
    if (PK.campFor === String(id || '')) return String(PK.pick || '');
    return String((row && row.campaign_id) || '');
  }
  function add(payload, el) {
    if (PK.busy) return;
    PK.busy = true;
    if (el) el.disabled = true;
    api('adtoolPeakAdd', payload).then(function () {
      toast((payload.hours ? 'Saved: the system will switch it at ' + payload.hours : 'Added to the peak times list') +
        (payload.campaign_id ? ', in one campaign only' : ''));
      PK.tab = 'manual';
      PK.edit = null;
      PK.item = ''; PK.note = ''; PK.pick = ''; PK.pickName = '';
      PK.camps = null; PK.campFor = ''; PK.campNote = ''; PK.campErr = ''; PK.campBusy = false;
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
