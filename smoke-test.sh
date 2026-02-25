#!/usr/bin/env bash
set -euo pipefail

# End-to-end smoke test: deploys contracts to Anvil, runs the bot, verifies results.
# Usage: ./smoke-test.sh [--keep-alive]
# Requires: anvil, forge, cast, node, npx, OPENROUTER_API_KEY in bot/.env
#
# --keep-alive: After the test, keep Anvil running and print env vars for the UI.
#               Press Ctrl+C to stop.

KEEP_ALIVE=false
if [ "${1:-}" = "--keep-alive" ]; then
  KEEP_ALIVE=true
fi

ROOT_DIR="$(cd "$(dirname "$0")" && pwd)"
CONTRACTS_DIR="$ROOT_DIR/contracts"
BOT_DIR="$ROOT_DIR/bot"

# Anvil default accounts (account 0 = deployer, account 1 = bot operator)
DEPLOYER_KEY="0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80"
DEPLOYER_ADDR="0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266"
BOT_KEY="0x59c6995e998f97a5a0044966f0945389dc9e86dae88c7a8412f4603b6b78690d"
BOT_ADDR="0x70997970C51812dc3A010C7d01b50e0d17dc79C8"

RPC_URL="http://127.0.0.1:8545"
EXPLORER_PORT=4000
EXPLORER_URL="http://127.0.0.1:$EXPLORER_PORT"

# PIDs to clean up
ANVIL_PID=""
EXPLORER_PID=""

cleanup() {
  echo ""
  echo "--- Cleanup ---"
  [ -n "$EXPLORER_PID" ] && kill "$EXPLORER_PID" 2>/dev/null && echo "Stopped mock explorer"
  [ -n "$ANVIL_PID" ] && kill "$ANVIL_PID" 2>/dev/null && echo "Stopped Anvil"
  true
}
trap cleanup EXIT

echo "=== BattleChain Smoke Test ==="
echo ""

# Step 1: Build contracts
echo "--- Building contracts ---"
cd "$CONTRACTS_DIR"
forge build --quiet
echo "Contracts built."
echo ""

# Step 2: Start Anvil
echo "--- Starting Anvil ---"
anvil --silent &
ANVIL_PID=$!
sleep 1
# Verify Anvil is running
if ! kill -0 "$ANVIL_PID" 2>/dev/null; then
  echo "Error: Anvil failed to start"
  exit 1
fi
echo "Anvil running (PID $ANVIL_PID)"
echo ""

# Step 3: Deploy contracts
echo "--- Deploying contracts ---"
cd "$CONTRACTS_DIR"
DEPLOY_OUTPUT=$(DEPLOYER_ADDRESS="$DEPLOYER_ADDR" forge script script/Deploy.s.sol:Deploy \
  --rpc-url "$RPC_URL" \
  --private-key "$DEPLOYER_KEY" \
  --broadcast 2>&1)

echo "$DEPLOY_OUTPUT"

# Parse deployed addresses from forge output
BENCHMARK_TOKEN=$(echo "$DEPLOY_OUTPUT" | grep "BenchmarkToken:" | head -1 | awk '{print $NF}')
AGENT_REGISTRY=$(echo "$DEPLOY_OUTPUT" | grep "AgentRegistry:" | head -1 | awk '{print $NF}')
SCORE_TRACKER=$(echo "$DEPLOY_OUTPUT" | grep "ScoreTracker:" | head -1 | awk '{print $NF}')
BENCHMARK_CONTROLLER=$(echo "$DEPLOY_OUTPUT" | grep "BenchmarkController:" | head -1 | awk '{print $NF}')

if [ -z "$BENCHMARK_TOKEN" ] || [ -z "$AGENT_REGISTRY" ] || [ -z "$SCORE_TRACKER" ] || [ -z "$BENCHMARK_CONTROLLER" ]; then
  echo "Error: Failed to parse deployed addresses"
  echo "$DEPLOY_OUTPUT"
  exit 1
fi

echo "BenchmarkToken:      $BENCHMARK_TOKEN"
echo "AgentRegistry:       $AGENT_REGISTRY"
echo "ScoreTracker:        $SCORE_TRACKER"
echo "BenchmarkController: $BENCHMARK_CONTROLLER"
echo ""

