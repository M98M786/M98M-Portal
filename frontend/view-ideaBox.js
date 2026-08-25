/* view-ideaBox.js — R8-11 (Hasib 25 Aug): "if any staff want to give a new product hunting idea,
 * give this bar to everyone, keep record of that". Every approved person can send an idea; the
 * record is permanent, the author is credited, and hunters/Management move it through
 * NEW → PICKED UP → HUNTED / NOT NOW. Backend: ideaSubmit · ideaList · ideaDecide (AS). */
(function () {
  'use strict';

  VIEW_CSS.push(
    '.ib-bar{border:1px solid var(--gold-line-hi);border-radius:14px;padding:15px 17px;background:linear-gradient(135deg,rgba(233,169,60,.13),rgba(233,169,60,.03));box-shadow:var(--glow-gold)}' +
    '.ib-bar h3{font-size:14px;font-weight:800}' +
    '.ib-bar .s{font-size:11.5px;color:var(--text-2);font-weight:600;margin-top:3px}' +
    '.ib-f{display:grid;gap:10px;margin-top:11px}' +
    '.ib-in,.ib-ta{width:100%;padding:11px 13px;border-radius:10px;border:1px solid var(--gold-line-hi);background:var(--panel);color:var(--text);font:inherit;font-weight:600}' +
    '.ib-ta{resize:vertical;min-height:58px}' +
    '.ib-in:focus,.ib-ta:focus{outline:none;border-color:var(--blue);box-shadow:var(--glow-blue)}' +
    '.ib-tiles{display:grid;gap:10px;grid-template-columns:repeat(auto-fit,minmax(130px,1fr));margin:14px 0}' +
    '.ib-t{border:1px solid var(--gold-line);border-radius:11px;padding:11px 13px;background:var(--panel-2)}' +
    '.ib-t .k{font-size:10px;text-transform:uppercase;letter-spacing:.08em;color:var(--text-3);font-weight:800}' +
    '.ib-t b{display:block;font-size:20px;font-weight:800;margin-top:4px}' +
    '.ib-card{border:1px solid var(--gold-line);border-radius:12px;padding:12px 14px;margin-top:10px;background:var(--panel)}' +
    '.ib-card .t{font-weight:800;font-size:13.5px}' +
    '.ib-card .m{font-size:11.5px;color:var(--text-3);font-weight:700;margin-top:4px}' +
    '.ib-card .w{font-size:12.5px;color:var(--text-2);font-weight:600;margin-top:6px;white-space:pre-wrap}' +
    '.ib-st{font-size:10px;font-weight:800;text-transform:uppercase;letter-spacing:.06em;padding:3px 9px;border-radius:9px}' +
    '.ib-st.NEW{background:var(--blue-soft);color:var(--blue-2)}' +
    '.ib-st.PICKED{background:var(--warn-soft);color:var(--warn)}' +
    '.ib-st.HUNTED{background:var(--ok-soft,rgba(47,177,112,.15));color:var(--ok)}' +
    '.ib-st.NOT{background:rgba(120,132,152,.16);color:var(--text-3)}'
  );

  function ibS(v) { return String(v == null ? '' : v); }
  function ibCls(s) { return s === 'NEW' ? 'NEW' : s === 'PICKED UP' ? 'PICKED' : s === 'HUNTED' ? 'HUNTED' : 'NOT'; }

  VIEWS.ideaBox = {
    label: 'Idea box',
    icon: '<path d="M9 18h6"/><path d="M10 21h4"/><path d="M12 3a6 6 0 0 0-3.5 10.9c.4.3.5.7.5 1.1h6c0-.4.1-.8.5-1.1A6 6 0 0 0 12 3z"/>',
    roles: '*',
    order: 15.5,
    render: function () {
      return '<div class="hgroup enter d1"><h1>Product <span class="goldtext">idea box</span></h1>' +
          '<span class="sub">anyone can send a product idea — every one is recorded with your name and answered</span>' +
          '<button class="minibtn" id="ibRefresh" style="margin-left:auto">Refresh</button></div>' +
        '<div class="ib-bar enter d1">' +
          '<h3>💡 Seen something worth selling?</h3>' +
          '<div class="s">You do not have to be a hunter. If you saw a product that could sell — on AliExpress, on eBay, in a shop, anywhere — send it. Hunters and Management see it straight away.</div>' +
          '<div class="ib-f">' +
            '<input class="ib-in" id="ibIdea" maxlength="300" placeholder="The product — e.g. “magnetic phone mount for car vents, sells well in winter”">' +
            '<input class="ib-in" id="ibLink" maxlength="500" placeholder="A link if you have one (optional) — https://…">' +
            '<textarea class="ib-ta" id="ibWhy" maxlength="500" placeholder="Why do you think it sells? (optional but it helps a lot)"></textarea>' +
            '<div class="hu-btns" style="margin-top:0"><button class="btn-gold" id="ibSend">Send the idea</button>' +
              '<span class="hu-hint" style="margin-top:0">You will be told what happens to it.</span></div>' +
          '</div>' +
        '</div>' +
        '<div id="ibTiles"></div>' +
        '<div class="card enter d2"><div class="hd">Ideas <span class="hint" id="ibScope">newest first</span></div>' +
          '<div class="bd" id="ibList"><div class="spinner"></div></div></div>';
    },
    init: function () {
      $('ibRefresh').onclick = ibLoad;
      $('ibSend').onclick = ibSend;
      ibLoad();
    }
  };

  function ibSend() {
    var idea = ibS($('ibIdea').value).trim();
    if (idea.length < 4) { toast('Write the product idea first.'); $('ibIdea').focus(); return; }
    var link = ibS($('ibLink').value).trim();
    if (link && !/^https?:\/\//i.test(link)) { toast('The link must start with http:// or https://'); $('ibLink').focus(); return; }
    var btn = $('ibSend');
    btn.disabled = true;
    api('ideaSubmit', { idea: idea, link: link, why: ibS($('ibWhy').value).trim() }).then(function (r) {
      $('ibIdea').value = ''; $('ibLink').value = ''; $('ibWhy').value = '';
      btn.disabled = false;
      toast('Idea sent · ' + ibS(r && r.idea_id) + ' — the hunters have it.');
      if (typeof draftClear === 'function') { draftClear('ideaBox'); }
      ibLoad();
    }).catch(function (e) { btn.disabled = false; toast('Not sent: ' + e.message); });
  }

  function ibLoad() {
    api('ideaList', {}).then(function (d) {
      d = d || {};
      var c = d.counts || {};
      setHTML('ibTiles', '<div class="ib-tiles">' +
        '<div class="ib-t"><span class="k">New</span><b style="color:var(--blue-2)">' + (c.NEW || 0) + '</b></div>' +
        '<div class="ib-t"><span class="k">Picked up</span><b style="color:var(--warn)">' + (c['PICKED UP'] || 0) + '</b></div>' +
        '<div class="ib-t"><span class="k">Hunted</span><b style="color:var(--ok)">' + (c.HUNTED || 0) + '</b></div>' +
        '<div class="ib-t"><span class="k">Your ideas</span><b class="goldtext">' + (c.mine || 0) + '</b></div>' +
      '</div>');
      if ($('ibScope')) { $('ibScope').textContent = d.can_decide ? 'everyone’s ideas · newest first' : 'your ideas · newest first'; }
      var list = d.ideas || [];
      var host = $('ibList');
      if (!list.length) {
        host.innerHTML = '<div class="hu-hint" style="margin-top:0">No ideas yet — be the first. Anything you have seen selling counts.</div>';
        return;
      }
      var states = d.states || ['NEW', 'PICKED UP', 'HUNTED', 'NOT NOW'];
      host.innerHTML = list.map(function (r) {
        var url = safeUrl(ibS(r.link));
        return '<div class="ib-card"><div class="t">💡 ' + esc(ibS(r.idea)) +
          ' <span class="ib-st ' + ibCls(ibS(r.status)) + '">' + esc(ibS(r.status)) + '</span></div>' +
          '<div class="m">' + esc(ibS(r.by_name) || ibS(r.by_email).split('@')[0]) +
            (ibS(r.role) ? ' · ' + esc(ibS(r.role)) : '') + ' · ' + esc(fmtPkt(r.created_at, true) || '') +
            ' · <span class="mono">' + esc(ibS(r.idea_id)) + '</span></div>' +
          (ibS(r.why) ? '<div class="w">' + esc(ibS(r.why)) + '</div>' : '') +
          (url ? '<div style="margin-top:6px"><a href="' + esc(url) + '" target="_blank" rel="noopener noreferrer" style="color:var(--blue-2);font-weight:700;font-size:12px">Open the link ↗</a></div>' : '') +
          (ibS(r.comment) ? '<div class="m">answer: ' + esc(ibS(r.comment)) + (ibS(r.decided_by) ? ' — ' + esc(ibS(r.decided_by).split('@')[0]) : '') + '</div>' : '') +
          (d.can_decide ? '<div style="display:flex;gap:8px;margin-top:9px;flex-wrap:wrap">' +
            '<select class="ib-in" style="width:auto;padding:7px 10px" data-ib-st="' + esc(ibS(r.idea_id)) + '">' +
              states.map(function (s) { return '<option' + (s === ibS(r.status) ? ' selected' : '') + '>' + esc(s) + '</option>'; }).join('') + '</select>' +
            '<input class="ib-in" style="flex:1;min-width:150px;padding:7px 10px" data-ib-c="' + esc(ibS(r.idea_id)) + '" placeholder="a word back to them (optional)">' +
            '<button class="minibtn" data-ib-save="' + esc(ibS(r.idea_id)) + '">Save</button></div>' : '') +
        '</div>';
      }).join('');
      host.querySelectorAll('[data-ib-save]').forEach(function (b) {
        b.onclick = function () {
          var id = this.getAttribute('data-ib-save');
          var st = host.querySelector('[data-ib-st="' + id.replace(/"/g, '') + '"]');
          var cm = host.querySelector('[data-ib-c="' + id.replace(/"/g, '') + '"]');
          var btn = this; btn.disabled = true;
          api('ideaDecide', { idea_id: id, status: st ? st.value : 'NEW', comment: cm ? cm.value : '' })
            .then(function () { toast('Saved — they have been told.'); ibLoad(); })
            .catch(function (e) { btn.disabled = false; toast(e.message); });
        };
      });
    }).catch(function (e) {
      setHTML('ibList', '<div class="hu-hint" style="margin-top:0">Could not load: ' + esc(e.message) + '</div>');
    });
  }

})();
