/* view-truthKeywords.js — TRUTH v2 WO-09: the 72-hour keyword-doc queue on the Keyword
 * approvals page. Wraps the existing view (this file sorts after view-cpc.js): the CPC
 * submission machinery stays; a "Keyword docs due" section and the archive land on top.
 * Backend: keywordBoard / keywordDecide (engine, D1 keyword_tasks + keyword_docs). */
(function () {
  'use strict';

  VIEW_CSS.push(
    '.kw-row{border:1px solid var(--gold-line);border-radius:12px;padding:12px 14px;background:var(--panel-2);margin-bottom:10px}' +
    '.kw-row .h{display:flex;gap:10px;align-items:baseline;flex-wrap:wrap}' +
    '.kw-row .t{font-size:13px;font-weight:800;flex:1;min-width:200px}' +
    '.kw-cd{font-size:11px;font-weight:800;padding:3px 10px;border-radius:99px;background:var(--panel);border:1px solid var(--gold-line)}' +
    '.kw-cd.over{color:var(--bad);border-color:var(--bad)}' +
    '.kw-cd.sched{color:var(--text-3)}' +
    '.kw-form{display:flex;gap:8px;margin-top:9px;flex-wrap:wrap;align-items:center}' +
    '.kw-form input{flex:1;min-width:240px;padding:8px 11px;border-radius:9px;border:1px solid var(--gold-line-hi);background:var(--panel);color:var(--text);font:inherit;font-size:12px;font-weight:600}' +
    '.kw-arc{display:flex;gap:10px;align-items:baseline;padding:7px 0;border-bottom:1px solid var(--gold-line);font-size:12px}' +
    '.kw-out{font-size:9.5px;font-weight:800;text-transform:uppercase;letter-spacing:.06em;padding:2px 8px;border-radius:8px;background:var(--blue-soft);color:var(--blue-2)}'
  );

  function kwS(v) { return String(v == null ? '' : v); }

  function kwCountdown(row, now) {
    var due = Date.parse(kwS(row.due_at).replace(' ', 'T') + 'Z');
    var opens = Date.parse(kwS(row.opens_at).replace(' ', 'T') + 'Z');
    var nowMs = Date.parse(now) || Date.now();
    if (!row.is_open) {
      var hO = Math.max(0, Math.round((opens - nowMs) / 3600000));
      return '<span class="kw-cd sched">opens in ' + hO + 'h (Scheduled)</span>';
    }
    if (isNaN(due)) { return ''; }
    var mins = Math.round((due - nowMs) / 60000);
    if (mins < 0) { return '<span class="kw-cd over">overdue ' + Math.abs(Math.round(mins / 60)) + 'h</span>'; }
    return '<span class="kw-cd">' + (mins >= 120 ? Math.round(mins / 60) + 'h left' : mins + 'm left') + '</span>';
  }

  function kwPaint(d) {
    var box = $('kwDocs');
    if (!box) { return; }
    var isMgmt = ['Management', 'Ops Head', 'Team Lead'].indexOf((STATE.user && STATE.user.role) || '') >= 0;
    var rows = (d.open || []).concat(d.scheduled || []);
    var h = '';
    if (!rows.length) {
      h = '<div class="hu-hint" style="margin-top:0">No keyword-doc tasks due. A task appears here 72 hours after a listing goes live in a CPC campaign.</div>';
    }
    h += rows.map(function (r) {
      var revReq = kwS(r.kind) === 'KEYWORD_REVISION_REQUEST';
      var head = '<div class="h"><span class="t">' + esc(kwS(r.title)) + '</span>' + kwCountdown(r, d.now) + '</div>' +
        '<div style="font-size:11px;color:var(--text-3);font-weight:600;margin-top:3px">' + esc(kwS(r.account)) + ' · listing ' + esc(kwS(r.listing_id)) + ' · campaign ' + esc(kwS(r.campaign_name) || kwS(r.campaign_id)) + (Number(r.follow_ups) ? ' · follow-up #' + r.follow_ups : '') + (revReq ? ' · <a href="' + esc(kwS(r.doc_link)) + '" target="_blank" rel="noopener">keywords doc</a>' : '') + '</div>';
      if (!r.is_open) { return '<div class="kw-row" style="opacity:.75">' + head + '</div>'; }
      if (revReq) {
        return '<div class="kw-row" style="border-color:rgba(255,159,67,.5)">' + head +
          '<div class="kw-form"><button class="minibtn" data-kw-rev="' + r.id + '" data-kw-link="' + esc(kwS(r.doc_link)) + '">Revision done — archive</button>' +
          '<span style="font-size:11px;color:var(--text-3);font-weight:600">requested by ' + esc(kwS(r.decided_by) || 'Zain') + '</span></div></div>';
      }
      return '<div class="kw-row">' + head +
        '<div class="kw-form">' +
        '<input data-kw-link-in="' + r.id + '" placeholder="Google Docs / Drive / Sheets link to the keywords document (required)">' +
        '</div><div class="kw-form">' +
        '<button class="minibtn" data-kw-do="REVISE_NOW" data-kw-id="' + r.id + '">Select for revision now</button>' +
        '<button class="minibtn" data-kw-do="NO_REVISION" data-kw-id="' + r.id + '">No revision needed</button>' +
        '<button class="minibtn" data-kw-do="REVISE_LATER" data-kw-id="' + r.id + '">Needs revision after 72h</button>' +
        '<button class="minibtn" data-kw-do="ARCHIVE" data-kw-id="' + r.id + '">Archive only</button>' +
        '</div></div>';
    }).join('');

    if ((d.archive || []).length) {
      h += '<details style="margin-top:12px"><summary style="cursor:pointer;font-size:12px;font-weight:800;color:var(--text-2)">Archive — ' + d.archive.length + ' decided doc(s)</summary>' +
        '<input id="kwArcQ" placeholder="filter by listing, account, campaign…" style="width:100%;margin:10px 0;padding:8px 11px;border-radius:9px;border:1px solid var(--gold-line);background:var(--panel);color:var(--text);font:inherit;font-size:12px">' +
        '<div id="kwArcList">' +
        d.archive.map(function (a) {
          return '<div class="kw-arc" data-kw-arc="' + esc((kwS(a.listing_id) + ' ' + kwS(a.account) + ' ' + kwS(a.campaign_name) + ' ' + kwS(a.title)).toLowerCase()) + '">' +
            '<span class="kw-out">' + esc(kwS(a.outcome)) + '</span>' +
            '<span style="flex:1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">' + esc(kwS(a.title)) + '</span>' +
            '<a href="' + esc(kwS(a.doc_link)) + '" target="_blank" rel="noopener" style="font-size:11px">doc</a>' +
            '<span style="color:var(--text-3);font-size:10.5px">' + esc(kwS(a.decided_at).slice(0, 16).replace('T', ' ')) + '</span></div>';
        }).join('') + '</div></details>';
    }
    box.innerHTML = h;

    box.querySelectorAll('[data-kw-do]').forEach(function (b) {
      b.onclick = function () {
        var id = this.getAttribute('data-kw-id');
        var inp = box.querySelector('[data-kw-link-in="' + id + '"]');
        var link = inp ? kwS(inp.value).trim() : '';
        if (!link) { toast('The keywords doc link is required for every outcome.'); if (inp) { inp.focus(); } return; }
        var me = this; me.disabled = true;
        api('keywordDecide', { id: Number(id), doc_link: link, outcome: this.getAttribute('data-kw-do') })
          .then(function (r) {
            toast(r.follow_up_id ? 'Recorded — a follow-up task opens in 72 hours.' : 'Recorded.');
            kwLoad();
          }).catch(function (e) { me.disabled = false; toast(e.message); });
      };
    });
    box.querySelectorAll('[data-kw-rev]').forEach(function (b) {
      b.onclick = function () {
        var me = this; me.disabled = true;
        api('keywordDecide', { id: Number(this.getAttribute('data-kw-rev')), doc_link: this.getAttribute('data-kw-link'), outcome: 'ARCHIVE' })
          .then(function () { toast('Revision recorded and archived.'); kwLoad(); })
          .catch(function (e) { me.disabled = false; toast(e.message); });
      };
    });
    var q = $('kwArcQ');
    if (q) {
      q.oninput = function () {
        var v = kwS(this.value).toLowerCase();
        box.querySelectorAll('[data-kw-arc]').forEach(function (row) {
          row.style.display = !v || row.getAttribute('data-kw-arc').indexOf(v) >= 0 ? '' : 'none';
        });
      };
    }
  }

  function kwLoad() {
    var box = $('kwDocs');
    if (!box) { return; }
    api('keywordBoard', {}).then(kwPaint).catch(function (e) {
      box.innerHTML = '<div class="hu-hint" style="margin-top:0">Keyword docs could not load — ' + esc(e.message) + '</div>';
    });
  }

  var kaOld = VIEWS.keywordApprovals;
  if (kaOld) {
    var r0 = kaOld.render, i0 = kaOld.init;
    kaOld.render = function () {
      return r0.apply(this, arguments) +
        '<div class="card enter d2" style="margin-top:16px"><div class="hd">Keyword docs due ' +
        '<span class="hint">a task opens 72 h after a listing goes live in a CPC campaign · due 24 h later · every outcome is archived</span></div>' +
        '<div class="bd" id="kwDocs"><div class="spinner"></div></div></div>';
    };
    kaOld.init = function () {
      i0.apply(this, arguments);
      kwLoad();
    };
  }
})();
