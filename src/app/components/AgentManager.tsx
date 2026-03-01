import { useState } from "react";
import {
  Bot,
  Search,
  Plus,
  MoreVertical,
  Wallet,
  TrendingUp,
  Pause,
  Play,
  X,
  Shield,
} from "lucide-react";
import { agents, type Agent } from "./mock-data";
import { toast } from "sonner";

function StatusBadge({ status }: { status: Agent["status"] }) {
  const config = {
    active: { bg: "bg-emerald-50", text: "text-emerald-700", dot: "bg-emerald-500", label: "Active" },
    inactive: { bg: "bg-gray-100", text: "text-gray-600", dot: "bg-gray-400", label: "Inactive" },
    paused: { bg: "bg-amber-50", text: "text-amber-700", dot: "bg-amber-500", label: "Paused" },
  };
  const c = config[status];
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] ${c.bg} ${c.text}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${c.dot}`} />
      {c.label}
    </span>
  );
}

function ComplianceIndicator({ status }: { status: Agent["complianceStatus"] }) {
  const config = {
    compliant: { color: "text-emerald-600", bg: "bg-emerald-50", label: "Compliant" },
    flagged: { color: "text-red-600", bg: "bg-red-50", label: "Flagged" },
    pending: { color: "text-amber-600", bg: "bg-amber-50", label: "Pending" },
  };
  const c = config[status];
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] ${c.bg} ${c.color}`}>
      <Shield className="w-3 h-3" />
      {c.label}
    </span>
  );
}

