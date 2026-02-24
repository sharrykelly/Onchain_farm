"use client";

import React, { createContext, useContext, useState, useEffect, useCallback } from "react";

interface WalletContextType {
  connected: boolean;
  address: string | null;
  connect: () => void;
  disconnect: () => void;
}

const WalletContext = createContext<WalletContextType>({
  connected: false,
  address: null,
  connect: () => {},
  disconnect: () => {},
});

export function WalletProvider({ children }: { children: React.ReactNode }) {
  const [address, setAddress] = useState<string | null>(null);
  const [connected, setConnected] = useState(false);

  // Restore session from localStorage on mount
  useEffect(() => {
    import("@stacks/connect").then(({ isConnected, getLocalStorage }) => {
      if (isConnected()) {
        const data = getLocalStorage();
        const stxAddr = data?.addresses?.stx?.[0]?.address ?? null;
        if (stxAddr) {
          setAddress(stxAddr);
          setConnected(true);
        }
      }
    });
  }, []);

  const connect = useCallback(async () => {
    try {
      const { connect: stacksConnect } = await import("@stacks/connect");
      const result = await stacksConnect();
      const stxAddr = result?.addresses?.find(
        (a) => a.symbol === "STX" || !a.symbol
      )?.address ?? null;
      if (stxAddr) {
        setAddress(stxAddr);
        setConnected(true);
      }
    } catch {
      // User cancelled the wallet popup — no-op
    }
  }, []);

  const disconnect = useCallback(async () => {
    const { disconnect: stacksDisconnect } = await import("@stacks/connect");
    stacksDisconnect();
    setAddress(null);
    setConnected(false);
  }, []);

  return (
    <WalletContext.Provider value={{ connected, address, connect, disconnect }}>
      {children}
    </WalletContext.Provider>
  );
}

export function useWallet() {
  return useContext(WalletContext);
}
