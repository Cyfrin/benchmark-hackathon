#!/usr/bin/env bash
set -euo pipefail

# Verifies deployed template contracts on the BattleChain block explorer.
#
# Usage:
#   ./script/verify-templates.sh <VulnerableVault_address> <WeakAccessControl_address> <IntegerOverflow_address>
#
# Example:
#   ./script/verify-templates.sh 0x1234... 0x5678... 0x9abc...

VERIFIER_URL="https://block-explorer-api.testnet.battlechain.com/api"
RPC_URL="https://testnet.battlechain.com:3051"
API_KEY="1234"

if [ $# -lt 3 ]; then
  echo "Usage: $0 <VulnerableVault_addr> <WeakAccessControl_addr> <IntegerOverflow_addr>"
  exit 1
fi

VAULT_ADDR="$1"
ACCESS_ADDR="$2"
OVERFLOW_ADDR="$3"

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"

echo "=== Verifying Template Contracts ==="
echo "Verifier URL: $VERIFIER_URL"
echo "RPC URL:      $RPC_URL"
echo ""

echo "--- Verifying VulnerableVault at $VAULT_ADDR ---"
forge verify-contract "$VAULT_ADDR" \
  src/benchmark/templates/VulnerableVault.sol:VulnerableVault \
  --verifier custom \
  --verifier-url "$VERIFIER_URL" \
  --etherscan-api-key "$API_KEY" \
  --rpc-url "$RPC_URL" \
  --root "$PROJECT_DIR"
echo ""

echo "--- Verifying WeakAccessControl at $ACCESS_ADDR ---"
forge verify-contract "$ACCESS_ADDR" \
  src/benchmark/templates/WeakAccessControl.sol:WeakAccessControl \
  --verifier custom \
  --verifier-url "$VERIFIER_URL" \
  --etherscan-api-key "$API_KEY" \
  --rpc-url "$RPC_URL" \
  --root "$PROJECT_DIR"
echo ""

echo "--- Verifying IntegerOverflow at $OVERFLOW_ADDR ---"
forge verify-contract "$OVERFLOW_ADDR" \
  src/benchmark/templates/IntegerOverflow.sol:IntegerOverflow \
  --verifier custom \
  --verifier-url "$VERIFIER_URL" \
  --etherscan-api-key "$API_KEY" \
  --rpc-url "$RPC_URL" \
  --root "$PROJECT_DIR"
echo ""

echo "=== All templates verified ==="
