import { useState, useEffect, useRef } from "react";
import {
  Play,
  Bot,
  Server,
  ShieldCheck,
  Shield,
  Zap,
  CheckCircle2,
  XCircle,
  ArrowRight,
  RotateCcw,
  Loader2,
  Eye,
  EyeOff,
  Copy,
  Lock,
} from "lucide-react";
import { toast } from "sonner";

type DemoStep = {
  id: string;
  label: string;
  description: string;
  icon: any;
  status: "idle" | "running" | "success" | "error";
  detail?: string;
  duration: number;
};

const initialSteps: DemoStep[] = [
  {
    id: "request",
    label: "Agent HTTP Request",
    description: "AI agent requests premium financial data from paywalled API",
    icon: Bot,
    status: "idle",
    duration: 1200,
  },
  {
    id: "402",
    label: "HTTP 402 Payment Required",
    description: "Resource server responds with payment requirements (x402 protocol)",
    icon: Server,
    status: "idle",
    duration: 800,
  },
  {
    id: "compliance",
    label: "Compliance Check",
    description: "CompliAgent validates: budget ✓ vendor allowlist ✓ AML clean ✓",
    icon: ShieldCheck,
    status: "idle",
    duration: 1500,
  },
  {
    id: "zk-stamp",
    label: "ZK Compliance Stamp",
    description: "Generating zero-knowledge proof via Unlink SDK...",
    icon: Shield,
    status: "idle",
    duration: 2000,
  },
  {
    id: "settlement",
    label: "Monad Settlement",
    description: "Shielded transfer executed on Monad (800ms finality)",
    icon: Zap,
    status: "idle",
    duration: 1000,
  },
  {
    id: "delivery",
    label: "Resource Delivered",
    description: "Agent retries HTTP request with payment receipt — data delivered",
    icon: CheckCircle2,
    status: "idle",
    duration: 800,
  },
];

const affiliateSteps: DemoStep[] = [
  {
    id: "buyer-pay",
    label: "Buyer Payment",
    description: "Buyer (Entity 3) initiates $1,000 purchase via x402",
    icon: Bot,
    status: "idle",
    duration: 1000,
  },
  {
    id: "compliance-check",
    label: "Compliance Verification",
    description: "CompliAgent validates all three parties + commission structure",
    icon: ShieldCheck,
    status: "idle",
    duration: 1500,
  },
  {
    id: "zk-split",
    label: "ZK Commission Verification",
    description: "Proving x + y = z without revealing individual values (x=150, y=850)",
    icon: Shield,
    status: "idle",
    duration: 2000,
  },
  {
    id: "affiliate-pay",
    label: "Affiliate Payment (15%)",
    description: "Shielded transfer to Affiliate (Entity 2) — amount hidden on-chain",
    icon: Lock,
    status: "idle",
    duration: 1200,
  },
  {
    id: "merchant-pay",
    label: "Merchant Payment (85%)",
    description: "Shielded transfer to Merchant (Entity 1) — amount hidden on-chain",
    icon: Lock,
    status: "idle",
    duration: 1200,
  },
  {
    id: "verified",
    label: "Settlement Complete",
    description: "All parties paid correctly. ZK proof on-chain. No data exposed.",
    icon: CheckCircle2,
    status: "idle",
    duration: 800,
  },
];