export function AgentManager() {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedAgent, setSelectedAgent] = useState<Agent | null>(null);
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [agentList, setAgentList] = useState<Agent[]>(agents);

  // Deploy Agent modal state
  const [showDeployModal, setShowDeployModal] = useState(false);
  const [deployName, setDeployName] = useState("");
  const [deployBudget, setDeployBudget] = useState("");
  const [deploying, setDeploying] = useState(false);

  // Allocate Budget modal state
  const [showBudgetInput, setShowBudgetInput] = useState(false);
  const [budgetAmount, setBudgetAmount] = useState("");
  const [allocatingBudget, setAllocatingBudget] = useState(false);

  const filteredAgents = agentList.filter((agent) => {
    const matchesSearch =
      agent.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      agent.wallet.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesFilter = filterStatus === "all" || agent.status === filterStatus;
    return matchesSearch && matchesFilter;
  });

  const handleDeployAgent = async () => {
    if (!deployName.trim()) {
      toast.error("Please enter an agent name");
      return;
    }
    const budgetNum = parseFloat(deployBudget);
    if (!budgetNum || budgetNum <= 0) {
      toast.error("Please enter a valid budget amount");
      return;
    }

    setDeploying(true);
    const agentIndex = agentList.length;
    let burnerAddress = `0x${Math.random().toString(16).slice(2, 6)}...${Math.random().toString(16).slice(2, 6)}`;

    try {
      // Step 1: Create agent to get burner address
      const createRes = await fetch("/api/agents/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ agentIndex }),
      });
      if (!createRes.ok) throw new Error("Failed to create agent");
      const createData = await createRes.json();
      burnerAddress = createData.burnerAddress;

      // Step 2: Fund the agent
      const fundRes = await fetch("/api/funding/fund-agent", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ agentIndex, amount: budgetNum * 1e6 }),
      });
      if (!fundRes.ok) throw new Error("Failed to fund agent");

      toast.success(`Agent deployed! Burner: ${burnerAddress}`);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Unknown error";
      toast.error(`Backend error: ${message}. Agent added with generated address.`);
    }

    // Always add agent to local state (even if backend fails)
    const newAgent: Agent = {
      id: `agent-${String(agentIndex + 1).padStart(3, "0")}`,
      name: deployName.trim(),
      wallet: burnerAddress,
      budgetAllocated: budgetNum,
      budgetUsed: 0,
      status: "active",
      lastTransaction: "Just now",
      complianceStatus: "pending",
      type: "Custom Agent",
    };
    setAgentList((prev) => [...prev, newAgent]);

    // Reset modal state
    setDeploying(false);
    setDeployName("");
    setDeployBudget("");
    setShowDeployModal(false);
  };

  const handleAllocateBudget = async () => {
    if (!selectedAgent) return;
    const amount = parseFloat(budgetAmount);
    if (!amount || amount <= 0) {
      toast.error("Please enter a valid amount");
      return;
    }

    const agentIndex = agentList.findIndex((a) => a.id === selectedAgent.id);
    if (agentIndex === -1) {
      toast.error("Agent not found");
      return;
    }

    setAllocatingBudget(true);
    try {
      const res = await fetch("/api/admin/budget", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ agentIndex, limit: amount * 1e6 }),
      });
      if (!res.ok) throw new Error("Failed to allocate budget");
      toast.success(`Budget of $${amount.toLocaleString()} allocated to ${selectedAgent.name}`);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Unknown error";
      toast.error(`Budget allocation failed: ${message}`);
    }

    // Update local state regardless
    setAgentList((prev) =>
      prev.map((a) =>
        a.id === selectedAgent.id ? { ...a, budgetAllocated: a.budgetAllocated + amount } : a
      )
    );

    // Update the selected agent in the detail modal
    setSelectedAgent((prev) =>
      prev ? { ...prev, budgetAllocated: prev.budgetAllocated + amount } : prev
    );

    setAllocatingBudget(false);
    setBudgetAmount("");
    setShowBudgetInput(false);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <p className="text-[13px] text-muted-foreground mt-1">
            Manage AI agent wallets, budgets, and compliance status
          </p>
        </div>
        <button
          onClick={() => setShowDeployModal(true)}
          className="flex items-center gap-2 bg-[#7C3AED] text-white px-4 py-2.5 rounded-lg hover:bg-[#6D28D9] transition-colors text-[13px]"
        >
          <Plus className="w-4 h-4" />
          Deploy Agent
        </button>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search agents..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 text-[13px] bg-card border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-[#7C3AED]/30 focus:border-[#7C3AED]"
          />
        </div>
        <div className="flex gap-1 bg-card border border-border rounded-lg p-1">
          {["all", "active", "paused", "inactive"].map((status) => (
            <button
              key={status}
              onClick={() => setFilterStatus(status)}
              className={`px-3 py-1.5 rounded-md text-[12px] transition-colors ${
                filterStatus === status
                  ? "bg-[#7C3AED] text-white"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {status.charAt(0).toUpperCase() + status.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {/* Agent Table */}
      <div className="bg-card rounded-xl border border-border overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="border-b border-border">
              <th className="text-left px-5 py-3 text-[12px] text-muted-foreground uppercase tracking-wider">
                Agent
              </th>
              <th className="text-left px-5 py-3 text-[12px] text-muted-foreground uppercase tracking-wider">
                Wallet
              </th>
              <th className="text-left px-5 py-3 text-[12px] text-muted-foreground uppercase tracking-wider">
                Budget
              </th>
              <th className="text-left px-5 py-3 text-[12px] text-muted-foreground uppercase tracking-wider">
                Status
              </th>
              <th className="text-left px-5 py-3 text-[12px] text-muted-foreground uppercase tracking-wider">
                Compliance
              </th>
              <th className="text-left px-5 py-3 text-[12px] text-muted-foreground uppercase tracking-wider">
                Last Txn
              </th>
              <th className="text-right px-5 py-3 text-[12px] text-muted-foreground uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {filteredAgents.map((agent) => {
              const utilization = Math.round(
                (agent.budgetUsed / agent.budgetAllocated) * 100
              );
              return (
                <tr
                  key={agent.id}
                  className="hover:bg-muted/30 transition-colors cursor-pointer"
                  onClick={() => setSelectedAgent(agent)}
                >
                  <td className="px-5 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-[#7C3AED]/10 flex items-center justify-center">
                        <Bot className="w-4 h-4 text-[#7C3AED]" />
                      </div>
                      <div>
                        <p className="text-[13px] text-foreground">{agent.name}</p>
                        <p className="text-[11px] text-muted-foreground">{agent.type}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-5 py-4">
                    <span className="text-[12px] text-muted-foreground" style={{ fontFamily: "'Roboto Mono', monospace" }}>
                      {agent.wallet}
                    </span>
                  </td>
                  <td className="px-5 py-4">
                    <div className="space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="text-[12px] text-foreground" style={{ fontFamily: "'Roboto Mono', monospace" }}>
                          ${agent.budgetUsed.toLocaleString()}
                        </span>
                        <span className="text-[11px] text-muted-foreground">{utilization}%</span>
                      </div>
                      <div className="w-24 h-1.5 bg-muted rounded-full overflow-hidden">
                        <div
                          className="h-full rounded-full"
                          style={{
                            width: `${utilization}%`,
                            backgroundColor:
                              utilization > 90 ? "#ef4444" : utilization > 70 ? "#f59e0b" : "#7C3AED",
                          }}
                        />
                      </div>
                      <span className="text-[11px] text-muted-foreground">
                        of ${agent.budgetAllocated.toLocaleString()}
                      </span>
                    </div>
                  </td>
                  <td className="px-5 py-4">
                    <StatusBadge status={agent.status} />
                  </td>
                  <td className="px-5 py-4">
                    <ComplianceIndicator status={agent.complianceStatus} />
                  </td>
                  <td className="px-5 py-4">
                    <span className="text-[12px] text-muted-foreground">
                      {agent.lastTransaction}
                    </span>
                  </td>
                  <td className="px-5 py-4 text-right">
                    <button
                      className="p-1.5 rounded-md hover:bg-muted transition-colors"
                      onClick={(e) => {
                        e.stopPropagation();
                      }}
                    >
                      <MoreVertical className="w-4 h-4 text-muted-foreground" />
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Agent Detail Modal */}
      {selectedAgent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-card rounded-2xl border border-border w-full max-w-lg mx-4 shadow-xl">
            <div className="flex items-center justify-between p-5 border-b border-border">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-[#7C3AED]/10 flex items-center justify-center">
                  <Bot className="w-5 h-5 text-[#7C3AED]" />
                </div>
                <div>
                  <h3 className="text-[16px] text-foreground">{selectedAgent.name}</h3>
                  <p className="text-[12px] text-muted-foreground">{selectedAgent.type}</p>
                </div>
              </div>
              <button
                onClick={() => {
                  setSelectedAgent(null);
                  setShowBudgetInput(false);
                  setBudgetAmount("");
                }}
                className="p-1.5 rounded-md hover:bg-muted transition-colors"
              >
                <X className="w-5 h-5 text-muted-foreground" />
              </button>
            </div>
            <div className="p-5 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-muted/50 rounded-lg p-3">
                  <div className="flex items-center gap-2 mb-1">
                    <Wallet className="w-4 h-4 text-muted-foreground" />
                    <span className="text-[12px] text-muted-foreground">Wallet</span>
                  </div>
                  <p className="text-[13px] text-foreground" style={{ fontFamily: "'Roboto Mono', monospace" }}>
                    {selectedAgent.wallet}
                  </p>
                </div>
                <div className="bg-muted/50 rounded-lg p-3">
                  <div className="flex items-center gap-2 mb-1">
                    <TrendingUp className="w-4 h-4 text-muted-foreground" />
                    <span className="text-[12px] text-muted-foreground">Utilization</span>
                  </div>
                  <p className="text-[13px] text-foreground" style={{ fontFamily: "'Roboto Mono', monospace" }}>
                    {Math.round((selectedAgent.budgetUsed / selectedAgent.budgetAllocated) * 100)}%
                  </p>
                </div>
              </div>
              <div>
                <div className="flex justify-between text-[12px] mb-1">
                  <span className="text-muted-foreground">Budget</span>
                  <span className="text-foreground" style={{ fontFamily: "'Roboto Mono', monospace" }}>
                    ${selectedAgent.budgetUsed.toLocaleString()} / ${selectedAgent.budgetAllocated.toLocaleString()}
                  </span>
                </div>
                <div className="w-full h-2.5 bg-muted rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full bg-[#7C3AED]"
                    style={{
                      width: `${(selectedAgent.budgetUsed / selectedAgent.budgetAllocated) * 100}%`,
                    }}
                  />
                </div>
              </div>
              <div className="flex items-center justify-between">
                <StatusBadge status={selectedAgent.status} />
                <ComplianceIndicator status={selectedAgent.complianceStatus} />
              </div>

              {/* Budget Allocation Input */}
              {showBudgetInput && (
                <div className="flex items-center gap-2 pt-2">
                  <input
                    type="number"
                    placeholder="Amount ($)"
                    value={budgetAmount}
                    onChange={(e) => setBudgetAmount(e.target.value)}
                    className="flex-1 px-3 py-2 text-[13px] bg-muted/50 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-[#7C3AED]/30 focus:border-[#7C3AED]"
                  />
                  <button
                    onClick={handleAllocateBudget}
                    disabled={allocatingBudget}
                    className="px-4 py-2 rounded-lg bg-[#7C3AED] text-white text-[13px] hover:bg-[#6D28D9] transition-colors disabled:opacity-50"
                  >
                    {allocatingBudget ? "Allocating..." : "Confirm"}
                  </button>
                  <button
                    onClick={() => {
                      setShowBudgetInput(false);
                      setBudgetAmount("");
                    }}
                    className="px-3 py-2 rounded-lg border border-border text-[13px] text-muted-foreground hover:bg-muted transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              )}
            </div>
            <div className="flex gap-3 p-5 border-t border-border">
              <button
                onClick={() => setShowBudgetInput(true)}
                className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg bg-[#7C3AED] text-white text-[13px] hover:bg-[#6D28D9] transition-colors"
              >
                <Wallet className="w-4 h-4" />
                Allocate Budget
              </button>
              <button className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg border border-border text-[13px] text-muted-foreground hover:bg-muted transition-colors">
                {selectedAgent.status === "active" ? (
                  <>
                    <Pause className="w-4 h-4" /> Pause
                  </>
                ) : (
                  <>
                    <Play className="w-4 h-4" /> Activate
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Deploy Agent Modal */}
      {showDeployModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-card rounded-2xl border border-border w-full max-w-md mx-4 shadow-xl">
            <div className="flex items-center justify-between p-5 border-b border-border">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-[#7C3AED]/10 flex items-center justify-center">
                  <Plus className="w-5 h-5 text-[#7C3AED]" />
                </div>
                <div>
                  <h3 className="text-[16px] text-foreground">Deploy New Agent</h3>
                  <p className="text-[12px] text-muted-foreground">Create and fund a new AI agent</p>
                </div>
              </div>
              <button
                onClick={() => {
                  setShowDeployModal(false);
                  setDeployName("");
                  setDeployBudget("");
                }}
                className="p-1.5 rounded-md hover:bg-muted transition-colors"
              >
                <X className="w-5 h-5 text-muted-foreground" />
              </button>
            </div>
            <div className="p-5 space-y-4">
              <div>
                <label className="block text-[12px] text-muted-foreground mb-1.5">Agent Name</label>
                <input
                  type="text"
                  placeholder="e.g. Omega Data Miner"
                  value={deployName}
                  onChange={(e) => setDeployName(e.target.value)}
                  className="w-full px-3 py-2.5 text-[13px] bg-muted/50 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-[#7C3AED]/30 focus:border-[#7C3AED]"
                />
              </div>
              <div>
                <label className="block text-[12px] text-muted-foreground mb-1.5">Initial Budget ($)</label>
                <input
                  type="number"
                  placeholder="e.g. 50000"
                  value={deployBudget}
                  onChange={(e) => setDeployBudget(e.target.value)}
                  className="w-full px-3 py-2.5 text-[13px] bg-muted/50 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-[#7C3AED]/30 focus:border-[#7C3AED]"
                />
              </div>
            </div>
            <div className="flex gap-3 p-5 border-t border-border">
              <button
                onClick={handleDeployAgent}
                disabled={deploying}
                className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg bg-[#7C3AED] text-white text-[13px] hover:bg-[#6D28D9] transition-colors disabled:opacity-50"
              >
                <Bot className="w-4 h-4" />
                {deploying ? "Deploying..." : "Deploy Agent"}
              </button>
              <button
                onClick={() => {
                  setShowDeployModal(false);
                  setDeployName("");
                  setDeployBudget("");
                }}
                className="px-4 py-2.5 rounded-lg border border-border text-[13px] text-muted-foreground hover:bg-muted transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
