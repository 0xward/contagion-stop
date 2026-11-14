#!/usr/bin/env bash
# ContagionStop — deploy via TERMINAL (forge/cast).
# Private key TIDAK ditulis di sini: dibaca dari file chmod 600 di
# ~/workspace/reactive-omni/hidden_files/deployer.key, tidak pernah ditampilkan.
# Pemakaian: ./deploy.sh <base-sepolia|unichain-sepolia|lasna> [simulate|broadcast]
# Default: simulate (tanpa broadcast). Broadcast HANYA bila argumen kedua = broadcast.
set -euo pipefail

REPO_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/repo" && pwd)"
KEY_FILE="$HOME/workspace/reactive-omni/hidden_files/deployer.key"

CHAIN="${1:-base-sepolia}"
MODE="${2:-simulate}"

case "$CHAIN" in
  base-sepolia)     RPC="https://sepolia.base.org";      SCRIPT="DeploySibling.s.sol" ;;
  unichain-sepolia) RPC="https://sepolia.unichain.org";  SCRIPT="DeploySibling.s.sol" ;;
  lasna)            RPC="https://lasna-rpc.rnk.dev/";    SCRIPT="DeployWatcher.s.sol" ;;
  *) echo "chain tidak dikenal: $CHAIN (base-sepolia | unichain-sepolia | lasna)" >&2; exit 1 ;;
esac

[ -f "$KEY_FILE" ] || { echo "key file tidak ditemukan: $KEY_FILE" >&2; exit 1; }
PRIVATE_KEY="$(cat "$KEY_FILE")"

cd "$REPO_DIR"
if [ "$MODE" = "broadcast" ]; then
  echo "BROADCAST $SCRIPT ke $CHAIN ($RPC)"
  FOUNDRY_VIA_IR=false FOUNDRY_OPTIMIZER=true ~/.foundry/bin/forge script "script/$SCRIPT" \
    --rpc-url "$RPC" --private-key "$PRIVATE_KEY" --broadcast
else
  echo "SIMULASI $SCRIPT ke $CHAIN ($RPC) — tanpa broadcast"
  FOUNDRY_VIA_IR=false FOUNDRY_OPTIMIZER=true ~/.foundry/bin/forge script "script/$SCRIPT" \
    --rpc-url "$RPC" --private-key "$PRIVATE_KEY"
fi
