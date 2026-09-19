/* Syntax check a JavaScript file with JavaScriptCore, since this Mac has no node.
 *
 *   osascript -l JavaScript scripts/jxa-syntax.js <file>
 *
 * Lives in the repo on purpose. It used to sit in /tmp and something overwrote it with a stub
 * that called a function which does not exist — every run then returned an error that looked
 * like a broken build rather than a broken checker, and had it failed the other way round it
 * would have passed everything silently. The frontend has no other syntax check at all.
 */
ObjC.import('Foundation');

function run(argv) {
  var path = argv[0];
  if (!path) return 'ERR no file given';
  var ns = $.NSString.stringWithContentsOfFileEncodingError($(path), $.NSUTF8StringEncoding, null);
  if (!ns || !ns.js) return 'ERR cannot read ' + path;
  var src = ObjC.unwrap(ns);

  /* The engine is an ES module (`export default {...}`), which `new Function` cannot parse.
     Comment the export out for the parse only — everything before it is what we care about. */
  var probe = src.replace(/^\s*export\s+default\s+/m, 'void 0, ');

  try {
    new Function(probe);
    return 'SYNTAX OK len=' + src.length;
  } catch (e) {
    return 'SYNTAX ERROR: ' + (e && e.message ? e.message : e);
  }
}
