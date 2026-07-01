import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        // YES = neon lime, NO = hot pink, on a near-black terminal.
        yes: "#b6ff3b",
        no: "#ff2d78",
        ink: "#07080a",
        panel: "#0e1015",
        edge: "#1c212b",
        muted: "#6b7280",
      },
      fontFamily: {
        mono: [
          "ui-monospace",
          "SFMono-Regular",
          "Menlo",
          "Monaco",
          "Consolas",
          "monospace",
        ],
      },
      boxShadow: {
        yes: "0 0 24px -4px rgba(182,255,59,0.55)",
        no: "0 0 24px -4px rgba(255,45,120,0.55)",
      },
    },
  },
  plugins: [],
};

export default config;
