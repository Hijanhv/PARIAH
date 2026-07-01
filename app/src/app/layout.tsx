import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "PARIAH · pari-mutuel prediction market",
  description:
    "Bet against the crowd. The pool doesn't lie. On-chain, real-time pari-mutuel betting on Stellar testnet.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-ink font-mono text-gray-200 antialiased">
        {children}
      </body>
    </html>
  );
}
