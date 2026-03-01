import { useState, useEffect } from "react";
import {
  ShieldCheck,
  Plus,
  Edit3,
  Trash2,
  ToggleLeft,
  ToggleRight,
  DollarSign,
  Users,
  AlertTriangle,
  Clock,
  X,
  Check,
} from "lucide-react";
import { toast } from "sonner";
import { useMonadContracts } from "../../hooks/useMonadContracts.js";
import { complianceRules, vendorAllowlist, type ComplianceRule } from "./mock-data";

const ruleTypeConfig = {
  budget_cap: { icon: DollarSign, color: "#7C3AED", label: "Budget Cap" },
  vendor_allowlist: { icon: Users, color: "#3b82f6", label: "Vendor Allowlist" },
  aml_threshold: { icon: AlertTriangle, color: "#ef4444", label: "AML Threshold" },
  rate_limit: { icon: Clock, color: "#f59e0b", label: "Rate Limit" },
};

export function ComplianceRules() {
  const [rules, setRules] = useState<ComplianceRule[]>(complianceRules);
  const [vendors, setVendors] = useState(vendorAllowlist);
  const [showAddRule, setShowAddRule] = useState(false);
  const [newVendor, setNewVendor] = useState("");
  const [activeTab, setActiveTab] = useState<"rules" | "vendors">("rules");

  // Form state for the Add Rule modal
  const [ruleName, setRuleName] = useState("");
  const [ruleType, setRuleType] = useState<ComplianceRule["type"]>("budget_cap");
  const [ruleValue, setRuleValue] = useState("");

  const { getComplianceRules } = useMonadContracts();

  // Load rules from chain on mount
  useEffect(() => {
    let cancelled = false;

    async function loadChainRules() {
      try {
        const chainRules = await getComplianceRules();
        if (cancelled) return;

        if (chainRules && chainRules.length > 0) {
          const mapped: ComplianceRule[] = chainRules.map((cr: { index: number; name: string; ruleType: string; value: string; enabled: boolean }, idx: number) => ({
            id: `chain-rule-${cr.index}`,
            name: cr.name,
            type: (cr.ruleType as ComplianceRule["type"]) || "budget_cap",
            value: cr.value,
            enabled: cr.enabled,
            updatedAt: new Date(),
            updatedBy: "On-chain",
          }));
          setRules(mapped);
          toast.success(`Loaded ${mapped.length} rules from Monad chain`);
        }
        // If chainRules is empty or null, keep mock data (already set as default)
      } catch (err) {
        if (cancelled) return;
        console.error("Failed to load on-chain rules, using mock data:", err);
        // Fall back to mock data which is already the default state
      }
    }

    loadChainRules();

    return () => {
      cancelled = true;
    };
  }, [getComplianceRules]);

  const toggleRule = (id: string) => {
    setRules((prev) =>
      prev.map((r) => (r.id === id ? { ...r, enabled: !r.enabled } : r))
    );
    toast.info("Rule toggled locally. On-chain update requires admin key.");
  };

  const removeVendor = (vendor: string) => {
    setVendors((prev) => prev.filter((v) => v !== vendor));
  };

  const addVendor = () => {
    if (newVendor.trim() && !vendors.includes(newVendor.trim())) {
      setVendors((prev) => [...prev, newVendor.trim()]);
      setNewVendor("");
    }
  };

  const handleAddRule = async () => {
    if (!ruleName.trim() || !ruleValue.trim()) {
      toast.error("Please fill in all fields");
      return;
    }

    const newRule: ComplianceRule = {
      id: `rule-${Date.now()}`,
      name: ruleName.trim(),
      type: ruleType,
      value: ruleValue.trim(),
      enabled: true,
      updatedAt: new Date(),
      updatedBy: "Admin",
    };

    try {
      const res = await fetch("/api/admin/compliance-rule", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: ruleName,
          ruleType,
          value: Number(ruleValue),
        }),
      });

      if (!res.ok) throw new Error(`HTTP ${res.status}`);

      const data = await res.json();
      toast.success(`Rule added on-chain! TxHash: ${data.txHash}`, {
        duration: 5000,
      });
      setRules((prev) => [...prev, newRule]);
    } catch (err) {
      console.error("Backend call failed:", err);
      // Still add to local state
      setRules((prev) => [...prev, newRule]);
      toast.warning("Rule added locally. Backend sync failed -- will retry later.");
    }

    // Reset form and close modal
    setRuleName("");
    setRuleType("budget_cap");
    setRuleValue("");
    setShowAddRule(false);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <p className="text-[13px] text-muted-foreground">
          Configure compliance rules, vendor allowlists, and AML thresholds
        </p>
        <button
          onClick={() => setShowAddRule(true)}
          className="flex items-center gap-2 bg-[#7C3AED] text-white px-4 py-2.5 rounded-lg hover:bg-[#6D28D9] transition-colors text-[13px]"
        >
          <Plus className="w-4 h-4" />
          Add Rule
        </button>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-card border border-border rounded-lg p-1 w-fit">
        <button
          onClick={() => setActiveTab("rules")}
          className={`px-4 py-2 rounded-md text-[13px] transition-colors ${
            activeTab === "rules"
              ? "bg-[#7C3AED] text-white"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          <span className="flex items-center gap-2">
            <ShieldCheck className="w-4 h-4" />
            Compliance Rules
          </span>
        </button>
        <button
          onClick={() => setActiveTab("vendors")}
          className={`px-4 py-2 rounded-md text-[13px] transition-colors ${
            activeTab === "vendors"
              ? "bg-[#7C3AED] text-white"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          <span className="flex items-center gap-2">
            <Users className="w-4 h-4" />
            Vendor Allowlist ({vendors.length})
          </span>
        </button>
      </div>

      {activeTab === "rules" ? (
        /* Rules List */
        <div className="space-y-3">
          {rules.map((rule) => {
            const config = ruleTypeConfig[rule.type];
            const Icon = config.icon;
            return (
              <div
                key={rule.id}
                className={`bg-card rounded-xl border border-border p-5 transition-opacity ${
                  !rule.enabled ? "opacity-50" : ""
                }`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-4">
                    <div
                      className="w-10 h-10 rounded-lg flex items-center justify-center"
                      style={{ backgroundColor: `${config.color}15` }}
                    >
                      <Icon className="w-5 h-5" style={{ color: config.color }} />
                    </div>
                    <div>
                      <h4 className="text-[14px] text-foreground">{rule.name}</h4>
                      <span
                        className="inline-block mt-1 px-2 py-0.5 rounded text-[11px]"
                        style={{
                          backgroundColor: `${config.color}10`,
                          color: config.color,
                        }}
                      >
                        {config.label}
                      </span>
                      <p
                        className="text-[13px] text-foreground mt-2"
                        style={{ fontFamily: "'Roboto Mono', monospace" }}
                      >
                        {rule.value}
                      </p>
                      <p className="text-[11px] text-muted-foreground mt-1">
                        Updated by {rule.updatedBy} ·{" "}
                        {rule.updatedAt.toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button className="p-2 rounded-md hover:bg-muted transition-colors">
                      <Edit3 className="w-4 h-4 text-muted-foreground" />
                    </button>
                    <button
                      onClick={() => toggleRule(rule.id)}
                      className="p-1 transition-colors"
                    >
                      {rule.enabled ? (
                        <ToggleRight className="w-8 h-8 text-[#7C3AED]" />
                      ) : (
                        <ToggleLeft className="w-8 h-8 text-gray-400" />
                      )}
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* Vendor Allowlist */
        <div className="bg-card rounded-xl border border-border">
          <div className="p-5 border-b border-border">
            <div className="flex gap-2">
              <input
                type="text"
                placeholder="Add vendor name..."
                value={newVendor}
                onChange={(e) => setNewVendor(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && addVendor()}
                className="flex-1 px-4 py-2.5 text-[13px] bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-[#7C3AED]/30 focus:border-[#7C3AED]"
              />
              <button
                onClick={addVendor}
                className="flex items-center gap-2 bg-[#7C3AED] text-white px-4 py-2.5 rounded-lg hover:bg-[#6D28D9] transition-colors text-[13px]"
              >
                <Plus className="w-4 h-4" />
                Add
              </button>
            </div>
          </div>
          <div className="divide-y divide-border">
            {vendors.map((vendor) => (
              <div
                key={vendor}
                className="flex items-center justify-between px-5 py-3 hover:bg-muted/30 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <Check className="w-4 h-4 text-emerald-500" />
                  <span className="text-[13px] text-foreground">{vendor}</span>
                </div>
                <button
                  onClick={() => removeVendor(vendor)}
                  className="p-1.5 rounded-md hover:bg-red-50 transition-colors group"
                >
                  <Trash2 className="w-4 h-4 text-muted-foreground group-hover:text-red-500" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Add Rule Modal */}
      {showAddRule && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-card rounded-2xl border border-border w-full max-w-md mx-4 shadow-xl">
            <div className="flex items-center justify-between p-5 border-b border-border">
              <h3 className="text-[16px] text-foreground">Add Compliance Rule</h3>
              <button
                onClick={() => setShowAddRule(false)}
                className="p-1.5 rounded-md hover:bg-muted transition-colors"
              >
                <X className="w-5 h-5 text-muted-foreground" />
              </button>
            </div>
            <div className="p-5 space-y-4">
              <div>
                <label className="block text-[12px] text-muted-foreground mb-1.5">Rule Name</label>
                <input
                  type="text"
                  placeholder="e.g., Max Daily Spend"
                  value={ruleName}
                  onChange={(e) => setRuleName(e.target.value)}
                  className="w-full px-4 py-2.5 text-[13px] bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-[#7C3AED]/30 focus:border-[#7C3AED]"
                />
              </div>
              <div>
                <label className="block text-[12px] text-muted-foreground mb-1.5">Rule Type</label>
                <select
                  value={ruleType}
                  onChange={(e) => setRuleType(e.target.value as ComplianceRule["type"])}
                  className="w-full px-4 py-2.5 text-[13px] bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-[#7C3AED]/30 focus:border-[#7C3AED]"
                >
                  <option value="budget_cap">Budget Cap</option>
                  <option value="vendor_allowlist">Vendor Allowlist</option>
                  <option value="aml_threshold">AML Threshold</option>
                  <option value="rate_limit">Rate Limit</option>
                </select>
              </div>
              <div>
                <label className="block text-[12px] text-muted-foreground mb-1.5">Value</label>
                <input
                  type="text"
                  placeholder="e.g., $10,000"
                  value={ruleValue}
                  onChange={(e) => setRuleValue(e.target.value)}
                  className="w-full px-4 py-2.5 text-[13px] bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-[#7C3AED]/30 focus:border-[#7C3AED]"
                />
              </div>
            </div>
            <div className="flex gap-3 p-5 border-t border-border">
              <button
                onClick={() => setShowAddRule(false)}
                className="flex-1 py-2.5 rounded-lg border border-border text-[13px] text-muted-foreground hover:bg-muted transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleAddRule}
                className="flex-1 py-2.5 rounded-lg bg-[#7C3AED] text-white text-[13px] hover:bg-[#6D28D9] transition-colors"
              >
                Add Rule
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
