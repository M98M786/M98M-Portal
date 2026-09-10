/* view-rev72.js — the 72-HOURS REVISION desk (owner, 10 Sept: "after exact 72 hours the portal
 * will show there all the listings"). The Advertising Manager decides each arrival:
 * No revision / Revision (typed TITLE + DESCRIPTION keywords with live counts, a comment,
 * Tier 1 = 2-day lister task, Tier 2 = parkable). Parked items wait here for his call;
 * called items can be sent on to VIDEO revision. Data: ladderQueue/ladderDecide/ladderCall/
 * ladderVideo/ladderResearch (engine). */
(function () {
  var LR_ROLES = ['Management', 'Ops Head', 'Advertising Manager', 'Team Lead', 'Listing Manager'];

  VIEW_CSS.push(
    '.lr-row{border:1px solid var(--gold-line);border-radius:12px;background:var(--panel-2);padding:12px 14px;margin-bottom:10px}' +
    '.lr-top{display:grid;grid-template-columns:52px 1fr auto;gap:12px;align-items:center}' +
    '.lr-thumb{width:52px;height:52px;border-radius:9px;overflow:hidden;background:var(--panel);border:1px solid var(--gold-line);display:grid;place-items:center;font-size:20px}' +
    '.lr-thumb img{width:100%;height:100%;object-fit:cover}' +
    '.lr-title{font-weight:700;font-size:13px;line-height:1.3}.lr-title a{color:inherit}' +
    '.lr-meta{font-size:10.5px;color:var(--text-3);font-weight:600;margin-top:4px;display:flex;gap:10px;flex-wrap:wrap}' +
    '.lr-btns{display:flex;gap:8px;flex-wrap:wrap;justify-content:flex-end}' +
    '.lr-form{margin-top:11px;border-top:1px dashed var(--gold-line);padding-top:11px;display:grid;gap:9px}' +
    '.lr-kw{display:grid;grid-template-columns:1fr 1fr;gap:10px}@media(max-width:760px){.lr-kw{grid-template-columns:1fr}}' +
    '.lr-kw label{font-size:10px;font-weight:800;text-transform:uppercase;letter-spacing:.06em;color:var(--text-3);display:block;margin-bottom:4px}' +
    '.lr-kw textarea{width:100%;min-height:92px;padding:9px 11px;border-radius:10px;border:1px solid var(--gold-line-hi);background:var(--panel);color:var(--text);font:inherit;font-weight:600;font-size:12.5px;resize:vertical}' +
    '.lr-count{font-size:10.5px;color:var(--gold-a);font-weight:800;margin-top:3px}' +
    '.lr-note{width:100%;padding:9px 11px;border-radius:10px;border:1px solid var(--gold-line);background:var(--panel);color:var(--text);font:inherit;font-weight:600;font-size:12.5px}' +
    '.lr-tier{display:flex;gap:14px;align-items:center;font-size:12px;font-weight:700}' +
    '.lr-sec{margin:20px 0 10px;font-size:11px;font-weight:800;letter-spacing:.06em;text-transform:uppercase;color:var(--text-3)}' +
    '.lr-res{margin-top:10px;border:1px solid var(--gold-line);border-radius:10px;background:var(--panel);padding:10px 12px;font-size:12px}' +
    '.lr-res table{width:100%;border-collapse:collapse;font-size:11.5px}.lr-res td{padding:4px 8px;border-top:1px solid var(--gold-line);vertical-align:top;white-space:pre-wrap;word-break:break-word}' +
    '.lr-res .k{color:var(--text-3);font-weight:700;width:38%}' +
    '.lr-badge{font-size:10px;font-weight:800;padding:2px 8px;border-radius:99px;border:1px solid var(--gold-line);background:var(--panel);color:var(--text-2);white-space:nowrap}'
  );

  function lrKwCount(s) {
    return String(s || '').split(/[\n,]/).map(function (x) { return x.trim(); }).filter(String).length;
  }
  function lrAge(go) {
    var ms = Date.now() - new Date(String(go || '').replace(' ', 'T') + 'Z').getTime();
    if (isNaN(ms)) { return ''; }
    var h = Math.floor(ms / 3600000);
    return h < 48 ? h + 'h live' : Math.floor(h / 24) + 'd live';
  }
  function lrThumb(r) {
    var u = safeUrl(r.image);
    return '<span class="lr-thumb">' + (u ? '<img src="' + u.replace(/"/g, '&quot;') + '" alt="">' : '📦') + '</span>';
  }
  function lrHead(r, extraBadges) {
    return '<div class="lr-top">' + lrThumb(r) +
      '<div><div class="lr-title"><a href="https://www.ebay.co.uk/itm/' + esc(r.item_id) + '" target="_blank" rel="noopener noreferrer">' + esc(r.title || r.item_id) + '</a></div>' +
      '<div class="lr-meta"><span class="mono">' + esc(r.item_id) + '</span><span>' + esc(r.account || '') + '</span>' +
      (r.lister_email ? '<span>listed by ' + esc(r.lister_email) + '</span>' : '') +
      '<span>' + esc(lrAge(r.go_live_at)) + '</span>' +
      '<span class="lr-badge">research ×' + esc(String(r.research_n || 0)) + '</span>' + (extraBadges || '') + '</div></div>';
  }
  /* read-only research + keyword history, fetched on demand */
  function lrResearchToggle(host, itemId) {
    var box = host.querySelector('[data-res="' + itemId + '"]');
    if (!box) { return; }
    if (!box.classList.contains('hidden')) { box.classList.add('hidden'); return; }
    box.classList.remove('hidden');
    if (box.dataset.loaded) { return; }
    box.innerHTML = '<div class="spinner"></div>';
    engineCall('ladderResearch', { item_id: itemId }, 15000).then(function (d) {
      box.dataset.loaded = '1';
      var h = '';
      (d.decisions || []).forEach(function (x) {
        h += '<div style="margin-bottom:8px"><b>' + esc(x.stage) + ' · ' + esc(x.decision) + (x.tier ? ' · Tier ' + esc(x.tier.replace('T', '')) : '') + '</b> — ' + esc(x.decided_by) + ' · ' + esc(x.decided_at) +
          (x.title_keywords ? '<div><span class="k">Title keywords:</span> ' + esc(x.title_keywords) + '</div>' : '') +
          (x.desc_keywords ? '<div><span class="k">Description keywords:</span> ' + esc(x.desc_keywords) + '</div>' : '') +
          (x.comment ? '<div><span class="k">Comment:</span> ' + esc(x.comment) + '</div>' : '') + '</div>';
      });
      (d.research || []).forEach(function (v) {
        var obj = {}; try { obj = JSON.parse(v.data_json || '{}'); } catch (e) {}
        h += '<div style="margin:8px 0 4px"><b>' + esc(v.kind) + ' research</b> — ' + esc(v.submitted_by) + ' · ' + esc(v.submitted_at) +
          (v.changes_note ? ' · <i>' + esc(v.changes_note) + '</i>' : '') + '</div><table>';
        Object.keys(obj).forEach(function (k) { if (String(obj[k]).trim()) { h += '<tr><td class="k">' + esc(k) + '</td><td>' + esc(obj[k]) + '</td></tr>'; } });
        h += '</table>';
      });
      box.innerHTML = h || '<span style="color:var(--text-3)">No research submitted yet.</span>';
    }).catch(function (e) { box.innerHTML = esc(e.message); });
  }
  function lrDecisionForm(r, stage) {
    return '<div class="lr-form hidden" data-form="' + esc(r.item_id) + '">' +
      '<div class="lr-kw"><div><label>Title keywords (required)</label><textarea data-tkw="' + esc(r.item_id) + '" placeholder="one per line or comma-separated"></textarea><div class="lr-count" data-tkc="' + esc(r.item_id) + '">0 keywords</div></div>' +
      '<div><label>Description keywords</label><textarea data-dkw="' + esc(r.item_id) + '"></textarea><div class="lr-count" data-dkc="' + esc(r.item_id) + '">0 keywords</div></div></div>' +
      '<input class="lr-note" data-cmt="' + esc(r.item_id) + '" placeholder="Comment for the lister — what to aim for">' +
      '<div class="lr-tier"><label><input type="radio" name="tier-' + esc(r.item_id) + '" value="T1" checked> Tier 1 — lister has 2 days</label>' +
      '<label><input type="radio" name="tier-' + esc(r.item_id) + '" value="T2"> Tier 2 — parkable, your call</label>' +
      '<button class="btn-gold" style="margin-left:auto" data-lact="submitRev" data-id="' + esc(r.item_id) + '" data-stage="' + esc(stage) + '">Submit revision</button></div></div>';
  }
  window.LADDER_UI = { lrKwCount: lrKwCount, lrHead: lrHead, lrDecisionForm: lrDecisionForm, lrResearchToggle: lrResearchToggle, lrThumb: lrThumb, lrAge: lrAge };

  function wire(host, reload) {
    host.onclick = function (ev) {
      var b = ev.target && ev.target.closest ? ev.target.closest('[data-lact]') : null;
      if (!b) { return; }
      var act = b.getAttribute('data-lact'), id = b.getAttribute('data-id');
      if (act === 'research') { lrResearchToggle(host, id); return; }
      if (act === 'openRev') { var f = host.querySelector('[data-form="' + id + '"]'); if (f) { f.classList.toggle('hidden'); } return; }
      if (act === 'noRev') {
        b.disabled = true;
        engineCall('ladderDecide', { item_id: id, stage: b.getAttribute('data-stage'), decision: 'NO_REVISION' }, 20000)
          .then(function () { toast('Marked: no revision required.'); reload(); })
          .catch(function (e) { b.disabled = false; toast(e.message); });
        return;
      }
      if (act === 'submitRev') {
        var tkw = host.querySelector('[data-tkw="' + id + '"]'), dkw = host.querySelector('[data-dkw="' + id + '"]');
        var cmt = host.querySelector('[data-cmt="' + id + '"]');
        var tierEl = host.querySelector('input[name="tier-' + id + '"]:checked');
        if (!tkw || !tkw.value.trim()) { toast('Title keywords are mandatory for a revision.'); if (tkw) { tkw.focus(); } return; }
        b.disabled = true;
        engineCall('ladderDecide', { item_id: id, stage: b.getAttribute('data-stage'), decision: 'REVISION',
          tier: tierEl ? tierEl.value : 'T1', title_keywords: tkw.value, desc_keywords: dkw ? dkw.value : '',
          comment: cmt ? cmt.value : '' }, 25000)
          .then(function (r) { toast('Revision sent — ' + (r.task || 'task raised') + '.'); reload(); })
          .catch(function (e) { b.disabled = false; toast(e.message); });
        return;
      }
      if (act === 'call') {
        b.disabled = true;
        engineCall('ladderCall', { item_id: id }, 25000)
          .then(function () { toast('Revision called in — the lister has it.'); reload(); })
          .catch(function (e) { b.disabled = false; toast(e.message); });
        return;
      }
      if (act === 'video') {
        b.disabled = true;
        engineCall('ladderVideo', { item_id: id, op: 'send' }, 25000)
          .then(function () { toast('Sent to video revision.'); reload(); })
          .catch(function (e) { b.disabled = false; toast(e.message); });
        return;
      }
    };
    host.oninput = function (ev) {
      var t = ev.target;
      if (t && t.hasAttribute && t.hasAttribute('data-tkw')) { var c = host.querySelector('[data-tkc="' + t.getAttribute('data-tkw') + '"]'); if (c) { c.textContent = lrKwCount(t.value) + ' keywords'; } }
      if (t && t.hasAttribute && t.hasAttribute('data-dkw')) { var c2 = host.querySelector('[data-dkc="' + t.getAttribute('data-dkw') + '"]'); if (c2) { c2.textContent = lrKwCount(t.value) + ' keywords'; } }
    };
  }

  function load() {
    var box = $('r72Body');
    if (!box) { return; }
    engineCall('ladderQueue', { page: 'r72' }, 25000).then(function (d) {
      var can = d.canDecide, h = '';
      var q = d.queue || [];
      h += '<div class="lr-sec">Waiting for your decision · ' + q.length + '</div>';
      if (!q.length) { h += '<div style="color:var(--text-3);font-weight:600;font-size:12.5px">Nothing at the 72-hour mark right now.</div>'; }
      q.forEach(function (r) {
        h += '<div class="lr-row">' + lrHead(r) +
          '<div class="lr-btns">' +
          '<button class="minibtn" data-lact="research" data-id="' + esc(r.item_id) + '">Research</button>' +
          (can ? '<button class="minibtn" data-lact="noRev" data-stage="R72" data-id="' + esc(r.item_id) + '">No revision required</button>' +
                 '<button class="btn-gold" data-lact="openRev" data-id="' + esc(r.item_id) + '">Revision required…</button>' : '') +
          '</div></div>' +
          '<div class="lr-res hidden" data-res="' + esc(r.item_id) + '"></div>' +
          (can ? lrDecisionForm(r, 'R72') : '') + '</div>';
      });
      var p = d.parked || [];
      h += '<div class="lr-sec">Waiting for the Advertising Manager’s call · ' + p.length + '</div>';
      p.forEach(function (r) {
        h += '<div class="lr-row">' + lrHead(r) + '<div class="lr-btns">' +
          '<button class="minibtn" data-lact="research" data-id="' + esc(r.item_id) + '">Research</button>' +
          (can ? '<button class="btn-gold" data-lact="call" data-id="' + esc(r.item_id) + '">Call the revision in</button>' : '') +
          '</div></div><div class="lr-res hidden" data-res="' + esc(r.item_id) + '"></div></div>';
      });
      var v = d.readyForVideo || [];
      h += '<div class="lr-sec">Tier 2 — called in · decide the video step · ' + v.length + '</div>';
      v.forEach(function (r) {
        h += '<div class="lr-row">' + lrHead(r) + '<div class="lr-btns">' +
          '<button class="minibtn" data-lact="research" data-id="' + esc(r.item_id) + '">Research</button>' +
          (can ? '<button class="btn-gold" data-lact="video" data-id="' + esc(r.item_id) + '">Send to video revision</button>' : '') +
          '</div></div><div class="lr-res hidden" data-res="' + esc(r.item_id) + '"></div></div>';
      });
      var rec = d.recent || [];
      if (rec.length) {
        h += '<div class="lr-sec">Recently decided</div>';
        rec.forEach(function (x) {
          h += '<div class="lr-meta" style="margin-bottom:6px"><span class="mono">' + esc(x.item_id) + '</span><span>' + esc((x.title || '').slice(0, 50)) + '</span>' +
            '<span><b>' + esc(x.decision) + (x.tier ? ' · Tier ' + esc(x.tier.replace('T', '')) : '') + '</b></span><span>' + esc(x.decided_by) + '</span><span>' + esc(x.decided_at) + '</span></div>';
        });
      }
      box.innerHTML = h;
      wire(box, load);
    }).catch(function (e) { box.innerHTML = '<div style="color:var(--text-2);font-weight:700">' + esc(e.message) + '</div>'; });
  }

  VIEWS.rev72 = {
    label: '72-hours revision',
    order: 17.65,
    roles: LR_ROLES,
    icon: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 3"/>',
    render: function () {
      return '<div class="hgroup enter d1"><h1>72-hours <span class="goldtext">revision</span></h1>' +
        '<span class="sub">every listing lands here exactly 72 hours after go-live — decide, add keywords, pick the tier · the dummy becomes the real listing here</span>' +
        '<button class="minibtn" id="r72Refresh" style="margin-left:auto">Refresh</button></div>' +
        '<div id="r72Body" class="enter d2"><div class="spinner"></div></div>';
    },
    init: function () { $('r72Refresh').onclick = load; load(); },
  };
})();
