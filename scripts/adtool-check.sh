#!/bin/bash
# Everything that can be checked without a database, in one command.
#
# Run this before every deploy. Each of the three has caught a real fault in this build:
#   NOTE the checker lives in scripts/ now. It used to be /tmp/jxa_check.js and something
#        overwrote it with a stub; a syntax checker that silently stops checking is worse than
#        none, because you keep trusting it.
#   syntax   — an apostrophe escaped as \\' closed a string early and would have broken a whole view.
#              Cloudflare validates the worker at upload; nothing validates the frontend files.
#   tests    — the pure functions: the rules, the models, the money.
#   sql      — a query asked adtool_orders for a column it does not have, and the Time slots page
#              had never once worked. The unit tests cannot see this; they never touch SQL.
set -u
cd "$(dirname "$0")/.."
fail=0

echo "== syntax =="
for f in engine/worker.js frontend/view-adtool-*.js; do
  out=$(osascript -l JavaScript scripts/jxa-syntax.js "$PWD/$f" 2>&1)
  case "$out" in
    *"SYNTAX OK"*) printf '  ok    %s\n' "$(basename "$f")" ;;
    *) printf '  FAIL  %s — %s\n' "$(basename "$f")" "$out"; fail=1 ;;
  esac
done

echo "== unit tests =="
t=$(osascript -l JavaScript scripts/adtool-test.js "$PWD" 2>&1 | tail -1)
echo "  $t"
case "$t" in PASS*) ;; *) fail=1 ;; esac

echo "== sql columns =="
if python3 scripts/adtool-sqlcheck.py engine/worker.js | sed 's/^/  /'; then :; else fail=1; fi

echo
if [ "$fail" -eq 0 ]; then echo "ALL CHECKS PASSED"; else echo "SOMETHING FAILED — do not deploy"; fi
exit $fail
