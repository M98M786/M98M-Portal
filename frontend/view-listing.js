/* view-listing.js — §8.2 the lister's LIMITED workspace · §8 the Item ID gate · §8.0 the two-stage
 * clock · §8.4 the revision loop. View: listing (My listings).
 * Backend: myListingWork · enterItemId · createRevision · revisionRevisit.
 *
 * REALITY WINS: every column label here is the live 'UMAR- Selected Listing' header (21 cols,
 * 'E-Bey Caluclator + £4', trailing spaces and embedded newlines) and the supplier columns are
 * named as the live Central Main Sheet writes them ('Ali Express Link 1', 'Suuplier 2') — this
 * screen only READS those names, so the typos stay.
 * §4.2 / §8.2 / RL-4: nothing on this screen is profit, ROI or analysis — the payload the server
 * sends has no such field, and nothing here derives one from Source Price and the calculator. */
(function () {

  /* Status strings, task types and the 72-hour title marker are backend vocabulary — they must
     match Tasks.gs and Listing.gs character for character (the em dash included). */
  var LS_PENDING = 'Pending';
  var LS_WORKING = 'Working';
  var LS_UPDATED = 'Updated';
  var LS_SUBMITTED = 'Submitted — awaiting approval';
  var LS_COMPLETED = 'Completed';
  var LS_OPEN = [LS_PENDING, LS_WORKING, LS_UPDATED];
  var LS_KIND_72H = 'listing_revision_72h';
  var LS_VIEW_ROLES = ['Item Lister', 'Listing Manager', 'Management'];
  /* §4.3 — the backend gate for createRevision. Showing the composer to anyone else would only
     produce 'role may not create a revision'. */
  var LS_CREATE_ROLES = ['Management', 'Ops Head', 'Team Lead', 'Advertising Manager'];

  // ---------- §8.0 the binding clock: UK windows, PKT equivalents ----------
  var LS_TZ_UK = 'Europe/London';
  var LS_TZ_PKT = 'Asia/Karachi';
  var LS_GO_LIVE_UK = 19;                        // day 0 — new listings go live 7:00 PM UK
  var LS_REVISION_UK = { start: 13, end: 17 };   // +72h — the real revision, 1:00–5:00 PM UK
  var LS_CAMPAIGN_UK = { start: 17, end: 22 };   // same day — campaign testing, 5:00–10:00 PM UK

  // ---------- §8.2 the 21 live headers ----------
  var LS_H = {
    update: 'Listing Update',
    date: 'Selected Date',
    seasonal: 'Seasonal',
    keyword: 'Main Keyword Terapeak link ',
    avgImg: 'Image Link of avg sold price ',
    zikImg: 'Image Link of Zik analytics',
    overview: 'Terapeak overview',
    temu: 'Temu Link',
    p1: 'Product Link 1 Main supplier\n\n\nAdded in supplier sheet',
    p2: 'Product Link 2\n\n',
    p3: 'Product Link 3',
    ebay: 'Ebay Link ',
    title: 'Title',
    imageLink: 'Image Link ',
    image: 'IMAGE ',
    desc: 'DESCRIPTION',
    category: 'Category',
    source: 'Source Price',
    calc: 'E-Bey Caluclator + £4',
    cpc: 'CPC Selling Chance',
    cpcZain: 'CPC Update For Zain'
  };

  VIEW_CSS.push(
    '.ls-tl{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:12px}' +
    '.ls-step{position:relative;padding:13px 14px 13px 20px;border:1px solid var(--gold-line);border-radius:10px;background:rgba(120,132,152,.07)}' +
    '.ls-step:before{content:"";position:absolute;left:7px;top:14px;bottom:14px;width:3px;border-radius:3px;background:linear-gradient(180deg,var(--blue-2),var(--blue-deep));box-shadow:var(--glow-blue)}' +
    '.ls-step.ls-gold:before{background:linear-gradient(180deg,var(--gold-a),var(--gold-c));box-shadow:0 0 10px rgba(233,169,60,.55)}' +
    '.ls-step .ls-n{font-size:10px;text-transform:uppercase;letter-spacing:.1em;font-weight:800;color:var(--text-3)}' +
    '.ls-step .ls-hh{font-weight:800;font-size:13.5px;margin-top:3px}' +
    '.ls-uk{font-weight:800;font-size:14px;margin-top:7px}' +
    '.ls-pkt{font-weight:800;font-size:12.5px;color:var(--blue-2);margin-top:1px}' +
    '.ls-step .ls-d{font-size:11.5px;color:var(--text-3);font-weight:600;margin-top:7px;line-height:1.5}' +
    '.ls-job{margin-top:14px}' +
    '.ls-name{font-weight:800;word-break:break-word}' +
    '.ls-meta{display:flex;flex-wrap:wrap;gap:8px;margin-bottom:13px}' +
    '.ls-chip{font-size:11.5px;font-weight:700;color:var(--text);border:1px solid var(--gold-line);border-radius:8px;padding:4px 10px;white-space:nowrap;max-width:100%;overflow:hidden;text-overflow:ellipsis}' +
    '.ls-chip .k{color:var(--text-3);text-transform:uppercase;letter-spacing:.08em;font-size:10px;font-weight:800;margin-right:6px}' +
    '.ls-chip.ls-late{border-color:rgba(240,96,90,.45);color:var(--bad)}' +
    '.ls-id{border:1px solid var(--gold-line-hi);border-radius:12px;padding:15px 16px;background:linear-gradient(135deg,rgba(233,169,60,.14),rgba(233,169,60,.03));box-shadow:var(--glow-gold)}' +
    '.ls-id h3{font-size:14.5px;font-weight:800;letter-spacing:.01em}' +
    '.ls-id .ls-sub{font-size:12px;color:var(--text-2);font-weight:600;margin-top:4px;line-height:1.55}' +
    '.ls-steps{margin-top:12px;padding:11px 13px;border-radius:10px;background:rgba(16,20,31,.28);border:1px solid var(--gold-line)}' +
    '[data-theme="ivory"] .ls-steps{background:rgba(255,255,255,.5)}' +
    '.ls-steps .k{font-size:10.5px;text-transform:uppercase;letter-spacing:.09em;font-weight:800;color:var(--text-3);margin-bottom:7px}' +
    '.ls-what{display:flex;gap:9px;align-items:baseline;font-size:12.5px;line-height:1.55;font-weight:600;color:var(--text-2)}' +
    '.ls-what+.ls-what{margin-top:7px}' +
    '.ls-what b{color:var(--text);font-weight:800}' +
    '.ls-what .ls-no{flex:none;width:19px;height:19px;border-radius:50%;display:inline-grid;place-items:center;font-size:10.5px;font-weight:800;color:var(--gold-ink);background:linear-gradient(135deg,var(--gold-a),var(--gold-c));align-self:flex-start}' +
    '.ls-in,.ls-ta{width:100%;padding:11px 13px;border-radius:10px;border:1px solid var(--gold-line-hi);background:var(--panel);color:var(--text);font:inherit;font-weight:600}' +
    '.ls-ta{resize:vertical;min-height:64px}' +
    '.ls-in:focus,.ls-ta:focus{outline:none;border-color:var(--blue);box-shadow:var(--glow-blue)}' +
    '.ls-in.ls-big{font-family:var(--mono);font-size:16px;letter-spacing:.06em}' +
    '.ls-btns{display:flex;gap:10px;flex-wrap:wrap;align-items:center;margin-top:12px}' +
    '.ls-sub2{font-size:11.5px;color:var(--text-3);font-weight:700}' +
    '.ls-2{display:grid;gap:12px;grid-template-columns:repeat(2,minmax(0,1fr));margin-top:12px}' +
    '.ls-media{display:grid;grid-template-columns:repeat(auto-fill,minmax(130px,1fr));gap:12px;margin-top:14px}' +
    '.ls-th{border:1px solid var(--gold-line);border-radius:10px;overflow:hidden;background:var(--panel);display:block;text-decoration:none}' +
    '.ls-th:hover{border-color:var(--blue);box-shadow:var(--glow-blue)}' +
    '.ls-th img{display:block;width:100%;height:112px;object-fit:cover;background:rgba(120,132,152,.10)}' +
    '.ls-th .k{display:block;padding:7px 9px;font-size:10.5px;text-transform:uppercase;letter-spacing:.07em;font-weight:800;color:var(--text-3);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}' +
    '.ls-th .ls-alt{display:grid;place-items:center;height:112px;font-size:11.5px;font-weight:700;color:var(--text-3);padding:8px;text-align:center;word-break:break-all;overflow:hidden}' +
    '.ls-cp{margin-top:12px;border:1px solid var(--gold-line);border-radius:10px;background:rgba(120,132,152,.07)}' +
    '.ls-cp-h{display:flex;align-items:center;gap:10px;padding:9px 12px;border-bottom:1px solid var(--gold-line)}' +
    '.ls-cp-h .k{font-size:10.5px;text-transform:uppercase;letter-spacing:.09em;font-weight:800;color:var(--text-3)}' +
    '.ls-cp-b{padding:11px 12px;white-space:pre-wrap;word-break:break-word;font-size:12.5px;line-height:1.6;max-height:200px;overflow:auto}' +
    '.ls-facts{display:grid;grid-template-columns:repeat(auto-fill,minmax(172px,1fr));gap:10px;margin-top:12px}' +
    '.ls-fact{border:1px solid var(--gold-line);border-radius:10px;padding:10px 12px}' +
    '.ls-fact .k{font-size:10px;text-transform:uppercase;letter-spacing:.09em;font-weight:800;color:var(--text-3)}' +
    '.ls-fact b{display:block;font-size:13.5px;font-weight:800;margin-top:4px;word-break:break-word}' +
    '.ls-lk{display:flex;gap:12px;align-items:baseline;padding:9px 0;font-size:12.5px}' +
    '.ls-lk+.ls-lk{border-top:1px solid var(--gold-line)}' +
    '.ls-lk .k{flex:none;min-width:186px;color:var(--text-3);font-weight:700;font-size:11.5px}' +
    '.ls-lk a{color:var(--blue-2);font-weight:700;word-break:break-all}' +
    '.ls-lk .ls-none{color:var(--text-3);font-weight:600}' +
    '.ls-sec{margin-top:16px;font-size:10.5px;text-transform:uppercase;letter-spacing:.1em;font-weight:800;color:var(--text-3)}' +
    '.ls-tbl{width:100%;border-collapse:collapse;font-size:12.5px;min-width:560px}' +
    '.ls-tbl th{font-size:10.5px;text-transform:uppercase;letter-spacing:.09em;color:var(--text-3);text-align:left;padding:8px 12px;border-bottom:1px solid var(--gold-line);font-weight:800}' +
    '.ls-tbl td{padding:9px 12px;border-bottom:1px solid var(--gold-line);vertical-align:top;white-space:pre-wrap;word-break:break-word}' +
    '.ls-tbl td.ls-c1{color:var(--text-3);font-weight:700;width:34%}' +
    '.ls-box{margin-top:12px;padding:11px 13px;border-radius:10px;border:1px solid var(--gold-line);background:rgba(120,132,152,.08)}' +
    '.ls-box .k{font-size:10.5px;text-transform:uppercase;letter-spacing:.09em;font-weight:800;color:var(--text-3);margin-bottom:5px}' +
    '.ls-box.ls-blue{background:var(--blue-soft);border-color:rgba(61,155,240,.30)}' +
    '.ls-box.ls-blue .k{color:var(--blue-2)}' +
    /* R7-4 lister-state flag banners + the lever bar */
    '.ls-flag{margin:12px 0;padding:12px 14px;border-radius:12px;border:1px solid var(--gold-line)}' +
    '.ls-flag .k{font-size:11px;text-transform:uppercase;letter-spacing:.08em;font-weight:800;margin-bottom:5px}' +
    '.ls-flag .ls-txt{font-size:12.5px;line-height:1.55;font-weight:600;color:var(--text-2)}' +
    '.ls-flag .ls-txt a{color:var(--blue-2);font-weight:700}' +
    '.ls-flag-ft{display:flex;align-items:center;gap:10px;margin-top:9px}' +
    '.ls-flag-ft .ls-sub2{margin-right:auto}' +
    '.ls-flag-time{background:var(--warn-soft);border-color:rgba(255,159,67,.4)}.ls-flag-time .k{color:var(--warn)}' +
    '.ls-flag-info{background:rgba(240,140,60,.12);border-color:rgba(240,140,60,.42)}.ls-flag-info .k{color:#E07B2F}' +
    '.ls-flag-draft{background:rgba(150,110,230,.13);border-color:rgba(150,110,230,.42)}.ls-flag-draft .k{color:#9B6AE6}' +
    '.ls-lever{margin-top:12px;padding:12px 14px;border-radius:12px;border:1px dashed var(--gold-line-hi);background:rgba(120,132,152,.06)}' +
    '.ls-lever-h{font-size:11px;text-transform:uppercase;letter-spacing:.08em;font-weight:800;color:var(--text-3)}' +
    '.ls-lform{margin-top:12px;padding:12px 13px;border-radius:10px;border:1px solid var(--gold-line);background:var(--panel)}' +
    '.ls-txt{white-space:pre-wrap;word-break:break-word;font-size:12.5px;line-height:1.6}' +
    '.ls-txt a{color:var(--blue-2);font-weight:700;word-break:break-all}' +
    '.ls-rc{border:1px solid var(--gold-line-hi);border-radius:12px;padding:14px 16px;background:linear-gradient(135deg,rgba(233,169,60,.13),rgba(233,169,60,.02));margin-top:16px}' +
    '.ls-rc h3{font-size:14px;font-weight:800}' +
    '.ls-empty{color:var(--text-2);font-weight:700;padding:10px 0}' +
    '.ls-empty span{display:block;color:var(--text-3);font-weight:600;font-size:12.5px;margin-top:4px}' +
    '.pill.ls-p-pending{background:var(--warn-soft);color:var(--warn)}' +
    '.pill.ls-p-working{background:var(--blue-soft);color:var(--blue-2)}' +
    '.pill.ls-p-updated{background:var(--blue-soft);color:var(--blue-2);outline:1px solid rgba(61,155,240,.35)}' +
    '.pill.ls-p-awaiting{background:linear-gradient(135deg,rgba(233,169,60,.18),rgba(233,169,60,.05));color:var(--gold-a);border:1px solid var(--gold-line-hi)}' +
    '.pill.ls-p-done{background:var(--ok-soft);color:var(--ok)}' +
    '.pill.ls-72{background:linear-gradient(135deg,var(--gold-a),var(--gold-c));color:var(--gold-ink)}' +
    '@media (max-width:880px){' +
      '.ls-tl{grid-template-columns:1fr}' +
      '.ls-2{grid-template-columns:1fr}' +
      '.ls-lk{flex-direction:column;gap:3px}.ls-lk .k{min-width:0}' +
      '.ls-media{grid-template-columns:repeat(auto-fill,minmax(112px,1fr))}' +
      '.ls-facts{grid-template-columns:1fr}' +
    '}'
  );

  // ---------- safety (RL-3) ----------
  /** esc() leaves quotes intact, so attribute values need the stricter form. */
  function lsAttr(v) { return esc(v).replace(/"/g, '&quot;').replace(/'/g, '&#39;'); }
  function lsStr(v) { return String(v == null ? '' : v).trim(); }
  function lsRaw(v) { return String(v == null ? '' : v); }

  /** Text for the DOM: escaped, with http/https URLs (and nothing else) turned into links. */
  function lsText(v) {
    var s = lsRaw(v), out = '', re = /https?:\/\/[^\s<>"']+/g, last = 0, m, url;
    while ((m = re.exec(s)) !== null) {
      out += esc(s.slice(last, m.index));
      url = m[0].replace(/[.,;:!?)\]]+$/, '');
      out += '<a href="' + lsAttr(url) + '" target="_blank" rel="noopener noreferrer">' + esc(url) + '</a>';
      last = m.index + url.length;
      re.lastIndex = last;
    }
    return out + esc(s.slice(last));
  }

  function lsPick(root, attr, val) {
    var els = root.querySelectorAll('[' + attr + ']'), i;
    for (i = 0; i < els.length; i++) { if (els[i].getAttribute(attr) === val) return els[i]; }
    return null;
  }
  function lsHas(arr, v) { return arr.indexOf(v) >= 0; }
  function lsRole() { return (STATE.user && STATE.user.role) || ''; }
  function lsCanCreate() { return lsHas(LS_CREATE_ROLES, lsRole()); }
  function lsCount(n) {
    if (!STATE.counts) { STATE.counts = {}; }
    STATE.counts.listing = n;
    if (typeof refreshBadges === 'function') { refreshBadges(); }
  }

  // ---------- clocks ----------
  /** The wall clock of a zone, expressed as the UTC instant of those same digits — the one
   *  primitive both directions of the UK↔PKT conversion need. */
  function lsZoneMs(ms, tz) {
    var d = new Date(ms), ymd, hms, t;
    try {
      ymd = d.toLocaleDateString('en-CA', { timeZone: tz, year: 'numeric', month: '2-digit', day: '2-digit' });
      hms = d.toLocaleTimeString('en-GB', { timeZone: tz, hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' });
    } catch (e) { return ms; }
    if (hms.indexOf('24:') === 0) { hms = '00' + hms.slice(2); }      // some engines render midnight as 24:00
    t = Date.parse(ymd + 'T' + hms + 'Z');
    return isNaN(t) ? ms : t;
  }
  function lsOffset(ms, tz) { return lsZoneMs(ms, tz) - ms; }
  function lsPad2(n) { return (n < 10 ? '0' : '') + n; }
  function lsToday(tz) {
    try { return new Date().toLocaleDateString('en-CA', { timeZone: tz, year: 'numeric', month: '2-digit', day: '2-digit' }); }
    catch (e) { return ''; }
  }
  /** The absolute instant of a UK wall-clock hour — the offset is read from the zone at that
   *  instant, so BST and GMT are both right and no offset is ever hardcoded. */
  function lsUkInstant(ukYmd, hour) {
    var guess = Date.parse(ukYmd + 'T' + lsPad2(hour) + ':00:00Z'), t, next, i;
    if (isNaN(guess)) { return NaN; }
    t = guess;
    for (i = 0; i < 3; i++) {
      next = guess - lsOffset(t, LS_TZ_UK);
      if (next === t) { break; }
      t = next;
    }
    return t;
  }
  function lsClock(ms, tz) {
    var s;
    try { s = new Date(ms).toLocaleTimeString('en-GB', { timeZone: tz, hour: 'numeric', minute: '2-digit', hour12: true }); }
    catch (e) { return ''; }
    return s.replace(/\s*([ap])\.?m\.?$/i, function (all, ap) { return ' ' + ap.toUpperCase() + 'M'; });
  }
  function lsDay(ms, tz) {
    try { return new Date(ms).toLocaleDateString('en-CA', { timeZone: tz, year: 'numeric', month: '2-digit', day: '2-digit' }); }
    catch (e) { return ''; }
  }
  /** A §8.0 window in both clocks: UK is the business clock, PKT is the one the team works in. */
  function lsWindow(startHour, endHour) {
    var ymd = lsToday(LS_TZ_UK), a = lsUkInstant(ymd, startHour), b = (endHour === null ? NaN : lsUkInstant(ymd, endHour));
    if (isNaN(a)) { return { uk: '', pkt: '' }; }
    if (isNaN(b)) {
      return { uk: lsClock(a, LS_TZ_UK) + ' UK', pkt: lsClock(a, LS_TZ_PKT) + ' PKT' };
    }
    return {
      uk: lsClock(a, LS_TZ_UK) + ' – ' + lsClock(b, LS_TZ_UK) + ' UK',
      pkt: lsClock(a, LS_TZ_PKT) + ' – ' + lsClock(b, LS_TZ_PKT) + ' PKT' +
        (lsDay(a, LS_TZ_PKT) !== lsDay(b, LS_TZ_PKT) ? ' (into the next day)' : '')
    };
  }
  function lsWhen(iso) {
    var s = lsStr(iso);
    if (!s) { return ''; }
    var out = fmtPkt(s, true);
    return out ? out + ' PKT' : s;
  }
  function lsOverdue(iso, status) {
    var ms = Date.parse(lsStr(iso));
    return !isNaN(ms) && ms < Date.now() && status !== LS_COMPLETED;
  }

  // ---------- §8.2 payload access ----------
  function lsNorm(s) { return String(s == null ? '' : s).toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim(); }
  /** Values are read through the normalized header, so a trailing space or an embedded newline
   *  drifting on the live sheet can never blank a field on this screen. */
  function lsIndex(listing) {
    var idx = {}, keys, i, n;
    if (!listing || typeof listing !== 'object') { return idx; }
    keys = Object.keys(listing);
    for (i = 0; i < keys.length; i++) {
      n = lsNorm(keys[i]);
      if (n && idx[n] === undefined) { idx[n] = listing[keys[i]]; }
    }
    return idx;
  }
  function lsVal(idx, header) { var v = idx[lsNorm(header)]; return v === undefined || v === null ? '' : v; }
  function lsLabel(header) { return String(header == null ? '' : header).replace(/\s+/g, ' ').trim(); }
  /** GBP figures render £ with two decimals; the live sheet also stores ranges as text
   *  ('3.02 - 3.30'), which are shown exactly as written. */
  function lsMoney(v) {
    var s = lsStr(v);
    if (!s) { return ''; }
    if (/^-?\d+(\.\d+)?$/.test(s)) { return '£' + Number(s).toFixed(2); }
    return s;
  }

  // ---------- module state ----------
  var LS_COLUMNS = [];        // the 21 headers, in the sheet's own order, as the backend sends them
  var LS_COPY = {};           // copy-button payloads, kept out of the DOM attributes
  var LS_TIMING = null;       // timing block from the last myListingWork
  var LS_SHOW_DONE = false;

  // ============================== VIEW ==============================
  VIEWS.listing = {
    label: 'Assigned listings',
    icon: '<path d="M11.6 3H5a2 2 0 0 0-2 2v6.6a2 2 0 0 0 .6 1.4l7.4 7.4a2 2 0 0 0 2.8 0l6.6-6.6a2 2 0 0 0 0-2.8L13 3.6A2 2 0 0 0 11.6 3z"/><path d="M7.5 7.5h.01"/>',
    roles: LS_VIEW_ROLES,
    order: 17,
    prefetch: function () { return lsFetch(); },
    badge: function () { return (STATE.counts && STATE.counts.listing) || 0; },
    render: function () {
      return '<div class="hgroup enter d1"><h1>Assigned <span class="goldtext">listings</span></h1>' +
          '<span class="sub">Day 0 dummy → 72-hour revision → campaign · UK windows, Pakistan time</span>' +
          '<button class="minibtn" id="lsDone" style="margin-left:auto">Show completed</button>' +
          '<button class="minibtn" id="lsRefresh">Refresh</button>' +
        '</div>' +
        '<div class="dr-kpis enter d1" id="lsTiles"></div>' +
        '<div class="card enter d1"><div class="hd">The listing clock ' +
          '<span class="hint">§8.0 — fixed UK windows, shown in your time too</span></div>' +
          '<div class="bd" id="lsClock">' + lsTimeline(null) + '</div>' +
        '</div>' +
        '<div id="lsReceipt"></div>' +
        '<div class="card enter d2" style="margin-top:16px"><div class="hd">Listing jobs assigned to me ' +
          '<span class="hint">The limited view — no profit or ROI figures live here</span></div>' +
          '<div class="bd" id="lsJobs"><div class="spinner"></div></div>' +
        '</div>' +
        '<div class="card enter d3" style="margin-top:16px"><div class="hd">Revisions ' +
          '<span class="hint">72-hour revisit: Sold before · Sold After/72 Hrs · Observation · Next Step</span></div>' +
          '<div class="bd" id="lsRevs"><div class="spinner"></div></div>' +
        '</div>' +
        (lsCanCreate() ? lsComposer() : lsComposerNote());
    },
    init: function () {
      /* review 3: the tool lives IN this dashboard, like the calculator */
      (function () {
        var hg = document.querySelector('.hgroup');
        if (hg && !document.getElementById('liToolDockBtn')) {
          var b = document.createElement('button');
          b.className = 'minibtn'; b.id = 'liToolDockBtn'; b.textContent = 'Open M98M Listing Tool';
          b.style.marginLeft = 'auto';
          var host = document.createElement('div'); host.id = 'liToolDock';
          hg.appendChild(b);
          hg.parentNode.insertBefore(host, hg.nextSibling);
          b.onclick = function () { window.toolDock(host, 'tool_listing', 'M98M Listing Tool'); };
        }
      })();

      $('lsRefresh').onclick = lsLoad;
      $('lsDone').onclick = function () {
        LS_SHOW_DONE = !LS_SHOW_DONE;
        this.textContent = LS_SHOW_DONE ? 'Hide completed' : 'Show completed';
        lsLoad();
      };
      if (lsCanCreate()) { lsWireComposer(); }
      lsLoad();
    }
  };

  // ---------- §8.0 the three-step timeline ----------
  function lsTimeline(timing) {
    var go = lsWindow(LS_GO_LIVE_UK, null);
    var rev = lsWindow(LS_REVISION_UK.start, LS_REVISION_UK.end);
    var camp = lsWindow(LS_CAMPAIGN_UK.start, LS_CAMPAIGN_UK.end);
    // The server is the authority on the labels it sends; the PKT twin of go-live and of the
    // campaign window is not in that payload, so it is computed from the same UK hours here.
    if (timing) {
      if (lsStr(timing.go_live_uk)) { go.uk = lsStr(timing.go_live_uk); }
      if (lsStr(timing.revision_window_uk)) { rev.uk = lsStr(timing.revision_window_uk); }
      if (lsStr(timing.revision_window_pkt)) { rev.pkt = lsStr(timing.revision_window_pkt); }
      if (lsStr(timing.campaign_window_uk)) { camp.uk = lsStr(timing.campaign_window_uk); }
    }
    return '<div class="ls-tl">' +
      lsStepCard('Step 1 · day 0', 'Dummy listing goes live', go, 'You list from Hamza\'s keywords, then enter the eBay Item ID below — that Item ID is the confirmation.', true) +
      lsStepCard('Step 2 · +72 hours', 'The real revision', rev, 'The dummy becomes the real competitor-based listing — final title, keywords, description. Auto-scheduled the moment the Item ID lands.', false) +
      lsStepCard('Step 3 · same day', 'Campaign testing — Zain', camp, 'Zain\'s campaign_set task opens as soon as the 72-hour revision is approved.', false) +
    '</div>';
  }
  function lsStepCard(step, head, win, note, gold) {
    return '<div class="ls-step' + (gold ? ' ls-gold' : '') + '">' +
      '<div class="ls-n">' + esc(step) + '</div>' +
      '<div class="ls-hh">' + esc(head) + '</div>' +
      '<div class="ls-uk num">' + esc(win.uk) + '</div>' +
      '<div class="ls-pkt num">' + esc(win.pkt) + '</div>' +
      '<div class="ls-d">' + esc(note) + '</div>' +
    '</div>';
  }

  // ---------- load ----------
  /** Fetch shared with the sign-in warm-up. The cache key carries the include_completed flag, so
      the "show done" toggle never paints the wrong list. Item-ID entry and revision actions are
      re-validated by the server, so a briefly stale card cannot cause a wrong write. */
  function lsFetch() {
    /* 30 Aug: completed rows always ride along — the tiles (done yesterday, drafts, archive
       counts) need them; the Show-completed button only changes what the job list DISPLAYS. */
    var payload = { include_completed: 'true' };
    return api('myListingWork', payload).then(function (d) {
      if (typeof cacheWrite === 'function') { cacheWrite('myListingWork', payload, d); }
      return d;
    });
  }

  function lsLoad() {
    var jobs = $('lsJobs'), revs = $('lsRevs');
    if (!jobs || !revs) { return; }
    var had = (typeof cacheRead === 'function') ? cacheRead('myListingWork', { include_completed: 'true' }) : null;
    if (had) { try { lsPaint(had); } catch (e) { had = null; } }
    if (!had) {
      jobs.innerHTML = '<div class="spinner"></div>';
      revs.innerHTML = '<div class="spinner"></div>';
    }
    lsFetch().then(function (d) {
      lsPaint(d);
    }).catch(function (e) {
      if (had) { toast('Showing your last listing work — could not refresh just now.'); return; }
      jobs.innerHTML = '<div class="ls-empty">Could not load your listing work.<span>' + esc(e.message) + '</span></div>';
      revs.innerHTML = '';
    });
  }

  function lsPktDay(iso, shift) {
    /* task stamps arrive as PKT ISO — compare by PKT calendar day */
    var t = Date.parse(lsStr(iso));
    if (!isFinite(t)) { return ''; }
    return new Date(t + (shift || 0) * 86400000).toISOString().slice(0, 10);
  }
  function lsTiles(d) {
    var host = $('lsTiles');
    if (!host) { return; }
    var all = [].concat(d.listings || [], d.revisions || []);
    var today = lsPktDay(new Date().toISOString(), 0);
    var yday = lsPktDay(new Date().toISOString(), -1);
    var assignedToday = 0, pending = 0, doneYday = 0, drafts = 0, awaiting = 0, doneAll = 0;
    all.forEach(function (j) {
      var st = lsStr(j.status);
      if (lsPktDay(j.created_at, 0) === today) { assignedToday++; }
      if (LS_OPEN.indexOf(st) >= 0) {
        pending++;
        var f = lsFlag(j);
        if (f && f.flag === 'draft') { drafts++; }
      }
      if (st === LS_SUBMITTED) { awaiting++; }
      if (st === LS_COMPLETED) {
        doneAll++;
        if (lsPktDay(j.submitted_at, 0) === yday) { doneYday++; }
      }
    });
    function tile(label, n, tone, hint) {
      return '<div class="dr-kpi" title="' + esc(hint || '') + '"><div class="l">' + esc(label) + '</div>' +
        '<div class="v" style="' + (tone ? 'color:var(--' + tone + ')' : '') + '">' + n + '</div></div>';
    }
    host.innerHTML =
      tile('Assigned today', assignedToday, '', 'jobs that landed on you today') +
      tile('Pending', pending, pending ? 'warn' : '', 'assigned · working · updated — still yours to finish') +
      tile('Left in draft', drafts, drafts ? 'bad' : '', 'flagged as draft — the go-live desk is waiting') +
      tile('Awaiting approval', awaiting, '', 'submitted, with the approver') +
      tile('Done yesterday', doneYday, doneYday ? 'ok' : '', 'completed on yesterday\u2019s date') +
      tile('Done all-time', doneAll, 'ok', 'your archive — the full history lives on My archive');
  }

  function lsPaint(d) {
    lsTiles(d || {});
    /* the job/revision lists hide completed unless the button asks for them */
    if (d && !LS_SHOW_DONE) {
      d = { listings: (d.listings || []).filter(function (j) { return lsStr(j.status) !== LS_COMPLETED; }),
        revisions: (d.revisions || []).filter(function (j) { return lsStr(j.status) !== LS_COMPLETED; }),
        columns: d.columns, timing: d.timing };
    }
    var jobs = $('lsJobs'), revs = $('lsRevs');
    if (!jobs || !revs) { return; }
    LS_COPY = {};
    (function (d) {
      var listings = (d && d.listings) || [], revisions = (d && d.revisions) || [], open = 0, i;
      LS_COLUMNS = (d && d.columns) || [];
      LS_TIMING = (d && d.timing) || null;
      if ($('lsClock')) { $('lsClock').innerHTML = lsTimeline(LS_TIMING); }

      for (i = 0; i < listings.length; i++) { if (lsHas(LS_OPEN, lsStr(listings[i].status))) { open++; } }
      for (i = 0; i < revisions.length; i++) { if (lsHas(LS_OPEN, lsStr(revisions[i].status))) { open++; } }
      lsCount(open);

      jobs.innerHTML = listings.length ? listings.map(lsJobCard).join('') :
        '<div class="ls-empty">No listing job on you right now.<span>Approved hunts arrive here with their full 21-column payload.</span></div>';
      revs.innerHTML = revisions.length ? revisions.map(lsRevisionCard).join('') :
        '<div class="ls-empty">No revision on you right now.<span>The 72-hour revision is created automatically when you enter an Item ID.</span></div>';
      lsWire(jobs);
      lsWire(revs);
    })(d);
  }
  function lsRetry(msg, err, id) {
    return '<div class="ls-empty">' + esc(msg) + '<span>' + esc(err) + '</span>' +
      '<button class="minibtn" id="' + id + '" style="margin-top:10px">Try again</button></div>';
  }

  function lsPillClass(status) {
    if (status === LS_PENDING) return 'ls-p-pending';
    if (status === LS_WORKING) return 'ls-p-working';
    if (status === LS_UPDATED) return 'ls-p-updated';
    if (status === LS_SUBMITTED) return 'ls-p-awaiting';
    if (status === LS_COMPLETED) return 'ls-p-done';
    return '';
  }
  function lsChip(k, v, late) {
    return '<span class="ls-chip' + (late ? ' ls-late' : '') + '"><span class="k">' + esc(k) + '</span>' + v + '</span>';
  }
  function lsApprover(t) { return lsStr(t.assigned_by) || 'Management'; }

  // ============================== LISTING JOB (§8.2) ==============================
  function lsJobCard(j) {
    var id = lsStr(j.task_id), status = lsStr(j.status);
    var idx = lsIndex(j.listing);
    var title = lsStr(lsVal(idx, LS_H.title)) || lsStr(j.title);
    var late = lsOverdue(j.deadline_pkt, status);

    return '<div class="card ls-job"><div class="hd">' +
        '<span class="ls-name">' + esc(title || 'Listing job') + '</span>' +
        '<span class="pill ' + lsPillClass(status) + '">' + esc(status) + '</span>' +
      '</div><div class="bd">' +
        '<div class="ls-meta">' +
          lsChip('Task', '<span class="mono">' + esc(id) + '</span>') +
          lsChip('Account', esc(lsStr(j.account) || '—')) +
          lsChip('Deadline', '<span class="num">' + esc(lsWhen(j.deadline_pkt) || '—') + '</span>' + (late ? ' · overdue' : ''), late) +
          (lsStr(j.priority) ? lsChip('Priority', esc(lsStr(j.priority))) : '') +
          (lsStr(lsVal(idx, LS_H.update)) ? lsChip('Listing Update', esc(lsStr(lsVal(idx, LS_H.update)))) : '') +
          (lsStr(lsVal(idx, LS_H.date)) ? lsChip('Selected Date', esc(lsStr(lsVal(idx, LS_H.date)))) : '') +
          (lsStr(lsVal(idx, LS_H.seasonal)) ? lsChip('Seasonal', esc(lsStr(lsVal(idx, LS_H.seasonal)))) : '') +
        '</div>' +
        lsFlagBanner(j, id, status) +
        lsItemIdBox(j, id, status) +
        lsListerBar(j, id, status) +
        lsMediaRow(idx, id) +
        lsCopyBlock(id, 'title', 'Title', lsStr(lsVal(idx, LS_H.title))) +
        lsCopyBlock(id, 'desc', 'DESCRIPTION', lsRaw(lsVal(idx, LS_H.desc))) +
        lsCopyBlock(id, 'category', 'Category', lsRaw(lsVal(idx, LS_H.category))) +
        lsFacts(idx) +
        '<div class="ls-sec">Research &amp; supplier links</div>' +
        lsLinkRows(idx) +
        (lsStr(j.details_text) ? '<div class="ls-box"><div class="k">Task details</div><div class="ls-txt">' + lsText(j.details_text) + '</div></div>' : '') +
        lsReturned(j, status) +
        '<div class="ls-btns"><button class="minibtn" data-act="all" data-id="' + lsAttr(id) + '">All 21 columns</button>' +
          '<span class="ls-sub2">Exactly as the account\'s &#39;UMAR- Selected Listing&#39; tab holds them</span></div>' +
        '<div class="hidden scroll" data-all="' + lsAttr(id) + '" style="margin-top:10px">' + lsAllColumns(idx) + '</div>' +
      '</div></div>';
  }

  /** Return() appends "[stamp] Name returned: comment" to comments — the lister must see it. */
  function lsReturned(t, status) {
    if (status !== LS_WORKING && status !== LS_UPDATED) { return ''; }
    var lines = lsRaw(t.comments).split('\n').filter(function (l) { return l.indexOf('@LFLAG@') !== 0; });
    var re = /^\[([^\]]+)\]\s*(.*?)\s+returned:\s*([\s\S]*)$/, at = -1, i, m;
    for (i = 0; i < lines.length; i++) { if (re.test(lines[i])) { at = i; } }
    if (at < 0) { return ''; }
    m = re.exec(lines.slice(at).join('\n'));
    if (!m) { return ''; }
    return '<div class="ls-box" style="border-color:rgba(240,96,90,.45);background:var(--bad-soft)">' +
      '<div class="k" style="color:var(--bad)">Returned by ' + esc(m[2]) + ' · ' + esc(lsWhen(m[1]) || m[1]) + '</div>' +
      '<div class="ls-txt">' + lsText(m[3]) + '</div></div>';
  }

  function lsMediaRow(idx, id) {
    var shots = [
      { k: 'Image Link', v: lsVal(idx, LS_H.imageLink) },
      { k: 'IMAGE', v: lsVal(idx, LS_H.image) },
      { k: 'Image Link of avg sold price', v: lsVal(idx, LS_H.avgImg) },
      { k: 'Image Link of Zik analytics', v: lsVal(idx, LS_H.zikImg) }
    ];
    var cells = [], i, url, v;
    for (i = 0; i < shots.length; i++) {
      v = lsStr(shots[i].v);
      if (!v) { continue; }
      url = safeUrl(v);
      if (url) {
        cells.push('<a class="ls-th" href="' + lsAttr(url) + '" target="_blank" rel="noopener noreferrer">' +
          '<img data-shot="' + lsAttr(id) + '" src="' + lsAttr(url) + '" alt="' + lsAttr(shots[i].k) + '">' +
          '<span class="k">' + esc(shots[i].k) + '</span></a>');
      } else {
        cells.push('<div class="ls-th"><div class="ls-alt">' + esc(v) + '</div><span class="k">' + esc(shots[i].k) + '</span></div>');
      }
    }
    return cells.length ? '<div class="ls-media">' + cells.join('') + '</div>' : '';
  }

  function lsCopyBlock(id, slot, label, value) {
    var key = id + '|' + slot;
    if (!lsStr(value)) { return ''; }
    LS_COPY[key] = lsRaw(value);
    return '<div class="ls-cp"><div class="ls-cp-h"><span class="k">' + esc(label) + '</span>' +
        '<button class="minibtn" data-act="copy" data-copy="' + lsAttr(key) + '" style="margin-left:auto">Copy</button></div>' +
      '<div class="ls-cp-b">' + lsText(value) + '</div></div>';
  }

  function lsFacts(idx) {
    var facts = [
      { k: 'Source Price', v: lsMoney(lsVal(idx, LS_H.source)) },
      { k: 'E-Bey Caluclator + £4', v: lsMoney(lsVal(idx, LS_H.calc)) },
      { k: 'CPC Selling Chance', v: lsStr(lsVal(idx, LS_H.cpc)) },
      { k: 'CPC Update For Zain', v: lsStr(lsVal(idx, LS_H.cpcZain)) }
    ];
    var out = [], i;
    for (i = 0; i < facts.length; i++) {
      out.push('<div class="ls-fact"><span class="k">' + esc(facts[i].k) + '</span>' +
        '<b class="num">' + esc(facts[i].v || '—') + '</b></div>');
    }
    return '<div class="ls-facts">' + out.join('') + '</div>';
  }

  function lsLinkRows(idx) {
    var links = [
      { k: 'Main Keyword Terapeak link', v: lsVal(idx, LS_H.keyword) },
      { k: 'Terapeak overview', v: lsVal(idx, LS_H.overview) },
      { k: 'Ebay Link', v: lsVal(idx, LS_H.ebay) },
      { k: 'Temu Link', v: lsVal(idx, LS_H.temu) },
      { k: 'Product Link 1 Main supplier', v: lsVal(idx, LS_H.p1) },
      { k: 'Product Link 2', v: lsVal(idx, LS_H.p2) },
      { k: 'Product Link 3', v: lsVal(idx, LS_H.p3) }
    ];
    var out = [], i, v, url;
    for (i = 0; i < links.length; i++) {
      v = lsStr(links[i].v);
      url = safeUrl(v);
      out.push('<div class="ls-lk"><span class="k">' + esc(links[i].k) + '</span>' +
        (url ? '<a href="' + lsAttr(url) + '" target="_blank" rel="noopener noreferrer">' + esc(v) + '</a>'
             : '<span class="ls-none">' + (v ? esc(v) : '—') + '</span>') + '</div>');
    }
    return out.join('');
  }

  /** Full fidelity (§13.5): the 21 columns in the sheet's own order, values verbatim. */
  function lsAllColumns(idx) {
    var rows = [], i, h, v;
    for (i = 0; i < LS_COLUMNS.length; i++) {
      h = LS_COLUMNS[i];
      v = lsVal(idx, h);
      rows.push('<tr><td class="ls-c1">' + esc(lsLabel(h)) + '</td><td>' + lsText(v) + '</td></tr>');
    }
    if (!rows.length) { return '<div class="ls-empty">The 21-column payload is not on this task.</div>'; }
    return '<table class="ls-tbl"><thead><tr><th>Column</th><th>Value</th></tr></thead><tbody>' + rows.join('') + '</tbody></table>';
  }

  // ---------- §8 the Item ID gate, front and centre ----------
  function lsItemIdBox(j, id, status) {
    var carried = lsStr(j.item_id);
    if (status === LS_SUBMITTED) {
      return '<div class="ls-id"><h3>Item ID ' + esc(carried) + ' is in</h3>' +
        '<div class="ls-sub">This listing is with <b>' + esc(lsApprover(j)) + '</b> for approval. Zain\'s campaign task, the supplier task and your 72-hour revision were created the moment you confirmed.</div>' +
        '<div class="ls-btns"><span class="pill ls-p-awaiting">' + esc(LS_SUBMITTED) + '</span>' +
        '<span class="ls-sub2">Submitted ' + esc(lsWhen(j.submitted_at) || '—') + '</span></div></div>';
    }
    if (status === LS_COMPLETED) {
      return '<div class="ls-id"><h3>Approved · Item ID ' + esc(carried || '—') + '</h3>' +
        '<div class="ls-sub">Listing Done. The 72-hour revision carries this listing from here.</div></div>';
    }
    if (status === LS_PENDING) {
      return '<div class="ls-id"><h3>Enter the eBay Item ID</h3>' +
        '<div class="ls-sub">Start this job first — open it in <b>My tasks</b> and press Start. The Item ID box opens the moment the job is ' + esc(LS_WORKING) + '.</div>' +
        lsWhatHappens() + '</div>';
    }
    return '<div class="ls-id"><h3>Enter the eBay Item ID</h3>' +
      '<div class="ls-sub">Paste the Item ID from eBay once the dummy listing is live. <b>The Item ID is the confirmation of this job.</b></div>' +
      '<div class="ls-2" data-entry="' + lsAttr(id) + '">' +
        '<div class="field" style="margin-top:0"><label>eBay Item ID</label>' +
          '<input class="ls-in ls-big" type="text" inputmode="numeric" autocomplete="off" placeholder="123456789012" data-item="' + lsAttr(id) + '" value="' + lsAttr(carried) + '"></div>' +
        '<div class="field" style="margin-top:0"><label>Note for the approver (optional)</label>' +
          '<textarea class="ls-ta" data-note="' + lsAttr(id) + '" placeholder="Anything the approver should check"></textarea></div>' +
      '</div>' +
      lsWhatHappens() +
      '<div class="ls-btns" data-bar="' + lsAttr(id) + '">' +
        '<button class="btn-gold" data-act="idEnter" data-id="' + lsAttr(id) + '">Enter Item ID</button>' +
        '<span class="ls-sub2">You confirm on the next step — nothing is sent yet.</span></div>' +
      '<div class="ls-steps hidden" data-confirm="' + lsAttr(id) + '" style="border-color:var(--gold-line-hi)">' +
        '<div class="k">Confirm</div>' +
        '<div class="ls-txt">Item ID <b class="mono" data-cid="' + lsAttr(id) + '"></b> is correct and the listing is live on eBay?</div>' +
        '<div class="ls-btns"><button class="btn-gold" data-act="idConfirm" data-id="' + lsAttr(id) + '">Yes — confirm and fire the chain</button>' +
          '<button class="minibtn" data-act="idCancel" data-id="' + lsAttr(id) + '">Cancel</button></div>' +
      '</div>' +
    '</div>';
  }

  // ---------- R7-4: lister states (need time / need info) + the draft hand-off ----------
  /** The flag rides TASKS.comments as JSON; a returned-task note is plain text, so parse only
      when it actually looks like our object. */
  function lsFlag(j) {
    var lines = lsStr(j.comments).split('\n'), i;
    for (i = 0; i < lines.length; i++) {
      if (lines[i].indexOf('@LFLAG@') === 0) {
        try { var o = JSON.parse(lines[i].slice(7)); return (o && o.flag) ? o : null; } catch (e) { return null; }
      }
    }
    return null;
  }

  function lsFlagBanner(j, id, status) {
    var f = lsFlag(j);
    if (!f) { return ''; }
    var open = status === LS_WORKING || status === LS_UPDATED || status === LS_PENDING;
    var when = lsWhen(f.at) || '';
    var body = '', cls = 'ls-flag';
    if (f.flag === 'needtime') {
      cls += ' ls-flag-time';
      body = '<div class="k">⏳ Needs more time</div><div class="ls-txt">' + lsText(f.reason || '') +
        (f.eta ? '<div class="ls-sub2" style="margin-top:6px">New ETA: <b>' + esc(lsWhen(f.eta) || f.eta) + '</b></div>' : '') + '</div>';
    } else if (f.flag === 'needinfo') {
      cls += ' ls-flag-info';
      body = '<div class="k">🟠 Waiting on the hunter</div><div class="ls-txt">' + lsText(f.note || '') +
        (f.hunter ? '<div class="ls-sub2" style="margin-top:6px">Alerted: ' + esc(f.hunter) + '</div>' : '') + '</div>';
    } else if (f.flag === 'draft') {
      cls += ' ls-flag-draft';
      var url = safeUrl(lsStr(f.link));
      body = '<div class="k">🟣 Left in draft — with go-live</div>' +
        (url ? '<div class="ls-txt"><a href="' + lsAttr(url) + '" target="_blank" rel="noopener noreferrer">Open the eBay draft</a></div>' : '') +
        (f.note ? '<div class="ls-txt" style="margin-top:4px">' + lsText(f.note) + '</div>' : '') +
        (f.from ? '<div class="ls-sub2" style="margin-top:6px">Handed off by ' + esc(f.from) + '</div>' : '');
    }
    return '<div class="' + cls + '">' + body +
      '<div class="ls-flag-ft"><span class="ls-sub2">Flagged ' + esc(when) + '</span>' +
        (open ? '<button class="minibtn" data-act="flagClear" data-id="' + lsAttr(id) + '">Clear this flag</button>' : '') +
      '</div></div>';
  }

  /** Three lister levers on an open job: need more time, need info from the hunter, or leave the
      listing in draft for the go-live approver to publish. Each opens a small inline form. */
  function lsListerBar(j, id, status) {
    if (status !== LS_WORKING && status !== LS_UPDATED) { return ''; }
    return '<div class="ls-lever"><div class="ls-lever-h">Not ready to enter an Item ID?</div>' +
      '<div class="ls-btns">' +
        '<button class="minibtn" data-act="needTimeF" data-id="' + lsAttr(id) + '">⏳ Need more time</button>' +
        '<button class="minibtn" data-act="needInfoF" data-id="' + lsAttr(id) + '">🟠 Need info from hunter</button>' +
        '<button class="minibtn" data-act="draftF" data-id="' + lsAttr(id) + '">🟣 Leave in draft</button>' +
      '</div>' +
      /* need-more-time form */
      '<div class="ls-lform hidden" data-lform="time:' + lsAttr(id) + '">' +
        '<div class="field" style="margin-top:0"><label>Why do you need more time?</label>' +
          '<textarea class="ls-ta" data-ltime-reason="' + lsAttr(id) + '" placeholder="What is holding the listing up"></textarea></div>' +
        '<div class="field" style="margin-top:10px"><label>New ETA (optional, Pakistan time)</label>' +
          '<input class="ls-in" type="datetime-local" data-ltime-eta="' + lsAttr(id) + '"></div>' +
        '<div class="ls-btns"><button class="btn-gold" data-act="needTime" data-id="' + lsAttr(id) + '">Send to your approver</button>' +
          '<button class="minibtn" data-act="leverCancel" data-id="time:' + lsAttr(id) + '">Cancel</button></div></div>' +
      /* need-info-from-hunter form */
      '<div class="ls-lform hidden" data-lform="info:' + lsAttr(id) + '">' +
        '<div class="field" style="margin-top:0"><label>What do you need from the hunter?</label>' +
          '<textarea class="ls-ta" data-linfo-note="' + lsAttr(id) + '" placeholder="e.g. a working supplier link, a clearer main image, the real UK sell price"></textarea></div>' +
        '<div class="ls-btns"><button class="btn-gold" data-act="needInfo" data-id="' + lsAttr(id) + '">Alert the hunter</button>' +
          '<button class="minibtn" data-act="leverCancel" data-id="info:' + lsAttr(id) + '">Cancel</button></div></div>' +
      /* leave-in-draft form */
      '<div class="ls-lform hidden" data-lform="draft:' + lsAttr(id) + '">' +
        '<div class="field" style="margin-top:0"><label>eBay draft link</label>' +
          '<input class="ls-in" type="url" autocomplete="off" placeholder="https://www.ebay.co.uk/…" data-ldraft-link="' + lsAttr(id) + '"></div>' +
        '<div class="field" style="margin-top:10px"><label>Note for go-live (optional)</label>' +
          '<textarea class="ls-ta" data-ldraft-note="' + lsAttr(id) + '" placeholder="Anything the person publishing should know"></textarea></div>' +
        '<div class="ls-btns"><button class="btn-gold" data-act="draft" data-id="' + lsAttr(id) + '">Hand to go-live</button>' +
          '<button class="minibtn" data-act="leverCancel" data-id="draft:' + lsAttr(id) + '">Cancel</button></div>' +
        '<div class="ls-sub2" style="margin-top:8px">The task leaves your queue and goes to whoever publishes drafts; they add the Item ID once it is live.</div></div>' +
    '</div>';
  }

  /** §8 / §8.0 — exactly what the confirmation does, in the order it does it. */
  function lsWhatHappens() {
    var rev = lsWindow(LS_REVISION_UK.start, LS_REVISION_UK.end);
    var camp = lsWindow(LS_CAMPAIGN_UK.start, LS_CAMPAIGN_UK.end);
    if (LS_TIMING) {
      if (lsStr(LS_TIMING.revision_window_uk)) { rev.uk = lsStr(LS_TIMING.revision_window_uk); }
      if (lsStr(LS_TIMING.revision_window_pkt)) { rev.pkt = lsStr(LS_TIMING.revision_window_pkt); }
      if (lsStr(LS_TIMING.campaign_window_uk)) { camp.uk = lsStr(LS_TIMING.campaign_window_uk); }
    }
    return '<div class="ls-steps"><div class="k">When you confirm, four things happen at once</div>' +
      '<div class="ls-what"><span class="ls-no">1</span><span><b>This listing goes for approval.</b> The job moves to “' + esc(LS_SUBMITTED) + '” — no task completes itself, your approver decides.</span></div>' +
      '<div class="ls-what"><span class="ls-no">2</span><span><b>Zain gets the campaign task.</b> campaign_set for this Item ID, worked in the testing window <b class="num">' + esc(camp.uk) + '</b> (' + esc(camp.pkt) + ') once the 72-hour revision is approved.</span></div>' +
      // 'Ali Express Link 1' and 'Suuplier 2' are the live Central Main Sheet headers, typo included.
      '<div class="ls-what"><span class="ls-no">3</span><span><b>Order Processors get the supplier task.</b> supplier_add — Current Supplier Working · Ali Express Link 1 · Suuplier 2 · Supplier 3 on the Central Main Sheet.</span></div>' +
      '<div class="ls-what"><span class="ls-no">4</span><span><b>Your 72-hour revision is scheduled.</b> ' + esc(LS_KIND_72H) + ' comes back to you for the window <b class="num">' + esc(rev.uk) + '</b> (' + esc(rev.pkt) + ') on day 3.</span></div>' +
    '</div>';
  }

  // ============================== REVISIONS (§8.4) ==============================
  function lsRevisionCard(r) {
    var id = lsStr(r.task_id), status = lsStr(r.status), late = lsOverdue(r.deadline_pkt, status);
    var open = status !== LS_COMPLETED && status !== LS_SUBMITTED;
    return '<div class="card ls-job"><div class="hd">' +
        '<span class="ls-name">' + esc(lsStr(r.title) || 'Revision') + '</span>' +
        (r.is_72h ? '<span class="pill ls-72">72-hour revision</span>' : '') +
        '<span class="pill ' + lsPillClass(status) + '">' + esc(status) + '</span>' +
      '</div><div class="bd">' +
        '<div class="ls-meta">' +
          lsChip('Task', '<span class="mono">' + esc(id) + '</span>') +
          lsChip('Item ID', '<span class="mono">' + esc(lsStr(r.item_id) || '—') + '</span>') +
          lsChip('Account', esc(lsStr(r.account) || '—')) +
          lsChip('Window ends', '<span class="num">' + esc(lsWhen(r.deadline_pkt) || '—') + '</span>' + (late ? ' · overdue' : ''), late) +
        '</div>' +
        (lsStr(r.details_text) ? '<div class="ls-box"><div class="k">Issue / changes required</div><div class="ls-txt">' + lsText(r.details_text) + '</div></div>' : '') +
        lsReturned(r, status) +
        (lsStr(r.comments) ? '<div class="ls-btns"><button class="minibtn" data-act="hist" data-id="' + lsAttr(id) + '">Revisit history</button></div>' +
          '<div class="ls-box hidden" data-hist="' + lsAttr(id) + '"><div class="k">History</div><div class="ls-txt">' + lsText(r.comments) + '</div></div>' : '') +
        (open ? lsRevisitForm(id) : '') +
      '</div></div>';
  }

  function lsRevisitForm(id) {
    return '<div class="ls-box ls-blue" data-revisit="' + lsAttr(id) + '">' +
      '<div class="k">72-hour revisit</div>' +
      '<div class="ls-2" style="margin-top:6px">' +
        '<div class="field" style="margin-top:0"><label>Sold before</label>' +
          '<input class="ls-in" type="text" inputmode="numeric" autocomplete="off" data-sb="' + lsAttr(id) + '" placeholder="units"></div>' +
        '<div class="field" style="margin-top:0"><label>Sold After/72 Hrs</label>' +
          '<input class="ls-in" type="text" inputmode="numeric" autocomplete="off" data-sa="' + lsAttr(id) + '" placeholder="units"></div>' +
      '</div>' +
      '<div class="field" style="margin-top:12px"><label>Observation</label>' +
        '<textarea class="ls-ta" data-obs="' + lsAttr(id) + '" placeholder="What the revision changed"></textarea></div>' +
      '<div class="field" style="margin-top:12px"><label>Next Step to update</label>' +
        '<textarea class="ls-ta" data-next="' + lsAttr(id) + '" placeholder="What you would change next"></textarea></div>' +
      '<div class="field" style="margin-top:12px"><label>Sold</label>' +
        '<input class="ls-in" type="text" autocomplete="off" data-sold="' + lsAttr(id) + '"></div>' +
      '<div class="ls-btns"><button class="btn-gold" data-act="revisit" data-id="' + lsAttr(id) + '">Record the revisit</button>' +
        '<span class="ls-sub2">This moves the job to ' + esc(LS_UPDATED) + ' and writes the row on the account\'s Listing Revision tab — approval still completes it.</span></div>' +
    '</div>';
  }

  // ============================== CREATE A REVISION (§8.4) ==============================
  function lsComposer() {
    var win = lsWindow(LS_REVISION_UK.start, LS_REVISION_UK.end);
    return '<div class="card enter d3" style="margin-top:16px"><div class="hd">Create a revision ' +
        '<span class="hint">Lands on the named employee for the ' + esc(win.uk) + ' window</span></div>' +
      '<div class="bd">' +
        '<div class="ls-2" style="margin-top:0">' +
          '<div class="field" style="margin-top:0"><label>Employee name</label>' +
            '<input class="ls-in" id="lsRvName" type="text" autocomplete="off" placeholder="as it appears in the portal"></div>' +
          '<div class="field" style="margin-top:0"><label>Employee email (if two people share a name)</label>' +
            '<input class="ls-in" id="lsRvEmail" type="email" autocomplete="off"></div>' +
          '<div class="field" style="margin-top:0"><label>Item ID</label>' +
            '<input class="ls-in" id="lsRvItem" type="text" inputmode="numeric" autocomplete="off"></div>' +
          '<div class="field" style="margin-top:0"><label>Item Link (optional)</label>' +
            '<input class="ls-in" id="lsRvLink" type="url" autocomplete="off" placeholder="https://"></div>' +
        '</div>' +
        '<div class="field" style="margin-top:12px"><label>Changes required</label>' +
          '<textarea class="ls-ta" id="lsRvChanges" placeholder="Issue/Changes in Listing"></textarea></div>' +
        '<div class="field" style="margin-top:12px"><label>Comments</label>' +
          '<textarea class="ls-ta" id="lsRvComments"></textarea></div>' +
        '<div class="ls-btns"><button class="btn-gold" id="lsRvSend">Create revision</button>' +
          '<span class="ls-sub2">The account is taken from the Item ID\'s own tasks when you leave it out.</span></div>' +
      '</div></div>';
  }
  function lsComposerNote() {
    return '<div class="card enter d3" style="margin-top:16px"><div class="hd">Revisions ' +
        '<span class="hint">§4.3</span></div><div class="bd">' +
      '<div class="ls-empty">Revisions are created by Management, the Team Lead or the Advertising Manager.' +
        '<span>Anything they send you appears above with its 1:00 PM – 5:00 PM UK window.</span></div></div></div>';
  }

  function lsWireComposer() {
    $('lsRvSend').onclick = function () {
      var btn = this;
      var item = lsStr($('lsRvItem').value);
      var link = lsStr($('lsRvLink').value);
      var payload = {
        employee_name: lsStr($('lsRvName').value),
        employee_email: lsStr($('lsRvEmail').value),
        item_id: item,
        changes_required: lsStr($('lsRvChanges').value),
        comments: lsStr($('lsRvComments').value)
      };
      if (!payload.employee_name && !payload.employee_email) { toast('Name the employee this revision is for.'); return; }
      if (!/^\d{9,15}$/.test(item)) { toast('An Item ID is 9 to 15 digits.'); return; }
      if (!payload.changes_required) { toast('Say what has to change.'); return; }
      if (link && !safeUrl(link)) { toast('The item link must start with http:// or https://'); return; }
      if (link) { payload.item_link = link; }
      btn.disabled = true;
      api('createRevision', payload).then(function (res) {
        btn.disabled = false;
        $('lsRvItem').value = ''; $('lsRvLink').value = ''; $('lsRvChanges').value = ''; $('lsRvComments').value = '';
        toast('Revision created · ' + lsStr(res.task_id) + ' · ' + lsStr(res.window && res.window.uk));
        lsLoad();
      }).catch(function (e) { btn.disabled = false; toast('Not created: ' + e.message); });
    };
  }

  // ---------- wiring ----------
  function lsWire(box) {
    var btns = box.querySelectorAll('button[data-act]'), imgs = box.querySelectorAll('img[data-shot]'), i;
    for (i = 0; i < btns.length; i++) {
      (function (b) {
        b.onclick = function () { lsAction(box, b.getAttribute('data-act'), b.getAttribute('data-id'), b); };
      })(btns[i]);
    }
    for (i = 0; i < imgs.length; i++) {
      (function (im) {
        im.onerror = function () {                       // a dead screenshot link must not leave a broken frame
          im.classList.add('hidden');
          var alt = document.createElement('div');
          alt.className = 'ls-alt';
          alt.textContent = 'Image did not load';
          if (im.parentNode) { im.parentNode.insertBefore(alt, im); }
        };
      })(imgs[i]);
    }
  }

  function lsAction(box, act, id, btn) {
    var el, input, value;

    if (act === 'copy') {
      lsDoCopy(LS_COPY[btn.getAttribute('data-copy')] || '', btn);
      return;
    }
    if (act === 'all') {
      el = lsPick(box, 'data-all', id);
      if (el) { el.classList.toggle('hidden'); }
      return;
    }
    if (act === 'hist') {
      el = lsPick(box, 'data-hist', id);
      if (el) { el.classList.toggle('hidden'); }
      return;
    }
    if (act === 'idEnter') {
      input = lsPick(box, 'data-item', id);
      value = input ? lsStr(input.value) : '';
      if (!/^\d{9,15}$/.test(value)) { toast('An eBay Item ID is 9 to 15 digits.'); if (input) { input.focus(); } return; }
      el = lsPick(box, 'data-cid', id);
      if (el) { el.textContent = value; }
      el = lsPick(box, 'data-confirm', id);
      if (el) { el.classList.remove('hidden'); }
      el = lsPick(box, 'data-bar', id);
      if (el) { el.classList.add('hidden'); }
      return;
    }
    if (act === 'idCancel') {
      el = lsPick(box, 'data-confirm', id);
      if (el) { el.classList.add('hidden'); }
      el = lsPick(box, 'data-bar', id);
      if (el) { el.classList.remove('hidden'); }
      return;
    }
    if (act === 'idConfirm') { lsConfirmItemId(box, id, btn); return; }
    if (act === 'revisit') { lsRecordRevisit(box, id, btn); return; }

    // R7-4 lister levers — open one inline form, close the others
    if (act === 'needTimeF' || act === 'needInfoF' || act === 'draftF') {
      var want = act === 'needTimeF' ? 'time:' : act === 'needInfoF' ? 'info:' : 'draft:';
      var forms = box.querySelectorAll('[data-lform]'), j2;
      for (j2 = 0; j2 < forms.length; j2++) {
        var key = forms[j2].getAttribute('data-lform');
        if (key === want + id) { forms[j2].classList.toggle('hidden'); }
        else if (key.indexOf(':' + id) === key.length - (id.length + 1)) { forms[j2].classList.add('hidden'); }
      }
      return;
    }
    if (act === 'leverCancel') {
      el = box.querySelector('[data-lform="' + String(id).replace(/"/g, '') + '"]');
      if (el) { el.classList.add('hidden'); }
      return;
    }
    if (act === 'needTime') { lsSendNeedTime(box, id, btn); return; }
    if (act === 'needInfo') { lsSendNeedInfo(box, id, btn); return; }
    if (act === 'draft') { lsSendDraft(box, id, btn); return; }
    if (act === 'flagClear') { lsClearFlag(box, id, btn); return; }
  }

  function lsSendNeedTime(box, id, btn) {
    var r = lsPick(box, 'data-ltime-reason', id), e = lsPick(box, 'data-ltime-eta', id);
    var reason = r ? lsStr(r.value) : '';
    if (!reason) { toast('Say why you need more time.'); if (r) { r.focus(); } return; }
    btn.disabled = true;
    api('listerNeedTime', { task_id: id, reason: reason, eta_pkt: e ? lsStr(e.value) : '' }).then(function () {
      btn.disabled = false; toast('Your approver has been told — the flag is on the job.'); lsLoad();
    }).catch(function (err) { btn.disabled = false; toast('Not sent: ' + err.message); });
  }

  function lsSendNeedInfo(box, id, btn) {
    var n = lsPick(box, 'data-linfo-note', id);
    var note = n ? lsStr(n.value) : '';
    if (!note) { toast('Say what you need from the hunter.'); if (n) { n.focus(); } return; }
    btn.disabled = true;
    api('listerNeedInfo', { task_id: id, note: note }).then(function (res) {
      btn.disabled = false;
      toast(res && res.hunter ? 'The hunter (' + res.hunter + ') has been alerted.' : 'Management notified — no hunter was on file.');
      lsLoad();
    }).catch(function (err) { btn.disabled = false; toast('Not sent: ' + err.message); });
  }

  function lsSendDraft(box, id, btn) {
    var l = lsPick(box, 'data-ldraft-link', id), n = lsPick(box, 'data-ldraft-note', id);
    var link = l ? lsStr(l.value) : '';
    if (!safeUrl(link)) { toast('Paste the eBay draft link (it must start with http/https).'); if (l) { l.focus(); } return; }
    btn.disabled = true;
    api('listerDraft', { task_id: id, draft_link: link, note: n ? lsStr(n.value) : '' }).then(function (res) {
      btn.disabled = false;
      toast('Handed to ' + (lsStr(res && res.assigned_to_name) || 'go-live') + ' — they publish it and add the Item ID.');
      lsLoad();
    }).catch(function (err) { btn.disabled = false; toast('Not handed off: ' + err.message); });
  }

  function lsClearFlag(box, id, btn) {
    btn.disabled = true;
    api('listerClearFlag', { task_id: id }).then(function () {
      btn.disabled = false; toast('Flag cleared.'); lsLoad();
    }).catch(function (err) { btn.disabled = false; toast('Not cleared: ' + err.message); });
  }

  function lsDoCopy(text, btn) {
    var label = btn.textContent;
    var done = function () {
      btn.textContent = 'Copied';
      setTimeout(function () { btn.textContent = label; }, 1500);
    };
    var manual = function () {
      var ta = document.createElement('textarea');
      ta.value = text;
      ta.setAttribute('readonly', 'readonly');
      ta.style.position = 'fixed';
      ta.style.opacity = '0';
      document.body.appendChild(ta);
      ta.select();
      try { document.execCommand('copy'); done(); }
      catch (e) { toast('Select the text and copy it manually.'); }
      document.body.removeChild(ta);
    };
    if (!text) { return; }
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(text).then(done, manual);
        return;
      }
    } catch (e) { /* falls through to the manual path */ }
    manual();
  }

  function lsConfirmItemId(box, id, btn) {
    var input = lsPick(box, 'data-item', id);
    var note = lsPick(box, 'data-note', id);
    var value = input ? lsStr(input.value) : '';
    if (!/^\d{9,15}$/.test(value)) { toast('An eBay Item ID is 9 to 15 digits.'); return; }
    btn.disabled = true;
    api('enterItemId', { task_id: id, item_id: value, note: note ? lsStr(note.value) : '' }).then(function (res) {
      btn.disabled = false;
      toast(res && res.idempotent ? 'Already in — nothing was duplicated.' : 'Item ID in · the chain is running.');
      lsShowReceipt(res);
      lsLoad();
    }).catch(function (e) {
      btn.disabled = false;
      toast('Not entered: ' + e.message);
    });
  }

  /** The receipt of one confirmation: the §8.0 dates the server actually scheduled, the three
   *  downstream tasks it actually created, and whether the Central sheet row was marked. */
  function lsShowReceipt(res) {
    var box = $('lsReceipt');
    if (!box || !res) { return; }
    var t = res.timing || {}, made = res.tasks || {}, mirror = res.mirror || {};
    var rev = t.revision || {}, camp = t.campaign || {};
    var rows = '';
    rows += lsReceiptRow('Item ID', '<span class="mono">' + esc(lsStr(res.item_id)) + '</span>');
    rows += lsReceiptRow('This job', '<span class="pill ' + lsPillClass(lsStr(res.status)) + '">' + esc(lsStr(res.status)) + '</span>');
    if (lsStr(t.go_live_uk)) {
      rows += lsReceiptRow('Day 0 · live', '<span class="num">' + esc(lsStr(t.go_live_uk)) + '</span> on ' + esc(lsStr(t.day0_uk_date)) +
        (lsStr(t.go_live_pkt) ? ' · <span class="num">' + esc(lsWhen(t.go_live_pkt)) + '</span>' : ''));
    }
    if (lsStr(rev.uk)) {
      rows += lsReceiptRow('72-hour revision', '<span class="num">' + esc(lsStr(rev.uk)) + '</span> (' + esc(lsStr(rev.pkt)) + ') on ' + esc(lsStr(rev.uk_date)));
    }
    if (lsStr(camp.uk)) {
      rows += lsReceiptRow('Campaign testing', '<span class="num">' + esc(lsStr(camp.uk)) + '</span> (' + esc(lsStr(camp.pkt)) + ') on ' + esc(lsStr(camp.uk_date)));
    }
    rows += lsMadeRow('Zain · campaign_set', made.campaign_set);
    rows += lsMadeRow('Order Processor · supplier_add', made.supplier_add);
    rows += lsMadeRow('You · ' + LS_KIND_72H, made.revision);
    rows += lsReceiptRow('Central sheet', mirror && mirror.ok
      ? 'Marked <b>Listing Done </b> on the Selected Listing tab'
      : '<span class="ls-sub2">' + esc(lsStr(mirror.reason) || 'not written') + '</span>');

    box.innerHTML = '<div class="ls-rc enter d1"><h3>' + (res.idempotent ? 'Already entered — nothing duplicated' : 'Item ID confirmed — here is what fired') + '</h3>' +
      '<div style="margin-top:8px">' + rows + '</div>' +
      '<div class="ls-btns"><button class="minibtn" id="lsRcClose">Close</button></div></div>';
    var c = $('lsRcClose');
    if (c) { c.onclick = function () { box.innerHTML = ''; }; }
  }
  function lsReceiptRow(k, v) {
    return '<div class="tl-row"><span class="k">' + esc(k) + '</span><span>' + v + '</span></div>';
  }
  function lsMadeRow(label, made) {
    if (!made) { return lsReceiptRow(label, '<span class="ls-sub2">not routed — Management was notified</span>'); }
    return lsReceiptRow(label, '<span class="mono">' + esc(lsStr(made.task_id)) + '</span> → ' + esc(lsStr(made.assigned_to)) +
      (made.existing ? ' <span class="ls-sub2">(already existed)</span>' : ''));
  }

  function lsRecordRevisit(box, id, btn) {
    var sb = lsPick(box, 'data-sb', id), sa = lsPick(box, 'data-sa', id);
    var obs = lsPick(box, 'data-obs', id), nx = lsPick(box, 'data-next', id), sold = lsPick(box, 'data-sold', id);
    var payload = {
      task_id: id,
      sold_before: sb ? lsStr(sb.value) : '',
      sold_after_72hrs: sa ? lsStr(sa.value) : '',
      observation: obs ? lsStr(obs.value) : '',
      next_step: nx ? lsStr(nx.value) : '',
      sold: sold ? lsStr(sold.value) : ''
    };
    if (payload.sold_before && !/^\d{1,6}$/.test(payload.sold_before)) { toast('Sold before is a whole number of units.'); sb.focus(); return; }
    if (payload.sold_after_72hrs && !/^\d{1,6}$/.test(payload.sold_after_72hrs)) { toast('Sold After/72 Hrs is a whole number of units.'); sa.focus(); return; }
    if (!payload.sold_before && !payload.sold_after_72hrs && !payload.observation && !payload.next_step && !payload.sold) {
      toast('Nothing to record yet.');
      return;
    }
    btn.disabled = true;
    api('revisionRevisit', payload).then(function (res) {
      toast('Revisit recorded · ' + lsStr(res.status));
      lsLoad();
    }).catch(function (e) { btn.disabled = false; toast('Not recorded: ' + e.message); });
  }

})();
