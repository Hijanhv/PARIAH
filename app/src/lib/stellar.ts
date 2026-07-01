import {
  Account,
  Address,
  BASE_FEE,
  Contract,
  TransactionBuilder,
  nativeToScVal,
  scValToNative,
  xdr,
  rpc,
} from "@stellar/stellar-sdk";
import {
  CONTRACT_ID,
  RPC_URL,
  NETWORK_PASSPHRASE,
  ADMIN_ADDRESS,
  HORIZON_URL,
} from "./config";

export const server = new rpc.Server(RPC_URL, {
  allowHttp: RPC_URL.startsWith("http://"),
});

// ---------------------------------------------------------------------------
// Reads (via read-only simulation — no signature, no fee, no submission)
// ---------------------------------------------------------------------------

export interface MarketState {
  admin: string;
  stakeToken: string;
  question: string;
  closeLedger: number;
  poolYes: bigint;
  poolNo: bigint;
  resolved: boolean;
  outcome: boolean;
}

async function simulateRead(method: string, ...args: xdr.ScVal[]): Promise<any> {
  const contract = new Contract(CONTRACT_ID);
  // Any real account works as the source for a read-only simulation; the
  // admin address is public and guaranteed to exist on-chain.
  const source = new Account(ADMIN_ADDRESS, "0");
  const tx = new TransactionBuilder(source, {
    fee: BASE_FEE,
    networkPassphrase: NETWORK_PASSPHRASE,
  })
    .addOperation(contract.call(method, ...args))
    .setTimeout(30)
    .build();

  const sim = await server.simulateTransaction(tx);
  if (rpc.Api.isSimulationError(sim)) {
    throw new Error(sim.error);
  }
  if (!sim.result?.retval) {
    throw new Error(`No result returned from ${method}`);
  }
  return scValToNative(sim.result.retval);
}

export async function readMarket(): Promise<MarketState> {
  const m = await simulateRead("get_market");
  return {
    admin: m.admin,
    stakeToken: m.stake_token,
    question: m.question,
    closeLedger: Number(m.close_ledger),
    poolYes: BigInt(m.pool_yes),
    poolNo: BigInt(m.pool_no),
    resolved: Boolean(m.resolved),
    outcome: Boolean(m.outcome),
  };
}

export async function readStake(user: string, side: boolean): Promise<bigint> {
  const v = await simulateRead(
    "get_stake",
    new Address(user).toScVal(),
    nativeToScVal(side, { type: "bool" }),
  );
  return BigInt(v ?? 0);
}

export async function readHasClaimed(user: string): Promise<boolean> {
  const v = await simulateRead("has_claimed", new Address(user).toScVal());
  return Boolean(v);
}

// ---------------------------------------------------------------------------
// Writes (build -> prepare/simulate -> [sign elsewhere] -> submit -> poll)
// ---------------------------------------------------------------------------

async function buildInvokeTx(
  sourcePk: string,
  method: string,
  ...args: xdr.ScVal[]
): Promise<string> {
  const account = await server.getAccount(sourcePk);
  const contract = new Contract(CONTRACT_ID);
  const tx = new TransactionBuilder(account, {
    fee: BASE_FEE,
    networkPassphrase: NETWORK_PASSPHRASE,
  })
    .addOperation(contract.call(method, ...args))
    .setTimeout(180)
    .build();

  // prepareTransaction simulates, then assembles auth + footprint + resource
  // fees. If the contract would panic (e.g. MarketClosed) it throws here,
  // BEFORE we ever ask the user to sign.
  const prepared = await server.prepareTransaction(tx);
  return prepared.toXDR();
}

export function buildBetTx(
  better: string,
  side: boolean,
  amountStroops: bigint,
): Promise<string> {
  return buildInvokeTx(
    better,
    "bet",
    new Address(better).toScVal(),
    nativeToScVal(side, { type: "bool" }),
    nativeToScVal(amountStroops, { type: "i128" }),
  );
}

export function buildResolveTx(admin: string, outcome: boolean): Promise<string> {
  return buildInvokeTx(admin, "resolve", nativeToScVal(outcome, { type: "bool" }));
}

