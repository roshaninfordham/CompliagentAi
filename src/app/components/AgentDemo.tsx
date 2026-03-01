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

type StepTiming = {
  step: string;
  durationMs: number;
};

type SSEEvent = {
  step: string;
  status: "running" | "success" | "error";
  detail?: string;
  timing?: number;
};

type DemoResponse = {
  txHash?: string;
  proofHash?: string;
  blockNumber?: number;
  timings?: StepTiming[];
  error?: string;
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
    description: "CompliAgent validates: budget \u2713 vendor allowlist \u2713 AML clean \u2713",
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
    description: "Agent retries HTTP request with payment receipt \u2014 data delivered",
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
    description: "Shielded transfer to Affiliate (Entity 2) \u2014 amount hidden on-chain",
    icon: Lock,
    status: "idle",
    duration: 1200,
  },
  {
    id: "merchant-pay",
    label: "Merchant Payment (85%)",
    description: "Shielded transfer to Merchant (Entity 1) \u2014 amount hidden on-chain",
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

// Map SSE step names to step IDs for each flow
const x402StepMap: Record<string, string> = {
  request: "request",
  "402": "402",
  compliance: "compliance",
  "zk-stamp": "zk-stamp",
  settlement: "settlement",
  delivery: "delivery",
};

const affiliateStepMap: Record<string, string> = {
  "buyer-pay": "buyer-pay",
  "compliance-check": "compliance-check",
  "compliance": "compliance-check",
  "zk-split": "zk-split",
  "zk-stamp": "zk-split",
  "affiliate-pay": "affiliate-pay",
  "merchant-pay": "merchant-pay",
  settlement: "merchant-pay",
  verified: "verified",
  delivery: "verified",
};

export function AgentDemo() {
  const [activeDemo, setActiveDemo] = useState<"x402" | "affiliate">("x402");
  const [steps, setSteps] = useState<DemoStep[]>(initialSteps);
  const [isRunning, setIsRunning] = useState(false);
  const [currentStep, setCurrentStep] = useState(-1);
  const [demoComplete, setDemoComplete] = useState(false);
  const [txHash, setTxHash] = useState("");
  const [blockNumber, setBlockNumber] = useState(0);
  const [proofHash, setProofHash] = useState("");
  const [stepTimings, setStepTimings] = useState<StepTiming[]>([]);
  const [totalTime, setTotalTime] = useState(0);
  const [isOfflineMode, setIsOfflineMode] = useState(false);
  const [dataFlowNodes, setDataFlowNodes] = useState<Record<string, boolean>>({
    wallet: false,
    engine: false,
    privacy: false,
    block: false,
  });
  const abortRef = useRef(false);
  const eventSourceRef = useRef<EventSource | null>(null);

  const switchDemo = (demo: "x402" | "affiliate") => {
    if (isRunning) return;
    setActiveDemo(demo);
    setSteps(demo === "x402" ? initialSteps : affiliateSteps);
    resetDemo();
  };

  const resetDemo = () => {
    abortRef.current = true;
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
      eventSourceRef.current = null;
    }
    setIsRunning(false);
    setCurrentStep(-1);
    setDemoComplete(false);
    setTxHash("");
    setBlockNumber(0);
    setProofHash("");
    setStepTimings([]);
    setTotalTime(0);
    setIsOfflineMode(false);
    setDataFlowNodes({ wallet: false, engine: false, privacy: false, block: false });
    setSteps((prev) => prev.map((s) => ({ ...s, status: "idle" })));
    setTimeout(() => {
      abortRef.current = false;
    }, 100);
  };

  // Fallback simulation when backend is offline
  const runFallbackDemo = async () => {
    setIsOfflineMode(true);

    const currentSteps = activeDemo === "x402" ? [...initialSteps] : [...affiliateSteps];
    setSteps(currentSteps.map((s) => ({ ...s, status: "idle" })));

    const simulatedTimings: StepTiming[] = [];
    const startTime = Date.now();

    for (let i = 0; i < currentSteps.length; i++) {
      if (abortRef.current) return;

      setCurrentStep(i);
      setSteps((prev) =>
        prev.map((s, idx) => (idx === i ? { ...s, status: "running" } : s))
      );

      // Light up data flow nodes at relevant steps
      if (i === 0) setDataFlowNodes((prev) => ({ ...prev, wallet: true }));
      if (i === 2 || (activeDemo === "affiliate" && i === 1))
        setDataFlowNodes((prev) => ({ ...prev, engine: true }));
      if (i === 3 || (activeDemo === "affiliate" && i === 2))
        setDataFlowNodes((prev) => ({ ...prev, privacy: true }));
      if (i === 4 || (activeDemo === "affiliate" && i === 4))
        setDataFlowNodes((prev) => ({ ...prev, block: true }));

      const stepStart = Date.now();
      await new Promise((resolve) => setTimeout(resolve, currentSteps[i].duration));
      const stepDuration = Date.now() - stepStart;

      if (abortRef.current) return;

      simulatedTimings.push({ step: currentSteps[i].id, durationMs: stepDuration });
      setStepTimings([...simulatedTimings]);

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
          description: `Block #${block.toLocaleString()} \u2022 ${tx}`,
        });
      }

      setSteps((prev) =>
        prev.map((s, idx) => (idx === i ? { ...s, status: "success" } : s))
      );
    }

    setTotalTime(Date.now() - startTime);
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

  const runDemo = async () => {
    abortRef.current = false;
    setIsRunning(true);
    setDemoComplete(false);
    setTxHash("");
    setBlockNumber(0);
    setProofHash("");
    setStepTimings([]);
    setTotalTime(0);
    setIsOfflineMode(false);
    setDataFlowNodes({ wallet: false, engine: false, privacy: false, block: false });

    const currentSteps = activeDemo === "x402" ? [...initialSteps] : [...affiliateSteps];
    setSteps(currentSteps.map((s) => ({ ...s, status: "idle" })));

    const stepMap = activeDemo === "x402" ? x402StepMap : affiliateStepMap;
    const startTime = Date.now();

    // Open SSE connection for real-time step updates
    const eventSource = new EventSource("/api/demo/events");
    eventSourceRef.current = eventSource;

    eventSource.onmessage = (event) => {
      if (abortRef.current) return;

      try {
        const data: SSEEvent = JSON.parse(event.data);
        const mappedStepId = stepMap[data.step] || data.step;

        setSteps((prev) => {
          const stepIndex = prev.findIndex((s) => s.id === mappedStepId);
          if (stepIndex === -1) return prev;

          const updated = [...prev];
          updated[stepIndex] = {
            ...updated[stepIndex],
            status: data.status === "running" ? "running" : data.status === "success" ? "success" : "error",
            detail: data.detail,
          };

          // If a step is now running, set it as current
          if (data.status === "running") {
            setCurrentStep(stepIndex);
          }

          return updated;
        });

        // Update data flow nodes based on step progress
        if (data.status === "success") {
          if (data.step === "request" || data.step === "buyer-pay") {
            setDataFlowNodes((prev) => ({ ...prev, wallet: true }));
          }
          if (data.step === "compliance" || data.step === "compliance-check") {
            setDataFlowNodes((prev) => ({ ...prev, engine: true }));
          }
          if (data.step === "zk-stamp" || data.step === "zk-split") {
            setDataFlowNodes((prev) => ({ ...prev, privacy: true }));
          }
          if (data.step === "settlement" || data.step === "merchant-pay" || data.step === "delivery" || data.step === "verified") {
            setDataFlowNodes((prev) => ({ ...prev, block: true }));
          }
        }

        // Record timing from SSE
        if (data.status === "success" && data.timing != null) {
          setStepTimings((prev) => {
            // Avoid duplicates
            if (prev.some((t) => t.step === mappedStepId)) return prev;
            return [...prev, { step: mappedStepId, durationMs: data.timing! }];
          });
        }
      } catch {
        // Ignore malformed events
      }
    };

    eventSource.onerror = () => {
      // SSE errors are non-fatal; the POST response is the source of truth
    };

    // Fire the POST request
    const endpoint =
      activeDemo === "x402" ? "/api/demo/run-x402" : "/api/demo/run-affiliate";
    const body =
      activeDemo === "x402"
        ? JSON.stringify({ agentIndex: 0 })
        : JSON.stringify({});

    try {
      const response = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body,
      });

      if (abortRef.current) {
        eventSource.close();
        eventSourceRef.current = null;
        return;
      }

      if (!response.ok) {
        throw new Error(`Backend responded with ${response.status}`);
      }

      const result: DemoResponse = await response.json();

      // Close SSE now that we have the final result
      eventSource.close();
      eventSourceRef.current = null;

      if (abortRef.current) return;

      // Apply final data from the POST response
      if (result.txHash) setTxHash(result.txHash);
      if (result.proofHash) setProofHash(result.proofHash);
      if (result.blockNumber) setBlockNumber(result.blockNumber);
      if (result.timings) setStepTimings(result.timings);

      // Ensure all steps show success
      setSteps((prev) =>
        prev.map((s) => ({
          ...s,
          status: "success" as const,
        }))
      );

      // Light up all data flow nodes
      setDataFlowNodes({ wallet: true, engine: true, privacy: true, block: true });

      const elapsed = Date.now() - startTime;
      setTotalTime(elapsed);
      setIsRunning(false);
      setDemoComplete(true);

      if (result.txHash) {
        toast.success("Monad Settlement Confirmed", {
          description: `Block #${(result.blockNumber || 0).toLocaleString()} \u2022 ${result.txHash}`,
        });
      }
      if (result.proofHash) {
        toast.success("ZK Compliance Proof Generated", {
          description: result.proofHash,
        });
      }

      toast.success(
        activeDemo === "x402"
          ? "x402 Agent Purchase Complete!"
          : "Affiliate Settlement Complete!",
        {
          description: "Transaction compliant. Identity shielded. Audit trail on-chain.",
        }
      );
    } catch (err) {
      // Backend is not available -- fall back to simulation
      eventSource.close();
      eventSourceRef.current = null;

      if (abortRef.current) return;

      console.warn("Backend unavailable, falling back to demo mode:", err);
      await runFallbackDemo();
    }
  };

  // Cleanup SSE on unmount
  useEffect(() => {
    return () => {
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
      }
    };
  }, []);

  // Helper: get timing for a step
  const getStepTiming = (stepId: string): number | null => {
    const found = stepTimings.find((t) => t.step === stepId);
    return found ? found.durationMs : null;
  };

  // Helper: format ms
  const formatMs = (ms: number): string => {
    if (ms < 1000) return `${ms}ms`;
    return `${(ms / 1000).toFixed(2)}s`;
  };

  return (
    <div className="space-y-6">
      {/* Offline Mode Warning */}
      {isOfflineMode && (
        <div
          className="flex items-center gap-2 px-4 py-2 rounded-lg text-[12px]"
          style={{
            backgroundColor: "rgba(234, 179, 8, 0.1)",
            border: "1px solid rgba(234, 179, 8, 0.3)",
            color: "#a16207",
          }}
        >
          <span
            className="inline-block w-2 h-2 rounded-full"
            style={{ backgroundColor: "#eab308" }}
          />
          Demo Mode &mdash; Backend Offline
        </div>
      )}

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
            const timing = getStepTiming(step.id);
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
                    {step.status === "success" && timing != null && (
                      <span
                        className="text-[10px] px-2 py-0.5 rounded-full"
                        style={{
                          backgroundColor: "rgba(124, 58, 237, 0.08)",
                          color: "#7C3AED",
                          fontFamily: "'Roboto Mono', monospace",
                        }}
                      >
                        {formatMs(timing)}
                      </span>
                    )}
                  </div>
                  <p className={`text-[14px] mt-0.5 ${step.status === "idle" ? "text-muted-foreground" : "text-foreground"}`}>
                    {step.label}
                  </p>
                  <p className="text-[12px] text-muted-foreground mt-0.5">
                    {step.detail || step.description}
                  </p>
                </div>

                {/* Status indicator */}
                <div className="flex items-center gap-2">
                  {step.status === "success" && (
                    <span className="text-[11px] text-emerald-600" style={{ fontFamily: "'Roboto Mono', monospace" }}>
                      {timing != null ? `\u2713 ${formatMs(timing)}` : "\u2713 Complete"}
                    </span>
                  )}
                  {step.status === "running" && (
                    <span className="text-[11px] text-[#7C3AED]" style={{ fontFamily: "'Roboto Mono', monospace" }}>
                      Processing...
                    </span>
                  )}
                  {step.status === "error" && (
                    <span className="text-[11px] text-red-500" style={{ fontFamily: "'Roboto Mono', monospace" }}>
                      \u2717 Error
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Data Flow Visualization */}
      {(isRunning || demoComplete) && (
        <div className="bg-card rounded-xl border border-border overflow-hidden">
          <div className="px-5 py-4 border-b border-border">
            <h3 className="text-[15px] text-foreground">Data Flow</h3>
          </div>
          <div className="px-5 py-6">
            <div className="flex items-center justify-between gap-0">
              {/* Node: Agent Wallet */}
              <div
                className="flex flex-col items-center gap-2 flex-1 min-w-0 transition-all duration-500"
                style={{ opacity: dataFlowNodes.wallet ? 1 : 0.35 }}
              >
                <div
                  className="w-12 h-12 rounded-xl flex items-center justify-center transition-all duration-500"
                  style={{
                    backgroundColor: dataFlowNodes.wallet
                      ? "rgba(124, 58, 237, 0.15)"
                      : "rgba(0, 0, 0, 0.05)",
                    border: dataFlowNodes.wallet
                      ? "2px solid rgba(124, 58, 237, 0.4)"
                      : "2px solid rgba(0, 0, 0, 0.1)",
                  }}
                >
                  <Bot
                    className="w-5 h-5 transition-colors duration-500"
                    style={{
                      color: dataFlowNodes.wallet ? "#7C3AED" : "#9ca3af",
                    }}
                  />
                </div>
                <span
                  className="text-[11px] text-center leading-tight transition-colors duration-500"
                  style={{
                    color: dataFlowNodes.wallet ? "#7C3AED" : "#9ca3af",
                    fontFamily: "'Roboto Mono', monospace",
                  }}
                >
                  Agent Wallet
                </span>
              </div>

              {/* Arrow 1 */}
              <div
                className="flex items-center transition-all duration-500 px-1"
                style={{
                  opacity: dataFlowNodes.wallet ? 1 : 0.2,
                  color: dataFlowNodes.engine ? "#7C3AED" : "#d1d5db",
                }}
              >
                <div
                  className="h-[2px] w-8 md:w-12 transition-colors duration-500"
                  style={{
                    backgroundColor: dataFlowNodes.engine
                      ? "#7C3AED"
                      : "#d1d5db",
                  }}
                />
                <ArrowRight
                  className="w-4 h-4 -ml-1 transition-colors duration-500"
                  style={{
                    color: dataFlowNodes.engine ? "#7C3AED" : "#d1d5db",
                  }}
                />
              </div>

              {/* Node: CompliAgent Engine */}
              <div
                className="flex flex-col items-center gap-2 flex-1 min-w-0 transition-all duration-500"
                style={{ opacity: dataFlowNodes.engine ? 1 : 0.35 }}
              >
                <div
                  className="w-12 h-12 rounded-xl flex items-center justify-center transition-all duration-500"
                  style={{
                    backgroundColor: dataFlowNodes.engine
                      ? "rgba(16, 185, 129, 0.15)"
                      : "rgba(0, 0, 0, 0.05)",
                    border: dataFlowNodes.engine
                      ? "2px solid rgba(16, 185, 129, 0.4)"
                      : "2px solid rgba(0, 0, 0, 0.1)",
                  }}
                >
                  <ShieldCheck
                    className="w-5 h-5 transition-colors duration-500"
                    style={{
                      color: dataFlowNodes.engine ? "#10b981" : "#9ca3af",
                    }}
                  />
                </div>
                <span
                  className="text-[11px] text-center leading-tight transition-colors duration-500"
                  style={{
                    color: dataFlowNodes.engine ? "#10b981" : "#9ca3af",
                    fontFamily: "'Roboto Mono', monospace",
                  }}
                >
                  CompliAgent Engine
                </span>
              </div>

              {/* Arrow 2 */}
              <div
                className="flex items-center transition-all duration-500 px-1"
                style={{
                  opacity: dataFlowNodes.engine ? 1 : 0.2,
                  color: dataFlowNodes.privacy ? "#7C3AED" : "#d1d5db",
                }}
              >
                <div
                  className="h-[2px] w-8 md:w-12 transition-colors duration-500"
                  style={{
                    backgroundColor: dataFlowNodes.privacy
                      ? "#7C3AED"
                      : "#d1d5db",
                  }}
                />
                <ArrowRight
                  className="w-4 h-4 -ml-1 transition-colors duration-500"
                  style={{
                    color: dataFlowNodes.privacy ? "#7C3AED" : "#d1d5db",
                  }}
                />
              </div>

              {/* Node: Unlink Privacy Pool */}
              <div
                className="flex flex-col items-center gap-2 flex-1 min-w-0 transition-all duration-500"
                style={{ opacity: dataFlowNodes.privacy ? 1 : 0.35 }}
              >
                <div
                  className="w-12 h-12 rounded-xl flex items-center justify-center transition-all duration-500"
                  style={{
                    backgroundColor: dataFlowNodes.privacy
                      ? "rgba(124, 58, 237, 0.15)"
                      : "rgba(0, 0, 0, 0.05)",
                    border: dataFlowNodes.privacy
                      ? "2px solid rgba(124, 58, 237, 0.4)"
                      : "2px solid rgba(0, 0, 0, 0.1)",
                  }}
                >
                  <Shield
                    className="w-5 h-5 transition-colors duration-500"
                    style={{
                      color: dataFlowNodes.privacy ? "#7C3AED" : "#9ca3af",
                    }}
                  />
                </div>
                <span
                  className="text-[11px] text-center leading-tight transition-colors duration-500"
                  style={{
                    color: dataFlowNodes.privacy ? "#7C3AED" : "#9ca3af",
                    fontFamily: "'Roboto Mono', monospace",
                  }}
                >
                  Unlink Privacy Pool
                </span>
              </div>

              {/* Arrow 3 */}
              <div
                className="flex items-center transition-all duration-500 px-1"
                style={{
                  opacity: dataFlowNodes.privacy ? 1 : 0.2,
                  color: dataFlowNodes.block ? "#7C3AED" : "#d1d5db",
                }}
              >
                <div
                  className="h-[2px] w-8 md:w-12 transition-colors duration-500"
                  style={{
                    backgroundColor: dataFlowNodes.block
                      ? "#7C3AED"
                      : "#d1d5db",
                  }}
                />
                <ArrowRight
                  className="w-4 h-4 -ml-1 transition-colors duration-500"
                  style={{
                    color: dataFlowNodes.block ? "#7C3AED" : "#d1d5db",
                  }}
                />
              </div>

              {/* Node: Monad Block */}
              <div
                className="flex flex-col items-center gap-2 flex-1 min-w-0 transition-all duration-500"
                style={{ opacity: dataFlowNodes.block ? 1 : 0.35 }}
              >
                <div
                  className="w-12 h-12 rounded-xl flex items-center justify-center transition-all duration-500"
                  style={{
                    backgroundColor: dataFlowNodes.block
                      ? "rgba(234, 179, 8, 0.15)"
                      : "rgba(0, 0, 0, 0.05)",
                    border: dataFlowNodes.block
                      ? "2px solid rgba(234, 179, 8, 0.4)"
                      : "2px solid rgba(0, 0, 0, 0.1)",
                  }}
                >
                  <Zap
                    className="w-5 h-5 transition-colors duration-500"
                    style={{
                      color: dataFlowNodes.block ? "#eab308" : "#9ca3af",
                    }}
                  />
                </div>
                <span
                  className="text-[11px] text-center leading-tight transition-colors duration-500"
                  style={{
                    color: dataFlowNodes.block ? "#eab308" : "#9ca3af",
                    fontFamily: "'Roboto Mono', monospace",
                  }}
                >
                  {blockNumber
                    ? `Monad Block #${blockNumber.toLocaleString()}`
                    : "Monad Block"}
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Result Panel */}
      {demoComplete && (
        <div className="bg-card rounded-xl border border-emerald-200 overflow-hidden">
          <div className="px-5 py-4 border-b border-emerald-100 bg-emerald-50">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                <h3 className="text-[15px] text-emerald-800">
                  {activeDemo === "x402"
                    ? "x402 Agent Purchase \u2014 Settlement Confirmed"
                    : "Affiliate Settlement \u2014 All Parties Paid"}
                </h3>
              </div>
              {totalTime > 0 && (
                <span
                  className="text-[12px] px-3 py-1 rounded-full"
                  style={{
                    backgroundColor: "rgba(16, 185, 129, 0.1)",
                    color: "#059669",
                    fontFamily: "'Roboto Mono', monospace",
                  }}
                >
                  Total: {formatMs(totalTime)}
                </span>
              )}
            </div>
          </div>
          <div className="p-5 space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-muted/50 rounded-lg p-4">
                <label className="text-[11px] text-muted-foreground uppercase tracking-wider">Monad Tx Hash</label>
                <div className="flex items-center gap-2 mt-1">
                  <a
                    href={`https://testnet.monadexplorer.com/tx/${txHash}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[12px] hover:underline transition-colors"
                    style={{
                      fontFamily: "'Roboto Mono', monospace",
                      color: "#7C3AED",
                    }}
                    title="View on Monad Explorer"
                  >
                    {txHash}
                  </a>
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

            {/* Step Timings Breakdown */}
            {stepTimings.length > 0 && (
              <div className="bg-muted/30 rounded-lg p-4">
                <h4 className="text-[13px] text-foreground mb-3 flex items-center gap-2">
                  <Zap className="w-4 h-4 text-[#7C3AED]" />
                  Step Timings
                </h4>
                <div className="space-y-2">
                  {stepTimings.map((timing) => {
                    const stepDef = steps.find((s) => s.id === timing.step);
                    const maxMs = Math.max(...stepTimings.map((t) => t.durationMs), 1);
                    const widthPct = Math.max((timing.durationMs / maxMs) * 100, 4);
                    return (
                      <div key={timing.step} className="flex items-center gap-3">
                        <span
                          className="text-[11px] text-muted-foreground w-36 truncate flex-shrink-0"
                          style={{ fontFamily: "'Roboto Mono', monospace" }}
                        >
                          {stepDef?.label || timing.step}
                        </span>
                        <div className="flex-1 h-4 bg-muted rounded-full overflow-hidden">
                          <div
                            className="h-full rounded-full transition-all duration-700"
                            style={{
                              width: `${widthPct}%`,
                              backgroundColor:
                                timing.durationMs < 500
                                  ? "#10b981"
                                  : timing.durationMs < 1500
                                  ? "#7C3AED"
                                  : "#eab308",
                            }}
                          />
                        </div>
                        <span
                          className="text-[11px] text-muted-foreground w-16 text-right flex-shrink-0"
                          style={{ fontFamily: "'Roboto Mono', monospace" }}
                        >
                          {formatMs(timing.durationMs)}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

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
