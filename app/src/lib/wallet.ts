import { NETWORK_PASSPHRASE } from "./config";

// The kit is loaded lazily via dynamic import so nothing wallet-related is
// evaluated during SSR (it registers web components that need `window`).
let kitPromise: Promise<any> | null = null;

async function getKit(): Promise<any> {
  if (typeof window === "undefined") {
    throw new Error("Wallet is only available in the browser");
  }
  if (!kitPromise) {
    kitPromise = (async () => {
      const mod = await import("@creit.tech/stellar-wallets-kit");
      return new mod.StellarWalletsKit({
        network: mod.WalletNetwork.TESTNET,
        selectedWalletId: mod.FREIGHTER_ID,
        modules: mod.allowAllModules(),
      });
    })();
  }
  return kitPromise;
}

/** Opens the multi-wallet modal and resolves with the chosen address. */
export async function connectWallet(): Promise<string> {
  const kit = await getKit();
  return new Promise<string>((resolve, reject) => {
    let settled = false;
    kit
      .openModal({
        onWalletSelected: async (option: { id: string }) => {
          if (settled) return;
          try {
            kit.setWallet(option.id);
            const { address } = await kit.getAddress();
            settled = true;
            resolve(address);
          } catch (e) {
            settled = true;
            reject(e);
          }
        },
        onClosed: (err?: Error) => {
          if (settled) return;
          settled = true;
          reject(err ?? new Error("You cancelled wallet selection."));
        },
      })
      .catch(reject);
  });
}

/** Signs a base64 transaction XDR with the connected wallet. */
export async function signTx(xdr: string, address: string): Promise<string> {
  const kit = await getKit();
  const { signedTxXdr } = await kit.signTransaction(xdr, {
    address,
    networkPassphrase: NETWORK_PASSPHRASE,
  });
  return signedTxXdr;
}
