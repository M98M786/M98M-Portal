#!/usr/bin/env bash
# Generate the lab's own gate key once and keep it OUTSIDE the repo.
# Not an eBay secret — it only stops a stranger from spending our Browse quota.
#   bash rank-lab/mint-lab-key.sh
set -euo pipefail
F="$HOME/.m98m/rank-lab-key"
if [ -f "$F" ]; then echo "already exists: $F (delete it first to rotate)"; exit 0; fi
mkdir -p "$HOME/.m98m"
openssl rand -hex 32 > "$F"
chmod 600 "$F"
echo "wrote $F (mode 600, $(wc -c < "$F") bytes). Never printed, never committed."
echo "rank-lab/deploy.sh pushes it to the Worker as the LAB_KEY secret."
