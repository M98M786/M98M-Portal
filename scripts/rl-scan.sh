#!/bin/bash
# RL-2 / RL-9 gate: secret-scan + business-file scan of a tree about to be pushed publicly.
# Usage: scripts/rl-scan.sh <dir>   → exit 0 clean, exit 1 findings (printed)
set -u
TREE="${1:?usage: rl-scan.sh <dir>}"
FAIL=0
say(){ echo "RL-SCAN FINDING: $*"; FAIL=1; }

# 1) Secrets / tokens / keys
grep -rEn --exclude-dir=.git \
  -e 'sk-ant-[A-Za-z0-9-]{8,}' \
  -e 'AIza[A-Za-z0-9_-]{30,}' \
  -e 'gh[pousr]_[A-Za-z0-9]{20,}' \
  -e 'AKIA[A-Z0-9]{16}' \
  "$TREE" && say "credential-like string above"

# 2) Maps to business data (RL-9)
grep -rEn --exclude-dir=.git \
  -e 'script\.google\.com/macros/s/[A-Za-z0-9_-]{20,}' \
  -e 'docs\.google\.com/spreadsheets/d/[A-Za-z0-9_-]{20,}' \
  "$TREE" && say "hardcoded exec URL / spreadsheet ID above"

# 3) Business files that must never ship (RL-2)
find "$TREE" -path ./.git -prune -o -type f \
  \( -name '*.xlsx' -o -name '*.xlsm' -o -name '*.csv' -o -name '*.docx' -o -name '*.pdf' \) -print | grep . \
  && say "business/document file above"

# 4) Internal document tells + staff PII
grep -rEln --exclude-dir=.git \
  -e 'MASTER PROMPT' -e 'SECURITY RED LINE' -e 'Account Learnings' \
  -e 'm98m(one|two|three|four|five|six|seven|eight|nine|ten|eleven)@gmail' \
  -e 'mrhasibullah91|zaidkaleem987' \
  "$TREE" && say "internal-document / staff-identity content above"

[ $FAIL -eq 0 ] && echo "RL-SCAN CLEAN: $TREE"
exit $FAIL
