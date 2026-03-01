import { useState, useEffect } from "react";
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
} from "lucide-react";
import { dashboardStats, transactions, agents } from "./mock-data";
import { useNavigate } from "react-router";
import { toast } from "sonner";

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
  const navigate = useNavigate();

  useEffect(() => {
    const interval = setInterval(() => {
      setLiveTxCount((prev) => prev + Math.floor(Math.random() * 3));
    }, 3000);
    return () => clearInterval(interval);
  }, []);

  const budgetPercent = Math.round(
    (dashboardStats.budgetUsed / dashboardStats.totalBudget) * 100
  );

  return (
    <div className="space-y-6">
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
                      <span className="text-[11px] text-muted-foreground" style={{ fontFamily: "'Roboto Mono', monospace" }}>
                        {tx.txHash}
                      </span>
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