# Step 4: Start mock explorer
echo "--- Starting mock explorer ---"
cd "$ROOT_DIR"
RPC_URL="$RPC_URL" MOCK_EXPLORER_PORT="$EXPLORER_PORT" node smoke-test-explorer.mjs &
EXPLORER_PID=$!
sleep 1
if ! kill -0 "$EXPLORER_PID" 2>/dev/null; then
  echo "Error: Mock explorer failed to start"
  exit 1
fi
echo "Mock explorer running (PID $EXPLORER_PID)"
echo ""

# Step 5: Install bot dependencies (if needed)
echo "--- Preparing bot ---"
cd "$BOT_DIR"
if [ ! -d "node_modules" ]; then
  npm install --silent
fi
echo ""

# Step 6: Run the bot
echo "--- Running bot ---"
BOT_OUTPUT=$(RPC_URL="$RPC_URL" \
  EXPLORER_API_URL="$EXPLORER_URL" \
  AGENT_REGISTRY_ADDRESS="$AGENT_REGISTRY" \
  BENCHMARK_CONTROLLER_ADDRESS="$BENCHMARK_CONTROLLER" \
  SCORE_TRACKER_ADDRESS="$SCORE_TRACKER" \
  PRIVATE_KEY="$BOT_KEY" \
  CHAIN_ID="31337" \
  npx tsx src/index.ts 2>&1) || true

echo "$BOT_OUTPUT"
echo ""

# Step 7: If bot couldn't complete run (deadline not reached), advance time and retry
if ! echo "$BOT_OUTPUT" | grep -q "Run completed."; then
  echo "--- Advancing Anvil time to pass deadline ---"
  cast rpc evm_increaseTime 90000 --rpc-url "$RPC_URL" > /dev/null 2>&1
  cast rpc evm_mine --rpc-url "$RPC_URL" > /dev/null 2>&1
  cast send "$BENCHMARK_CONTROLLER" "completeRun(uint256)" 1 \
    --rpc-url "$RPC_URL" \
    --private-key "$BOT_KEY" \
    --quiet 2>/dev/null
  echo "Run completed via cast after time advance."
  echo ""
fi

# Step 8: Verify results
echo "--- Verifying results ---"

# Read agent stats from ScoreTracker via cast
# getAgentStats returns (bestRunBugs, bestRunExtracted, bestRunScore, totalRuns, bestTime)
STATS=$(cast call "$SCORE_TRACKER" "getAgentStats(uint256)(uint256,uint256,uint256,uint256,uint256)" 1 \
  --rpc-url "$RPC_URL" 2>&1)
BUGS=$(echo "$STATS" | sed -n '1p')
SCORE=$(echo "$STATS" | sed -n '3p')

echo "Total bugs found: $BUGS"
echo "Best run score: $SCORE"

# Verify at least 1 exploit succeeded and score matches (100 points per exploit)
EXPECTED_SCORE=$((BUGS * 100))
if [ "$BUGS" -ge 1 ] && [ "$SCORE" = "$EXPECTED_SCORE" ]; then
  echo "PASS: Bot exploited $BUGS/3 contracts, score = $SCORE (as expected)"
else
  echo "FAIL: bugs=$BUGS score=$SCORE (expected score=$EXPECTED_SCORE, min 1 exploit)"
  exit 1
fi

# Keep Anvil running for UI development if requested
if [ "$KEEP_ALIVE" = true ]; then
  # Write env file for the UI
  UI_ENV="$ROOT_DIR/ui/.env.local"
  cat > "$UI_ENV" <<EOF
# Auto-generated by smoke-test.sh --keep-alive
PUBLIC_RPC_URL=$RPC_URL
PUBLIC_AGENT_REGISTRY_ADDRESS=$AGENT_REGISTRY
PUBLIC_BENCHMARK_CONTROLLER_ADDRESS=$BENCHMARK_CONTROLLER
PUBLIC_SCORE_TRACKER_ADDRESS=$SCORE_TRACKER
EOF

  echo ""
  echo "=== Anvil is running ==="
  echo "Wrote $UI_ENV"
  echo ""
  echo "Start the UI with:  cd ui && npm run dev"
  echo ""
  echo "Press Ctrl+C to stop."
  wait
fi
