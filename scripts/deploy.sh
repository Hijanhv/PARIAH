#!/usr/bin/env bash
# PARIAH — build, deploy and initialize the pari-mutuel contract on testnet.
#
# Requires: stellar CLI (>= 22), Rust with a wasm target.
#   brew install stellar-cli
#   rustup target add wasm32v1-none        # or wasm32-unknown-unknown on older toolchains
#
# Usage:  ./scripts/deploy.sh
set -euo pipefail

IDENTITY="${IDENTITY:-pariah-deployer}"
NETWORK="testnet"
QUESTION="${QUESTION:-Will BTC close above \$100k this Friday?}"
# How many ledgers (~5s each) the market stays open. 100000 ≈ ~6 days.
OPEN_FOR_LEDGERS="${OPEN_FOR_LEDGERS:-100000}"

echo "▸ 1. Ensure a funded testnet identity ($IDENTITY)"
stellar keys generate "$IDENTITY" --network "$NETWORK" --fund --overwrite
ADMIN=$(stellar keys address "$IDENTITY")
echo "   admin = $ADMIN"

echo "▸ 2. Resolve the native XLM Stellar Asset Contract address"
STAKE_TOKEN=$(stellar contract id asset --asset native --network "$NETWORK")
echo "   stake_token (native SAC) = $STAKE_TOKEN"

echo "▸ 3. Build the contract to wasm"
stellar contract build --manifest-path contract/Cargo.toml

WASM="contract/target/wasm32v1-none/release/pariah.wasm"
[ -f "$WASM" ] || WASM="contract/target/wasm32-unknown-unknown/release/pariah.wasm"

echo "▸ 4. Deploy"
CONTRACT_ID=$(stellar contract deploy \
  --wasm "$WASM" \
  --source "$IDENTITY" \
  --network "$NETWORK")
echo "   contract_id = $CONTRACT_ID"

echo "▸ 5. Compute close_ledger (current + $OPEN_FOR_LEDGERS)"
CURRENT=$(curl -s -X POST https://soroban-testnet.stellar.org \
  -H 'Content-Type: application/json' \
  -d '{"jsonrpc":"2.0","id":1,"method":"getLatestLedger"}' \
  | python3 -c "import sys,json;print(json.load(sys.stdin)['result']['sequence'])")
CLOSE_LEDGER=$((CURRENT + OPEN_FOR_LEDGERS))
echo "   current=$CURRENT close_ledger=$CLOSE_LEDGER"

echo "▸ 6. Initialize the market"
stellar contract invoke \
  --id "$CONTRACT_ID" \
  --source "$IDENTITY" \
  --network "$NETWORK" \
  -- initialize \
  --admin "$ADMIN" \
  --stake_token "$STAKE_TOKEN" \
  --question "$QUESTION" \
  --close_ledger "$CLOSE_LEDGER"

cat <<EOF

✅ Done. Put these in app/.env.local:

NEXT_PUBLIC_CONTRACT_ID=$CONTRACT_ID
NEXT_PUBLIC_ADMIN_ADDRESS=$ADMIN
NEXT_PUBLIC_STAKE_TOKEN=$STAKE_TOKEN
NEXT_PUBLIC_STELLAR_NETWORK=TESTNET
NEXT_PUBLIC_RPC_URL=https://soroban-testnet.stellar.org
NEXT_PUBLIC_NETWORK_PASSPHRASE=Test SDF Network ; September 2015
NEXT_PUBLIC_HORIZON_URL=https://horizon-testnet.stellar.org

Place a first bet (native XLM has 7 decimals, so 75 XLM = 750000000):

  stellar contract invoke --id $CONTRACT_ID --source $IDENTITY --network testnet --send=yes \\
    -- bet --better $ADMIN --side true --amount 750000000
EOF
