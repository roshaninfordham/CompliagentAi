import { useState, useEffect, useRef } from "react";
import {
  Bot,
  ArrowUpRight,
  ArrowDownRight,
  ShieldCheck,
  DollarSign,
  Activity,
  Zap,
  Eye,
  EyeOff,
  FileText,
  Clock,
  Wallet,
  Lock,
  Blocks,
  ExternalLink,
  Bell,
  Scale,
  CheckCircle2,
} from "lucide-react";
import { dashboardStats, transactions, agents } from "./mock-data";
import { useNavigate } from "react-router";
import { toast } from "sonner";
import { ethers } from "ethers";
import { useCompliAgent } from "../../hooks/useCompliAgent";
import { useMonadContracts } from "../../hooks/useMonadContracts.js";
import { MONAD_CONFIG } from "../../config/monad";
import { getExplorerUrl } from "../../utils/explorer";

function StatCard({
  icon: Icon,
  label,
  value,
  subValue,
  trend,
  trendUp,
  accentColor,
}: {
  icon: any;
  label: string;
  value: string;
  subValue?: string;
  trend?: string;
  trendUp?: boolean;
  accentColor?: string;
}) {
  return (
    <div className="bg-card rounded-xl border border-border p-5 hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between mb-3">
        <div
          className="w-10 h-10 rounded-lg flex items-center justify-center"
          style={{ backgroundColor: accentColor ? `${accentColor}15` : "#7C3AED15" }}
        >
          <Icon
            className="w-5 h-5"
            style={{ color: accentColor || "#7C3AED" }}
          />
        </div>
        {trend && (
          <div
            className={`flex items-center gap-1 text-[12px] px-2 py-0.5 rounded-full ${
              trendUp
                ? "bg-emerald-50 text-emerald-600"
                : "bg-red-50 text-red-500"
            }`}
          >
            {trendUp ? (
              <ArrowUpRight className="w-3 h-3" />
            ) : (
              <ArrowDownRight className="w-3 h-3" />
            )}
            {trend}
          </div>
        )}
      </div>
      <p className="text-[24px] text-foreground tracking-tight" style={{ fontFamily: "'Inter', sans-serif" }}>
        {value}
      </p>
      <p className="text-[13px] text-muted-foreground mt-0.5">{label}</p>
      {subValue && (
        <p className="text-[11px] text-muted-foreground mt-1" style={{ fontFamily: "'Roboto Mono', monospace" }}>
          {subValue}
        </p>
      )}
    </div>
  );
}

