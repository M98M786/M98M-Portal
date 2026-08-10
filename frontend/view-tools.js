/* view-tools.js — §17 step 11 · §15 · RL-8: the secure home of the four embedded HTML tools.
 * View: tools (Tools). Backend: toolManifest · toolHtml.
 *
 * The backend decides which tools this caller may open — actionToolManifest_ omits a tool the
 * role may not open rather than disabling it, so this screen renders whatever arrives and never
 * filters by role itself. Nothing here knows a Drive id, a URL or a path: the HTML arrives
 * inside the authenticated response and is written straight into a frame (RL-9).
 *
 * REALITY WINS (the four files, read 8 Aug 2026): the titles come from the backend, but each
 * card's one-line description is the tool's OWN strapline copied out of its <body> — the Listing
 * Tool calls itself 'eBay Listing Generator Premium 1.0' in its <title> while the company calls
 * it the M98M Listing Tool, and the recovery agent is filed as v1_0 but titles itself v1.2.
 * Embeds.gs already settled both; this file just never contradicts it.
 */
(function () {

  /* Backend vocabulary — these two strings are EMBED_NOT_SET_UP and the 'ready' status that
     actionToolManifest_ sends. They are compared, never re-worded: the card shows the server's
     own status and note text. */
  var TK_READY = 'ready';
  var TK_NOT_SET_UP = 'not set up yet';

  /* What each tool does, in the tool's own words — these straplines are lifted from the four
     files themselves, not written for the portal. A kind that is not in this map (a fifth tool
     registered later) still renders: the backend, not this map, decides what appears. */
  var TK_ABOUT = {
    tool_listing: {
      what: 'Professional eBay listings in one click — Description + Gallery + Cards + Store.',
      where: 'Build the listing here, then confirm its eBay Item ID in My listings — the Item ID is what completes the job.'
    },
    tool_defense: {
      what: 'Seller support chats · defects · negatives · late shipment · violations.',
      where: 'Search a case, or paste the eBay message and let the tool match it to a template.'
    },
    tool_reply: {
      what: 'eBay customer service — type the case, get the reply.',
      where: 'Search a case, or paste what the buyer wrote under Match Buyer Message.'
    },
    tool_recovery: {
      what: 'Buyer-side recovery · supplier messages · long-form appeals · chat replies · refunds.',
      where: 'For the AliExpress side of a case — the appeal wording behind ALI EXPRESS APPEAL on the Return/Refunds tab.'
    }
  };

  VIEW_CSS.push(
    '.scroll{overflow-x:auto;-webkit-overflow-scrolling:touch}' +
    '.minibtn{padding:6px 12px;border:1px solid rgba(120,132,152,.35);border-radius:8px;font-weight:800;font-size:12px;color:var(--text-2);transition:all .15s}' +
    '.minibtn:hover{border-color:var(--blue);color:var(--blue-2);box-shadow:var(--glow-blue)}' +
    '.minibtn[disabled]{opacity:.4;cursor:default;box-shadow:none}' +
    '.tk-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(292px,1fr));gap:14px}' +
    '.tk-card{position:relative;display:flex;flex-direction:column;border:1px solid var(--gold-line);border-radius:12px;padding:15px 16px 14px;background:rgba(120,132,152,.07);transition:border-color .2s,box-shadow .2s}' +
    '.tk-card:hover{border-color:var(--gold-line-hi);box-shadow:var(--glow-gold)}' +
    '.tk-card.tk-off{background:rgba(120,132,152,.04)}' +
    '.tk-card.tk-off:hover{border-color:var(--gold-line);box-shadow:none}' +
    '.tk-hd{display:flex;align-items:flex-start;gap:10px}' +
    '.tk-t{font-weight:800;font-size:14px;line-height:1.35;word-break:break-word}' +
    '.tk-card.tk-off .tk-t{color:var(--text-2)}' +
    '.tk-d{font-size:12.5px;font-weight:600;color:var(--text-2);line-height:1.55;margin-top:9px}' +
    '.tk-w{font-size:11.5px;font-weight:600;color:var(--text-3);line-height:1.55;margin-top:7px}' +
    '.tk-foot{display:flex;align-items:center;gap:10px;flex-wrap:wrap;margin-top:auto;padding-top:14px}' +
    '.tk-sub{font-size:11.5px;color:var(--text-3);font-weight:700}' +
    '.pill.tk-p-ready{background:var(--ok-soft);color:var(--ok)}' +
    '.pill.tk-p-off{background:rgba(120,132,152,.16);color:var(--text-3)}' +
    '.btn-gold.tk-arm{background:linear-gradient(135deg,var(--blue-2),var(--blue-deep));color:#fff;box-shadow:var(--glow-blue)}' +
    '.tk-stage{display:none;flex-direction:column;border:1px solid var(--gold-line-hi);border-radius:12px;overflow:hidden;background:var(--panel);box-shadow:var(--glow-gold);margin-bottom:16px}' +
    '.tk-stage.tk-on{display:flex}' +
    '.tk-bar{display:flex;align-items:center;gap:10px;flex-wrap:wrap;padding:10px 14px;border-bottom:1px solid var(--gold-line);background:linear-gradient(180deg,var(--panel-2),var(--panel))}' +
    '.tk-bar .tk-bt{font-weight:800;font-size:13.5px;word-break:break-word}' +
    '.tk-bar .tk-sp{flex:1;min-width:8px}' +
    '.tk-frame{flex:1;display:block;width:100%;height:min(78vh,880px);min-height:420px;border:0;background:#fff}' +
    /* Full screen is a class on the stage the frame already lives in. The frame is never moved
       or re-created, because re-parenting an iframe reloads it and the tool would lose the case
       the person is in the middle of typing. */
    '.tk-stage.tk-full{position:fixed;inset:0;z-index:60;margin:0;border:0;border-radius:0;box-shadow:none;background:var(--bg0)}' +
    '.tk-stage.tk-full .tk-frame{height:auto;max-height:none;min-height:0}' +
    /* the shell styles padding as '.card .bd', so a stage that is not a .card needs its own */
    '.tk-stage .bd{padding:15px 18px}' +
    '.tk-load{display:grid;place-items:center;gap:8px;padding:44px 16px;text-align:center}' +
    '.tk-load .tk-sub{max-width:340px;line-height:1.55}' +
    '.tk-note{padding:10px 14px;border-top:1px solid var(--gold-line);font-size:11.5px;font-weight:600;color:var(--text-3);line-height:1.55;background:rgba(16,20,31,.28)}' +
    '[data-theme="ivory"] .tk-note{background:rgba(255,255,255,.5)}' +
    '.tk-note b{color:var(--text-2);font-weight:800}' +
    '.tk-stage.tk-full .tk-note{display:none}' +
    '.tk-calm{border:1px solid var(--gold-line);border-radius:10px;padding:12px 14px;background:rgba(120,132,152,.07);font-size:12.5px;font-weight:600;color:var(--text-2);line-height:1.6}' +
    '.tk-calm b{display:block;color:var(--text);font-weight:800;margin-bottom:4px}' +
    '.tk-empty{color:var(--text-2);font-weight:700;padding:10px 0}' +
    '.tk-empty span{display:block;color:var(--text-3);font-weight:600;font-size:12.5px;margin-top:4px}' +
    '@media (max-width:880px){' +
      '.tk-grid{grid-template-columns:1fr}' +
      '.tk-frame{height:min(70vh,620px);min-height:340px}' +
      '.tk-bar{padding:9px 11px;gap:8px}' +
      '.tk-bar .tk-bt{width:100%}' +
    '}'
  );

  // ---------- helpers ----------
  function tkStr(v) { return String(v == null ? '' : v).trim(); }
  function tkAbout(kind) { return TK_ABOUT[kind] || null; }
  function tkKb(bytes) {
    var n = Number(bytes || 0);
    if (!n) { return ''; }
    return n >= 1048576 ? (n / 1048576).toFixed(1) + ' MB' : Math.round(n / 1024) + ' KB';
  }
  function tkNow() { return fmtPkt(new Date().toISOString(), false); }
  function tkSmooth() {
    try { return !window.matchMedia('(prefers-reduced-motion:reduce)').matches; } catch (e) { return false; }
  }

  // ---------- module state ----------
  var TK_TOOLS = [];      // the manifest exactly as the server sent it
  var TK_OPEN = '';       // kind currently mounted in the stage
  var TK_ARM = '';        // kind whose Open button is asking to replace what is already open
  var TK_FULL = false;

  // ============================== VIEW ==============================
  VIEWS.tools = {
    label: 'Tools',
    icon: '<path d="M14.7 6.3a4 4 0 0 0 5 5l-8.4 8.4a2.8 2.8 0 0 1-4-4z"/><path d="M14.7 6.3 17.5 3.5"/>',
    roles: '*',
    order: 32,
    render: function () {
      return '<div class="hgroup enter d1"><h1>Tools</h1>' +
          '<span class="sub">The company\'s four working tools, opened through the portal</span>' +
          '<button class="minibtn" id="tkRefresh" style="margin-left:auto">Refresh</button>' +
        '</div>' +
        '<div class="tk-stage" id="tkStage"></div>' +
        '<div class="card enter d1"><div class="hd">Your tools ' +
          '<span class="hint">Every tool open is logged</span></div>' +
          '<div class="bd" id="tkList"><div class="spinner"></div></div>' +
        '</div>' +
        '<div class="card enter d2" style="margin-top:16px"><div class="hd">How these tools run here ' +
          '<span class="hint">RL-8</span></div><div class="bd">' +
          '<div class="tk-calm"><b>They never leave the portal.</b>' +
            'The tools are not published on the website — they are kept privately and handed to you only after the portal has checked who you are and that your version includes that tool. There is no link to a tool that works without signing in.</div>' +
          '<div class="tk-calm" style="margin-top:10px"><b>They run walled off from the portal.</b>' +
            'A tool opens inside a sealed frame: it can run and you can type in it, but it cannot see your portal sign-in, your data or anything else on this page. That wall also means a tool cannot remember anything in this browser between opens — treat each open as a fresh start and copy your work out before you close it.</div>' +
          '<div class="tk-calm" style="margin-top:10px"><b>Opens are recorded.</b>' +
            'Who opened which tool and when goes to the activity log, the same as every other action in the portal. Nothing you type inside a tool is recorded — only the fact that you opened it.</div>' +
        '</div></div>';
    },
    init: function () {
      $('tkRefresh').onclick = tkLoad;
      tkLoad();
    }
  };

  // ---------- the manifest ----------
  function tkLoad() {
    var box = $('tkList');
    if (!box) { return; }
    box.innerHTML = '<div class="spinner"></div>';
    api('toolManifest', {}).then(function (d) {
      TK_TOOLS = (d && d.tools) || [];
      TK_ARM = '';
      box.innerHTML = TK_TOOLS.length ? '<div class="tk-grid">' + TK_TOOLS.map(tkCard).join('') + '</div>' + tkFootNote()
        : '<div class="tk-empty">No tool is part of your version.' +
          '<span>Tools are attached to a role — Management can tell you which one you should have.</span></div>';
      tkWire(box);
    }).catch(function (e) {
      box.innerHTML = '<div class="tk-empty">Your tools could not be listed just now.<span>' + esc(e.message) + '</span>' +
        '<button class="minibtn" id="tkRetry" style="margin-top:10px">Try again</button></div>';
      var r = $('tkRetry');
      if (r) { r.onclick = tkLoad; }
    });
  }

  function tkFootNote() {
    var off = 0, i;
    for (i = 0; i < TK_TOOLS.length; i++) { if (tkStr(TK_TOOLS[i].status) !== TK_READY) { off++; } }
    if (!off) { return ''; }
    return '<div class="tk-sub" style="margin-top:13px">' + esc(String(off)) +
      (off === 1 ? ' tool is waiting to be connected. It is not broken — Management links it once, and it appears here ready.'
                 : ' tools are waiting to be connected. They are not broken — Management links them once, and they appear here ready.') +
      '</div>';
  }

  /** A tool nobody has registered yet is a calm card, never an error (§6 graceful degradation):
   *  the status pill and the sentence both come from the server's own manifest fields. */
  function tkCard(t) {
    var kind = tkStr(t.tool), ready = tkStr(t.status) === TK_READY, about = tkAbout(kind);
    var note = tkStr(t.note);
    return '<div class="tk-card' + (ready ? '' : ' tk-off') + '">' +
        '<div class="tk-hd"><span class="tk-t">' + esc(tkStr(t.title) || kind) + '</span>' +
          '<span class="pill ' + (ready ? 'tk-p-ready' : 'tk-p-off') + '" style="margin-left:auto;flex:none">' +
            esc(tkStr(t.status) || TK_NOT_SET_UP) + '</span></div>' +
        (about ? '<div class="tk-d">' + esc(about.what) + '</div>' : '') +
        (about && ready ? '<div class="tk-w">' + esc(about.where) + '</div>' : '') +
        (!ready ? '<div class="tk-w">' + esc(note || 'Not set up yet.') + '</div>' : '') +
        '<div class="tk-foot">' +
          (ready
            ? '<button class="btn-gold" data-open="' + esc(kind) + '">Open</button><span class="tk-sub">Opens inside the portal</span>'
            : '<span class="tk-sub">Nothing to do here yet</span>') +
        '</div>' +
      '</div>';
  }

  function tkWire(box) {
    var btns = box.querySelectorAll('button[data-open]'), i;
    for (i = 0; i < btns.length; i++) {
      (function (b) {
        b.onclick = function () { tkOpenClick(b.getAttribute('data-open'), b); };
      })(btns[i]);
    }
  }

  /** Opening a second tool throws away whatever is typed into the first, so it asks once. */
  function tkOpenClick(kind, btn) {
    if (TK_OPEN && TK_OPEN !== kind && TK_ARM !== kind) {
      tkDisarm();
      TK_ARM = kind;
      btn.textContent = 'Replace the open tool?';
      btn.classList.add('tk-arm');
      return;
    }
    tkDisarm();
    tkFetch(kind);
  }

  function tkDisarm() {
    var box = $('tkList'), btns, i;
    TK_ARM = '';
    if (!box) { return; }
    btns = box.querySelectorAll('button[data-open]');
    for (i = 0; i < btns.length; i++) {
      btns[i].textContent = 'Open';
      btns[i].classList.remove('tk-arm');
    }
  }

  function tkTitleOf(kind) {
    var i;
    for (i = 0; i < TK_TOOLS.length; i++) { if (tkStr(TK_TOOLS[i].tool) === kind) { return tkStr(TK_TOOLS[i].title); } }
    return kind;
  }

  // ---------- fetching and mounting ----------
  function tkFetch(kind) {
    var stage = $('tkStage');
    if (!stage) { return; }
    tkExitFull();
    TK_OPEN = '';
    stage.className = 'tk-stage tk-on';
    stage.innerHTML = tkBar(tkTitleOf(kind), '', true) +
      '<div class="tk-load"><div class="spinner"></div>' +
        '<div class="tk-sub">Opening ' + esc(tkTitleOf(kind)) + ' — the whole tool comes down in one piece, so give it a moment.</div></div>';
    tkWireBar(stage);
    tkReveal(stage);

    api('toolHtml', { tool: kind }).then(function (res) {
      if (!res || res.ok !== true) {
        tkCalmStage(kind, tkStr(res && res.reason), tkStr(res && res.note));
        return;
      }
      tkMount(kind, res);
    }).catch(function (e) {
      tkFailStage(kind, e.message);
    });
  }

  /** The frame is built with the DOM, never by concatenating an attribute: srcdoc is assigned as
   *  a property so the tool's own quotes and angle brackets can never break out of the markup
   *  this file writes (RL-3).
   *
   *  WHY sandbox="allow-scripts allow-forms" AND NOTHING ELSE.
   *  What is granted: the four tools are single-file apps whose entire function is client-side
   *  JavaScript, so scripts must run; their template fill-in fields are forms, so forms are
   *  allowed. What is withheld is the point. Leaving out allow-same-origin forces the frame into
   *  an OPAQUE origin — an origin that matches nothing, not even itself. From there the tool's
   *  script cannot read parent.STATE (so it can never see the Google ID token every request is
   *  signed with), cannot touch the portal's localStorage or cookies, and cannot call the portal's
   *  backend as us; parent.document simply throws. Adding allow-same-origin back would return the
   *  frame to the portal's own origin and hand it all of that — and, because a frame that is both
   *  same-origin and scripted can rewrite its own sandbox attribute and reload itself out of the
   *  box, the two flags together would leave no sandbox at all. That is the pair to never write.
   *  Also withheld: allow-popups, allow-top-navigation and allow-modals — a tool cannot open
   *  windows, cannot navigate the portal away from under the person using it, and cannot put a
   *  browser dialog in front of them.
   *  Two consequences to be honest about rather than work around: an opaque origin has no storage,
   *  so a tool cannot remember anything between opens; and a srcdoc document inherits index.html's
   *  Content-Security-Policy, so the tool runs under the portal's default-src 'none' as well. */
  function tkMount(kind, res) {
    var stage = $('tkStage'), frame;
    if (!stage) { return; }
    TK_OPEN = kind;
    stage.innerHTML = tkBar(tkStr(res.title) || tkTitleOf(kind), tkKb(res.bytes), false);

    frame = document.createElement('iframe');
    frame.className = 'tk-frame';
    frame.id = 'tkFrame';
    frame.setAttribute('sandbox', 'allow-scripts allow-forms');
    frame.setAttribute('title', tkStr(res.title) || tkTitleOf(kind));
    frame.setAttribute('referrerpolicy', 'no-referrer');   // the portal's URL is not the tool's business
    frame.srcdoc = String(res.html == null ? '' : res.html);
    stage.appendChild(frame);

    stage.insertAdjacentHTML('beforeend',
      '<div class="tk-note">This tool is running <b>sealed off from the portal</b> — it cannot reach your sign-in or your data, ' +
      'and it cannot save anything in this browser. Copy out what you need before you close it. This open was logged at <b>' +
      esc(tkNow()) + ' PKT</b>.</div>');

    tkWireBar(stage);
    tkReveal(stage);
    toast(tkTitleOf(kind) + ' is open.');
  }

  function tkBar(title, size, busy) {
    return '<div class="tk-bar">' +
        '<span class="tk-bt">' + esc(title || 'Tool') + '</span>' +
        (size ? '<span class="tk-sub num">' + esc(size) + '</span>' : '') +
        '<span class="tk-sp"></span>' +
        (busy ? '' : '<button class="minibtn" data-bar="full">Full screen</button>') +
        '<button class="minibtn" data-bar="close">Close</button>' +
      '</div>';
  }

  function tkWireBar(stage) {
    var btns = stage.querySelectorAll('button[data-bar]'), i;
    for (i = 0; i < btns.length; i++) {
      (function (b) {
        var act = b.getAttribute('data-bar');
        b.onclick = function () {
          if (act === 'close') { tkClose(); return; }
          if (act === 'full') { tkToggleFull(b); return; }
        };
      })(btns[i]);
    }
    var again = stage.querySelector('button[data-again]');
    if (again) {
      again.onclick = function () { tkFetch(again.getAttribute('data-again')); };
    }
  }

  function tkReveal(stage) {
    try { stage.scrollIntoView({ block: 'start', behavior: tkSmooth() ? 'smooth' : 'auto' }); }
    catch (e) { /* an old engine simply leaves the page where it is */ }
  }

  // ---------- the calm paths ----------
  /** A tool that is registered but unreadable, or not registered at all, ends here — same tone as
   *  the card, no error styling. The server's own wording is preferred over anything invented. */
  function tkCalmStage(kind, reason, note) {
    var stage = $('tkStage');
    if (!stage) { return; }
    TK_OPEN = '';
    stage.innerHTML = tkBar(tkTitleOf(kind), '', false) +
      '<div class="bd"><div class="tk-calm"><b>' + esc(reason || TK_NOT_SET_UP) + '</b>' +
        esc(note || 'Management still has to connect this tool. Nothing is broken and there is nothing for you to fix — it will appear here ready once they do.') +
      '</div></div>';
    tkWireBar(stage);
    tkLoad();
  }

  function tkFailStage(kind, message) {
    var stage = $('tkStage'), m = String(message || ''), line;
    if (!stage) { return; }
    TK_OPEN = '';
    if (/too many/i.test(m)) {
      line = 'You have opened tools a lot in the last few minutes. Give it ten minutes and it will open again — nothing is wrong with the tool.';
    } else if (/may not open|unknown tool/i.test(m)) {
      line = 'This tool is not part of your version. If you think it should be, ask Management.';
    } else {
      line = 'It could not be opened just now. Nothing was changed — try again in a moment.';
    }
    stage.innerHTML = tkBar(tkTitleOf(kind), '', false) +
      '<div class="bd"><div class="tk-calm"><b>Not opened</b>' + esc(line) + '</div>' +
        '<div class="tk-foot"><button class="minibtn" data-again="' + esc(kind) + '">Try again</button>' +
        '<span class="tk-sub">' + esc(m) + '</span></div></div>';
    tkWireBar(stage);
  }

  // ---------- close and full screen ----------
  function tkClose() {
    var stage = $('tkStage');
    tkExitFull();
    TK_OPEN = '';
    tkDisarm();
    if (stage) { stage.className = 'tk-stage'; stage.innerHTML = ''; }
  }

  /** Class-only toggle. The frame keeps running throughout — see the .tk-full rule above. */
  function tkToggleFull(btn) {
    var stage = $('tkStage');
    if (!stage) { return; }
    TK_FULL = !TK_FULL;
    stage.classList.toggle('tk-full', TK_FULL);
    btn.textContent = TK_FULL ? 'Exit full screen' : 'Full screen';
    if (TK_FULL) { toast('Full screen · press Esc to come back.'); }
  }

  function tkExitFull() {
    var stage = $('tkStage'), btn;
    TK_FULL = false;
    if (!stage) { return; }
    stage.classList.remove('tk-full');
    btn = stage.querySelector('button[data-bar="full"]');
    if (btn) { btn.textContent = 'Full screen'; }
  }

  /* Escape belongs to the portal, not to the tool: key presses inside a sandboxed frame never
     reach this document, so the bar's Exit button stays visible as the reliable way out. */
  document.addEventListener('keydown', function (ev) {
    if (ev.key !== 'Escape' || !TK_FULL) { return; }
    var stage = $('tkStage');
    if (!stage || !document.body.contains(stage)) { TK_FULL = false; return; }
    tkExitFull();
  });

})();
