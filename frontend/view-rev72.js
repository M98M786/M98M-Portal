/* view-rev72.js — THE 7-DAY REVISION BOARD (owner, 14 Oct: "make the 7-day revision page with
 * proper representation — the item lister will properly work there and he will have to add the
 * status there, and management can see the update and status of the revision; when the item
 * lister says it's done, revision done. Make this page self-explanatory.")
 *
 * One board, three people, one shared picture. Every listing that has reached 7 days since
 * go-live appears once, at the step it is actually on, and the page states what that step means:
 *
 *   1 Decide    the Advertising Manager reads the research and calls it: revise, or leave it
 *   2 Revising  the lister has the job — and posts a STATUS here as the work moves
 *   3 Checking  the lister has said it is done; Management approves or sends it back
 *   4 Done      approved — and that approval is what raises the campaign task
 *
 * Each person meets their own work first and the rest as context, so nobody has to be told where
 * to look. The decision half still runs on ladderQueue/ladderDecide (and still exports
 * window.LADDER_UI, which the 14-day page builds on); the lifecycle half reads revisionBoard and
 * writes through revisionStatus and submitTask. No money appears anywhere on this page, which is
 * why an Item Lister may read all of it. */
(function () {
  'use strict';

  var LR_ROLES = ['Management', 'Ops Head', 'Advertising Manager', 'Team Lead', 'Listing Manager', 'Item Lister'];
  var RV = { board: null, queue: null, seq: 0 };

  VIEW_CSS.push(
    /* ---- the decision half (markup shared with the 14-day page) ---- */
    '.lr-row{border:1px solid var(--gold-line);border-radius:12px;background:var(--panel-2);padding:12px 14px;margin-bottom:10px}' +
    '.lr-top{display:grid;grid-template-columns:52px 1fr auto;gap:12px;align-items:center}' +
    '.lr-thumb{width:52px;height:52px;border-radius:9px;overflow:hidden;background:var(--panel);border:1px solid var(--gold-line);display:grid;place-items:center;font-size:20px}' +
    '.lr-thumb img{width:100%;height:100%;object-fit:cover}' +
    '.lr-title{font-weight:700;font-size:13px;line-height:1.3}.lr-title a{color:inherit}' +
    '.lr-meta{font-size:10.5px;color:var(--text-3);font-weight:600;margin-top:4px;display:flex;gap:10px;flex-wrap:wrap}' +
    '.lr-btns{display:flex;gap:8px;flex-wrap:wrap;justify-content:flex-end}' +
    '.lr-form{margin-top:11px;border-top:1px dashed var(--gold-line);padding-top:11px;display:grid;gap:9px}' +
    '.lr-note{width:100%;padding:9px 11px;border-radius:10px;border:1px solid var(--gold-line);background:var(--panel);color:var(--text);font:inherit;font-weight:600;font-size:12.5px}' +
    '.lr-tier{display:flex;gap:14px;align-items:center;font-size:12px;font-weight:700;flex-wrap:wrap}' +
    '.lr-sec{margin:22px 0 10px;font-size:11px;font-weight:800;letter-spacing:.06em;text-transform:uppercase;color:var(--text-3)}' +
    '.lr-res{margin-top:10px;border:1px solid var(--gold-line);border-radius:10px;background:var(--panel);padding:10px 12px;font-size:12px}' +
    '.lr-res table{width:100%;border-collapse:collapse;font-size:11.5px}.lr-res td{padding:4px 8px;border-top:1px solid var(--gold-line);vertical-align:top;white-space:pre-wrap;word-break:break-word}' +
    '.lr-res .k{color:var(--text-3);font-weight:700;width:38%}' +
    '.lr-badge{font-size:10px;font-weight:800;padding:2px 8px;border-radius:99px;border:1px solid var(--gold-line);background:var(--panel);color:var(--text-2);white-space:nowrap}' +
    '.lr-kwset{display:flex;flex-wrap:wrap;gap:6px;margin:6px 0 2px}' +
    '.lr-kwchip{font-size:11px;font-weight:700;padding:3px 10px;border-radius:99px;border:1px solid var(--gold-line-hi);background:var(--panel);color:var(--text);line-height:1.5;white-space:normal}' +
    '.lr-kwlabel{font-size:10px;font-weight:800;text-transform:uppercase;letter-spacing:.06em;color:var(--gold-a);margin-top:8px}' +
    /* ---- the board ---- */
    '.rv-steps{display:grid;gap:10px;grid-template-columns:repeat(auto-fit,minmax(190px,1fr));margin-bottom:8px}' +
    '.rv-step{border:1px solid var(--gold-line);border-radius:13px;background:var(--panel-2);padding:12px 14px;position:relative;overflow:hidden}' +
    '.rv-step::before{content:"";position:absolute;left:0;top:0;bottom:0;width:4px;background:var(--tone,var(--gold-line))}' +
    '.rv-step .n{font-size:9.5px;font-weight:800;letter-spacing:.08em;color:var(--text-3)}' +
    '.rv-step .h{font-size:13px;font-weight:800;margin-top:3px}' +
    '.rv-step b{display:block;font-size:24px;font-weight:800;margin-top:4px;font-variant-numeric:tabular-nums;color:var(--tone,var(--text))}' +
    '.rv-step .w{font-size:11px;color:var(--text-3);font-weight:600;margin-top:3px;line-height:1.45}' +
    '.rv-card{border:1px solid var(--gold-line);border-radius:13px;background:var(--panel-2);padding:14px 16px;margin-bottom:11px;position:relative;overflow:hidden}' +
    '.rv-card::before{content:"";position:absolute;left:0;top:0;bottom:0;width:4px;background:var(--tone,var(--gold-line))}' +
    '.rv-head{display:grid;grid-template-columns:52px 1fr auto;gap:12px;align-items:start}' +
    '.rv-ttl{font-weight:800;font-size:13.5px;line-height:1.35}.rv-ttl a{color:inherit}' +
    '.rv-pill{font-size:9.5px;font-weight:800;text-transform:uppercase;letter-spacing:.05em;padding:2px 9px;border-radius:99px;border:1px solid var(--tone,var(--gold-line));color:var(--tone,var(--text-2));white-space:nowrap}' +
    '.rv-ask{background:rgba(233,169,60,.09);border:1px solid var(--gold-line);border-radius:10px;padding:10px 12px;margin-top:10px}' +
    '.rv-ask .k{font-size:10px;font-weight:800;text-transform:uppercase;letter-spacing:.06em;color:var(--gold-a);display:block;margin-bottom:3px}' +
    '.rv-ask .t{font-size:12.5px;color:var(--text);line-height:1.5;white-space:pre-wrap}' +
    '.rv-trail{margin-top:10px;border-left:2px solid var(--gold-line);padding-left:11px;display:grid;gap:7px}' +
    '.rv-u{font-size:12px;line-height:1.45}.rv-u b{color:var(--text)}.rv-u .w{color:var(--text-3);font-weight:600;font-size:10.5px;display:block}' +
    '.rv-do{margin-top:11px;border-top:1px dashed var(--gold-line);padding-top:11px;display:grid;gap:8px}' +
    '.rv-do .r{display:flex;gap:8px;flex-wrap:wrap;align-items:center}' +
    '.rv-in,.rv-sel{padding:9px 12px;border-radius:10px;border:1px solid var(--gold-line-hi);background:var(--panel);color:var(--text);font:inherit;font-weight:600;font-size:12.5px}' +
    '.rv-in{flex:1;min-width:190px}' +
    '.rv-hint{font-size:11px;color:var(--text-3);font-weight:600;line-height:1.5}' +
    '.rv-empty{padding:14px 2px;color:var(--text-3);font-weight:600;font-size:12.5px}' +
    '.rv-over{color:var(--bad);font-weight:800}'
  );

  function rvS(v) { return String(v == null ? '' : v).trim(); }
  function rvWho(e) { return esc(rvS(e).split('@')[0]); }
  function rvRole() { return (STATE.user && STATE.user.role) || ''; }

  /* The four steps in the words the whole page uses. Tone carries the meaning on its own:
     gold = somebody must act, blue = in hand, amber = waiting on Management, green = finished. */
  var RV_STEP = {
    decide:    { n: 'STEP 1', h: 'Decide', tone: 'var(--gold-a)', w: 'The Advertising Manager reads the research and calls it.' },
    parked:    { n: 'STEP 1', h: 'Parked', tone: '#9B6AE6', w: 'Tier 2 — waiting for the Advertising Manager to call it in.' },
    revising:  { n: 'STEP 2', h: 'Being revised', tone: '#8dc6f2', w: 'With the item lister. He posts his status here as it moves.' },
    submitted: { n: 'STEP 3', h: 'Checking', tone: 'var(--warn)', w: 'The lister says it is done. Management approves or sends it back.' },
    done:      { n: 'STEP 4', h: 'Revision done', tone: 'var(--ok)', w: 'Approved — and that approval raises the campaign task.' },
    none:      { n: '—', h: 'No revision needed', tone: 'var(--text-3)', w: 'Judged fine as it is.' }
  };

  /* ---------------- the decision half (shared with the 14-day page) ---------------- */
  function lrKwCount(s) { return String(s || '').split(/[\n,]/).map(function (x) { return x.trim(); }).filter(String).length; }
  function lrKwChips(s, label) {
    var parts = String(s || '').split(/[\n,]+/).map(function (x) { return x.trim().replace(/^["'“”]+|["'“”]+$/g, '').trim(); }).filter(String);
    if (!parts.length) { return ''; }
    return '<div class="lr-kwlabel">' + esc(label) + ' · ' + parts.length + '</div>' +
      '<div class="lr-kwset">' + parts.map(function (k) { return '<span class="lr-kwchip">' + esc(k) + '</span>'; }).join('') + '</div>';
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
      (r.lister_email ? '<span>listed by ' + rvWho(r.lister_email) + '</span>' : '') +
      '<span>' + esc(lrAge(r.go_live_at)) + '</span>' +
      '<span class="lr-badge">research ×' + esc(String(r.research_n || 0)) + '</span>' + (extraBadges || '') + '</div></div>';
  }
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
        h += '<div style="margin-bottom:10px"><b>' + esc(x.stage) + ' · ' + esc(x.decision) + (x.tier ? ' · Tier ' + esc(x.tier.replace('T', '')) : '') + '</b> — ' + rvWho(x.decided_by) + ' · ' + esc(x.decided_at) +
          lrKwChips(x.title_keywords, 'Title keywords') + lrKwChips(x.desc_keywords, 'Description keywords') +
          (x.comment ? '<div><span class="k">Comment:</span> ' + esc(x.comment) + '</div>' : '') + '</div>';
      });
      (d.research || []).forEach(function (v) {
        var obj = {}; try { obj = JSON.parse(v.data_json || '{}'); } catch (e) {}
        h += '<div style="margin:8px 0 4px"><b>' + esc(v.kind) + ' research</b> — ' + rvWho(v.submitted_by) + ' · ' + esc(v.submitted_at) +
          (v.changes_note ? ' · <i>' + esc(v.changes_note) + '</i>' : '') + '</div><table>';
        Object.keys(obj).forEach(function (k) { if (String(obj[k]).trim()) { h += '<tr><td class="k">' + esc(k) + '</td><td>' + esc(obj[k]) + '</td></tr>'; } });
        h += '</table>';
      });
      box.innerHTML = h || '<span style="color:var(--text-3)">No research submitted yet.</span>';
    }).catch(function (e) { box.innerHTML = esc(e.message); });
  }
  function lrDecisionForm(r, stage) {
    return '<div class="lr-form hidden" data-form="' + esc(r.item_id) + '">' +
      '<input class="lr-note" data-cmt="' + esc(r.item_id) + '" placeholder="What should the lister aim for? — this is the whole brief he gets">' +
      '<div class="lr-tier"><label><input type="radio" name="tier-' + esc(r.item_id) + '" value="T1" checked> Tier 1 — the lister has 2 days</label>' +
      '<label><input type="radio" name="tier-' + esc(r.item_id) + '" value="T2"> Tier 2 — parked until you call it in</label>' +
      '<button class="btn-gold" style="margin-left:auto" data-lact="submitRev" data-id="' + esc(r.item_id) + '" data-stage="' + esc(stage) + '">Send the revision to the lister</button></div></div>';
  }
  window.LADDER_UI = { lrKwCount: lrKwCount, lrKwChips: lrKwChips, lrHead: lrHead, lrDecisionForm: lrDecisionForm, lrResearchToggle: lrResearchToggle, lrThumb: lrThumb, lrAge: lrAge };

  /* ---------------- the lifecycle board ---------------- */
  function rvCard(r) {
    var st = RV_STEP[r.stage] || RV_STEP.decide;
    var t = r.task;
    var canWrite = !!r.mine || !!RV.board.mgmt;
    var h = '<div class="rv-card" style="--tone:' + st.tone + '" data-rv="' + esc(r.item_id) + '">' +
      '<div class="rv-head">' + lrThumb(r) +
        '<div><div class="rv-ttl"><a href="https://www.ebay.co.uk/itm/' + esc(r.item_id) + '" target="_blank" rel="noopener noreferrer">' + esc(r.title || r.item_id) + '</a></div>' +
        '<div class="lr-meta"><span class="mono">' + esc(r.item_id) + '</span><span>' + esc(r.account) + '</span>' +
          '<span>' + esc(lrAge(r.go_live_at)) + '</span>' +
          (r.tier ? '<span class="lr-badge">Tier ' + esc(r.tier.replace('T', '')) + '</span>' : '') +
          (t && t.assigned_to ? '<span>with <b>' + rvWho(t.assigned_to) + '</b></span>' : (r.lister_email ? '<span>listed by ' + rvWho(r.lister_email) + '</span>' : '')) +
          (t && t.deadline_pkt && r.stage === 'revising' ? '<span' + (t.overdue ? ' class="rv-over"' : '') + '>due ' + esc(fmtPkt(t.deadline_pkt, true) || t.deadline_pkt) + (t.overdue ? ' · OVERDUE' : '') + '</span>' : '') +
        '</div></div>' +
        '<span class="rv-pill">' + esc(st.h) + '</span>' +
      '</div>';

    if (r.decision && (r.decision.comment || r.decision.title_keywords)) {
      h += '<div class="rv-ask"><span class="k">What the Advertising Manager asked for</span>' +
        '<div class="t">' + esc(r.decision.comment || '(no written brief — ask him before you start)') + '</div>' +
        lrKwChips(r.decision.title_keywords, 'Title keywords') + lrKwChips(r.decision.desc_keywords, 'Description keywords') +
        '<div class="rv-hint" style="margin-top:6px">' + rvWho(r.decision.by) + ' · ' + esc(fmtPkt(r.decision.at, true) || r.decision.at) + '</div></div>';
    }

    if ((r.updates || []).length) {
      h += '<div class="rv-trail">' + r.updates.map(function (u) {
        return '<div class="rv-u"><b>' + esc(u.status) + '</b>' + (u.note ? ' — ' + esc(u.note) : '') +
          '<span class="w">' + esc(fmtPkt(u.at, true) || u.at) + '</span></div>';
      }).join('') + '</div>';
    } else if (r.stage === 'revising') {
      h += '<div class="rv-hint" style="margin-top:9px">No status posted yet' + (r.mine ? ' — say where you are with it.' : '.') + '</div>';
    }

    if (r.stage === 'submitted' && t) {
      h += '<div class="rv-ask" style="background:rgba(255,159,67,.08)"><span class="k">The lister says it is done</span>' +
        '<div class="t">' + esc(t.submission_note || '(no note)') + '</div>' +
        '<div class="rv-hint" style="margin-top:6px">submitted ' + esc(fmtPkt(t.submitted_at, true) || '') + ' — ' +
        (RV.board.mgmt ? 'approve it or send it back on the <b>Revision approval</b> desk; approving raises the campaign task.' : 'waiting for Management to approve it.') + '</div></div>';
    }
    if (r.stage === 'done' && t) {
      h += '<div class="rv-hint" style="margin-top:9px">✅ Approved by ' + rvWho(t.approved_by) + ' · ' + esc(fmtPkt(t.decided_at, true) || '') +
        ' — the campaign task went to the Advertising Manager.</div>';
    }

    /* the working panel: only while the job is genuinely with a lister, only for its owner */
    if (r.stage === 'revising' && canWrite && t) {
      h += '<div class="rv-do">' +
        '<div class="r"><select class="rv-sel" data-rv-st="' + esc(t.task_id) + '">' +
          '<option value="">Where are you with it?…</option>' +
          (RV.board.statuses || []).map(function (s) { return '<option>' + esc(s) + '</option>'; }).join('') +
        '</select>' +
        '<input class="rv-in" data-rv-note="' + esc(t.task_id) + '" placeholder="Anything worth saying (optional)">' +
        '<button class="minibtn" data-rv-save="' + esc(t.task_id) + '">Save status</button></div>' +
        '<div class="r"><input class="rv-in" data-rv-done="' + esc(t.task_id) + '" placeholder="What exactly did you change? — Management reads this">' +
        '<button class="btn-gold" data-rv-finish="' + esc(t.task_id) + '">Revision done — send to Management</button></div>' +
        '<div class="rv-hint">Saving a status keeps the job with you. “Revision done” hands it to Management, who approve it or send it back with a reason.</div>' +
      '</div>';
    }
    h += '<div class="lr-btns" style="margin-top:10px"><button class="minibtn" data-lact="research" data-id="' + esc(r.item_id) + '">Research &amp; history</button></div>' +
      '<div class="lr-res hidden" data-res="' + esc(r.item_id) + '"></div>';
    return h + '</div>';
  }

  function rvSection(title, rows, emptyWord) {
    var h = '<div class="lr-sec">' + esc(title) + ' · ' + rows.length + '</div>';
    if (!rows.length) { return h + (emptyWord ? '<div class="rv-empty">' + esc(emptyWord) + '</div>' : ''); }
    return h + rows.map(rvCard).join('');
  }

  function paint() {
    var box = $('r72Body');
    if (!box || !RV.board) { return; }
    var b = RV.board, c = b.counts || {}, d = RV.queue || {};
    var role = rvRole();
    var lister = role === 'Item Lister' || role === 'Listing Manager';
    var rows = b.rows || [];
    var by = function (s) { return rows.filter(function (r) { return r.stage === s; }); };

    /* the four steps, always visible, always in order — this is the page explaining itself */
    var h = '<div class="rv-steps">' + ['decide', 'revising', 'submitted', 'done'].map(function (k) {
      var s = RV_STEP[k];
      return '<div class="rv-step" style="--tone:' + s.tone + '"><span class="n">' + s.n + '</span>' +
        '<div class="h">' + esc(s.h) + '</div><b>' + (c[k] || 0) + '</b><div class="w">' + esc(s.w) + '</div></div>';
    }).join('') + '</div>' +
    '<div class="rv-hint" style="margin-bottom:4px">A listing arrives here 7 days after it goes live. ' +
      (lister ? 'When a revision is sent to you it appears under <b>Your revisions</b> — post a status as you go, then press <b>Revision done</b>.'
              : 'Nothing counts as finished until Management approves what the lister submitted.') + '</div>';

    var mine = rows.filter(function (r) { return r.mine && r.stage === 'revising'; });
    if (mine.length || lister) {
      h += rvSection('Your revisions — these are yours to do', mine,
        'Nothing is with you right now. When the Advertising Manager sends a revision, it lands here.');
    }

    /* step 1 — the decision desk */
    var q = d.queue || [];
    if (b.can_decide || q.length) {
      h += '<div class="lr-sec">Step 1 · waiting for the Advertising Manager · ' + q.length + '</div>';
      if (!q.length) { h += '<div class="rv-empty">Nothing is waiting at the 7-day mark.</div>'; }
      q.forEach(function (r) {
        h += '<div class="lr-row">' + lrHead(r) + '<div class="lr-btns">' +
          '<button class="minibtn" data-lact="research" data-id="' + esc(r.item_id) + '">Research &amp; history</button>' +
          (b.can_decide ? '<button class="minibtn" data-lact="noRev" data-stage="R72" data-id="' + esc(r.item_id) + '">No revision needed</button>' +
                          '<button class="btn-gold" data-lact="openRev" data-id="' + esc(r.item_id) + '">Revision required…</button>' : '') +
          '</div></div><div class="lr-res hidden" data-res="' + esc(r.item_id) + '"></div>' +
          (b.can_decide ? lrDecisionForm(r, 'R72') : '') + '</div>';
      });
      var parked = d.parked || [];
      if (parked.length) {
        h += '<div class="lr-sec">Tier 2 — parked, waiting for his call · ' + parked.length + '</div>';
        parked.forEach(function (r) {
          h += '<div class="lr-row">' + lrHead(r) + '<div class="lr-btns">' +
            '<button class="minibtn" data-lact="research" data-id="' + esc(r.item_id) + '">Research &amp; history</button>' +
            (b.can_decide ? '<button class="btn-gold" data-lact="call" data-id="' + esc(r.item_id) + '">Call this revision in</button>' : '') +
            '</div></div><div class="lr-res hidden" data-res="' + esc(r.item_id) + '"></div></div>';
        });
      }
    }

    var others = by('revising').filter(function (r) { return !r.mine; });
    h += rvSection('Step 2 · being revised' + (mine.length ? ' by the rest of the team' : ''), others,
      'No revision is in a lister’s hands right now.');
    h += rvSection('Step 3 · waiting for Management', by('submitted'),
      'Nothing is waiting to be approved.');
    h += rvSection('Step 4 · revision done', by('done').slice(0, 25),
      'No revision has been completed yet.');
    var none = by('none');
    if (none.length) { h += rvSection('Judged fine as it is — no revision needed', none.slice(0, 15), ''); }
    h += '<p class="rv-hint" style="margin-top:14px">' + esc(rvS(b.note)) + '</p>';

    box.innerHTML = h;
    wireDecide(box);
    wireLister(box);
  }

  function wireLister(box) {
    box.querySelectorAll('[data-rv-save]').forEach(function (btn) {
      btn.onclick = function () {
        var id = this.getAttribute('data-rv-save');
        var sel = box.querySelector('[data-rv-st="' + id + '"]');
        var note = box.querySelector('[data-rv-note="' + id + '"]');
        var status = sel ? rvS(sel.value) : '';
        if (!status) { toast('Pick where you are with it first.'); if (sel) { sel.focus(); } return; }
        var b = this; b.disabled = true; b.textContent = 'Saving…';
        api('revisionStatus', { task_id: id, status: status, note: note ? rvS(note.value) : '' })
          .then(function () { toast('Status saved — everyone can see it.'); load(); })
          .catch(function (e) { b.disabled = false; b.textContent = 'Save status'; toast(e.message); });
      };
    });
    box.querySelectorAll('[data-rv-finish]').forEach(function (btn) {
      btn.onclick = function () {
        var id = this.getAttribute('data-rv-finish');
        var inp = box.querySelector('[data-rv-done="' + id + '"]');
        var what = inp ? rvS(inp.value) : '';
        if (what.length < 5) { toast('Say what you changed — Management reads this before approving.'); if (inp) { inp.focus(); } return; }
        var b = this; b.disabled = true; b.textContent = 'Sending…';
        api('submitTask', { task_id: id, submission_note: what })
          .then(function () { toast('Sent to Management — they approve it or send it back.'); load(); })
          .catch(function (e) { b.disabled = false; b.textContent = 'Revision done — send to Management'; toast(e.message); });
      };
    });
  }

  function wireDecide(host) {
    host.onclick = function (ev) {
      var b = ev.target && ev.target.closest ? ev.target.closest('[data-lact]') : null;
      if (!b) { return; }
      var act = b.getAttribute('data-lact'), id = b.getAttribute('data-id');
      if (act === 'research') { lrResearchToggle(host, id); return; }
      if (act === 'openRev') { var f = host.querySelector('[data-form="' + id + '"]'); if (f) { f.classList.toggle('hidden'); } return; }
      if (act === 'noRev') {
        b.disabled = true;
        engineCall('ladderDecide', { item_id: id, stage: b.getAttribute('data-stage'), decision: 'NO_REVISION' }, 20000)
          .then(function () { toast('Marked: no revision needed.'); load(); })
          .catch(function (e) { b.disabled = false; toast(e.message); });
        return;
      }
      if (act === 'submitRev') {
        var cmt = host.querySelector('[data-cmt="' + id + '"]');
        var tierEl = host.querySelector('input[name="tier-' + id + '"]:checked');
        b.disabled = true;
        engineCall('ladderDecide', { item_id: id, stage: b.getAttribute('data-stage'), decision: 'REVISION',
          tier: tierEl ? tierEl.value : 'T1', comment: cmt ? cmt.value : '' }, 25000)
          .then(function (r) { toast('Sent to the lister — ' + (r.task || 'task raised') + '.'); load(); })
          .catch(function (e) { b.disabled = false; toast(e.message); });
        return;
      }
      if (act === 'call') {
        b.disabled = true;
        engineCall('ladderCall', { item_id: id }, 25000)
          .then(function () { toast('Called in — the lister has it.'); load(); })
          .catch(function (e) { b.disabled = false; toast(e.message); });
      }
    };
  }

  function load() {
    var box = $('r72Body');
    if (!box) { return; }
    var seq = ++RV.seq;
    if (!RV.board) { box.innerHTML = '<div class="spinner"></div>'; }
    /* the lifecycle board IS the page; the decision queue rides beside it. Either may fail
       without blanking the other — a lister must still see his own work if the AM's desk errors. */
    Promise.all([
      engineCall('revisionBoard', {}, 25000),
      engineCall('ladderQueue', { page: 'r72' }, 25000).catch(function () { return { queue: [], parked: [] }; })
    ]).then(function (both) {
      if (seq !== RV.seq) { return; }
      RV.board = both[0] || { rows: [], counts: {} };
      RV.queue = both[1] || {};
      try {
        STATE.counts.rev72 = (RV.board.rows || []).filter(function (r) { return r.mine && r.stage === 'revising'; }).length;
        if (typeof refreshBadges === 'function') { refreshBadges(); }
      } catch (e) {}
      paint();
    }).catch(function (e) {
      if (seq !== RV.seq) { return; }
      box.innerHTML = '<div class="rv-empty">The board did not answer — ' + esc(rvS(e.message) || 'press Refresh') + '</div>';
    });
  }

  VIEWS.rev72 = {
    label: '7-day revision',
    order: 17.65,
    roles: LR_ROLES,
    icon: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 3"/>',
    badge: function () { return (STATE.counts && STATE.counts.rev72) || 0; },
    render: function () {
      return '<div class="hgroup enter d1"><h1>7-day <span class="goldtext">revision</span></h1>' +
        '<span class="sub">every listing comes here 7 days after it goes live · the Advertising Manager decides, the item lister does the work and posts his status, Management signs it off</span>' +
        '<button class="minibtn" id="r72Refresh" style="margin-left:auto">Refresh</button></div>' +
        '<div id="r72Body" class="enter d2"><div class="spinner"></div></div>';
    },
    init: function () { $('r72Refresh').onclick = load; load(); },
  };
})();