function ComplianceBadge({ status }: { status: string }) {
  const config: Record<string, { bg: string; text: string; dot: string }> = {
    compliant: { bg: "bg-emerald-50", text: "text-emerald-700", dot: "bg-emerald-500" },
    rejected: { bg: "bg-red-50", text: "text-red-700", dot: "bg-red-500" },
    pending: { bg: "bg-amber-50", text: "text-amber-700", dot: "bg-amber-500" },
  };
  const c = config[status] || config.pending;
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] ${c.bg} ${c.text}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${c.dot}`} />
      {status.charAt(0).toUpperCase() + status.slice(1)}
    </span>
  );
}

function PrivacyBadge({ shielded }: { shielded: boolean }) {
  return shielded ? (
    <span className="inline-flex items-center gap-1 text-[11px] text-[#7C3AED]">
      <EyeOff className="w-3 h-3" />
      Shielded
    </span>
  ) : (
    <span className="inline-flex items-center gap-1 text-[11px] text-muted-foreground">
      <Eye className="w-3 h-3" />
      Public
    </span>
  );
}

export function Dashboard() {
  const [liveTxCount, setLiveTxCount] = useState(dashboardStats.totalTransactions);
  const [blockNumber, setBlockNumber] = useState<number | null>(null);
  const [onChainRules, setOnChainRules] = useState<any[]>([]);
  const [totalStamped, setTotalStamped] = useState<number | null>(null);
  const providerRef = useRef<ethers.JsonRpcProvider | null>(null);
  const navigate = useNavigate();
  const [mnemonic, setMnemonic] = useState<string | null>(null);

  const MOCK_USDC = "0x18c945c79f85f994A10356Aa4945371Ec4cD75D4";

  const {
    ready,
    busy,
    walletExists,
    activeAccount,
    balances,
    status,
    initializeEnterprise,
    depositToPool,
    refresh,
  } = useCompliAgent();

  // On-chain contract events & reads (Steps 13-16)
  const {
    complianceEvents,
    budgetEvents,
    availableBudget,
    getAgentUtilization,
    checkCompliance,
    getComplianceRules,
    getTotalStamped,
  } = useMonadContracts();

  // Fetch on-chain compliance rules & stamp count on mount
  useEffect(() => {
    getComplianceRules().then(setOnChainRules).catch(console.error);
    getTotalStamped().then(setTotalStamped).catch(console.error);
  }, [getComplianceRules, getTotalStamped]);

  // Show toast on new on-chain events
  useEffect(() => {
    if (complianceEvents.length > 0) {
      const latest = complianceEvents[0];
      toast.success(`Compliance stamped at block ${latest.blockNumber}`, {
        description: `Tx: ${latest.txHash.slice(0, 10)}...`,
      });
    }
  }, [complianceEvents.length]);

  useEffect(() => {
    if (budgetEvents.length > 0) {
      const latest = budgetEvents[0];
      const labels = { deposit: "Budget Deposited", allocate: "Budget Allocated", payment: "Payment Executed" };
      toast.info(`${labels[latest.type]}: ${latest.amount} USDC`, {
        description: `Block ${latest.blockNumber}`,
      });
    }
  }, [budgetEvents.length]);

  async function handleSetup() {
    const result = await initializeEnterprise();
    if (result?.isNew) {
      setMnemonic(result.mnemonic);
      toast.success("Enterprise wallet created!");
    } else {
      toast.success("Wallet already initialized.");
    }
  }

  async function handleDeposit() {
    // Deposit 100 USDC (6 decimals) into private pool
    await depositToPool(MOCK_USDC, BigInt(100 * 1e6));
    await refresh();
    toast.success("Deposited 100 USDC to private pool");
  }

  // Live block number polling (every 2s)
  useEffect(() => {
    if (!providerRef.current) {
      providerRef.current = new ethers.JsonRpcProvider(MONAD_CONFIG.rpcUrl);
    }
    const provider = providerRef.current;

    // Initial fetch
    provider.getBlockNumber().then(setBlockNumber).catch(console.error);

    const blockInterval = setInterval(async () => {
      try {
        const block = await provider.getBlockNumber();
        setBlockNumber(block);
      } catch (err) {
        console.error("Block polling error:", err);
      }
    }, 2000);

    return () => clearInterval(blockInterval);
  }, []);

  useEffect(() => {
    const interval = setInterval(() => {
      setLiveTxCount((prev) => prev + Math.floor(Math.random() * 3));
    }, 3000);
    return () => clearInterval(interval);
  }, []);

  const budgetPercent = Math.round(
    (dashboardStats.budgetUsed / dashboardStats.totalBudget) * 100
  );

  const poolBalance = balances?.[MOCK_USDC]
    ? (Number(balances[MOCK_USDC]) / 1e6).toFixed(2)
    : "0.00";

  return (
    <div className="space-y-6">
      {/* Unlink Enterprise Wallet Setup */}
      {!walletExists && ready && (
        <div className="bg-[#7C3AED]/5 border border-[#7C3AED]/15 rounded-xl p-5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-[#7C3AED]/10 flex items-center justify-center">
                <Lock className="w-5 h-5 text-[#7C3AED]" />
              </div>
              <div>
                <h4 className="text-[14px] text-foreground">Enterprise Wallet Not Initialized</h4>
                <p className="text-[12px] text-muted-foreground">Set up your Unlink private pool to enable agent funding</p>
              </div>
            </div>
            <button
              onClick={handleSetup}
              disabled={busy}
              className="flex items-center gap-2 bg-[#7C3AED] text-white px-5 py-2.5 rounded-lg hover:bg-[#6D28D9] transition-colors text-[13px] disabled:opacity-50"
            >
              <Wallet className="w-4 h-4" />
              {busy ? "Initializing..." : "Initialize Enterprise Wallet"}
            </button>
          </div>
          {mnemonic && (
            <div className="mt-4 p-4 bg-amber-50 border border-amber-200 rounded-lg">
              <p className="text-[12px] font-semibold text-red-600 mb-1">⚠ BACKUP THIS MNEMONIC — IT CONTROLS YOUR PRIVATE POOL:</p>
              <code className="block text-[12px] text-foreground break-all" style={{ fontFamily: "'Roboto Mono', monospace" }}>
                {mnemonic}
              </code>
            </div>
          )}
        </div>
      )}

      {/* Unlink Private Pool Card */}
      {walletExists && (
        <div className="bg-card rounded-xl border border-border p-5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-[#7C3AED]/10 flex items-center justify-center">
                <Wallet className="w-5 h-5 text-[#7C3AED]" />
              </div>
              <div>
                <p className="text-[13px] text-muted-foreground">Unlink Private Pool</p>
                <p className="text-[22px] text-foreground" style={{ fontFamily: "'Roboto Mono', monospace" }}>
                  {poolBalance} USDC
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="text-right mr-4">
                <p className="text-[11px] text-muted-foreground">Account</p>
                <p className="text-[11px] text-foreground truncate max-w-[140px]" style={{ fontFamily: "'Roboto Mono', monospace" }}>
                  {activeAccount?.address || "—"}
                </p>
              </div>
              <span className={`text-[11px] px-2.5 py-1 rounded-full ${
                busy ? "bg-amber-50 text-amber-700" : "bg-emerald-50 text-emerald-700"
              }`}>
                {busy ? status || "Processing..." : "Ready"}
              </span>
              <button
                onClick={handleDeposit}
                disabled={busy}
                className="flex items-center gap-2 bg-[#7C3AED] text-white px-4 py-2 rounded-lg hover:bg-[#6D28D9] transition-colors text-[13px] disabled:opacity-50"
              >
                <DollarSign className="w-4 h-4" />
                {busy ? "Depositing..." : "Deposit 100 USDC"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Monad Live Block */}
      <div className="bg-card rounded-xl border border-border p-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-[#836EF9]/10 flex items-center justify-center">
            <Blocks className="w-5 h-5 text-[#836EF9]" />
          </div>
          <div>
            <p className="text-[12px] text-muted-foreground">Monad Testnet — Live Block</p>
            <p className="text-[20px] text-foreground" style={{ fontFamily: "'Roboto Mono', monospace" }}>
              {blockNumber !== null ? `#${blockNumber.toLocaleString()}` : "Connecting..."}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className="relative flex h-2.5 w-2.5">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
          </span>
          <span className="text-[11px] text-emerald-600">Live (~400ms blocks)</span>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          icon={Bot}
          label="Active Agents"
          value={`${dashboardStats.activeAgents}`}
          subValue={`${dashboardStats.totalAgents} total deployed`}
          trend="+2 this week"
          trendUp={true}
          accentColor="#7C3AED"
        />
        <StatCard
          icon={Activity}
          label="Transactions Processed"
          value={liveTxCount.toLocaleString()}
          subValue="Last 24 hours"
          trend="+12.4%"
          trendUp={true}
          accentColor="#3b82f6"
        />
        <StatCard
          icon={ShieldCheck}
          label="Compliance Rate"
          value={`${dashboardStats.complianceRate}%`}
          subValue={`${dashboardStats.rejectedToday} rejected today`}
          trend="+0.3%"
          trendUp={true}
          accentColor="#10b981"
        />
        <StatCard
          icon={DollarSign}
          label="Budget Utilized"
          value={`$${(dashboardStats.budgetUsed / 1000).toFixed(0)}K`}
          subValue={`of $${(dashboardStats.totalBudget / 1000).toFixed(0)}K allocated`}
          accentColor="#f59e0b"
        />
      </div>

      {/* Budget Bar */}
      <div className="bg-card rounded-xl border border-border p-5">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-[15px] text-foreground">Enterprise Budget Utilization</h3>
          <span className="text-[13px] text-muted-foreground" style={{ fontFamily: "'Roboto Mono', monospace" }}>
            {budgetPercent}% used
          </span>
        </div>
        <div className="w-full h-3 bg-muted rounded-full overflow-hidden">
          <div
            className="h-full rounded-full transition-all duration-1000"
            style={{
              width: `${budgetPercent}%`,
              background: budgetPercent > 85 ? "#ef4444" : budgetPercent > 70 ? "#f59e0b" : "#7C3AED",
            }}
          />
        </div>
        <div className="flex justify-between mt-2">
          <span className="text-[11px] text-muted-foreground" style={{ fontFamily: "'Roboto Mono', monospace" }}>
            ${dashboardStats.budgetUsed.toLocaleString()} USDC
          </span>
          <span className="text-[11px] text-muted-foreground" style={{ fontFamily: "'Roboto Mono', monospace" }}>
            ${dashboardStats.totalBudget.toLocaleString()} USDC
          </span>
        </div>
      </div>

      {/* On-Chain Events Feed */}
      {(complianceEvents.length > 0 || budgetEvents.length > 0) && (
        <div className="bg-card rounded-xl border border-border">
          <div className="flex items-center justify-between p-5 border-b border-border">
            <div className="flex items-center gap-2">
              <Bell className="w-4 h-4 text-[#7C3AED]" />
              <h3 className="text-[15px] text-foreground">On-Chain Events</h3>
            </div>
            <span className="text-[11px] text-muted-foreground" style={{ fontFamily: "'Roboto Mono', monospace" }}>
              Live from contracts
            </span>
          </div>
          <div className="divide-y divide-border max-h-[220px] overflow-y-auto">
            {complianceEvents.slice(0, 5).map((evt, i) => (
              <div key={`c-${i}`} className="flex items-center justify-between px-5 py-3">
                <div className="flex items-center gap-3">
                  <div className="w-7 h-7 rounded-lg bg-emerald-50 flex items-center justify-center">
                    <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                  </div>
                  <div>
                    <p className="text-[12px] text-foreground">Compliance Stamped</p>
                    <p className="text-[10px] text-muted-foreground" style={{ fontFamily: "'Roboto Mono', monospace" }}>
                      {evt.txHash.slice(0, 18)}...
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-[11px] text-muted-foreground" style={{ fontFamily: "'Roboto Mono', monospace" }}>
                    Block {evt.blockNumber.toLocaleString()}
                  </span>
                  <a
                    href={getExplorerUrl(evt.txHash)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[#7C3AED] hover:text-[#6D28D9]"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                </div>
              </div>
            ))}
            {budgetEvents.slice(0, 5).map((evt, i) => (
              <div key={`b-${i}`} className="flex items-center justify-between px-5 py-3">
                <div className="flex items-center gap-3">
                  <div className={`w-7 h-7 rounded-lg flex items-center justify-center ${
                    evt.type === "deposit" ? "bg-blue-50" : evt.type === "allocate" ? "bg-amber-50" : "bg-purple-50"
                  }`}>
                    <DollarSign className={`w-3.5 h-3.5 ${
                      evt.type === "deposit" ? "text-blue-600" : evt.type === "allocate" ? "text-amber-600" : "text-purple-600"
                    }`} />
                  </div>
                  <div>
                    <p className="text-[12px] text-foreground">
                      {evt.type === "deposit" ? "Budget Deposited" : evt.type === "allocate" ? "Budget Allocated" : "Payment Executed"}
                    </p>
                    <p className="text-[10px] text-muted-foreground" style={{ fontFamily: "'Roboto Mono', monospace" }}>
                      {evt.amount} USDC{evt.agent ? ` → ${evt.agent.slice(0, 10)}...` : ""}
                    </p>
                  </div>
                </div>
                <span className="text-[11px] text-muted-foreground" style={{ fontFamily: "'Roboto Mono', monospace" }}>
                  Block {evt.blockNumber.toLocaleString()}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* On-Chain Budget (from BudgetVault) */}
      {availableBudget && (
        <div className="bg-card rounded-xl border border-border p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[12px] text-muted-foreground">BudgetVault — Available On-Chain</p>
              <p className="text-[22px] text-foreground" style={{ fontFamily: "'Roboto Mono', monospace" }}>
                {Number(availableBudget).toLocaleString()} USDC
              </p>
            </div>
            <div className="flex items-center gap-4">
              {totalStamped !== null && (
                <div className="text-right">
                  <p className="text-[11px] text-muted-foreground">Compliance Stamps</p>
                  <p className="text-[16px] text-emerald-600 flex items-center gap-1" style={{ fontFamily: "'Roboto Mono', monospace" }}>
                    <CheckCircle2 className="w-4 h-4" />
                    {totalStamped}
                  </p>
                </div>
              )}
              <a
                href={`${MONAD_CONFIG.explorerUrl}/address/${MONAD_CONFIG.contracts.budgetVault}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1 text-[12px] text-[#7C3AED] hover:underline"
              >
                View Contract <ExternalLink className="w-3 h-3" />
              </a>
            </div>
          </div>
        </div>
      )}

      {/* On-Chain Compliance Rules */}
      {onChainRules.length > 0 && (
        <div className="bg-card rounded-xl border border-border">
          <div className="flex items-center justify-between p-5 border-b border-border">
            <div className="flex items-center gap-2">
              <Scale className="w-4 h-4 text-[#7C3AED]" />
              <h3 className="text-[15px] text-foreground">On-Chain Compliance Rules</h3>
            </div>
            <a
              href={`${MONAD_CONFIG.explorerUrl}/address/${MONAD_CONFIG.contracts.complianceRegistry}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1 text-[11px] text-[#7C3AED] hover:underline"
            >
              ComplianceRegistry <ExternalLink className="w-3 h-3" />
            </a>
          </div>
          <div className="divide-y divide-border">
            {onChainRules.map((rule) => (
              <div key={rule.index} className="flex items-center justify-between px-5 py-3">
                <div className="flex items-center gap-3">
                  <span className={`w-2 h-2 rounded-full ${rule.enabled ? "bg-emerald-500" : "bg-gray-300"}`} />
                  <div>
                    <p className="text-[13px] text-foreground">{rule.name}</p>
                    <p className="text-[10px] text-muted-foreground" style={{ fontFamily: "'Roboto Mono', monospace" }}>
                      {rule.ruleType}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-[12px] text-foreground" style={{ fontFamily: "'Roboto Mono', monospace" }}>
                    {rule.ruleType === "budget_cap" || rule.ruleType === "aml_threshold"
                      ? `${(Number(rule.value) / 1e6).toLocaleString()} USDC`
                      : rule.value}
                  </span>
                  <span className={`text-[10px] px-2 py-0.5 rounded-full ${
                    rule.enabled ? "bg-emerald-50 text-emerald-700" : "bg-gray-100 text-gray-500"
                  }`}>
                    {rule.enabled ? "Active" : "Disabled"}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Two columns */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Live Transaction Feed */}
        <div className="lg:col-span-2 bg-card rounded-xl border border-border">
          <div className="flex items-center justify-between p-5 border-b border-border">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <h3 className="text-[15px] text-foreground">Live Transaction Feed</h3>
            </div>
            <span className="text-[11px] text-muted-foreground" style={{ fontFamily: "'Roboto Mono', monospace" }}>
              Monad Testnet
            </span>
          </div>
          <div className="divide-y divide-border">
            {transactions.slice(0, 6).map((tx) => (
              <div
                key={tx.id}
                className="flex items-center justify-between px-5 py-3.5 hover:bg-muted/30 transition-colors"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div
                    className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                      tx.status === "compliant"
                        ? "bg-emerald-50"
                        : tx.status === "rejected"
                        ? "bg-red-50"
                        : "bg-amber-50"
                    }`}
                  >
                    {tx.status === "compliant" ? (
                      <ShieldCheck className="w-4 h-4 text-emerald-600" />
                    ) : tx.status === "rejected" ? (
                      <ShieldCheck className="w-4 h-4 text-red-500" />
                    ) : (
                      <Clock className="w-4 h-4 text-amber-500" />
                    )}
                  </div>
                  <div className="min-w-0">
                    <p className="text-[13px] text-foreground truncate">
                      {tx.agentName}{" "}
                      <span className="text-muted-foreground">→</span>{" "}
                      {tx.vendor}
                    </p>
                    <div className="flex items-center gap-2 mt-0.5">
                      <a
                        href={getExplorerUrl(tx.txHash)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-[11px] text-[#7C3AED] hover:underline inline-flex items-center gap-1"
                        style={{ fontFamily: "'Roboto Mono', monospace" }}
                      >
                        {tx.txHash}
                        <ExternalLink className="w-2.5 h-2.5" />
                      </a>
                      <PrivacyBadge shielded={tx.shielded} />
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-3 ml-4">
                  <div className="text-right">
                    <p className="text-[13px] text-foreground" style={{ fontFamily: "'Roboto Mono', monospace" }}>
                      {tx.shielded ? "****" : `$${tx.amount.toLocaleString()}`}
                    </p>
                    <p className="text-[11px] text-muted-foreground">
                      {formatTimeAgo(tx.timestamp)}
                    </p>
                  </div>
                  <ComplianceBadge status={tx.status} />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Agent Status */}
        <div className="bg-card rounded-xl border border-border">
          <div className="flex items-center justify-between p-5 border-b border-border">
            <h3 className="text-[15px] text-foreground">Agent Status</h3>
            <span className="text-[12px] text-[#7C3AED] cursor-pointer hover:underline">
              View All
            </span>
          </div>
          <div className="divide-y divide-border">
            {agents.slice(0, 5).map((agent) => (
              <div
                key={agent.id}
                className="flex items-center justify-between px-5 py-3 hover:bg-muted/30 transition-colors"
              >
                <div className="min-w-0">
                  <p className="text-[13px] text-foreground truncate">
                    {agent.name}
                  </p>
                  <p className="text-[11px] text-muted-foreground" style={{ fontFamily: "'Roboto Mono', monospace" }}>
                    {agent.wallet}
                  </p>
                </div>
                <div className="flex items-center gap-2 ml-2">
                  <div className="w-16 h-1.5 bg-muted rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full"
                      style={{
                        width: `${(agent.budgetUsed / agent.budgetAllocated) * 100}%`,
                        backgroundColor:
                          agent.budgetUsed / agent.budgetAllocated > 0.9
                            ? "#ef4444"
                            : agent.budgetUsed / agent.budgetAllocated > 0.7
                            ? "#f59e0b"
                            : "#7C3AED",
                      }}
                    />
                  </div>
                  <span
                    className={`w-2 h-2 rounded-full ${
                      agent.status === "active"
                        ? "bg-emerald-500"
                        : agent.status === "paused"
                        ? "bg-amber-500"
                        : "bg-gray-400"
                    }`}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Quick Actions & Settlement Info */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <button
          onClick={() => {
            toast.success("Navigating to Agent Deployment...");
            navigate("/agents");
          }}
          className="flex items-center gap-3 bg-[#7C3AED] text-white rounded-xl px-5 py-4 hover:bg-[#6D28D9] transition-colors"
        >
          <Bot className="w-5 h-5" />
          <span className="text-[14px]">Deploy New Agent</span>
        </button>
        <button
          onClick={() => {
            toast.success("Navigating to Audit Reports...");
            navigate("/audit");
          }}
          className="flex items-center gap-3 bg-card text-foreground rounded-xl px-5 py-4 border border-border hover:bg-muted/50 transition-colors"
        >
          <FileText className="w-5 h-5 text-[#7C3AED]" />
          <span className="text-[14px]">Generate Audit Report</span>
        </button>
        <div className="flex items-center gap-3 bg-card rounded-xl px-5 py-4 border border-border">
          <Zap className="w-5 h-5 text-amber-500" />
          <div>
            <p className="text-[13px] text-foreground">Avg. Settlement</p>
            <p className="text-[18px] text-[#7C3AED]" style={{ fontFamily: "'Roboto Mono', monospace" }}>
              {dashboardStats.avgSettlementTime}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

function formatTimeAgo(date: Date): string {
  const seconds = Math.floor((Date.now() - date.getTime()) / 1000);
  if (seconds < 60) return `${seconds}s ago`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  return `${hours}h ago`;
}