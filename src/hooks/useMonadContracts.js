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

  // ── Step 13: Listen for ComplianceStamped events ────────────────
  useEffect(() => {
    const provider = getProvider();
    const registry = new ethers.Contract(
      MONAD_CONFIG.contracts.complianceRegistry,
      COMPLIANCE_REGISTRY_ABI,
      provider
    );

    const onComplianceStamped = (
      txHash,
      proofHash,
      timestamp,
      event
    ) => {
      setComplianceEvents((prev) => [
        {
          txHash,
          proofHash,
          timestamp: Number(timestamp),
          blockNumber: event.blockNumber,
        },
        ...prev.slice(0, 49), // keep last 50
      ]);
    };

    registry.on("ComplianceStamped", onComplianceStamped);
    setConnected(true);

    return () => {
      registry.off("ComplianceStamped", onComplianceStamped);
    };
  }, [getProvider]);

  // ── Step 14: Listen for Budget events ───────────────────────────
  useEffect(() => {
    const provider = getProvider();
    const vault = new ethers.Contract(
      MONAD_CONFIG.contracts.budgetVault,
      BUDGET_VAULT_ABI,
      provider
    );

    const onBudgetDeposited = (from, amount, event) => {
      setBudgetEvents((prev) => [
        {
          type: "deposit",
          from,
          amount: ethers.formatUnits(amount, 6),
          blockNumber: event.blockNumber,
        },
        ...prev.slice(0, 49),
      ]);
    };

    const onBudgetAllocated = (agent, amount, event) => {
      setBudgetEvents((prev) => [
        {
          type: "allocate",
          agent,
          amount: ethers.formatUnits(amount, 6),
          blockNumber: event.blockNumber,
        },
        ...prev.slice(0, 49),
      ]);
    };

    const onPaymentExecuted = (
      agent,
      vendor,
      amount,
      event
    ) => {
      setBudgetEvents((prev) => [
        {
          type: "payment",
          agent,
          vendor,
          amount: ethers.formatUnits(amount, 6),
          blockNumber: event.blockNumber,
        },
        ...prev.slice(0, 49),
      ]);
    };

    vault.on("BudgetDeposited", onBudgetDeposited);
    vault.on("BudgetAllocated", onBudgetAllocated);
    vault.on("PaymentExecuted", onPaymentExecuted);

    // Fetch initial available budget
    vault.getAvailableBudget().then((b) => {
      setAvailableBudget(ethers.formatUnits(b, 6));
    }).catch(console.error);

    return () => {
      vault.off("BudgetDeposited", onBudgetDeposited);
      vault.off("BudgetAllocated", onBudgetAllocated);
      vault.off("PaymentExecuted", onPaymentExecuted);
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
