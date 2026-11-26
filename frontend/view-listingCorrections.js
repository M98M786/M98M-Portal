/* view-listingCorrections.js — Listing corrections (26 Nov, owner: "I am sending listings back to
 * the listers to update them, but they cannot send them back — make a listing correction page; in
 * the management portal show every lister's listings that need correction, in a lister's own portal
 * show him the ones that need correcting again").
 * ONE feed (engine listingCorrections) judges which new-listing tasks still need correcting: the
 * sheet's own "returned:" notes (the go-live desk's Send back) and the notes management raises from
 * any task card or from here. A correction stays open until the lister hands the corrected draft
 * back (Leave in draft / Resend here), the listing is submitted or live, or management marks it
 * fixed. A lister sees his own and resends from the row; management and the listing leads see every
 * lister's, grouped, with Send back again and Mark fixed. Nothing here writes the tasks sheet. */
(function () {
  'use strict';

  var LC_MGMT = ['Management', 'Ops Head', 'Listing Manager', 'Team Lead'];
  var LC_ROLES = ['Item Lister'].concat(LC_MGMT);
  var LC = { data: null, seq: 0, open: {} };

  function lcS(v) { return String(v == null ? '' : v).trim(); }
  function lcAttr(v) { return esc(lcS(v)).replace(/"/g, '&quot;').replace(/'/g, '&#39;'); }
  function lcMgmt() { return !!(STATE.user && (LC_MGMT.indexOf(STATE.user.role) >= 0 || STATE.user.super)); }
  function lcWhen(iso) { var d = new Date(iso); if (isNaN(d.getTime())) { return lcS(iso); } return d.toLocaleString('en-GB', { timeZone: 'Asia/Karachi', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit', hour12: true }); }
  function lcAge(iso) { var ms = Date.now() - Date.parse(iso); if (!isFinite(ms) || ms < 0) { return ''; } var h = Math.floor(ms / 3600000); if (h < 1) { return 'just now'; } if (h < 24) { return h + ' h'; } var d = Math.floor(h / 24); return d + ' day' + (d === 1 ? '' : 's'); }

  VIEW_CSS.push(
    '.lc-tiles{display:grid;gap:10px;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));margin:0 0 14px}' +
    '.lc-tile{border:1px solid var(--gold-line);border-radius:12px;padding:12px 14px;background:var(--panel-2);cursor:pointer}' +
    '.lc-tile.on{border-color:var(--gold-a);box-shadow:0 0 0 1px var(--gold-a) inset}' +
    '.lc-tile .k{font-size:10px;text-transform:uppercase;letter-spacing:.08em;color:var(--text-3);font-weight:800}' +
    '.lc-tile b{display:block;font-size:22px;margin-top:4px}' +
    '.lc-tile.bad b{color:var(--bad)}' +
    '.lc-row{border:1px solid var(--gold-line);border-left:4px solid var(--bad);border-radius:12px;padding:12px 14px;margin:0 0 10px;background:var(--panel-2)}' +
    '.lc-row.fixed{border-left-color:var(--ok);opacity:.85}' +
    '.lc-row .t{font-weight:800;font-size:13.5px}' +
    '.lc-row .m{font-size:11px;color:var(--text-3);font-weight:700;margin-top:3px}' +
    '.lc-note{margin-top:8px;padding:9px 11px;border-radius:10px;background:rgba(255,80,80,.08);border:1px solid rgba(255,80,80,.25);font-size:12.5px;white-space:pre-wrap}' +
    '.lc-note .k{font-size:10px;text-transform:uppercase;letter-spacing:.08em;color:var(--bad);font-weight:800;margin-bottom:3px}' +
    '.lc-row.fixed .lc-note{background:rgba(80,200,120,.08);border-color:rgba(80,200,120,.25)}.lc-row.fixed .lc-note .k{color:var(--ok)}' +
    '.lc-acts{display:flex;gap:8px;flex-wrap:wrap;margin-top:10px;align-items:center}' +
    '.lc-form{margin-top:10px;display:grid;gap:8px}' +
    '.lc-in{width:100%;box-sizing:border-box;padding:9px 11px;border-radius:10px;border:1px solid var(--gold-line-hi);background:var(--panel);color:var(--text);font:inherit;font-size:12.5px}' +
    '.lc-grp{font-size:11px;text-transform:uppercase;letter-spacing:.08em;color:var(--text-3);font-weight:800;margin:16px 0 8px;display:flex;gap:8px;align-items:center}' +
    '.lc-grp b{color:var(--text);font-size:13px;text-transform:none;letter-spacing:0}' +
    '.lc-empty{color:var(--text-2);font-weight:700;padding:14px 0}.lc-empty span{display:block;color:var(--text-3);font-weight:600;font-size:12px;margin-top:4px}' +
    '.lc-link{display:inline-flex;align-items:center;gap:6px;margin-top:8px;padding:6px 10px;border-radius:999px;border:1px solid var(--gold-line-hi);background:var(--panel);font-size:12px;font-weight:700;text-decoration:none;color:var(--gold-a)}' +
    '.lc-link.old{color:var(--text-2);border-color:var(--gold-line)}' +
    '.lc-data{margin-top:10px;padding:10px 12px;border-radius:10px;border:1px solid var(--gold-line);background:var(--panel)}' +
    '.lc-data.hidden{display:none}'
  );

  function lcFetch() { return api('listingCorrections', {}); }

  function lcRow(r, mgmt) {
    var id = lcS(r.task_id), link = safeUrl(lcS(r.draft_link)), prev = safeUrl(lcS(r.prev_draft_link));
    var where = r.with_golive ? 'draft is with go-live' : 'with ' + (mgmt ? esc(lcS(r.lister_name)) : 'you');
    /* 26 Nov (owner): the previous draft link and the product data on every row — the link the
       lister handed off before it came back (the same one if it is still with go-live), and the
       listing's own data drawn exactly as the task's Details card and the archive draw it */
    var hasData = !!(r.listing && typeof window.M98M_taskDetailsHtml === 'function');
    var h = '<div class="lc-row' + (r.resolved_how ? ' fixed' : '') + '" data-lc-row="' + lcAttr(id) + '">' +
      '<div class="t">' + esc(lcS(r.title) || id) + '</div>' +
      '<div class="m"><span class="mono">' + esc(id) + '</span> · ' + esc(lcS(r.account)) +
        (mgmt ? ' · lister <b style="color:var(--text-2)">' + esc(lcS(r.lister_name)) + '</b>' : '') +
        ' · ' + where + (link ? ' · <a href="' + esc(link) + '" target="_blank" rel="noopener noreferrer">open the eBay draft ↗</a>' : '') + '</div>' +
      '<div class="lc-note"><div class="k">' + (r.resolved_how ? 'Fixed · ' + esc(lcS(r.resolved_how)) : 'Needs correction') + ' · sent back by ' + esc(lcS(r.by) || 'management') + ' · ' + esc(lcWhen(r.at)) + (r.resolved_how ? '' : ' (' + esc(lcAge(r.at)) + ' waiting)') + '</div>' +
        esc(lcS(r.note)) + '</div>' +
      '<div class="lc-acts" style="margin-top:4px">' +
        (prev ? '<a class="lc-link' + (link && link === prev ? '' : ' old') + '" href="' + esc(prev) + '" target="_blank" rel="noopener noreferrer">' + (link && link === prev ? '\ud83d\udfe3 Draft link' : '\u21a9 Previous draft link') + ' \u2197</a>' : '<span class="lc-link old" style="cursor:default">No draft link on record yet</span>') +
        (hasData ? '<button class="minibtn" data-lc-act="data" data-id="' + lcAttr(id) + '">\ud83d\udce6 Product data</button>' : '') +
      '</div>' +
      (hasData ? '<div class="lc-data hidden" data-lc-data="' + lcAttr(id) + '">' + window.M98M_taskDetailsHtml(JSON.stringify({ limited: r.listing, hunt_id: r.hunt_id })) + '</div>' : '');
    if (!r.resolved_how) {
      h += '<div class="lc-acts">';
      if (!mgmt || lcS(r.lister) === lcS(STATE.user && STATE.user.email).toLowerCase()) {
        h += '<button class="minibtn" data-lc-act="resendOpen" data-id="' + lcAttr(id) + '" style="border-color:var(--gold-a);color:var(--gold-a)">✅ Resend corrected draft</button>';
      }
      if (mgmt) {
        h += '<button class="minibtn" data-lc-act="againOpen" data-id="' + lcAttr(id) + '">Send back again</button>' +
             '<button class="minibtn" data-lc-act="fixed" data-id="' + lcAttr(id) + '">Mark fixed</button>';
      }
      h += '</div>' +
        '<div class="lc-form hidden" data-lc-form="resend:' + lcAttr(id) + '">' +
          '<input class="lc-in" type="url" autocomplete="off" placeholder="https://www.ebay.co.uk/… the corrected draft link" data-lc-link="' + lcAttr(id) + '" value="' + lcAttr(r.draft_link || r.prev_draft_link) + '">' +
          '<input class="lc-in" type="text" placeholder="Note for go-live (optional) — what you changed" data-lc-rnote="' + lcAttr(id) + '">' +
          '<div class="lc-acts" style="margin-top:0"><button class="minibtn" data-lc-act="resend" data-id="' + lcAttr(id) + '" style="border-color:var(--gold-a);color:var(--gold-a)">Hand the corrected draft to go-live</button>' +
            '<button class="minibtn" data-lc-act="cancel" data-id="resend:' + lcAttr(id) + '">Cancel</button></div></div>' +
        '<div class="lc-form hidden" data-lc-form="again:' + lcAttr(id) + '">' +
          '<textarea class="lc-in" rows="2" placeholder="What must the lister correct this time?" data-lc-anote="' + lcAttr(id) + '"></textarea>' +
          '<div class="lc-acts" style="margin-top:0"><button class="minibtn" data-lc-act="again" data-id="' + lcAttr(id) + '">Send back</button>' +
            '<button class="minibtn" data-lc-act="cancel" data-id="again:' + lcAttr(id) + '">Cancel</button></div></div>';
    }
    return h + '</div>';
  }

  function lcPaint() {
    var box = $('lcBody'), D = LC.data, mgmt = lcMgmt();
    if (!box) { return; }
    if (!D) { box.innerHTML = '<div class="spinner"></div>'; return; }
    var open = D.open || [], fixed = D.fixed || [];
    var h = '';
    if (mgmt) {
      h += '<div class="lc-tiles">' +
        '<div class="lc-tile' + (open.length ? ' bad' : '') + (LC.lister === '' ? ' on' : '') + '" data-lc-lister=""><span class="k">Need correction · all listers</span><b>' + open.length + '</b></div>' +
        (D.listers || []).map(function (l) {
          return '<div class="lc-tile' + (LC.lister === l.lister ? ' on' : '') + '" data-lc-lister="' + lcAttr(l.lister) + '"><span class="k">' + esc(lcS(l.lister_name)) + '</span><b>' + l.open + '</b></div>';
        }).join('') +
        '<div class="lc-tile" style="cursor:default"><span class="k">Fixed · last 7 days</span><b style="color:var(--ok)">' + (D.counts && D.counts.fixed_7d || 0) + '</b></div>' +
      '</div>';
    }
    var shown = LC.lister ? open.filter(function (r) { return lcS(r.lister) === LC.lister; }) : open;
    if (!shown.length) {
      h += '<div class="lc-empty">' + (mgmt ? 'Nothing is waiting for correction' + (LC.lister ? ' with this lister' : '') + '.' : 'Nothing of yours needs correcting right now.') +
        '<span>' + (mgmt ? 'Send a listing back from any listing task (Send back) or from the go-live desk; it appears here until the lister hands the corrected draft back.' : 'When management sends a listing back, it appears here with what to fix.') + '</span></div>';
    } else if (mgmt && !LC.lister) {
      var by = {}; shown.forEach(function (r) { (by[lcS(r.lister)] = by[lcS(r.lister)] || []).push(r); });
      Object.keys(by).sort(function (a, b) { return by[b].length - by[a].length; }).forEach(function (k) {
        h += '<div class="lc-grp"><b>' + esc(lcS(by[k][0].lister_name)) + '</b> ' + by[k].length + ' listing' + (by[k].length === 1 ? '' : 's') + ' to correct</div>' + by[k].map(function (r) { return lcRow(r, true); }).join('');
      });
    } else {
      h += shown.map(function (r) { return lcRow(r, mgmt); }).join('');
    }
    if (fixed.length && (mgmt || !LC.lister)) {
      var mine = mgmt ? fixed : fixed;
      h += '<div class="lc-grp">Fixed recently</div>' + mine.slice(0, 20).map(function (r) { return lcRow(r, mgmt); }).join('');
    }
    box.innerHTML = h;
    lcWire(box);
  }

  function lcForm(box, key) { var fs = box.querySelectorAll('[data-lc-form]'), i; for (i = 0; i < fs.length; i++) { if (fs[i].getAttribute('data-lc-form') === key) { return fs[i]; } } return null; }
  function lcPick(box, attr, id) { var els = box.querySelectorAll('[' + attr + ']'), i; for (i = 0; i < els.length; i++) { if (els[i].getAttribute(attr) === id) { return els[i]; } } return null; }

  function lcWire(box) {
    box.querySelectorAll('[data-lc-lister]').forEach(function (t) { t.onclick = function () { LC.lister = this.getAttribute('data-lc-lister') || ''; lcPaint(); }; });
    box.onclick = function (ev) {
      var el = ev.target && ev.target.closest ? ev.target.closest('[data-lc-act]') : null;
      if (!el || !box.contains(el)) { return; }
      var act = el.getAttribute('data-lc-act'), id = el.getAttribute('data-id') || '';
      if (act === 'resendOpen' || act === 'againOpen') {
        var f = lcForm(box, (act === 'resendOpen' ? 'resend:' : 'again:') + id);
        if (f) { f.classList.remove('hidden'); var first = f.querySelector('input,textarea'); if (first) { first.focus(); } }
        return;
      }
      if (act === 'cancel') { var fc = lcForm(box, id); if (fc) { fc.classList.add('hidden'); } return; }
      if (act === 'data') { var dd = lcPick(box, 'data-lc-data', id); if (dd) { dd.classList.toggle('hidden'); el.textContent = dd.classList.contains('hidden') ? '\ud83d\udce6 Product data' : '\ud83d\udce6 Hide product data'; } return; }
      if (act === 'resend') {
        var l = lcPick(box, 'data-lc-link', id), n = lcPick(box, 'data-lc-rnote', id);
        var link = l ? lcS(l.value) : '';
        if (!safeUrl(link)) { toast('Paste the corrected eBay draft link (it must start with http/https).'); if (l) { l.focus(); } return; }
        el.disabled = true;
        /* the same hand-off the task card makes (listerDraft): the draft flag is rewritten with the
           new link and the task moves to go-live; the engine then sees a flag newer than the note
           and the correction closes on its own. The resolve call below only makes it close NOW,
           ahead of the five-minute mirror. */
        api('listerDraft', { task_id: id, draft_link: link, note: n ? lcS(n.value) : '' }).then(function (res) {
          toast('Handed to ' + (lcS(res && res.assigned_to_name) || 'go-live') + ' ✓ — correction cleared.');
          return api('listingCorrectionResolve', { task_id: id, how: 'resent' })['catch'](function () {});
        }).then(lcLoad)['catch'](function (e) {
          el.disabled = false;
          var msg = String((e && e.message) || '');
          if (/overloaded|timeout|did not answer|taking long|aborted|failed to fetch/i.test(msg)) { toast('Google is slow — the hand-off is finishing on the server; this clears on the next refresh.'); setTimeout(lcLoad, 15000); return; }
          toast('Not sent: ' + msg);
        });
        return;
      }
      if (act === 'again') {
        var ta = lcPick(box, 'data-lc-anote', id), note = ta ? lcS(ta.value) : '';
        if (!note) { toast('Say what the lister must correct.'); if (ta) { ta.focus(); } return; }
        el.disabled = true;
        lcRaise(id, note).then(function () { toast('Sent back — the lister sees it on the listing and here.'); lcLoad(); })['catch'](function (e) { el.disabled = false; toast('Not sent: ' + ((e && e.message) || 'request failed')); });
        return;
      }
      if (act === 'fixed') {
        el.disabled = true;
        api('listingCorrectionResolve', { task_id: id, how: 'marked fixed' }).then(function () { toast('Marked fixed.'); lcLoad(); })['catch'](function (e) { el.disabled = false; toast('Not marked: ' + ((e && e.message) || 'request failed')); });
      }
    };
  }

  /* raising a correction: the note goes to the engine; when the draft sits with go-live the sheet's
     own goLiveReturn runs too, because only it can move the task back to the lister */
  function lcRaise(id, note) {
    return api('listingCorrectionRaise', { task_id: id, note: note }).then(function (res) {
      if (res && res.with_golive) { return api('goLiveReturn', { task_id: id, note: note })['catch'](function () {}); }
    });
  }
  window.M98M_listingCorrectionRaise = lcRaise;

  function lcLoad() {
    var seq = ++LC.seq;
    return lcFetch().then(function (d) {
      if (seq !== LC.seq) { return; }
      LC.data = d || { open: [], fixed: [], counts: {}, listers: [] };
      try { if (STATE.user && STATE.user.role === 'Item Lister') { STATE.counts.listingCorrections = (d && d.counts && d.counts.open) || 0; if (typeof refreshBadges === 'function') { refreshBadges(); } } } catch (e) {}
      lcPaint();
      var fr = $('lcFresh'); if (fr) { fr.textContent = (LC.data.counts && LC.data.counts.open || 0) + ' waiting'; }
    })['catch'](function (e) {
      var box = $('lcBody'); if (box && !LC.data) { box.innerHTML = '<div class="lc-empty">Could not load.<span>' + esc((e && e.message) || '') + '</span></div>'; }
    });
  }

  VIEWS.listingCorrections = {
    label: 'Listing corrections',
    order: 12.4,
    roles: LC_ROLES,
    icon: '<path d="M4 20h4l10-10-4-4L4 16v4z"/><path d="M13 7l4 4"/>',
    badge: function () { return (STATE.counts && STATE.counts.listingCorrections) || 0; },
    prefetch: function () {
      return lcFetch().then(function (d) {
        try { if (STATE.user && STATE.user.role === 'Item Lister') { STATE.counts.listingCorrections = (d && d.counts && d.counts.open) || 0; if (typeof refreshBadges === 'function') { refreshBadges(); } } } catch (e) {}
        return d;
      });
    },
    render: function () {
      var mgmt = lcMgmt();
      return '<div class="hgroup enter d1"><h1>Listing <span class="goldtext">corrections</span></h1>' +
          '<span class="sub">' + (mgmt ? 'every lister’s listings sent back for correction, until the corrected draft comes back' : 'listings sent back to you — what to fix, and one click to hand the corrected draft back') + '</span>' +
          '<span style="margin-left:auto;display:flex;gap:6px;align-items:center"><span class="hint" id="lcFresh"></span><button class="minibtn" id="lcRefresh">Refresh</button></span></div>' +
        '<div class="card enter d2"><div class="bd" id="lcBody"><div class="spinner"></div></div></div>';
    },
    init: function () {
      LC.lister = '';
      var r = $('lcRefresh'); if (r) { r.onclick = function () { lcLoad(); }; }
      lcLoad();
    }
  };
})();