export function AgentDemo() {
  const [activeDemo, setActiveDemo] = useState<"x402" | "affiliate">("x402");
  const [steps, setSteps] = useState<DemoStep[]>(initialSteps);
  const [isRunning, setIsRunning] = useState(false);
  const [currentStep, setCurrentStep] = useState(-1);
  const [demoComplete, setDemoComplete] = useState(false);
  const [txHash, setTxHash] = useState("");
  const [blockNumber, setBlockNumber] = useState(0);
  const [proofHash, setProofHash] = useState("");
  const abortRef = useRef(false);

  const switchDemo = (demo: "x402" | "affiliate") => {
    if (isRunning) return;
    setActiveDemo(demo);
    setSteps(demo === "x402" ? initialSteps : affiliateSteps);
    resetDemo();
  };

  const resetDemo = () => {
    abortRef.current = true;
    setIsRunning(false);
    setCurrentStep(-1);
    setDemoComplete(false);
    setTxHash("");
    setBlockNumber(0);
    setProofHash("");
    setSteps((prev) => prev.map((s) => ({ ...s, status: "idle" })));
    setTimeout(() => { abortRef.current = false; }, 100);
  };

  const runDemo = async () => {
    abortRef.current = false;
    setIsRunning(true);
    setDemoComplete(false);
    setTxHash("");
    setBlockNumber(0);
    setProofHash("");

    const currentSteps = activeDemo === "x402" ? [...initialSteps] : [...affiliateSteps];
    setSteps(currentSteps.map((s) => ({ ...s, status: "idle" })));

    for (let i = 0; i < currentSteps.length; i++) {
      if (abortRef.current) return;

      setCurrentStep(i);
      setSteps((prev) =>
        prev.map((s, idx) => (idx === i ? { ...s, status: "running" } : s))
      );

      await new Promise((resolve) => setTimeout(resolve, currentSteps[i].duration));

      if (abortRef.current) return;

      // Generate mock data at specific steps
      if (currentSteps[i].id === "zk-stamp" || currentSteps[i].id === "zk-split") {
        const hash = `0xZK${Math.random().toString(16).slice(2, 14)}`;
        setProofHash(hash);
        toast.success("ZK Compliance Proof Generated", {
          description: hash,
        });
      }

      if (currentSteps[i].id === "settlement" || currentSteps[i].id === "merchant-pay") {
        const tx = `0x${Math.random().toString(16).slice(2, 14)}`;
        const block = 1847296 + Math.floor(Math.random() * 10);
        setTxHash(tx);
        setBlockNumber(block);
        toast.success("Monad Settlement Confirmed", {
          description: `Block #${block.toLocaleString()} • ${tx}`,
        });
      }

      setSteps((prev) =>
        prev.map((s, idx) => (idx === i ? { ...s, status: "success" } : s))
      );
    }

    setIsRunning(false);
    setDemoComplete(true);
    toast.success(
      activeDemo === "x402"
        ? "x402 Agent Purchase Complete!"
        : "Affiliate Settlement Complete!",
      {
        description: "Transaction compliant. Identity shielded. Audit trail on-chain.",
      }
    );
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <p className="text-[13px] text-muted-foreground">
          Live simulation of CompliAgent compliance flows
        </p>
        <div className="flex items-center gap-2">
          {demoComplete && (
            <button
              onClick={resetDemo}
              className="flex items-center gap-2 px-4 py-2.5 rounded-lg border border-border text-[13px] text-muted-foreground hover:bg-muted transition-colors"
            >
              <RotateCcw className="w-4 h-4" />
              Reset
            </button>
          )}
          <button
            onClick={isRunning ? resetDemo : runDemo}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-lg text-[13px] transition-colors ${
              isRunning
                ? "bg-red-500 text-white hover:bg-red-600"
                : "bg-[#7C3AED] text-white hover:bg-[#6D28D9]"
            }`}
          >
            {isRunning ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Stop Demo
              </>
            ) : (
              <>
                <Play className="w-4 h-4" />
                Run {activeDemo === "x402" ? "Agent" : "Affiliate"} Demo
              </>
            )}
          </button>
        </div>
      </div>

      {/* Demo Selector */}
      <div className="flex gap-1 bg-card border border-border rounded-lg p-1 w-fit">
        <button
          onClick={() => switchDemo("x402")}
          className={`px-4 py-2 rounded-md text-[13px] transition-colors ${
            activeDemo === "x402"
              ? "bg-[#7C3AED] text-white"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          Flow 1: x402 Agent Purchase
        </button>
        <button
          onClick={() => switchDemo("affiliate")}
          className={`px-4 py-2 rounded-md text-[13px] transition-colors ${
            activeDemo === "affiliate"
              ? "bg-[#7C3AED] text-white"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          Flow 2: Affiliate Settlement
        </button>
      </div>

      {/* Flow Description */}
      <div className="bg-[#7C3AED]/5 border border-[#7C3AED]/15 rounded-xl p-5">
        {activeDemo === "x402" ? (
          <div>
            <h4 className="text-[14px] text-foreground mb-1">
              x402 Agent Data Purchase with Compliance
            </h4>
            <p className="text-[13px] text-muted-foreground">
              An enterprise AI agent purchases premium financial data from a paywalled API using the x402 protocol. 
              CompliAgent intercepts the payment, verifies compliance, generates a ZK stamp via Unlink, and settles 
              on Monad in under 1 second. The public ledger reveals nothing about agent identity, data purchased, or amount.
            </p>
          </div>
        ) : (
          <div>
            <h4 className="text-[14px] text-foreground mb-1">
              Three-Party Affiliate Commission Split
            </h4>
            <p className="text-[13px] text-muted-foreground">
              Merchant (Entity 1) sells a product. Affiliate (Entity 2) earns 15% commission. Buyer (Entity 3) pays $1,000. 
              CompliAgent verifies the commission split using partial-knowledge verification: total = z, affiliate = x, 
              merchant = y, proving x + y = z without exposing individual values.
            </p>
          </div>
        )}
      </div>

      {/* Pipeline Steps */}
      <div className="bg-card rounded-xl border border-border overflow-hidden">
        <div className="px-5 py-4 border-b border-border flex items-center justify-between">
          <h3 className="text-[15px] text-foreground">Execution Pipeline</h3>
          {isRunning && (
            <span className="flex items-center gap-1.5 text-[12px] text-[#7C3AED]">
              <span className="w-1.5 h-1.5 rounded-full bg-[#7C3AED] animate-pulse" />
              Processing...
            </span>
          )}
        </div>
        <div className="divide-y divide-border">
          {steps.map((step, idx) => {
            const Icon = step.icon;
            const isActive = idx === currentStep && isRunning;
            return (
              <div
                key={step.id}
                className={`flex items-center gap-4 px-5 py-4 transition-all duration-300 ${
                  isActive ? "bg-[#7C3AED]/5" : step.status === "success" ? "bg-emerald-50/50" : ""
                }`}
              >
                {/* Step number + connector */}
                <div className="flex flex-col items-center">
                  <div
                    className={`w-10 h-10 rounded-full flex items-center justify-center transition-all duration-500 ${
                      step.status === "success"
                        ? "bg-emerald-100"
                        : step.status === "running"
                        ? "bg-[#7C3AED]/15"
                        : step.status === "error"
                        ? "bg-red-100"
                        : "bg-muted"
                    }`}
                  >
                    {step.status === "running" ? (
                      <Loader2 className="w-5 h-5 text-[#7C3AED] animate-spin" />
                    ) : step.status === "success" ? (
                      <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                    ) : step.status === "error" ? (
                      <XCircle className="w-5 h-5 text-red-500" />
                    ) : (
                      <Icon className="w-5 h-5 text-muted-foreground" />
                    )}
                  </div>
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] text-muted-foreground uppercase tracking-wider" style={{ fontFamily: "'Roboto Mono', monospace" }}>
                      Step {idx + 1}
                    </span>
                    {isActive && (
                      <span className="text-[10px] text-[#7C3AED] bg-[#7C3AED]/10 px-2 py-0.5 rounded-full">
                        IN PROGRESS
                      </span>
                    )}
                  </div>
                  <p className={`text-[14px] mt-0.5 ${step.status === "idle" ? "text-muted-foreground" : "text-foreground"}`}>
                    {step.label}
                  </p>
                  <p className="text-[12px] text-muted-foreground mt-0.5">
                    {step.description}
                  </p>
                </div>

                {/* Status indicator */}
                <div className="flex items-center gap-2">
                  {step.status === "success" && (
                    <span className="text-[11px] text-emerald-600" style={{ fontFamily: "'Roboto Mono', monospace" }}>
                      ✓ Complete
                    </span>
                  )}
                  {step.status === "running" && (
                    <span className="text-[11px] text-[#7C3AED]" style={{ fontFamily: "'Roboto Mono', monospace" }}>
                      Processing...
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Result Panel */}
      {demoComplete && (
        <div className="bg-card rounded-xl border border-emerald-200 overflow-hidden">
          <div className="px-5 py-4 border-b border-emerald-100 bg-emerald-50">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5 text-emerald-600" />
              <h3 className="text-[15px] text-emerald-800">
                {activeDemo === "x402"
                  ? "x402 Agent Purchase — Settlement Confirmed"
                  : "Affiliate Settlement — All Parties Paid"}
              </h3>
            </div>
          </div>
          <div className="p-5 space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-muted/50 rounded-lg p-4">
                <label className="text-[11px] text-muted-foreground uppercase tracking-wider">Monad Tx Hash</label>
                <div className="flex items-center gap-2 mt-1">
                  <code className="text-[12px] text-foreground" style={{ fontFamily: "'Roboto Mono', monospace" }}>
                    {txHash}
                  </code>
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(txHash);
                      toast.success("Copied to clipboard");
                    }}
                    className="p-1 rounded hover:bg-muted"
                  >
                    <Copy className="w-3 h-3 text-muted-foreground" />
                  </button>
                </div>
              </div>
              <div className="bg-muted/50 rounded-lg p-4">
                <label className="text-[11px] text-muted-foreground uppercase tracking-wider">Block Number</label>
                <p className="text-[12px] text-foreground mt-1" style={{ fontFamily: "'Roboto Mono', monospace" }}>
                  #{blockNumber.toLocaleString()}
                </p>
              </div>
              <div className="bg-muted/50 rounded-lg p-4">
                <label className="text-[11px] text-muted-foreground uppercase tracking-wider">ZK Proof Hash</label>
                <div className="flex items-center gap-2 mt-1">
                  <code className="text-[12px] text-emerald-600" style={{ fontFamily: "'Roboto Mono', monospace" }}>
                    {proofHash}
                  </code>
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                </div>
              </div>
            </div>

            {/* What's hidden */}
            <div className="bg-[#7C3AED]/5 border border-[#7C3AED]/10 rounded-lg p-4">
              <h4 className="text-[13px] text-foreground mb-2 flex items-center gap-2">
                <EyeOff className="w-4 h-4 text-[#7C3AED]" />
                Privacy-Preserved (Hidden from Public Ledger)
              </h4>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {[
                  "Agent Identity",
                  "Vendor Identity",
                  "Payment Amount",
                  activeDemo === "affiliate" ? "Commission Split" : "Data Purchased",
                ].map((item) => (
                  <div
                    key={item}
                    className="flex items-center gap-2 text-[12px] text-muted-foreground"
                  >
                    <Lock className="w-3 h-3 text-[#7C3AED]" />
                    {item}
                  </div>
                ))}
              </div>
            </div>

            {/* What's proven */}
            <div className="bg-emerald-50 border border-emerald-100 rounded-lg p-4">
              <h4 className="text-[13px] text-foreground mb-2 flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-emerald-600" />
                Cryptographically Proven (ZK-Verified On-Chain)
              </h4>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {[
                  "Within Budget",
                  "Vendor Approved",
                  "AML Clean",
                  activeDemo === "affiliate" ? "Split Correct" : "Policy Compliant",
                ].map((item) => (
                  <div
                    key={item}
                    className="flex items-center gap-2 text-[12px] text-emerald-700"
                  >
                    <CheckCircle2 className="w-3 h-3 text-emerald-500" />
                    {item}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
