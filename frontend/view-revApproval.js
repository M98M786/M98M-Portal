/* view-revApproval.js — REVISION APPROVAL, the Listings department's approval gate (9 Oct, owner:
 * "when an item lister revises a listing with changes, it is sent to management for approval, and
 * when management approves it, create the campaign task for the Advertising Manager").
 * Every submitted listing_revision across the team, oldest first, each showing WHAT the lister
 * says they changed. Approve completes the revision AND the server raises (or rings) the
 * campaign_set task for the Advertising Manager by itself — that rule lives in approveTask, not
 * here, so it holds from every desk. Return sends it back to the lister with a note.
 * Data: allTasksEngine (fast mirror). Writes: approveTask · returnTask (sheet, §8.0b).
 * This file is served from a public URL (RL-2/RL-9): no staff name or email lives in it. */
(function () {
  'use strict';

  var RA_ROLES = ['Management', 'Ops Head'];
  var RA_SUBMITTED = 'Submitted — awaiting approval';   // §8.0b, verbatim — the em-dash matters
  var RA = { rows: [], done: [], seq: 0 };

  VIEW_CSS.push(
    '.ra-card{border:1px solid var(--gold-line);border-radius:14px;background:var(--panel-2);padding:14px 16px;margin-top:12px;position:relative;overflow:hidden}' +
    '.ra-card::before{content:"";position:absolute;left:0;top:0;bottom:0;width:4px;background:var(--gold-a)}' +
    '.ra-t{font-weight:800;font-size:14px}' +
    '.ra-m{font-size:11.5px;color:var(--text-3);font-weight:700;margin-top:4px}' +
    '.ra-kind{font-size:9.5px;font-weight:800;text-transform:uppercase;letter-spacing:.05em;padding:2px 8px;border-radius:7px;border:1px solid var(--gold-line);color:var(--text-3);white-space:nowrap;margin-left:8px}' +
    '.ra-chg{background:rgba(233,169,60,.09);border:1px solid var(--gold-line);border-radius:10px;padding:10px 12px;margin-top:10px}' +
    '.ra-chg .k{font-size:10px;font-weight:800;text-transform:uppercase;letter-spacing:.06em;color:var(--gold-a);display:block;margin-bottom:3px}' +
    '.ra-chg .txt{font-size:13px;color:var(--text);line-height:1.45;white-space:pre-wrap}' +
    '.ra-inst{margin-top:8px}' +
    '.ra-inst summary{cursor:pointer;font-size:11.5px;font-weight:800;color:var(--text-3)}' +
    '.ra-inst pre{font:inherit;font-size:12px;color:var(--text-2);white-space:pre-wrap;margin:6px 0 0}' +
    '.ra-act{display:flex;gap:8px;flex-wrap:wrap;align-items:center;margin-top:12px}' +
    '.ra-act input{flex:1;min-width:220px;padding:9px 12px;border-radius:9px;border:1px solid var(--gold-line-hi);background:var(--panel);color:var(--text);font:inherit;font-weight:600}' +
    '.ra-tiles{display:grid;gap:12px;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));margin-bottom:14px}' +
    '.ra-tile{border:1px solid var(--gold-line);border-radius:12px;padding:13px 15px;background:var(--panel-2)}' +
    '.ra-tile .k{font-size:10px;text-transform:uppercase;letter-spacing:.08em;color:var(--text-3);font-weight:800}' +
    '.ra-tile b{display:block;font-size:22px;font-weight:800;margin-top:5px;font-variant-numeric:tabular-nums}' +
    '.ra-tile.gold b{color:var(--gold-a)}.ra-tile.bad b{color:var(--bad)}' +
    '.ra-empty{text-align:center;padding:40px 16px;color:var(--text-2)}' +
    '.ra-empty b{display:block;font-size:15px;color:var(--text)}' +
    '.ra-empty span{font-size:12.5px;color:var(--text-3)}'
  );

  function raS(v) { return String(v == null ? '' : v).replace(/^\s+|\s+$/g, ''); }
  function raWho(e) { return esc(raS(e).split('@')[0]); }
  function raKind(t) {
    var head = raS(t.title).split('—')[0].trim();
    return head && head.length <= 24 ? head : 'Revision';
  }
  function raAgeMin(t) {
    var ms = Date.parse(String(t.updated_at || '').replace(' ', 'T'));
    return isFinite(ms) ? Math.max(0, Math.round((Date.now() - ms) / 60000)) : null;
  }
  function raAgeWord(t) {
    var m = raAgeMin(t);
    if (m === null) { return ''; }
    if (m < 60) { return m + ' min ago'; }
    if (m < 48 * 60) { return Math.round(m / 60) + ' h ago'; }
    return Math.round(m / 1440) + ' days ago';
  }

  VIEWS.revApproval = {
    label: 'Revision approval',
    icon: '<path d="M4 4v6h6"/><path d="M20 9a8 8 0 0 0-14-3L4 8"/><path d="m8 14 3 3 5-6"/>',
    roles: RA_ROLES,
    order: 17.67,
    badge: function () { return (STATE.counts && STATE.counts.revApproval) || 0; },
    render: function () {
      return '<div class="hgroup enter d1"><h1>Revision <span class="goldtext">approval</span></h1>' +
          '<span class="sub">every revised listing a lister has submitted — what they changed, approve or send back · approving raises the campaign task for the Advertising Manager by itself</span>' +
          '<button class="minibtn" id="raRefresh" style="margin-left:auto">Refresh</button></div>' +
        '<div id="raTiles" class="enter d1"></div>' +
        '<div class="card enter d2"><div class="hd">Awaiting your decision ' +
          '<span class="hint">oldest first — every hour here is an hour the listing waits</span></div>' +
          '<div class="bd" id="raBody"><div class="spinner"></div></div></div>' +
        '<div class="card enter d3" style="margin-top:14px"><div class="hd">Recently decided ' +
          '<span class="hint">the archive — newest first</span></div>' +
          '<div class="bd" id="raDone"><div class="spinner"></div></div></div>';
    },
    init: function () {
      $('raRefresh').onclick = raLoad;
      raLoad();
    }
  };

  function raLoad() {
    var seq = ++RA.seq;
    var open = engineCall('allTasksEngine', { scope: 'open' }, 30000).then(function (d) {
      return ((d && d.tasks) || []).filter(function (t) {
        return raS(t.type) === 'listing_revision' && raS(t.status) === RA_SUBMITTED;
      });
    });
    /* the archive is a courtesy — its failure never blanks the queue */
    var done = engineCall('allTasksEngine', { scope: 'archive', everyone: true }, 30000).then(function (d) {
      return ((d && d.tasks) || []).filter(function (t) { return raS(t.type) === 'listing_revision'; }).slice(0, 30);
    }).catch(function () { return []; });
    Promise.all([open, done]).then(function (both) {
      if (seq !== RA.seq) { return; }
      RA.rows = both[0];
      RA.rows.sort(function (a, b) {
        return String(a.updated_at || '').localeCompare(String(b.updated_at || ''));
      });
      RA.done = both[1];
      try { STATE.counts.revApproval = RA.rows.length; if (typeof refreshBadges === 'function') { refreshBadges(); } } catch (e) {}
      raPaint();
    }).catch(function (e) {
      if (seq !== RA.seq) { return; }
      setHTML('raBody', '<div class="ra-empty"><b>Could not load.</b><span>' + esc((e && e.message) || 'try again') + '</span></div>');
      setHTML('raDone', '');
    });
  }

  function raCard(t) {
    var id = raS(t.task_id);
    var age = raAgeMin(t);
    return '<div class="ra-card" data-ra="' + esc(id) + '">' +
      '<div class="ra-t">' + esc(raS(t.title) || id) + '<span class="ra-kind">' + esc(raKind(t)) + '</span>' +
        (age !== null && age > 24 * 60 ? '<span class="ra-kind" style="color:var(--bad);border-color:rgba(240,96,90,.5)">waiting ' + esc(raAgeWord(t)) + '</span>' : '') + '</div>' +
      '<div class="ra-m">' +
        (raS(t.item_id) ? '<a href="https://www.ebay.co.uk/itm/' + esc(raS(t.item_id)) + '" target="_blank" rel="noopener noreferrer" class="mono" style="color:inherit">' + esc(raS(t.item_id)) + '</a> · ' : '') +
        esc(raS(t.account)) + ' · revised by <b>' + raWho(t.assigned_to) + '</b> · submitted ' + esc(fmtPkt(t.updated_at, true) || raAgeWord(t)) + '</div>' +
      '<div class="ra-chg"><span class="k">What the lister changed</span>' +
        '<div class="txt">' + esc(raS(t.submission_note) || '(no note came with the submission)') + '</div></div>' +
      (raS(t.details) ? '<details class="ra-inst"><summary>The instruction they were given</summary><pre>' + esc(raS(t.details).slice(0, 1200)) + '</pre></details>' : '') +
      '<div class="ra-act">' +
        '<button class="btn-gold" data-ra-ok="' + esc(id) + '">Approve — raise the campaign task</button>' +
        '<input data-ra-note="' + esc(id) + '" placeholder="note (required to send back)">' +
        '<button class="minibtn" data-ra-back="' + esc(id) + '">Send back to the lister</button>' +
      '</div></div>';
  }

  function raPaint() {
    var over24 = RA.rows.filter(function (t) { var m = raAgeMin(t); return m !== null && m > 24 * 60; }).length;
    var today = (new Date()).toISOString().slice(0, 10);
    var decidedToday = RA.done.filter(function (t) { return String(t.decided_at || '').slice(0, 10) === today; }).length;
    setHTML('raTiles', '<div class="ra-tiles">' +
      '<div class="ra-tile gold"><span class="k">Awaiting approval</span><b>' + RA.rows.length + '</b></div>' +
      '<div class="ra-tile' + (over24 ? ' bad' : '') + '"><span class="k">Waiting over a day</span><b>' + over24 + '</b></div>' +
      '<div class="ra-tile"><span class="k">Decided today</span><b>' + decidedToday + '</b></div></div>');

    var box = $('raBody');
    if (!box) { return; }
    if (!RA.rows.length) {
      box.innerHTML = '<div class="ra-empty"><b>Nothing is waiting.</b><span>When a lister submits a revised listing, it lands here for the decision.</span></div>';
    } else {
      box.innerHTML = RA.rows.map(raCard).join('');
      raWire(box);
    }

    var dn = $('raDone');
    if (!dn) { return; }
    if (!RA.done.length) {
      dn.innerHTML = '<div class="ra-m" style="margin-top:0">No decided revisions in the archive yet.</div>';
      return;
    }
    dn.innerHTML = '<div class="scroll"><table class="ir-tbl" style="min-width:760px"><thead><tr>' +
      '<th style="text-align:left">Listing</th><th style="text-align:left">Account</th><th style="text-align:left">Lister</th>' +
      '<th style="text-align:left">What changed</th><th style="text-align:left">Decided</th></tr></thead><tbody>' +
      RA.done.map(function (t) {
        return '<tr><td style="text-align:left;max-width:260px"><div style="overflow:hidden;text-overflow:ellipsis;white-space:nowrap" title="' + esc(raS(t.title)) + '">' + esc(raS(t.title)) + '</div></td>' +
          '<td style="text-align:left">' + esc(raS(t.account)) + '</td>' +
          '<td style="text-align:left">' + raWho(t.assigned_to) + '</td>' +
          '<td style="text-align:left;max-width:280px;font-size:12px" title="' + esc(raS(t.submission_note)) + '">' + esc(raS(t.submission_note).slice(0, 80) || '—') + '</td>' +
          '<td style="text-align:left;white-space:nowrap;font-size:11.5px;color:var(--text-3)">' + esc(fmtPkt(t.decided_at, true) || raS(t.decided_at).slice(0, 16)) + '</td></tr>';
      }).join('') + '</tbody></table></div>';
  }

  function raWire(box) {
    box.querySelectorAll('[data-ra-ok]').forEach(function (b) {
      b.onclick = function () {
        var id = this.getAttribute('data-ra-ok');
        var card = this.closest('[data-ra]');
        card.querySelectorAll('button').forEach(function (x) { x.disabled = true; });
        var btn = this; btn.textContent = 'Approving…';
        api('approveTask', { task_id: id }).then(function (r) {
          var c = r && r.campaign;
          toast(c && c.to ? (c.existing ? 'Approved · the open campaign task for this item was rung (' + raS(c.to).split('@')[0] + ').'
                                        : 'Approved · campaign task sent to ' + raS(c.to).split('@')[0] + '.')
            : 'Approved.' + (c && c.note ? ' (' + c.note + ')' : ''));
          raLoad();
        }).catch(function (e) {
          card.querySelectorAll('button').forEach(function (x) { x.disabled = false; });
          btn.textContent = 'Approve — raise the campaign task';
          toast(e.message);
        });
      };
    });
    box.querySelectorAll('[data-ra-back]').forEach(function (b) {
      b.onclick = function () {
        var id = this.getAttribute('data-ra-back');
        var card = this.closest('[data-ra]');
        var inp = card.querySelector('[data-ra-note]');
        var note = inp ? raS(inp.value) : '';
        if (note.length < 3) { toast('Write what the lister must fix — the note goes back with it.'); if (inp) { inp.focus(); } return; }
        card.querySelectorAll('button').forEach(function (x) { x.disabled = true; });
        api('returnTask', { task_id: id, comment: note }).then(function () {
          toast('Sent back to the lister.');
          raLoad();
        }).catch(function (e) {
          card.querySelectorAll('button').forEach(function (x) { x.disabled = false; });
          toast(e.message);
        });
      };
    });
  }

})();
