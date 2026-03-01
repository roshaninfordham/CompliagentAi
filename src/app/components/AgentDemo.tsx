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
  ExternalLink,
  Globe,
  Database,
  FileCheck,
  Wallet,
  Users,
  Clock,
  Activity,
} from "lucide-react";
import { toast } from "sonner";

/* ──────────────────────────── Types ──────────────────────────── */

type DemoStep = {
  id: string;
  label: string;
  description: string;
  poweredBy: string;
  icon: any;
  status: "idle" | "running" | "success" | "error";
  detail?: string;
  duration: number;
};

type StepTiming = { step: string; durationMs: number };

type SSEEvent = {
  step: string;
  status: string;
  detail?: any;
  timing?: number;
};

/* ──────────────────────── Step Definitions ──────────────────── */

const x402Steps: DemoStep[] = [
  {
    id: "request",
    label: "Agent HTTP Request",
    description: "AI agent requests premium financial data from paywalled API",
    poweredBy: "CompliAgent Engine",
    icon: Bot,
    status: "idle",
    duration: 1200,
  },
  {
    id: "402",
    label: "HTTP 402 Payment Required",
    description: "API responds with x402 payment requirements — amount, token, recipient",
    poweredBy: "x402 Protocol",
    icon: Server,
    status: "idle",
    duration: 800,
  },
  {
    id: "compliance",
    label: "Compliance Check",
    description: "Validates budget limits, vendor allowlist, and AML screening",
    poweredBy: "CompliAgent Compliance Engine",
    icon: ShieldCheck,
    status: "idle",
    duration: 1500,
  },
  {
    id: "zk-stamp",
    label: "ZK Compliance Stamp",
    description: "Generates zero-knowledge proof — proves compliance without revealing identity",
    poweredBy: "Unlink SDK (Privacy Layer)",
    icon: Shield,
    status: "idle",
    duration: 2000,
  },
  {
    id: "settlement",
    label: "Monad Settlement",
    description: "On-chain compliance stamp via ComplianceRegistry smart contract",
    poweredBy: "Monad Testnet (~400ms finality)",
    icon: Zap,
    status: "idle",
    duration: 1000,
  },
  {
    id: "delivery",
    label: "Resource Delivered",
    description: "Agent retries with payment receipt — premium data delivered successfully",
    poweredBy: "x402 Protocol",
    icon: CheckCircle2,
    status: "idle",
    duration: 800,
  },
];

const affiliateSteps: DemoStep[] = [
  {
    id: "buyer-pay",
    label: "Buyer Payment",
    description: "Buyer initiates $100.00 USDC purchase via x402 protocol",
    poweredBy: "x402 Protocol",
    icon: Wallet,
    status: "idle",
    duration: 1000,
  },
  {
    id: "compliance-check",
    label: "Compliance Verification",
    description: "Validates all three parties and commission structure",
    poweredBy: "CompliAgent Compliance Engine",
    icon: ShieldCheck,
    status: "idle",
    duration: 1500,
  },
  {
    id: "zk-split",
    label: "ZK Commission Verification",
    description: "Proves x + y = z without revealing individual split values",
    poweredBy: "Unlink SDK (ZK Proofs)",
    icon: Shield,
    status: "idle",
    duration: 2000,
  },
  {
    id: "affiliate-pay",
    label: "Affiliate Payment (15%)",
    description: "Shielded transfer to Affiliate — amount hidden on public ledger",
    poweredBy: "Unlink Privacy Pool → Monad",
    icon: Lock,
    status: "idle",
    duration: 1200,
  },
  {
    id: "merchant-pay",
    label: "Merchant Payment (85%)",
    description: "Shielded transfer to Merchant — amount hidden on public ledger",
    poweredBy: "Unlink Privacy Pool → Monad",
    icon: Lock,
    status: "idle",
    duration: 1200,
  },
  {
    id: "verified",
    label: "Settlement Complete",
    description: "All parties paid correctly. ZK proof on-chain. No data exposed.",
    poweredBy: "Monad Block Finality",
    icon: CheckCircle2,
    status: "idle",
    duration: 800,
  },
];

/* ──────────────────── SSE Step Mapping ──────────────────── */

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
  "buyer-payment-check": "buyer-pay",
  "compliance-check": "compliance-check",
  "compliance-verification": "compliance-check",
  compliance: "compliance-check",
  "zk-split": "zk-split",
  "zk-commission-proof": "zk-split",
  "zk-stamp": "zk-split",
  "affiliate-pay": "affiliate-pay",
  "affiliate-payment": "affiliate-pay",
  "merchant-pay": "merchant-pay",
  "merchant-payment": "merchant-pay",
  settlement: "merchant-pay",
  "settlement-complete": "verified",
  verified: "verified",
  delivery: "verified",
};