export function buildClaimTx(better: string): Promise<string> {
  return buildInvokeTx(better, "claim", new Address(better).toScVal());
}

export async function submitSignedTx(signedXdr: string): Promise<string> {
  const tx = TransactionBuilder.fromXDR(signedXdr, NETWORK_PASSPHRASE);
  const sendResp = await server.sendTransaction(tx);
  if (sendResp.status === "ERROR") {
    throw new Error(
      "Transaction rejected by the network: " +
        JSON.stringify(sendResp.errorResult ?? sendResp.status),
    );
  }
  return sendResp.hash;
}

export interface TxOutcome {
  status: "SUCCESS" | "FAILED";
  hash: string;
  raw: rpc.Api.GetTransactionResponse;
}

export async function pollTx(hash: string, timeoutMs = 45000): Promise<TxOutcome> {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    const res = await server.getTransaction(hash);
    if (res.status !== rpc.Api.GetTransactionStatus.NOT_FOUND) {
      return {
        status:
          res.status === rpc.Api.GetTransactionStatus.SUCCESS
            ? "SUCCESS"
            : "FAILED",
        hash,
        raw: res,
      };
    }
    await new Promise((r) => setTimeout(r, 2000));
  }
  throw new Error("Timed out waiting for transaction confirmation.");
}

// ---------------------------------------------------------------------------
// Balance (classic account balance via Horizon)
// ---------------------------------------------------------------------------

export async function fetchXlmBalance(pk: string): Promise<number> {
  const res = await fetch(`${HORIZON_URL}/accounts/${pk}`);
  if (!res.ok) {
    if (res.status === 404) return 0; // account not funded yet
    throw new Error("Failed to fetch XLM balance");
  }
  const data = await res.json();
  const native = (data.balances ?? []).find(
    (b: any) => b.asset_type === "native",
  );
  return native ? parseFloat(native.balance) : 0;
}

// ---------------------------------------------------------------------------
// Events (getEvents polling -> live tape + odds)
// ---------------------------------------------------------------------------

export interface PariahEvent {
  id: string;
  ledger: number;
  txHash?: string;
  type: "bet" | "resolve" | "claim";
  address?: string;
  side?: boolean;
  amount?: bigint;
  poolYes?: bigint;
  poolNo?: bigint;
  outcome?: boolean;
}

function toNative(v: any): any {
  if (v == null) return v;
  if (typeof v === "string") return scValToNative(xdr.ScVal.fromXDR(v, "base64"));
  return scValToNative(v);
}

function parseEvent(e: any): PariahEvent | null {
  const rawTopics = e.topic ?? e.topics ?? [];
  const topics = rawTopics.map(toNative);
  const kind = topics[0];
  const value = toNative(e.value);
  const base = {
    id: String(e.id),
    ledger: Number(e.ledger),
    txHash: e.txHash as string | undefined,
  };

  if (kind === "bet") {
    return {
      ...base,
      type: "bet",
      address: topics[1],
      side: Boolean(value[0]),
      amount: BigInt(value[1]),
      poolYes: BigInt(value[2]),
      poolNo: BigInt(value[3]),
    };
  }
  if (kind === "resolve") {
    return {
      ...base,
      type: "resolve",
      outcome: Boolean(value[0]),
      poolYes: BigInt(value[1]),
      poolNo: BigInt(value[2]),
    };
  }
  if (kind === "claim") {
    const payout = Array.isArray(value) ? value[0] : value;
    return { ...base, type: "claim", address: topics[1], amount: BigInt(payout) };
  }
  return null;
}

export async function fetchEvents(
  startLedger: number,
): Promise<{ events: PariahEvent[]; latestLedger: number }> {
  const resp = await server.getEvents({
    startLedger,
    filters: [{ type: "contract", contractIds: [CONTRACT_ID] }],
    limit: 100,
  });
  const events: PariahEvent[] = [];
  for (const e of resp.events ?? []) {
    try {
      const parsed = parseEvent(e);
      if (parsed) events.push(parsed);
    } catch {
      // skip anything we can't decode
    }
  }
  return { events, latestLedger: resp.latestLedger };
}

export async function getLatestLedger(): Promise<number> {
  const l = await server.getLatestLedger();
  return l.sequence;
}
