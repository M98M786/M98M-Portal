#!/bin/bash
# RL-2 / RL-9 gate: secret-scan + business-file scan of a tree about to be pushed publicly.
# The frontend's own /exec backend URL is ALLOWED (RL-9: "the HTML knows only the /exec URL").
set -u
TREE="${1:?usage: rl-scan.sh <dir>}"; FAIL=0
say(){ echo "RL-SCAN FINDING: $*"; FAIL=1; }
grep -rEn --exclude-dir=.git -e 'sk-ant-[A-Za-z0-9-]{8,}' -e 'AIza[A-Za-z0-9_-]{30,}' -e 'gh[pousr]_[A-Za-z0-9]{20,}' -e 'AKIA[A-Z0-9]{16}' "$TREE" && say "credential-like string above"
# business SHEET ids must never ship (the /exec macro URL is allowed and intentionally excluded)
grep -rEn --exclude-dir=.git -e 'docs\.google\.com/spreadsheets/d/[A-Za-z0-9_-]{20,}' -e 'script\.google\.com/macros/library/d/[A-Za-z0-9_-]{20,}' "$TREE" && say "spreadsheet/library ID above"
find "$TREE" -path ./.git -prune -o -type f \( -name '*.xlsx' -o -name '*.xlsm' -o -name '*.csv' -o -name '*.docx' -o -name '*.pdf' \) -print | grep . && say "business/document file above"
grep -rEln --exclude-dir=.git -e 'MASTER PROMPT' -e 'SECURITY RED LINE' -e 'Account Learnings' -e 'm98m(one|two|three|four|five|six|seven|eight|nine|ten|eleven)@gmail' "$TREE" && say "internal-document / staff-identity content above"
[ $FAIL -eq 0 ] && echo "RL-SCAN CLEAN: $TREE"
exit $FAIL
