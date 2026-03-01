import { useState, useEffect, useRef, useCallback } from "react";
import { ethers } from "ethers";
import { MONAD_CONFIG } from "../config/monad";

// ── ABI Fragments ─────────────────────────────────────────────────
const COMPLIANCE_REGISTRY_ABI = [
  "event ComplianceStamped(bytes32 indexed txHash, bytes32 proofHash, uint256 timestamp)",
  "event BatchStamped(uint256 count, uint256 timestamp)",
  "event RuleUpdated(uint256 indexed ruleIndex, string name, bool enabled)",
  "event AuditGenerated(bytes32 indexed auditHash, uint256 totalTransactions, uint256 passRate)",
  "function isCompliant(bytes32 txHash) view returns (bool)",
  "function getStamp(bytes32 txHash) view returns (bytes32 proofHash, uint256 timestamp, bool verified)",
  "function getRuleCount() view returns (uint256)",
  "function getRule(uint256 ruleIndex) view returns (string name, string ruleType, uint256 value, bool enabled)",
  "function totalStamped() view returns (uint256)",
];

const BUDGET_VAULT_ABI = [
  "event BudgetDeposited(address indexed from, uint256 amount)",
  "event BudgetAllocated(address indexed agent, uint256 amount)",
  "event PaymentExecuted(address indexed agent, address indexed vendor, uint256 amount)",
  "event AgentStatusChanged(address indexed agent, bool active)",
  "function getAgentUtilization(address agent) view returns (uint256 allocated, uint256 spent, uint256 remaining, bool active)",
  "function getAvailableBudget() view returns (uint256)",
];

/**
 * Hook that subscribes to on-chain contract events and provides
 * read helpers for compliance checks and agent utilization.
 */
