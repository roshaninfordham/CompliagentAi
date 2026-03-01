import { createContext, useContext, useState, useEffect, useRef, type ReactNode } from "react";
import { ethers } from "ethers";
import { MONAD_CONFIG } from "../config/monad";

interface BlockNumberContextType {
  blockNumber: number | null;
}

const BlockNumberContext = createContext<BlockNumberContextType>({ blockNumber: null });

export function BlockNumberProvider({ children }: { children: ReactNode }) {
  const [blockNumber, setBlockNumber] = useState<number | null>(null);
  const providerRef = useRef<ethers.JsonRpcProvider | null>(null);

  useEffect(() => {
    if (!providerRef.current) {
      providerRef.current = new ethers.JsonRpcProvider(MONAD_CONFIG.rpcUrl);
    }
    const provider = providerRef.current;

    provider.getBlockNumber().then(setBlockNumber).catch(console.error);

    const interval = setInterval(async () => {
      try {
        const block = await provider.getBlockNumber();
        setBlockNumber(block);
      } catch (err) {
        console.error("Block polling error:", err);
      }
    }, 2000);

    return () => clearInterval(interval);
  }, []);

  return (
    <BlockNumberContext.Provider value={{ blockNumber }}>
      {children}
    </BlockNumberContext.Provider>
  );
}

export function useBlockNumber() {
  return useContext(BlockNumberContext);
}
