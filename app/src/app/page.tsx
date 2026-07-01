"use client";

import dynamic from "next/dynamic";

// The whole app is client-only: it talks to wallets + RPC and must never run
// during SSR (the wallet kit registers web components that need `window`).
const PariahApp = dynamic(() => import("@/components/PariahApp"), {
  ssr: false,
  loading: () => (
    <div className="flex min-h-screen items-center justify-center font-mono text-sm text-muted">
      booting pariah…
    </div>
  ),
});

export default function Page() {
  return <PariahApp />;
}