export function useMonadContracts() {
  const providerRef = useRef(null);
  const [complianceEvents, setComplianceEvents] = useState([]);
  const [budgetEvents, setBudgetEvents] = useState([]);
  const [availableBudget, setAvailableBudget] = useState(null);
  const [connected, setConnected] = useState(false);

  // Lazy provider singleton
  const getProvider = useCallback(() => {
    if (!providerRef.current) {
      providerRef.current = new ethers.JsonRpcProvider(MONAD_CONFIG.rpcUrl);
    }
    return providerRef.current;
  }, []);

  // ── Step 13: Listen for ComplianceStamped events (Polled) ───────
  useEffect(() => {
    const provider = getProvider();
    const registry = new ethers.Contract(
      MONAD_CONFIG.contracts.complianceRegistry,
      COMPLIANCE_REGISTRY_ABI,
      provider
    );

    let lastBlockChecked = -1;
    let isMounted = true;

    const poll = async () => {
      if (!isMounted) return;
      try {
        const currentBlock = await provider.getBlockNumber();
        if (lastBlockChecked === -1) {
          lastBlockChecked = currentBlock > 50 ? currentBlock - 50 : 0;
        }
        if (currentBlock > lastBlockChecked) {
          const logs = await registry.queryFilter("ComplianceStamped", lastBlockChecked + 1, currentBlock);
          if (logs.length > 0 && isMounted) {
            const newEvents = logs.map(log => ({
              txHash: log.args[0],
              proofHash: log.args[1],
              timestamp: Number(log.args[2]),
              blockNumber: log.blockNumber,
            })).reverse();
            
            setComplianceEvents(prev => {
              const merged = [...newEvents, ...prev];
              // Remove duplicates based on txHash
              const unique = Array.from(new Map(merged.map(item => [item.txHash, item])).values());
              return unique.slice(0, 50);
            });
          }
          lastBlockChecked = currentBlock;
        }
      } catch (err) {
        console.error("Compliance poll error:", err);
      }
    };

    poll();
    const interval = setInterval(poll, 4000);
    setConnected(true);

    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, [getProvider]);

  // ── Step 14: Listen for Budget events (Polled) ──────────────────
  useEffect(() => {
    const provider = getProvider();
    const vault = new ethers.Contract(
      MONAD_CONFIG.contracts.budgetVault,
      BUDGET_VAULT_ABI,
      provider
    );

    let lastBlockChecked = -1;
    let isMounted = true;

    const poll = async () => {
      if (!isMounted) return;
      try {
        const currentBlock = await provider.getBlockNumber();
        if (lastBlockChecked === -1) {
          lastBlockChecked = currentBlock > 50 ? currentBlock - 50 : 0;
        }
        if (currentBlock > lastBlockChecked) {
          const filterDeposit = vault.filters.BudgetDeposited();
          const filterAlloc = vault.filters.BudgetAllocated();
          const filterPay = vault.filters.PaymentExecuted();
          
          const [deposits, allocs, pays] = await Promise.all([
            vault.queryFilter(filterDeposit, lastBlockChecked + 1, currentBlock),
            vault.queryFilter(filterAlloc, lastBlockChecked + 1, currentBlock),
            vault.queryFilter(filterPay, lastBlockChecked + 1, currentBlock)
          ]);
          
          let newEvents = [];
          deposits.forEach(log => newEvents.push({ type: "deposit", from: log.args[0], amount: ethers.formatUnits(log.args[1], 6), blockNumber: log.blockNumber, txHash: log.transactionHash }));
          allocs.forEach(log => newEvents.push({ type: "allocate", agent: log.args[0], amount: ethers.formatUnits(log.args[1], 6), blockNumber: log.blockNumber, txHash: log.transactionHash }));
          pays.forEach(log => newEvents.push({ type: "payment", agent: log.args[0], vendor: log.args[1], amount: ethers.formatUnits(log.args[2], 6), blockNumber: log.blockNumber, txHash: log.transactionHash }));
          
          if (newEvents.length > 0 && isMounted) {
            newEvents.sort((a, b) => b.blockNumber - a.blockNumber); // desc
            setBudgetEvents(prev => {
              const merged = [...newEvents, ...prev];
              const unique = Array.from(new Map(merged.map(item => [item.txHash + item.type, item])).values());
              return unique.slice(0, 50);
            });
          }
          lastBlockChecked = currentBlock;
        }

        // Fetch initial available budget
        const b = await vault.getAvailableBudget();
        if (isMounted) setAvailableBudget(ethers.formatUnits(b, 6));

      } catch (err) {
        console.error("Budget poll error:", err);
      }
    };

    poll();
    const interval = setInterval(poll, 4000);

    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, [getProvider]);

  // ── Step 15: Get Agent Utilization ──────────────────────────────
  const getAgentUtilization = useCallback(
    async (agentAddress) => {
      const provider = getProvider();
      const vault = new ethers.Contract(
        MONAD_CONFIG.contracts.budgetVault,
        BUDGET_VAULT_ABI,
        provider
      );
      const [allocated, spent, remaining, active] = await vault.getAgentUtilization(agentAddress);
      return {
        address: agentAddress,
        allocated: ethers.formatUnits(allocated, 6),
        spent: ethers.formatUnits(spent, 6),
        remaining: ethers.formatUnits(remaining, 6),
        active,
      };
    },
    [getProvider]
  );

  // ── Step 16: Check Compliance ───────────────────────────────────
  const checkCompliance = useCallback(
    async (txHashBytes32) => {
      const provider = getProvider();
      const registry = new ethers.Contract(
        MONAD_CONFIG.contracts.complianceRegistry,
        COMPLIANCE_REGISTRY_ABI,
        provider
      );
      return registry.isCompliant(txHashBytes32);
    },
    [getProvider]
  );

  const getComplianceStamp = useCallback(
    async (txHashBytes32) => {
      const provider = getProvider();
      const registry = new ethers.Contract(
        MONAD_CONFIG.contracts.complianceRegistry,
        COMPLIANCE_REGISTRY_ABI,
        provider
      );
      const [proofHash, timestamp, verified] = await registry.getStamp(txHashBytes32);
      return {
        proofHash,
        timestamp: Number(timestamp),
        verified,
      };
    },
    [getProvider]
  );

  // ── Get on-chain compliance rules ───────────────────────────────
  const getComplianceRules = useCallback(
    async () => {
      const provider = getProvider();
      const registry = new ethers.Contract(
        MONAD_CONFIG.contracts.complianceRegistry,
        COMPLIANCE_REGISTRY_ABI,
        provider
      );
      const count = await registry.getRuleCount();
      const rules = [];
      for (let i = 0; i < Number(count); i++) {
        const [name, ruleType, value, enabled] = await registry.getRule(i);
        rules.push({ index: i, name, ruleType, value: value.toString(), enabled });
      }
      return rules;
    },
    [getProvider]
  );

  // ── Get total stamps count ──────────────────────────────────────
  const getTotalStamped = useCallback(
    async () => {
      const provider = getProvider();
      const registry = new ethers.Contract(
        MONAD_CONFIG.contracts.complianceRegistry,
        COMPLIANCE_REGISTRY_ABI,
        provider
      );
      const total = await registry.totalStamped();
      return Number(total);
    },
    [getProvider]
  );

  return {
    connected,
    complianceEvents,
    budgetEvents,
    availableBudget,
    getAgentUtilization,
    checkCompliance,
    getComplianceStamp,
    getComplianceRules,
    getTotalStamped,
  };
}
