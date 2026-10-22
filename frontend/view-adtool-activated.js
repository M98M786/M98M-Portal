/* view-adtool-activated.js — Advertising · Activated today (owner's batch, 22 Oct 2026: "make a page
 * on portal that tells you which items you made active today ... keep the archive so that we can see
 * working archive").
 *
 * The same page as Stopped yesterday, read the other way round, so it is the SAME implementation: the
 * factory lives in view-adtool-stopped.js and is handed over on `window.adtChangeDayPage`. Only the
 * direction, the default day (today in UK time) and the words differ. Two screens that share one set
 * of sums can never come to disagree about a day.
 *
 * The factory is asked for at render time, never while this file is loading: the files are spliced in
 * name order, so this one runs first and the factory does not exist yet. If the other file were ever
 * missing from a build, the page says so plainly instead of throwing.
 *
 * Read-only: nothing on this page is ever sent to eBay. Engine action: adtoolChangeDay.
 * Own class prefix: .acd-
 */
(function () {
  var ROLES = ['Management', 'Ops Head', 'Advertising Manager'];

  VIEW_CSS.push([
    '.acd-miss{background:var(--panel);border:1px solid var(--gold-line);border-radius:14px;padding:14px 16px;max-width:720px}',
    '.acd-miss h3{margin:0 0 4px;font-size:15px;font-weight:800;color:var(--text)}',
    '.acd-miss p{margin:0;font-size:12px;color:var(--text-2);line-height:1.55}'
  ].join(''));

  var PAGE = null;
  function page() {
    if (!PAGE && typeof window.adtChangeDayPage === 'function') {
      PAGE = window.adtChangeDayPage({
        id: 'cdyA', direction: 'activated', title: 'Activated today',
        sub: 'Every ad and campaign started on a chosen UK day'
      });
    }
    return PAGE;
  }

  VIEWS.adtoolActivated = {
    label: 'Activated today', /* 22 Oct: NOT hidden. Every other advertising-tool page is hidden here and lives only in
       the /ads/ portal, but the owner asked for these three "on portal" alongside a sort on
       the Ads command centre, which is a company-portal page. They are carried by both
       builds, so they appear in both sidebars. */
    hidden: false, order: 94, roles: ROLES,
    icon: '<circle cx="12" cy="12" r="9"/><path d="m10 8 6 4-6 4z"/>',
    render: function () {
      var p = page();
      if (p) return p.render();
      return '<div class="hgroup enter d1"><h1>Activated today</h1>' +
        '<span class="sub">Every ad and campaign started on a chosen UK day</span></div>' +
        '<div class="acd-miss"><h3>Not available</h3><p>This page shares its workings with Stopped yesterday, ' +
        'and that page is not in this build. Both pages come back together.</p></div>';
    },
    init: function () { var p = page(); if (p) p.init(); }
  };
})();
