// All config is client-side (NEXT_PUBLIC_*). Values come from .env.local.

export const CONTRACT_ID = process.env.NEXT_PUBLIC_CONTRACT_ID ?? "";
export const RPC_URL =
  process.env.NEXT_PUBLIC_RPC_URL ?? "https://soroban-testnet.stellar.org";
export const HORIZON_URL =
  process.env.NEXT_PUBLIC_HORIZON_URL ?? "https://horizon-testnet.stellar.org";
export const NETWORK_PASSPHRASE =
  process.env.NEXT_PUBLIC_NETWORK_PASSPHRASE ?? "Test SDF Network ; September 2015";
export const NETWORK = process.env.NEXT_PUBLIC_STELLAR_NETWORK ?? "TESTNET";
export const ADMIN_ADDRESS = process.env.NEXT_PUBLIC_ADMIN_ADDRESS ?? "";
export const STAKE_TOKEN = process.env.NEXT_PUBLIC_STAKE_TOKEN ?? "";

export const STELLAR_EXPERT = "https://stellar.expert/explorer/testnet";
export const STROOPS_PER_XLM = 10_000_000;

// ~5 second ledgers on Stellar; used to turn a ledger delta into wall-clock.
export const SECONDS_PER_LEDGER = 5;

export function isConfigured(): boolean {
  return CONTRACT_ID.length > 0;
}
