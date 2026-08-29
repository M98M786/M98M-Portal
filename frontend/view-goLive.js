/* view-goLive.js — R8-3e: the go-live desk. Drafts a lister left behind (R7-4 @LFLAG@ draft)
 * arrive here; the Team Lead / Husnain / Management opens the eBay draft, publishes it, and
 * enters the Item ID right on this screen — the same §8 chain as My listings. Or sends it back
 * to the lister with a note. Backend: myListingWork · enterItemId · listerNeedInfo-style return
 * (taskReturnToLister via listerDraft's owner move is not needed — we reassign by returning). */
(function () {
  'use strict';

  var GL_ROLES = ['Team Lead', 'Listing Manager', 'Management', 'Ops Head', 'CS'];

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
    order: 17.6,
    badge: function () { return (STATE.counts && STATE.counts.goLive) || 0; },
    render: function () {
      return '<div class="hgroup enter d1"><h1>Go-live <span class="goldtext">desk</span></h1>' +
          '<span class="sub">drafts waiting to be published — open the draft, publish on eBay, enter the Item ID here</span>' +
          '<button class="minibtn" id="glRefresh" style="margin-left:auto">Refresh</button></div>' +
        '<div id="glTiles" class="enter d1"><div class="spinner"></div></div>' +
        '<div class="card enter d2"><div class="hd">Drafts assigned to you ' +
          '<span class="hint">entering the Item ID fires the campaign, supplier and 72-hour tasks</span></div>' +
          '<div class="bd" id="glBody"><div class="spinner"></div></div></div>';
    },
    init: function () {
      $('glRefresh').onclick = glLoad;
      glLoad();
    }
  };

  function glLoad() {
    api('myListingWork', {}).then(function (d) {
      var all = (d && d.listings) || [];
      var drafts = all.map(function (t) { return { t: t, f: glFlag(t) }; })
        .filter(function (x) { return x.f && x.f.flag === 'draft'; });
      var byAcct = {};
      drafts.forEach(function (x) { var a = glS(x.t.account) || '(none)'; byAcct[a] = (byAcct[a] || 0) + 1; });
      try { STATE.counts.goLive = drafts.length; if (typeof refreshBadges === 'function') { refreshBadges(); } } catch (e) {}
      setHTML('glTiles', '<div class="gl-tiles">' +
        '<div class="gl-tile purple"><span class="k">Drafts waiting</span><b>' + drafts.length + '</b></div>' +
        Object.keys(byAcct).map(function (a) {
          return '<div class="gl-tile"><span class="k">' + esc(a) + '</span><b>' + byAcct[a] + '</b></div>';
        }).join('') + '</div>');

      var box = $('glBody');
      if (!drafts.length) {
        box.innerHTML = '<div class="hu-hint" style="margin-top:0">No drafts waiting. When a lister leaves an item in draft, it lands here with its link.</div>';
        return;
      }
      box.innerHTML = drafts.map(function (x) {
        var t = x.t, f = x.f, id = glS(t.task_id);
        var url = safeUrl(glS(f.link));
        return '<div class="gl-card">' +
          '<div class="t">🟣 ' + esc(glS(t.title) || id) + '</div>' +
          '<div class="m"><span class="mono">' + esc(id) + '</span> · ' + esc(glS(t.account)) +
            (f.from ? ' · left by ' + esc(glS(f.from).split('@')[0]) : '') + ' · flagged ' + esc(fmtPkt(f.at, true) || '') + '</div>' +
          (f.note ? '<div class="n">' + esc(glS(f.note)) + '</div>' : '') +
          '<div class="hu-btns" style="margin-top:10px">' +
            (url ? '<a class="minibtn" href="' + esc(url) + '" target="_blank" rel="noopener noreferrer">Open the eBay draft ↗</a>' : '<span class="hu-hint" style="margin-top:0">No draft link was given</span>') +
          '</div>' +
          '<div class="gl-2">' +
            '<div><label style="font-size:10.5px;text-transform:uppercase;letter-spacing:.08em;color:var(--text-3);font-weight:800">eBay Item ID (once published)</label>' +
              '<input class="gl-in mono" inputmode="numeric" placeholder="123456789012" data-gl-item="' + esc(id) + '"></div>' +
            '<div><label style="font-size:10.5px;text-transform:uppercase;letter-spacing:.08em;color:var(--text-3);font-weight:800">Final eBay title (saved for ever)</label>' +
              '<input class="gl-in" data-gl-title="' + esc(id) + '" maxlength="160" placeholder="the title exactly as published"></div>' +
            '<div><label style="font-size:10.5px;text-transform:uppercase;letter-spacing:.08em;color:var(--text-3);font-weight:800">Note (optional)</label>' +
              '<input class="gl-in" data-gl-note="' + esc(id) + '" placeholder="anything the approver should know"></div>' +
          '</div>' +
          '<div class="hu-btns" style="margin-top:10px">' +
            '<button class="btn-gold" data-gl-live="' + esc(id) + '">Make live — enter Item ID</button>' +
            '<button class="minibtn" data-gl-back="' + esc(id) + '">Send back to the lister</button>' +
          '</div></div>';
      }).join('');

      box.querySelectorAll('[data-gl-live]').forEach(function (b) {
        b.onclick = function () {
          var id = this.getAttribute('data-gl-live');
          var inp = box.querySelector('[data-gl-item="' + id.replace(/"/g, '') + '"]');
          var note = box.querySelector('[data-gl-note="' + id.replace(/"/g, '') + '"]');
          var ttl = box.querySelector('[data-gl-title="' + id.replace(/"/g, '') + '"]');
          var v = inp ? glS(inp.value) : '';
          if (!/^\d{9,15}$/.test(v)) { toast('An eBay Item ID is 9 to 15 digits.'); if (inp) { inp.focus(); } return; }
          var btn = this; btn.disabled = true;
          btn.textContent = 'Live ✓';
          toast('Live · the campaign, supplier and 72-hour tasks are being created.');
          api('enterItemId', { task_id: id, item_id: v, title: ttl ? glS(ttl.value) : '',
            note: note ? glS(note.value) : 'Published from the go-live desk.' })
            .then(function (res) {
              glLoad();
            }).catch(function (e) { btn.disabled = false; btn.textContent = 'Make live — enter Item ID'; toast('NOT entered — ' + e.message); });
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
            toast('Sent back to ' + (glS(r && r.assigned_to).split('@')[0] || 'the lister') + '.');
            glLoad();
          }).catch(function (e) { btn.disabled = false; toast(e.message); });
        };
      });
    }).catch(function (e) {
      setHTML('glTiles', '<div class="hu-hint">Could not load: ' + esc(e.message) + '</div>');
      setHTML('glBody', '');
    });
  }

})();