/* ──────────────────── Explorer URL ──────────────────── */

const EXPLORER = "https://testnet.monadexplorer.com";

/* ──────────────────── Component ──────────────────── */

export function AgentDemo() {
  const [activeDemo, setActiveDemo] = useState<"x402" | "affiliate">("x402");
  const [steps, setSteps] = useState<DemoStep[]>(x402Steps);
  const [isRunning, setIsRunning] = useState(false);
  const [currentStep, setCurrentStep] = useState(-1);
  const [demoComplete, setDemoComplete] = useState(false);
  const [txHash, setTxHash] = useState("");
  const [blockNumber, setBlockNumber] = useState(0);
  const [proofHash, setProofHash] = useState("");
  const [stepTimings, setStepTimings] = useState<StepTiming[]>([]);
  const [totalTime, setTotalTime] = useState(0);
  const [isOfflineMode, setIsOfflineMode] = useState(false);
  const abortRef = useRef(false);
  const eventSourceRef = useRef<EventSource | null>(null);

  const switchDemo = (demo: "x402" | "affiliate") => {
    if (isRunning) return;
    setActiveDemo(demo);
    setSteps(demo === "x402" ? x402Steps.map((s) => ({ ...s })) : affiliateSteps.map((s) => ({ ...s })));
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
    setSteps((prev) => prev.map((s) => ({ ...s, status: "idle" as const, detail: undefined })));
    setTimeout(() => { abortRef.current = false; }, 100);
  };

  /* ─── Fallback simulation when backend offline ─── */
  const runFallbackDemo = async () => {
    setIsOfflineMode(true);
    const currentSteps = activeDemo === "x402" ? x402Steps.map((s) => ({ ...s })) : affiliateSteps.map((s) => ({ ...s }));
    setSteps(currentSteps.map((s) => ({ ...s, status: "idle" as const })));
    const simulatedTimings: StepTiming[] = [];
    const startTime = Date.now();

    for (let i = 0; i < currentSteps.length; i++) {
      if (abortRef.current) return;
      setCurrentStep(i);
      setSteps((prev) => prev.map((s, idx) => (idx === i ? { ...s, status: "running" as const } : s)));
      const stepStart = Date.now();
      await new Promise((resolve) => setTimeout(resolve, currentSteps[i].duration));
      if (abortRef.current) return;
      simulatedTimings.push({ step: currentSteps[i].id, durationMs: Date.now() - stepStart });
      setStepTimings([...simulatedTimings]);

      if (currentSteps[i].id === "zk-stamp" || currentSteps[i].id === "zk-split") {
        const hash = `0xZK${Math.random().toString(16).slice(2, 14)}`;
        setProofHash(hash);
      }
      if (currentSteps[i].id === "settlement" || currentSteps[i].id === "merchant-pay") {
        setTxHash(`0x${Math.random().toString(16).slice(2, 14)}`);
        setBlockNumber(16000000 + Math.floor(Math.random() * 10000));
      }
      setSteps((prev) => prev.map((s, idx) => (idx === i ? { ...s, status: "success" as const } : s)));
    }

    setTotalTime(Date.now() - startTime);
    setIsRunning(false);
    setDemoComplete(true);
    toast.success(activeDemo === "x402" ? "x402 Agent Purchase Complete!" : "Affiliate Settlement Complete!");
  };

  /* ─── Main demo runner ─── */
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

    const currentSteps = activeDemo === "x402" ? x402Steps.map((s) => ({ ...s })) : affiliateSteps.map((s) => ({ ...s }));
    setSteps(currentSteps.map((s) => ({ ...s, status: "idle" as const })));

    const stepMap = activeDemo === "x402" ? x402StepMap : affiliateStepMap;
    const startTime = Date.now();

    // Open SSE connection
    const eventSource = new EventSource("/api/demo/events");
    eventSourceRef.current = eventSource;

    eventSource.onmessage = (event) => {
      if (abortRef.current) return;
      try {
        const data: SSEEvent = JSON.parse(event.data);
        if (data.step === "connected") return;
        const mappedStepId = stepMap[data.step] || data.step;

        const failStatuses = new Set(["failed", "error"]);
        const uiStatus: "running" | "success" | "error" =
          data.status === "running" ? "running" : failStatuses.has(data.status) ? "error" : "success";

        // Stringify detail if it's an object
        const detailStr = typeof data.detail === "object" && data.detail !== null
          ? JSON.stringify(data.detail)
          : data.detail;

        setSteps((prev) => {
          const stepIndex = prev.findIndex((s) => s.id === mappedStepId);
          if (stepIndex === -1) return prev;
          const updated = [...prev];
          updated[stepIndex] = { ...updated[stepIndex], status: uiStatus, detail: detailStr || updated[stepIndex].detail };
          if (uiStatus === "running") setCurrentStep(stepIndex);
          return updated;
        });

        if (uiStatus === "success" && data.timing != null) {
          setStepTimings((prev) => {
            if (prev.some((t) => t.step === mappedStepId)) return prev;
            return [...prev, { step: mappedStepId, durationMs: data.timing! }];
          });
        }
      } catch { /* ignore malformed SSE */ }
    };

    eventSource.onerror = () => { /* non-fatal */ };

    // Fire the POST
    const endpoint = activeDemo === "x402" ? "/api/demo/run-x402" : "/api/demo/run-affiliate";
    try {
      const response = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(activeDemo === "x402" ? { agentIndex: 0 } : {}),
      });

      if (abortRef.current) { eventSource.close(); return; }
      if (!response.ok) throw new Error(`Backend responded with ${response.status}`);

      const result = await response.json();
      eventSource.close();
      eventSourceRef.current = null;
      if (abortRef.current) return;

      if (result.txHash) setTxHash(result.txHash);
      if (result.proofHash) setProofHash(result.proofHash);
      if (result.blockNumber) setBlockNumber(result.blockNumber);

      // Mark all steps success
      setSteps((prev) => prev.map((s) => ({ ...s, status: "success" as const })));
      const elapsed = Date.now() - startTime;
      setTotalTime(elapsed);
      setIsRunning(false);
      setDemoComplete(true);

      if (result.txHash) {
        toast.success("✅ Real Monad Transaction Confirmed", {
          description: `Block #${(result.blockNumber || 0).toLocaleString()} • Verifiable on Explorer`,
        });
      }
    } catch (err) {
      eventSource.close();
      eventSourceRef.current = null;
      if (abortRef.current) return;
      console.warn("Backend unavailable, falling back to simulation:", err);
      await runFallbackDemo();
    }
  };

  useEffect(() => {
    return () => { if (eventSourceRef.current) eventSourceRef.current.close(); };
  }, []);

  const getStepTiming = (stepId: string): number | null => {
    const found = stepTimings.find((t) => t.step === stepId);
    return found ? found.durationMs : null;
  };

  const formatMs = (ms: number): string => ms < 1000 ? `${ms}ms` : `${(ms / 1000).toFixed(2)}s`;

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success("Copied to clipboard");
  };

  /* ──────────────────────── RENDER ──────────────────────── */
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>

      {/* Offline Warning */}
      {isOfflineMode && (
        <div style={{
          display: "flex", alignItems: "center", gap: "8px", padding: "10px 16px",
          borderRadius: "10px", backgroundColor: "rgba(234, 179, 8, 0.08)",
          border: "1px solid rgba(234, 179, 8, 0.25)", fontSize: "12px", color: "#a16207",
        }}>
          <span style={{ width: 8, height: 8, borderRadius: "50%", backgroundColor: "#eab308", display: "inline-block" }} />
          Demo Mode — Backend is offline. Showing simulated flow.
        </div>
      )}

      {/* ─── Header ─── */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <p style={{ fontSize: "13px", color: "#6b7280" }}>
          Live simulation of CompliAgent compliance flows
        </p>
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          {demoComplete && (
            <button onClick={resetDemo} style={{
              display: "flex", alignItems: "center", gap: "6px", padding: "8px 16px",
              borderRadius: "10px", border: "1px solid #e5e7eb", fontSize: "13px",
              color: "#6b7280", background: "white", cursor: "pointer",
            }}>
              <RotateCcw style={{ width: 16, height: 16 }} /> Reset
            </button>
          )}
          <button onClick={isRunning ? resetDemo : runDemo} style={{
            display: "flex", alignItems: "center", gap: "8px", padding: "10px 20px",
            borderRadius: "10px", fontSize: "13px", fontWeight: 600, border: "none", cursor: "pointer",
            background: isRunning ? "#ef4444" : "#7C3AED", color: "white",
            boxShadow: isRunning ? "0 2px 8px rgba(239,68,68,0.3)" : "0 2px 8px rgba(124,58,237,0.3)",
          }}>
            {isRunning ? (
              <><Loader2 style={{ width: 16, height: 16, animation: "spin 1s linear infinite" }} /> Stop Demo</>
            ) : (
              <><Play style={{ width: 16, height: 16 }} /> Run {activeDemo === "x402" ? "Agent" : "Affiliate"} Demo</>
            )}
          </button>
        </div>
      </div>

      {/* ─── Flow Selector ─── */}
      <div style={{
        display: "flex", gap: "4px", padding: "4px",
        borderRadius: "12px", border: "1px solid #e5e7eb", width: "fit-content", background: "#fafafa",
      }}>
        {[
          { key: "x402" as const, label: "Flow 1: x402 Agent Purchase" },
          { key: "affiliate" as const, label: "Flow 2: Affiliate Settlement" },
        ].map((tab) => (
          <button key={tab.key} onClick={() => switchDemo(tab.key)} style={{
            padding: "8px 20px", borderRadius: "8px", fontSize: "13px", border: "none", cursor: "pointer",
            fontWeight: activeDemo === tab.key ? 600 : 400,
            background: activeDemo === tab.key ? "#7C3AED" : "transparent",
            color: activeDemo === tab.key ? "white" : "#6b7280",
            transition: "all 0.2s",
          }}>
            {tab.label}
          </button>
        ))}
      </div>

      {/* ─── Flow Description ─── */}
      <div style={{
        background: "linear-gradient(135deg, rgba(124,58,237,0.04), rgba(124,58,237,0.08))",
        border: "1px solid rgba(124,58,237,0.12)", borderRadius: "14px", padding: "20px",
      }}>
        {activeDemo === "x402" ? (
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "8px" }}>
              <Bot style={{ width: 18, height: 18, color: "#7C3AED" }} />
              <h4 style={{ fontSize: "15px", fontWeight: 600, margin: 0 }}>x402 Agent Data Purchase with Compliance</h4>
            </div>
            <p style={{ fontSize: "13px", color: "#6b7280", margin: 0, lineHeight: 1.6 }}>
              An enterprise AI agent purchases premium financial data from a paywalled API using the <strong>x402 protocol</strong>.
              CompliAgent intercepts the payment, verifies compliance, generates a <strong>ZK stamp via Unlink</strong>, and settles
              on <strong>Monad</strong> in under 1 second. The public ledger reveals nothing about agent identity, data purchased, or amount.
            </p>
            <div style={{ display: "flex", gap: "16px", marginTop: "12px", flexWrap: "wrap" }}>
              {[
                { icon: Shield, label: "Privacy: Unlink SDK", color: "#7C3AED" },
                { icon: Zap, label: "Settlement: Monad Testnet", color: "#eab308" },
                { icon: ShieldCheck, label: "Compliance: On-Chain Registry", color: "#10b981" },
              ].map((tag) => (
                <div key={tag.label} style={{
                  display: "flex", alignItems: "center", gap: "6px", fontSize: "11px",
                  color: tag.color, fontWeight: 500,
                }}>
                  <tag.icon style={{ width: 13, height: 13 }} /> {tag.label}
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "8px" }}>
              <Users style={{ width: 18, height: 18, color: "#7C3AED" }} />
              <h4 style={{ fontSize: "15px", fontWeight: 600, margin: 0 }}>Three-Party Affiliate Commission Split</h4>
            </div>
            <p style={{ fontSize: "13px", color: "#6b7280", margin: 0, lineHeight: 1.6 }}>
              Merchant (Entity 1) sells a product. Affiliate (Entity 2) earns <strong>15% commission</strong>. Buyer (Entity 3) pays $100 USDC.
              CompliAgent verifies the commission split using <strong>zero-knowledge verification</strong>: proving x + y = z without
              exposing individual amounts. Each transfer is <strong>shielded via Unlink</strong>.
            </p>
            <div style={{ display: "flex", gap: "16px", marginTop: "12px", flexWrap: "wrap" }}>
              {[
                { icon: Lock, label: "Shielded Transfers: Unlink", color: "#7C3AED" },
                { icon: Zap, label: "On-Chain Stamps: Monad", color: "#eab308" },
                { icon: FileCheck, label: "ZK Proof: x+y=z", color: "#10b981" },
              ].map((tag) => (
                <div key={tag.label} style={{
                  display: "flex", alignItems: "center", gap: "6px", fontSize: "11px",
                  color: tag.color, fontWeight: 500,
                }}>
                  <tag.icon style={{ width: 13, height: 13 }} /> {tag.label}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* ─── Execution Pipeline ─── */}
      <div style={{
        borderRadius: "14px", border: "1px solid #e5e7eb", overflow: "hidden", background: "white",
      }}>
        <div style={{
          padding: "14px 20px", borderBottom: "1px solid #e5e7eb",
          display: "flex", alignItems: "center", justifyContent: "space-between",
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <Activity style={{ width: 16, height: 16, color: "#7C3AED" }} />
            <h3 style={{ fontSize: "15px", fontWeight: 600, margin: 0 }}>Execution Pipeline</h3>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            {isRunning && (
              <span style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "12px", color: "#7C3AED" }}>
                <span style={{
                  width: 6, height: 6, borderRadius: "50%", backgroundColor: "#7C3AED",
                  animation: "pulse 1.5s ease-in-out infinite",
                }} />
                Live Execution...
              </span>
            )}
            {totalTime > 0 && (
              <span style={{
                fontSize: "11px", padding: "4px 10px", borderRadius: "20px",
                backgroundColor: "#10b981", color: "white", fontWeight: 600,
                fontFamily: "'Roboto Mono', monospace",
              }}>
                Total: {formatMs(totalTime)}
              </span>
            )}
          </div>
        </div>

        <div>
          {steps.map((step, idx) => {
            const Icon = step.icon;
            const isActive = idx === currentStep && isRunning;
            const timing = getStepTiming(step.id);
            return (
              <div key={step.id} style={{
                display: "flex", alignItems: "flex-start", gap: "16px",
                padding: "16px 20px", borderBottom: idx < steps.length - 1 ? "1px solid #f3f4f6" : "none",
                transition: "all 0.3s ease",
                background: isActive
                  ? "rgba(124,58,237,0.03)"
                  : step.status === "success"
                    ? "rgba(16,185,129,0.02)"
                    : "transparent",
              }}>
                {/* Step indicator */}
                <div style={{ display: "flex", flexDirection: "column", alignItems: "center", paddingTop: "2px" }}>
                  <div style={{
                    width: 40, height: 40, borderRadius: "50%",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    transition: "all 0.4s ease",
                    background: step.status === "success" ? "#dcfce7"
                      : step.status === "running" ? "rgba(124,58,237,0.1)"
                        : step.status === "error" ? "#fee2e2" : "#f3f4f6",
                    border: step.status === "running" ? "2px solid #7C3AED" : "2px solid transparent",
                  }}>
                    {step.status === "running" ? (
                      <Loader2 style={{ width: 18, height: 18, color: "#7C3AED", animation: "spin 1s linear infinite" }} />
                    ) : step.status === "success" ? (
                      <CheckCircle2 style={{ width: 18, height: 18, color: "#16a34a" }} />
                    ) : step.status === "error" ? (
                      <XCircle style={{ width: 18, height: 18, color: "#dc2626" }} />
                    ) : (
                      <Icon style={{ width: 18, height: 18, color: "#9ca3af" }} />
                    )}
                  </div>
                </div>

                {/* Content */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap" }}>
                    <span style={{
                      fontSize: "10px", color: "#9ca3af", textTransform: "uppercase",
                      letterSpacing: "0.08em", fontFamily: "'Roboto Mono', monospace",
                    }}>
                      Step {idx + 1}
                    </span>
                    {isActive && (
                      <span style={{
                        fontSize: "10px", color: "#7C3AED", backgroundColor: "rgba(124,58,237,0.08)",
                        padding: "2px 8px", borderRadius: "10px", fontWeight: 600,
                      }}>
                        ● IN PROGRESS
                      </span>
                    )}
                    {step.status === "success" && timing != null && (
                      <span style={{
                        fontSize: "10px", padding: "2px 8px", borderRadius: "10px",
                        backgroundColor: "rgba(16,185,129,0.08)", color: "#16a34a",
                        fontFamily: "'Roboto Mono', monospace", fontWeight: 500,
                      }}>
                        {formatMs(timing)}
                      </span>
                    )}
                    {/* Powered By tag */}
                    <span style={{
                      fontSize: "10px", padding: "2px 8px", borderRadius: "10px",
                      backgroundColor: "rgba(124,58,237,0.05)", color: "#7C3AED",
                      fontWeight: 500, marginLeft: "auto",
                    }}>
                      ⚡ {step.poweredBy}
                    </span>
                  </div>

                  <p style={{
                    fontSize: "14px", margin: "4px 0 0", fontWeight: 500,
                    color: step.status === "idle" ? "#9ca3af" : "#111827",
                  }}>
                    {step.label}
                  </p>

                  <p style={{ fontSize: "12px", color: "#6b7280", margin: "2px 0 0", lineHeight: 1.5 }}>
                    {step.detail || step.description}
                  </p>
                </div>

                {/* Status badge */}
                <div style={{ display: "flex", alignItems: "center", flexShrink: 0, paddingTop: "4px" }}>
                  {step.status === "success" && (
                    <span style={{
                      fontSize: "11px", color: "#16a34a", fontFamily: "'Roboto Mono', monospace",
                      fontWeight: 500,
                    }}>
                      ✓ {timing != null ? formatMs(timing) : "Done"}
                    </span>
                  )}
                  {step.status === "running" && (
                    <span style={{
                      fontSize: "11px", color: "#7C3AED", fontFamily: "'Roboto Mono', monospace",
                    }}>
                      Processing…
                    </span>
                  )}
                  {step.status === "error" && (
                    <span style={{
                      fontSize: "11px", color: "#dc2626", fontFamily: "'Roboto Mono', monospace",
                    }}>
                      ✗ Error
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ─── Data Flow Visualization ─── */}
      {(isRunning || demoComplete) && (
        <div style={{
          borderRadius: "14px", border: "1px solid #e5e7eb", overflow: "hidden",
          background: "linear-gradient(180deg, #fafafa, white)",
        }}>
          <div style={{ padding: "14px 20px", borderBottom: "1px solid #e5e7eb" }}>
            <h3 style={{ fontSize: "15px", fontWeight: 600, margin: 0, display: "flex", alignItems: "center", gap: "8px" }}>
              <Globe style={{ width: 16, height: 16, color: "#7C3AED" }} />
              Real-Time Data Flow
            </h3>
          </div>
          <div style={{ padding: "24px 20px" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              {[
                { label: "Agent Wallet", icon: Bot, color: "#7C3AED", activeStep: 0 },
                { label: "CompliAgent Engine", icon: ShieldCheck, color: "#10b981", activeStep: 2 },
                { label: "Unlink Privacy Pool", icon: Shield, color: "#7C3AED", activeStep: 3 },
                { label: "Monad Block", icon: Zap, color: "#eab308", activeStep: 4 },
              ].map((node, nIdx) => {
                const active = currentStep >= node.activeStep || demoComplete;
                return (
                  <div key={node.label} style={{ display: "contents" }}>
                    <div style={{
                      display: "flex", flexDirection: "column", alignItems: "center", gap: "8px",
                      opacity: active ? 1 : 0.3, transition: "all 0.5s ease",
                    }}>
                      <div style={{
                        width: 48, height: 48, borderRadius: "12px",
                        display: "flex", alignItems: "center", justifyContent: "center",
                        background: active ? `${node.color}15` : "#f3f4f6",
                        border: `2px solid ${active ? `${node.color}40` : "#e5e7eb"}`,
                        transition: "all 0.5s ease",
                      }}>
                        <node.icon style={{ width: 20, height: 20, color: active ? node.color : "#9ca3af", transition: "all 0.5s" }} />
                      </div>
                      <span style={{
                        fontSize: "10px", textAlign: "center", color: active ? node.color : "#9ca3af",
                        fontFamily: "'Roboto Mono', monospace", fontWeight: 500, maxWidth: "80px",
                        transition: "all 0.5s",
                      }}>
                        {node.label}
                      </span>
                    </div>
                    {nIdx < 3 && (
                      <div style={{
                        display: "flex", alignItems: "center", opacity: active ? 1 : 0.2,
                        transition: "all 0.5s",
                      }}>
                        <div style={{
                          height: 2, width: "40px", transition: "all 0.5s",
                          background: currentStep > node.activeStep || demoComplete ? "#7C3AED" : "#e5e7eb",
                        }} />
                        <ArrowRight style={{
                          width: 14, height: 14, marginLeft: "-2px",
                          color: currentStep > node.activeStep || demoComplete ? "#7C3AED" : "#e5e7eb",
                          transition: "all 0.5s",
                        }} />
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* ─── Result Panel ─── */}
      {demoComplete && (
        <div style={{
          borderRadius: "14px", border: "2px solid #bbf7d0", overflow: "hidden",
          background: "linear-gradient(135deg, #f0fdf4, #ecfdf5)",
        }}>
          <div style={{
            padding: "14px 20px", borderBottom: "1px solid #bbf7d0",
            display: "flex", alignItems: "center", justifyContent: "space-between",
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <CheckCircle2 style={{ width: 20, height: 20, color: "#16a34a" }} />
              <h3 style={{ fontSize: "15px", fontWeight: 600, margin: 0, color: "#14532d" }}>
                {activeDemo === "x402" ? "x402 Agent Purchase — Settlement Confirmed" : "Affiliate Settlement — All Parties Paid"}
              </h3>
            </div>
            {totalTime > 0 && (
              <span style={{
                fontSize: "12px", padding: "4px 12px", borderRadius: "20px",
                background: "rgba(16,185,129,0.1)", color: "#059669",
                fontFamily: "'Roboto Mono', monospace", fontWeight: 600,
              }}>
                Total: {formatMs(totalTime)}
              </span>
            )}
          </div>

          <div style={{ padding: "20px", display: "flex", flexDirection: "column", gap: "16px" }}>
            {/* Tx details grid */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "12px" }}>
              {/* Monad Tx Hash */}
              <div style={{ background: "rgba(255,255,255,0.7)", borderRadius: "10px", padding: "14px" }}>
                <label style={{ fontSize: "10px", color: "#6b7280", textTransform: "uppercase", letterSpacing: "0.06em", fontWeight: 600 }}>
                  Monad Tx Hash
                </label>
                <div style={{ display: "flex", alignItems: "center", gap: "6px", marginTop: "6px" }}>
                  <a
                    href={`${EXPLORER}/tx/${txHash}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{
                      fontSize: "11px", fontFamily: "'Roboto Mono', monospace",
                      color: "#7C3AED", textDecoration: "none", wordBreak: "break-all",
                    }}
                    title="View on Monad Explorer"
                  >
                    {txHash ? `${txHash.slice(0, 22)}…` : "—"}
                  </a>
                  {txHash && (
                    <>
                      <button onClick={() => copyToClipboard(txHash)} style={{
                        background: "none", border: "none", cursor: "pointer", padding: "2px",
                      }}>
                        <Copy style={{ width: 12, height: 12, color: "#9ca3af" }} />
                      </button>
                      <a href={`${EXPLORER}/tx/${txHash}`} target="_blank" rel="noopener noreferrer"
                        style={{ padding: "2px" }}>
                        <ExternalLink style={{ width: 12, height: 12, color: "#7C3AED" }} />
                      </a>
                    </>
                  )}
                </div>
              </div>

              {/* Block Number */}
              <div style={{ background: "rgba(255,255,255,0.7)", borderRadius: "10px", padding: "14px" }}>
                <label style={{ fontSize: "10px", color: "#6b7280", textTransform: "uppercase", letterSpacing: "0.06em", fontWeight: 600 }}>
                  Monad Block
                </label>
                <p style={{
                  fontSize: "14px", fontFamily: "'Roboto Mono', monospace", margin: "6px 0 0",
                  color: "#111827", fontWeight: 600,
                }}>
                  #{blockNumber > 0 ? blockNumber.toLocaleString() : "—"}
                </p>
              </div>

              {/* ZK Proof Hash */}
              <div style={{ background: "rgba(255,255,255,0.7)", borderRadius: "10px", padding: "14px" }}>
                <label style={{ fontSize: "10px", color: "#6b7280", textTransform: "uppercase", letterSpacing: "0.06em", fontWeight: 600 }}>
                  ZK Proof Hash (Unlink)
                </label>
                <div style={{ display: "flex", alignItems: "center", gap: "6px", marginTop: "6px" }}>
                  <code style={{
                    fontSize: "11px", fontFamily: "'Roboto Mono', monospace",
                    color: "#16a34a", wordBreak: "break-all",
                  }}>
                    {proofHash ? `${proofHash.slice(0, 22)}…` : "—"}
                  </code>
                  {proofHash && (
                    <button onClick={() => copyToClipboard(proofHash)} style={{
                      background: "none", border: "none", cursor: "pointer", padding: "2px",
                    }}>
                      <Copy style={{ width: 12, height: 12, color: "#9ca3af" }} />
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* Step Timings */}
            {stepTimings.length > 0 && (
              <div style={{ background: "rgba(255,255,255,0.5)", borderRadius: "10px", padding: "14px" }}>
                <h4 style={{ fontSize: "13px", margin: "0 0 12px", display: "flex", alignItems: "center", gap: "6px" }}>
                  <Clock style={{ width: 14, height: 14, color: "#7C3AED" }} />
                  Step Timings
                </h4>
                <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                  {stepTimings.map((timing) => {
                    const stepDef = steps.find((s) => s.id === timing.step);
                    const maxMs = Math.max(...stepTimings.map((t) => t.durationMs), 1);
                    const widthPct = Math.max((timing.durationMs / maxMs) * 100, 4);
                    return (
                      <div key={timing.step} style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                        <span style={{
                          fontSize: "11px", color: "#6b7280", width: "140px", flexShrink: 0,
                          fontFamily: "'Roboto Mono', monospace", overflow: "hidden", textOverflow: "ellipsis",
                          whiteSpace: "nowrap",
                        }}>
                          {stepDef?.label || timing.step}
                        </span>
                        <div style={{ flex: 1, height: "14px", background: "#f3f4f6", borderRadius: "7px", overflow: "hidden" }}>
                          <div style={{
                            height: "100%", borderRadius: "7px", transition: "width 0.7s ease",
                            width: `${widthPct}%`,
                            background: timing.durationMs < 600 ? "#10b981"
                              : timing.durationMs < 2000 ? "#7C3AED" : "#eab308",
                          }} />
                        </div>
                        <span style={{
                          fontSize: "11px", color: "#6b7280", width: "60px", textAlign: "right", flexShrink: 0,
                          fontFamily: "'Roboto Mono', monospace",
                        }}>
                          {formatMs(timing.durationMs)}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Privacy Section */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
              {/* Hidden from ledger */}
              <div style={{
                background: "rgba(124,58,237,0.04)", border: "1px solid rgba(124,58,237,0.1)",
                borderRadius: "10px", padding: "14px",
              }}>
                <h4 style={{ fontSize: "13px", margin: "0 0 10px", display: "flex", alignItems: "center", gap: "6px" }}>
                  <EyeOff style={{ width: 14, height: 14, color: "#7C3AED" }} />
                  Hidden from Public Ledger
                </h4>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "6px" }}>
                  {["Agent Identity", "Vendor Identity", "Payment Amount",
                    activeDemo === "affiliate" ? "Commission Split" : "Data Purchased",
                  ].map((item) => (
                    <div key={item} style={{
                      display: "flex", alignItems: "center", gap: "6px",
                      fontSize: "12px", color: "#6b7280",
                    }}>
                      <Lock style={{ width: 12, height: 12, color: "#7C3AED" }} />
                      {item}
                    </div>
                  ))}
                </div>
              </div>

              {/* Proven on-chain */}
              <div style={{
                background: "rgba(16,185,129,0.04)", border: "1px solid rgba(16,185,129,0.1)",
                borderRadius: "10px", padding: "14px",
              }}>
                <h4 style={{ fontSize: "13px", margin: "0 0 10px", display: "flex", alignItems: "center", gap: "6px" }}>
                  <ShieldCheck style={{ width: 14, height: 14, color: "#16a34a" }} />
                  Cryptographically Proven On-Chain
                </h4>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "6px" }}>
                  {["Within Budget", "Vendor Approved", "AML Clean",
                    activeDemo === "affiliate" ? "Split Correct" : "Policy Compliant",
                  ].map((item) => (
                    <div key={item} style={{
                      display: "flex", alignItems: "center", gap: "6px",
                      fontSize: "12px", color: "#15803d",
                    }}>
                      <CheckCircle2 style={{ width: 12, height: 12, color: "#16a34a" }} />
                      {item}
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Verify on Explorer CTA */}
            {txHash && (
              <a
                href={`${EXPLORER}/tx/${txHash}`}
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  display: "flex", alignItems: "center", justifyContent: "center", gap: "8px",
                  padding: "12px", borderRadius: "10px",
                  background: "linear-gradient(135deg, #7C3AED, #6D28D9)",
                  color: "white", fontSize: "13px", fontWeight: 600, textDecoration: "none",
                  boxShadow: "0 2px 8px rgba(124,58,237,0.3)",
                }}
              >
                <ExternalLink style={{ width: 14, height: 14 }} />
                Verify Transaction on Monad Explorer →
              </a>
            )}
          </div>
        </div>
      )}

      {/* CSS keyframes for spinner */}
      <style>{`
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        @keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.3; } }
      `}</style>
    </div>
  );
}
