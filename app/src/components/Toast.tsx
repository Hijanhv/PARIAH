"use client";

import { createContext, useCallback, useContext, useState, ReactNode } from "react";

type ToastKind = "info" | "success" | "error";
interface ToastItem {
  id: number;
  kind: ToastKind;
  msg: string;
}
interface ToastApi {
  push: (kind: ToastKind, msg: string) => void;
}

const ToastContext = createContext<ToastApi>({ push: () => {} });
export const useToast = () => useContext(ToastContext);

const STYLES: Record<ToastKind, string> = {
  info: "border-edge bg-panel text-gray-200",
  success: "border-yes/50 bg-yes/10 text-yes",
  error: "border-no/50 bg-no/10 text-no",
};

const ICONS: Record<ToastKind, string> = {
  info: "▸",
  success: "✓",
  error: "✕",
};

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const push = useCallback((kind: ToastKind, msg: string) => {
    const id = Date.now() + Math.random();
    setToasts((t) => [...t, { id, kind, msg }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 5500);
  }, []);

  return (
    <ToastContext.Provider value={{ push }}>
      {children}
      <div className="pointer-events-none fixed bottom-4 right-4 z-50 flex w-[min(92vw,360px)] flex-col gap-2">
        {toasts.map((t) => (
          <div
            key={t.id}
            className={`pointer-events-auto flex items-start gap-2 rounded-lg border px-3 py-2 text-sm shadow-lg backdrop-blur animate-slidein ${STYLES[t.kind]}`}
          >
            <span className="mt-[1px] font-bold">{ICONS[t.kind]}</span>
            <span className="leading-snug">{t.msg}</span>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}
