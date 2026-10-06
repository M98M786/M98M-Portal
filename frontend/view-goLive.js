/* view-goLive.js — R8-3e: the go-live desk. Drafts a lister left behind (R7-4 @LFLAG@ draft)
 * arrive here; the Team Lead / Husnain / Management opens the eBay draft, publishes it, and
 * enters the Item ID right on this screen — the same §8 chain as My listings. Or sends it back
 * to the lister with a note. Backend: myListingWork · enterItemId · listerNeedInfo-style return
 * (taskReturnToLister via listerDraft's owner move is not needed — we reassign by returning). */
(function () {
  'use strict';

  var GL_ROLES = ['Team Lead', 'Listing Manager', 'Management', 'Ops Head', 'CS'];
  /* 4 Oct (owner: "update Sir Hasib's portal with the go-live desk … make his portal the same as Zaid's"):
     the desk is SHARED between the publishers — each sees every waiting draft and may make it live.
     The server (CONFIG go_live_publishers) decides who may publish; this list only shows the desk.
     Google signs the same person in as either @googlemail.com or @gmail.com, so both are listed. */
  var GL_PUBLISHERS = ['zaidkaleem987@gmail.com', 'mrhasibullah91@googlemail.com', 'mrhasibullah91@gmail.com', 'm98m786@gmail.com'];
  /* Item IDs published from THIS desk in this session. The desk reads myListingWork, which is
     engine-served (D1 tasks mirror) and lags the sheet write enterItemId just made — so without
     this the draft the publisher just made live comes straight back on the next refresh until the
     mirror syncs. We only add a task here on a CONFIRMED success, never on a slow/timeout path, so
     a listing that did not actually publish is never hidden. (owner, 6 Sept — "it says live but
     comes back on refresh".) A full page reload clears this, by which time the mirror has caught up. */
  var GL_DONE = {};
  /* 1 Oct (owner): "give option to Zaid to select the campaign … when he is adding the item id and
     title in the go-live desk, so he can change campaign type on the basis of listing quality."
     The same list the hunt form offers; the server checks the value. Blank = the hunt's own pick. */
  var GL_ADV_TYPES = ['General Dynamic', '75% Low DYN', '80% Medium DYN', '85% Medium DYN',
    '90% High CPC LOW', '95% High  CPC PRO', '100 % Strong ', 'General 10%', 'General 5%'];
  function glHuntAdv(t) {
    var m = (glS(t.details) + '\n' + glS(t.comments)).match(/(?:CPC Selling Chance|Advertising(?: type)?|Campaign(?: type)?)\s*[:：]\s*([^\n·|(]+)/i);
    return m ? glS(m[1]) : '';
  }
  /* `chosen` is what the publisher already picked on this card (remembered across a repaint);
     with nothing chosen the hunt's own pick is pre-selected, exactly as before. */
  function glAdvOptions(cur, chosen) {
    var norm = function (v) { return glS(v).toLowerCase().replace(/[^a-z0-9]+/g, ''); };
    var pick = (chosen === undefined || chosen === null) ? null : glS(chosen);
    var found = false, h = '';
    GL_ADV_TYPES.forEach(function (v) {
      var isHunt = !!cur && norm(v) === norm(cur);
      if (isHunt) { found = true; }
      var on = pick === null ? isHunt : (pick === v);
      h += '<option value="' + esc(v) + '"' + (on ? ' selected' : '') + '>' + esc(glS(v)) + (isHunt ? ' — the hunt’s pick' : '') + '</option>';
    });
    var blank = pick === null ? !found : (pick === '');
    return '<option value=""' + (blank ? ' selected' : '') + '>' + (cur && !found ? '— keep the hunt’s pick (' + esc(cur) + ')' : '— as the hunt said —') + '</option>' + h;
  }

  VIEW_CSS.push(
    '.gl-tiles{display:grid;gap:12px;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));margin-bottom:14px}' +
    '.gl-tile{border:1px solid var(--gold-line);border-radius:12px;padding:13px 15px;background:var(--panel-2)}' +
    '.gl-tile .k{font-size:10px;text-transform:uppercase;letter-spacing:.08em;color:var(--text-3);font-weight:800}' +
    '.gl-tile b{display:block;font-size:22px;font-weight:800;margin-top:5px;font-variant-numeric:tabular-nums}' +
    '.gl-tile.purple b{color:#9B6AE6}' +
    '.gl-card{border:1px solid rgba(150,110,230,.42);background:rgba(150,110,230,.10);border-radius:13px;padding:14px 16px;margin-top:12px}' +
    '.gl-card .t{font-weight:800;font-size:14px}' +
    '.gl-card .m{font-size:11.5px;color:var(--text-3);font-weight:700;margin-top:4px}' +
    '.gl-card .n{font-size:12.5px;color:var(--text-2);font-weight:600;margin-top:7px;white-space:pre-wrap}' +
    '.gl-in{width:100%;padding:10px 12px;border-radius:10px;border:1px solid var(--gold-line-hi);background:var(--panel);color:var(--text);font:inherit;font-weight:600}' +
    '.gl-2{display:grid;gap:10px;grid-template-columns:repeat(auto-fit,minmax(190px,1fr));margin-top:10px}'
  );

  function glS(v) { return String(v == null ? '' : v).trim(); }
  function glFlag(t) {
    var lines = glS(t.comments).split('\n');
    for (var i = 0; i < lines.length; i++) {
      if (lines[i].indexOf('@LFLAG@') === 0) {
        try { var o = JSON.parse(lines[i].slice(7)); return (o && o.flag) ? o : null; } catch (e) { return null; }
      }
    }
    return null;
  }

  VIEWS.goLive = {
    label: 'Go-live desk',
    icon: '<path d="M12 3v12"/><path d="m7 8 5-5 5 5"/><path d="M5 21h14"/>',
    roles: GL_ROLES,
    only: GL_PUBLISHERS,   // owner 5 Sept: Zaid alone · 4 Oct: Zaid and Hasib share the desk
    order: 17.6,
    badge: function () { return (STATE.counts && STATE.counts.goLive) || 0; },
    render: function () {
      return '<div class="hgroup enter d1"><h1>Go-live <span class="goldtext">desk</span></h1>' +
          '<span class="sub">drafts waiting to be published — open the draft, publish on eBay, enter the Item ID here</span>' +
          '<button class="minibtn" id="glRefresh" style="margin-left:auto">Refresh</button></div>' +
        '<div id="glTiles" class="enter d1"><div class="spinner"></div></div>' +
        '<div class="card enter d2"><div class="hd">Drafts waiting to go live ' +
          '<span class="hint">entering the Item ID fires the campaign, supplier and 7-day tasks</span>' +
          '<span class="hint" id="glShared" style="margin-left:8px;color:var(--gold-a)"></span></div>' +
          '<div class="bd" id="glBody"><div class="spinner"></div></div></div>';
    },
    init: function () {
      $('glRefresh').onclick = function () { glLoad(); };
      /* One delegated listener on the container (which survives every repaint): everything typed
         into a card is remembered, so no refresh or background merge can take it away. */
      var body = $('glBody');
      if (body) { body.addEventListener('input', glDraftHarvest); body.addEventListener('change', glDraftHarvest); }
      glLoad();
    }
  };

  /* 6 Oct (owner: "go live desk not working at all — not getting updated after adding details").
     The shared-desk merge added on 4 Oct asked the sheet backend for the other publisher's drafts
     and, when the answer landed seconds later, rebuilt the WHOLE list — destroying every box the
     publisher had already typed into. They then pressed "Make live" against an empty field and the
     desk refused the (now blank) Item ID, which reads as "nothing happens". Two rules now:
       · a repaint NEVER rebuilds a card that is already on screen — newly found drafts are
         APPENDED, nothing else is touched;
       · whatever is typed is remembered per draft (GL_DRAFT) and put back if a full repaint does
         happen — pressing Refresh, or the reload after a listing goes live, no longer costs work.
     Nothing is ever sent from this memory: the Make-live handler still reads the live field. */
  var GL_DRAFT = {};             // task_id → { item, title, camp, note } as typed, not yet sent
  var GL_FIELDS = [['data-gl-item', 'item'], ['data-gl-title', 'title'],
    ['data-gl-camp', 'camp'], ['data-gl-note', 'note']];

  function glDraftField(el) {
    if (!el || !el.getAttribute) { return null; }
    for (var i = 0; i < GL_FIELDS.length; i++) {
      var id = el.getAttribute(GL_FIELDS[i][0]);
      if (id) { return { id: id, field: GL_FIELDS[i][1] }; }
    }
    return null;
  }
  function glDraftHarvest(ev) {
    var k = glDraftField(ev && ev.target);
    if (!k) { return; }
    var d = GL_DRAFT[k.id] || (GL_DRAFT[k.id] = {});
    d[k.field] = ev.target.value;
  }
  function glDraftOf(id) { return GL_DRAFT[id] || {}; }
  function glAttrVal(v) { return esc(glS(v)).replace(/"/g, '&quot;'); }

  var GL_SEQ = 0;
  var GL_SHOWN = [];             // the drafts currently on screen, so an append can recount the tiles

  function glLoad() {
    var seq = ++GL_SEQ;
    api('myListingWork', {}).then(function (d) {
      if (seq !== GL_SEQ) { return; }
      var all = (d && d.listings) || [];
      glPaint(all);
      glSharedMerge(seq, all);
    }).catch(function (e) {
      setHTML('glTiles', '<div class="hu-hint">Could not load: ' + esc(e.message) + '</div>');
      setHTML('glBody', '');
    });
  }

  /* 4 Oct (owner): the shared desk. The fast engine answer paints first; if it does not yet pool the
     other publisher's drafts (its records carry no assigned_to until that engine build is live), the
     sheet backend is asked for every publisher's drafts and they are merged in, deduped by task id. */
  function glSharedMerge(seq, all) {
    var me = glS(STATE.user && STATE.user.email).toLowerCase();
    if (GL_PUBLISHERS.indexOf(me) < 0) { return; }
    var pooled = all.some(function (t) { return t && t.assigned_to !== undefined; });
    if (pooled) { return; }
    var note = $('glShared');
    if (note) { note.textContent = 'checking the shared desk for drafts held by the other publisher…'; }
    api('goLiveDrafts', {}).then(function (d2) {
      if (seq !== GL_SEQ) { return; }
      var seen = {};
      all.forEach(function (t) { seen[glS(t.task_id)] = 1; });
      var extra = ((d2 && d2.listings) || []).filter(function (t) { return !seen[glS(t.task_id)]; });
      glAppend(extra);
      var n2 = $('glShared'); if (n2) { n2.textContent = ''; }
    }).catch(function () { var n3 = $('glShared'); if (n3) { n3.textContent = ''; } });
  }

  /** The drafts in a listing-work answer that still belong on this desk. */
  function glDrafts(all) {
    return all.map(function (t) { return { t: t, f: glFlag(t) }; })
      .filter(function (x) { return x.f && x.f.flag === 'draft' && !GL_DONE[glS(x.t.task_id)]; });
  }

  /** The count tiles. Rebuilt in place so the go-live pipeline row below them survives. */
  function glRenderTiles(drafts) {
    var host = $('glTiles');
    if (!host) { return; }
    var byAcct = {};
    drafts.forEach(function (x) { var a = glS(x.t.account) || '(none)'; byAcct[a] = (byAcct[a] || 0) + 1; });
    try { STATE.counts.goLive = drafts.length; if (typeof refreshBadges === 'function') { refreshBadges(); } } catch (e) {}
    var html = '<div class="gl-tiles">' +
      '<div class="gl-tile purple"><span class="k">Drafts waiting</span><b>' + drafts.length + '</b></div>' +
      Object.keys(byAcct).map(function (a) {
        return '<div class="gl-tile"><span class="k">' + esc(a) + '</span><b>' + byAcct[a] + '</b></div>';
      }).join('') + '</div>';
    var existing = host.querySelector('.gl-tiles');
    if (existing) { existing.outerHTML = html; return; }      // leaves #glPipe and its numbers alone
    host.innerHTML = html + '<div id="glPipe"></div>';
  }

  /* 30 Aug (owner): how many dummies went LIVE — today / 7d / 30d, split General · Dynamic ·
     CPC — straight from the go-live records joined with each item's campaign family. */
  function glPipeline() {
    api('listingPipeline', {}).then(function (p) {
      var wnd = (p && p.windows) || {};
      var host = $('glPipe');
      if (!host) { return; }
      var row = function (label, w) {
        w = w || {};
        return '<div class="gl-tile"><span class="k">Went live · ' + label + '</span><b>' + (w.total || 0) + '</b>' +
          '<div style="font-size:10.5px;color:var(--text-3);font-weight:700;margin-top:3px">CPC ' + (w.cpc || 0) +
          ' · General ' + (w.general || 0) + ' · Dynamic ' + (w.dynamic || 0) +
          (w.unset ? ' · no campaign yet ' + w.unset : '') + '</div></div>';
      };
      host.innerHTML = '<div class="gl-tiles" style="margin-top:2px">' +
        row('today', wnd.today) + row('7 days', wnd.d7) + row('30 days', wnd.d30) + '</div>';
    }).catch(function () {});
  }

  function glCardHtml(x, me) {
    var t = x.t, f = x.f, id = glS(t.task_id);
    var url = safeUrl(glS(f.link));
    var dr = glDraftOf(id);
    var lab = 'font-size:10.5px;text-transform:uppercase;letter-spacing:.08em;color:var(--text-3);font-weight:800';
    return '<div class="gl-card" data-gl-card="' + esc(id) + '">' +
      '<div class="t">🟣 ' + esc(glS(t.title) || id) + '</div>' +
      '<div class="m"><span class="mono">' + esc(id) + '</span> · ' + esc(glS(t.account)) +
        (f.from ? ' · left by ' + esc(glS(f.from).split('@')[0]) : '') + ' · flagged ' + esc(fmtPkt(f.at, true) || '') +
        (glS(t.assigned_to) && glS(t.assigned_to).toLowerCase() !== me ? ' · <b>with ' + esc(glS(t.assigned_to).split('@')[0]) + '</b> — shared desk, you may make it live too' : '') + '</div>' +
      (f.note ? '<div class="n">' + esc(glS(f.note)) + '</div>' : '') +
      '<div class="hu-btns" style="margin-top:10px">' +
        (url ? '<a class="minibtn" href="' + esc(url) + '" target="_blank" rel="noopener noreferrer">Open the eBay draft ↗</a>' : '<span class="hu-hint" style="margin-top:0">No draft link was given</span>') +
      '</div>' +
      '<div class="gl-2">' +
        '<div><label style="' + lab + '">eBay Item ID (once published)</label>' +
          '<input class="gl-in mono" inputmode="numeric" placeholder="123456789012" data-gl-item="' + esc(id) + '" value="' + glAttrVal(dr.item) + '"></div>' +
        '<div><label style="' + lab + '">Final eBay title (saved for ever)</label>' +
          '<input class="gl-in" data-gl-title="' + esc(id) + '" maxlength="160" placeholder="the title exactly as published" value="' + glAttrVal(dr.title) + '"></div>' +
        '<div><label style="' + lab + '">Campaign type · change it on listing quality</label>' +
          '<select class="gl-in" data-gl-camp="' + esc(id) + '">' + glAdvOptions(glHuntAdv(t), dr.camp) + '</select></div>' +
        '<div><label style="' + lab + '">Note (optional)</label>' +
          '<input class="gl-in" data-gl-note="' + esc(id) + '" placeholder="anything the approver should know" value="' + glAttrVal(dr.note) + '"></div>' +
      '</div>' +
      '<div class="hu-btns" style="margin-top:10px">' +
        '<button class="btn-gold" data-gl-live="' + esc(id) + '">Make live — enter Item ID</button>' +
        '<button class="minibtn" data-gl-back="' + esc(id) + '">Send back to the lister</button>' +
      '</div></div>';
  }

  /** A full repaint: only ever from a fresh load, and every box comes back filled. */
  function glPaint(all) {
    var me = glS(STATE.user && STATE.user.email).toLowerCase();
    var drafts = glDrafts(all);
    GL_SHOWN = drafts;
    glRenderTiles(drafts);
    glPipeline();
    var box = $('glBody');
    if (!box) { return; }
    if (!drafts.length) {
      box.innerHTML = '<div class="hu-hint" style="margin-top:0">No drafts waiting. When a lister leaves an item in draft, it lands here with its link.</div>';
      return;
    }
    box.innerHTML = drafts.map(function (x) { return glCardHtml(x, me); }).join('');
    glWire(box);
  }

  /** Drafts the second answer found: appended, so nothing already on screen is disturbed. */
  function glAppend(extra) {
    var box = $('glBody');
    if (!box) { return; }
    var me = glS(STATE.user && STATE.user.email).toLowerCase();
    var add = glDrafts(extra || []).filter(function (x) {
      return !box.querySelector('[data-gl-card="' + glS(x.t.task_id).replace(/"/g, '') + '"]');
    });
    if (!add.length) { return; }
    if (!GL_SHOWN.length) { box.innerHTML = ''; }          // clears the "No drafts waiting" line
    box.insertAdjacentHTML('beforeend', add.map(function (x) { return glCardHtml(x, me); }).join(''));
    GL_SHOWN = GL_SHOWN.concat(add);
    glRenderTiles(GL_SHOWN);
    glWire(box);                                            // onclick assignment — safe to re-run
  }

  function glWire(box) {
    box.querySelectorAll('[data-gl-live]').forEach(function (b) {
      b.onclick = function () {
        var id = this.getAttribute('data-gl-live');
        var inp = box.querySelector('[data-gl-item="' + id.replace(/"/g, '') + '"]');
        var note = box.querySelector('[data-gl-note="' + id.replace(/"/g, '') + '"]');
        var ttl = box.querySelector('[data-gl-title="' + id.replace(/"/g, '') + '"]');
        var camp = box.querySelector('[data-gl-camp="' + id.replace(/"/g, '') + '"]');
        var v = inp ? glS(inp.value) : '';
        if (!/^\d{9,15}$/.test(v)) { toast('An eBay Item ID is 9 to 15 digits.'); if (inp) { inp.focus(); } return; }
        var btn = this; btn.disabled = true;
        btn.textContent = 'Live ✓';
        toast('Live · the campaign, supplier and 7-day tasks are being created.');
        api('enterItemId', { task_id: id, item_id: v, title: ttl ? glS(ttl.value) : '',
          campaign_type: camp ? glS(camp.value) : '',
          note: note ? glS(note.value) : 'Published from the go-live desk.' })
          .then(function (res) {
            GL_DONE[id] = true;   // confirmed live — keep it off the desk even while the mirror lags
            delete GL_DRAFT[id];  // it is on eBay now; nothing left to remember
            toast('Live ✓ — campaign, supplier and 7-day tasks created.');
            glLoad();
          }).catch(function (e) {
            var msg = String((e && e.message) || '');
            /* The sheet backend is slow, not broken: it almost always FINISHES entering the Item
               ID on the server even when the browser gives up at 25s — so don't report failure and
               don't let the publisher re-enter it. Say it's finishing and refresh; the draft leaves
               this desk the moment it lands. (owner, 5 Sept — the recurring "go-live not working".) */
            if (/overloaded|timeout|did not answer|taking long|aborted/i.test(msg)) {
              btn.textContent = 'Finishing on the server…';
              toast('Google is slow right now — the Item ID is finishing on the server. Refreshing to confirm…');
              setTimeout(glLoad, 7000);
            } else {
              btn.disabled = false; btn.textContent = 'Make live — enter Item ID';
              toast('NOT entered — ' + msg);
            }
          });
      };
    });
    box.querySelectorAll('[data-gl-back]').forEach(function (b) {
      b.onclick = function () {
        var id = this.getAttribute('data-gl-back');
        var note = box.querySelector('[data-gl-note="' + id.replace(/"/g, '') + '"]');
        var msg = note ? glS(note.value) : '';
        if (!msg) { toast('Write what the lister must fix in the note box first.'); if (note) { note.focus(); } return; }
        var btn = this; btn.disabled = true;
        api('goLiveReturn', { task_id: id, note: msg }).then(function (r) {
          delete GL_DRAFT[id];
          toast('Sent back to ' + (glS(r && r.assigned_to).split('@')[0] || 'the lister') + '.');
          glLoad();
        }).catch(function (e) { btn.disabled = false; toast(e.message); });
      };
    });
  }

})();
