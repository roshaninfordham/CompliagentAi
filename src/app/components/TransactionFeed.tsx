import { useState, useEffect, useRef } from "react";
import {
  Search,
  Filter,
  ShieldCheck,
  Clock,
  EyeOff,
  Eye,
  ExternalLink,
  X,
  Copy,
  CheckCircle2,
  RefreshCw,
} from "lucide-react";
import { transactions, type Transaction } from "./mock-data";
import { useMonadContracts } from "../../hooks/useMonadContracts.js";
import { useBlockNumber } from "../../hooks/useBlockNumber";

/** Extended transaction type that tracks whether the entry came from on-chain events */
interface FeedTransaction extends Transaction {
  onChain?: boolean;
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

function OnChainBadge() {
  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] bg-emerald-100 text-emerald-800 border border-emerald-200">
      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
      On-Chain
    </span>
  );
}

export function TransactionFeed() {
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [selectedTx, setSelectedTx] = useState<FeedTransaction | null>(null);
  const [isLive, setIsLive] = useState(true);
  const [txList, setTxList] = useState<FeedTransaction[]>(transactions);
  const [feedMode, setFeedMode] = useState<"simulated" | "onchain">("simulated");

  // On-chain hooks
  const { complianceEvents } = useMonadContracts();
  const { blockNumber: currentBlockNumber } = useBlockNumber();

  // Track which on-chain events we've already ingested so we don't duplicate
  const processedEventsRef = useRef<Set<string>>(new Set());

  // Use the real block number as a base for simulated transactions, falling back to a high default
  const baseBlockNumber = currentBlockNumber ?? 18_472_960;
  const simBlockCounterRef = useRef(0);

  // Auto-switch to on-chain mode when real events arrive
  useEffect(() => {
    if (complianceEvents.length > 0 && feedMode === "simulated") {
      setFeedMode("onchain");
    }
  }, [complianceEvents, feedMode]);

  // Ingest real ComplianceStamped events into the feed
  useEffect(() => {
    if (complianceEvents.length === 0) return;

    const newEntries: FeedTransaction[] = [];

    for (const evt of complianceEvents) {
      const key = `${evt.txHash}-${evt.blockNumber}`;
      if (processedEventsRef.current.has(key)) continue;
      processedEventsRef.current.add(key);

      const txHashStr = typeof evt.txHash === "string" ? evt.txHash : String(evt.txHash);
      const proofHashStr = typeof evt.proofHash === "string" ? evt.proofHash : String(evt.proofHash);

      const shortTxHash =
        txHashStr.length > 14
          ? `${txHashStr.slice(0, 6)}...${txHashStr.slice(-4)}`
          : txHashStr;

      const shortProofHash =
        proofHashStr.length > 14
          ? `${proofHashStr.slice(0, 6)}...${proofHashStr.slice(-4)}`
          : proofHashStr;

      newEntries.push({
        id: `onchain-${key}`,
        agentName: "On-Chain Agent",
        agentId: "onchain",
        vendor: "ComplianceRegistry",
        amount: 0,
        status: "compliant",
        txHash: shortTxHash,
        timestamp: new Date(evt.timestamp * 1000),
        shielded: true,
        type: "ComplianceStamped",
        proofHash: shortProofHash,
        blockNumber: evt.blockNumber,
        onChain: true,
      });
    }

    if (newEntries.length > 0) {
      setTxList((prev) => [...newEntries, ...prev].slice(0, 50));
    }
  }, [complianceEvents]);

  // Simulate new transactions arriving (fallback / simulated mode)
  useEffect(() => {
    if (!isLive) return;
    if (feedMode === "onchain") return; // don't generate fake data in on-chain mode

    const interval = setInterval(() => {
      simBlockCounterRef.current += 1;

      setTxList((prev) => {
        const newTx: FeedTransaction = {
          id: `tx-live-${Date.now()}`,
          agentName: ["Alpha Data Scout", "Beta Market Analyzer", "Theta Price Oracle", "Zeta Geo Intel"][
            Math.floor(Math.random() * 4)
          ],
          agentId: "agent-001",
          vendor: ["DataStream Pro API", "MarketPulse Analytics", "PriceOracle Network", "GPU Cluster Ltd."][
            Math.floor(Math.random() * 4)
          ],
          amount: Math.floor(Math.random() * 5000) + 10,
          status: Math.random() > 0.1 ? "compliant" : "rejected",
          txHash: `0x${Math.random().toString(16).slice(2, 6)}...${Math.random().toString(16).slice(2, 6)}`,
          timestamp: new Date(),
          shielded: Math.random() > 0.15,
          type: "x402 Purchase",
          proofHash: `0x${Math.random().toString(16).slice(2, 10)}`,
          blockNumber: baseBlockNumber + simBlockCounterRef.current,
          onChain: false,
        };
        return [newTx, ...prev].slice(0, 50);
      });
    }, 5000);
    return () => clearInterval(interval);
  }, [isLive, feedMode, baseBlockNumber]);

  const filteredTx = txList.filter((tx) => {
    const matchesSearch =
      tx.agentName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      tx.vendor.toLowerCase().includes(searchQuery.toLowerCase()) ||
      tx.txHash.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesFilter = statusFilter === "all" || tx.status === statusFilter;
    // In on-chain mode, only show on-chain transactions
    const matchesMode = feedMode === "simulated" || (tx as FeedTransaction).onChain === true;
    return matchesSearch && matchesFilter && matchesMode;
  });

  const formatTime = (date: Date) => {
    const seconds = Math.floor((Date.now() - date.getTime()) / 1000);
    if (seconds < 60) return `${seconds}s ago`;
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    return `${hours}h ago`;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <p className="text-[13px] text-muted-foreground">
            Real-time agent transaction monitoring
          </p>
          <button
            onClick={() => setIsLive(!isLive)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] transition-colors ${isLive
              ? "bg-emerald-50 text-emerald-700"
              : "bg-muted text-muted-foreground"
              }`}
          >
            <span className={`w-1.5 h-1.5 rounded-full ${isLive ? "bg-emerald-500 animate-pulse" : "bg-gray-400"}`} />
            {isLive ? "Live" : "Paused"}
          </button>
          {/* Mode toggle */}
          <div className="flex gap-0.5 bg-muted border border-border rounded-full p-0.5">
            <button
              onClick={() => setFeedMode("simulated")}
              className={`px-2.5 py-1 rounded-full text-[11px] transition-colors ${feedMode === "simulated"
                ? "bg-amber-100 text-amber-800"
                : "text-muted-foreground hover:text-foreground"
                }`}
            >
              Simulated
            </button>
            <button
              onClick={() => setFeedMode("onchain")}
              className={`px-2.5 py-1 rounded-full text-[11px] transition-colors ${feedMode === "onchain"
                ? "bg-emerald-100 text-emerald-800"
                : "text-muted-foreground hover:text-foreground"
                }`}
            >
              On-Chain
            </button>
          </div>
        </div>
        <button
          onClick={() => {
            setTxList(transactions);
            processedEventsRef.current.clear();
            simBlockCounterRef.current = 0;
          }}
          className="flex items-center gap-2 text-[13px] text-muted-foreground hover:text-foreground transition-colors"
        >
          <RefreshCw className="w-4 h-4" />
          Reset
        </button>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search by agent, vendor, or tx hash..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 text-[13px] bg-card border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-[#7C3AED]/30 focus:border-[#7C3AED]"
          />
        </div>
        <div className="flex gap-1 bg-card border border-border rounded-lg p-1">
          {["all", "compliant", "rejected", "pending"].map((status) => (
            <button
              key={status}
              onClick={() => setStatusFilter(status)}
              className={`px-3 py-1.5 rounded-md text-[12px] transition-colors ${statusFilter === status
                ? "bg-[#7C3AED] text-white"
                : "text-muted-foreground hover:text-foreground"
                }`}
            >
              {status.charAt(0).toUpperCase() + status.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {/* Transaction Table */}
      <div className="bg-card rounded-xl border border-border overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="border-b border-border">
              <th className="text-left px-5 py-3 text-[12px] text-muted-foreground uppercase tracking-wider">
                Agent
              </th>
              <th className="text-left px-5 py-3 text-[12px] text-muted-foreground uppercase tracking-wider">
                Vendor
              </th>
              <th className="text-left px-5 py-3 text-[12px] text-muted-foreground uppercase tracking-wider">
                Amount
              </th>
              <th className="text-left px-5 py-3 text-[12px] text-muted-foreground uppercase tracking-wider">
                Privacy
              </th>
              <th className="text-left px-5 py-3 text-[12px] text-muted-foreground uppercase tracking-wider">
                Status
              </th>
              <th className="text-left px-5 py-3 text-[12px] text-muted-foreground uppercase tracking-wider">
                Tx Hash
              </th>
              <th className="text-left px-5 py-3 text-[12px] text-muted-foreground uppercase tracking-wider">
                Time
              </th>
              <th className="text-right px-5 py-3 text-[12px] text-muted-foreground uppercase tracking-wider">
                Details
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {filteredTx.length === 0 ? (
              <tr>
                <td colSpan={8} className="px-5 py-12 text-center">
                  <div className="flex flex-col items-center gap-3">
                    <ShieldCheck className="w-10 h-10 text-muted-foreground/30" />
                    <p className="text-[14px] text-muted-foreground">
                      {feedMode === "onchain"
                        ? "No on-chain events captured yet"
                        : "No transactions match your filters"}
                    </p>
                    {feedMode === "onchain" && (
                      <p className="text-[12px] text-muted-foreground/70 max-w-sm">
                        Run the <strong>Live Demo</strong> to generate real ComplianceStamped events on Monad Testnet.
                        On-chain events will appear here automatically.
                      </p>
                    )}
                  </div>
                </td>
              </tr>
            ) : (
              filteredTx.map((tx) => (
                <tr
                  key={tx.id}
                  className="hover:bg-muted/30 transition-colors cursor-pointer"
                  onClick={() => setSelectedTx(tx)}
                >
                  <td className="px-5 py-3.5">
                    <div className="flex items-center gap-2">
                      <p className="text-[13px] text-foreground">{tx.agentName}</p>
                      {(tx as FeedTransaction).onChain && <OnChainBadge />}
                    </div>
                  </td>
                  <td className="px-5 py-3.5">
                    <p className="text-[13px] text-muted-foreground">{tx.vendor}</p>
                  </td>
                  <td className="px-5 py-3.5">
                    <span className="text-[13px] text-foreground" style={{ fontFamily: "'Roboto Mono', monospace" }}>
                      {tx.shielded ? (
                        <span className="text-[#7C3AED]">****</span>
                      ) : (
                        `$${tx.amount.toLocaleString()}`
                      )}
                    </span>
                  </td>
                  <td className="px-5 py-3.5">
                    {tx.shielded ? (
                      <span className="inline-flex items-center gap-1 text-[11px] text-[#7C3AED]">
                        <EyeOff className="w-3 h-3" />
                        Shielded
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-[11px] text-muted-foreground">
                        <Eye className="w-3 h-3" />
                        Public
                      </span>
                    )}
                  </td>
                  <td className="px-5 py-3.5">
                    <ComplianceBadge status={tx.status} />
                  </td>
                  <td className="px-5 py-3.5">
                    <span className="text-[12px] text-muted-foreground" style={{ fontFamily: "'Roboto Mono', monospace" }}>
                      {tx.txHash}
                    </span>
                  </td>
                  <td className="px-5 py-3.5">
                    <span className="text-[12px] text-muted-foreground">
                      {formatTime(tx.timestamp)}
                    </span>
                  </td>
                  <td className="px-5 py-3.5 text-right">
                    <button className="p-1.5 rounded-md hover:bg-muted transition-colors">
                      <ExternalLink className="w-4 h-4 text-muted-foreground" />
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Transaction Detail Modal */}
      {selectedTx && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-card rounded-2xl border border-border w-full max-w-md mx-4 shadow-xl">
            <div className="flex items-center justify-between p-5 border-b border-border">
              <div className="flex items-center gap-2">
                <h3 className="text-[16px] text-foreground">Transaction Details</h3>
                {(selectedTx as FeedTransaction).onChain && <OnChainBadge />}
              </div>
              <button
                onClick={() => setSelectedTx(null)}
                className="p-1.5 rounded-md hover:bg-muted transition-colors"
              >
                <X className="w-5 h-5 text-muted-foreground" />
              </button>
            </div>
            <div className="p-5 space-y-4">
              <div className="flex items-center justify-between">
                <ComplianceBadge status={selectedTx.status} />
                {selectedTx.shielded && (
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] bg-[#7C3AED]/10 text-[#7C3AED]">
                    <EyeOff className="w-3 h-3" />
                    Unlink Shielded
                  </span>
                )}
              </div>

              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-[12px] text-muted-foreground">Agent</span>
                  <span className="text-[13px] text-foreground">{selectedTx.agentName}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[12px] text-muted-foreground">Vendor</span>
                  <span className="text-[13px] text-foreground">{selectedTx.vendor}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[12px] text-muted-foreground">Amount</span>
                  <span className="text-[13px] text-foreground" style={{ fontFamily: "'Roboto Mono', monospace" }}>
                    {selectedTx.shielded ? (
                      <span className="text-[#7C3AED]">**** (shielded)</span>
                    ) : (
                      `$${selectedTx.amount.toLocaleString()} USDC`
                    )}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[12px] text-muted-foreground">Type</span>
                  <span className="text-[13px] text-foreground">{selectedTx.type}</span>
                </div>
                <div className="flex justify-between items-start">
                  <span className="text-[12px] text-muted-foreground">Tx Hash</span>
                  <div className="flex items-center gap-1">
                    <span className="text-[12px] text-foreground" style={{ fontFamily: "'Roboto Mono', monospace" }}>
                      {selectedTx.txHash}
                    </span>
                    <button
                      onClick={() => navigator.clipboard.writeText(selectedTx.txHash)}
                      className="p-1 rounded hover:bg-muted"
                    >
                      <Copy className="w-3 h-3 text-muted-foreground" />
                    </button>
                  </div>
                </div>
                {selectedTx.blockNumber && (
                  <div className="flex justify-between">
                    <span className="text-[12px] text-muted-foreground">Block</span>
                    <span className="text-[13px] text-foreground" style={{ fontFamily: "'Roboto Mono', monospace" }}>
                      #{selectedTx.blockNumber.toLocaleString()}
                    </span>
                  </div>
                )}
                {selectedTx.proofHash && (
                  <div className="flex justify-between items-start">
                    <span className="text-[12px] text-muted-foreground">ZK Proof</span>
                    <span className="text-[12px] text-emerald-600 flex items-center gap-1" style={{ fontFamily: "'Roboto Mono', monospace" }}>
                      <CheckCircle2 className="w-3 h-3" />
                      {selectedTx.proofHash}
                    </span>
                  </div>
                )}
                {(selectedTx as FeedTransaction).onChain && (
                  <div className="flex justify-between">
                    <span className="text-[12px] text-muted-foreground">Source</span>
                    <span className="text-[12px] text-emerald-600 flex items-center gap-1">
                      <CheckCircle2 className="w-3 h-3" />
                      Verified on-chain event
                    </span>
                  </div>
                )}
              </div>

              {selectedTx.status === "compliant" && selectedTx.proofHash && (
                <div className="bg-emerald-50 rounded-lg p-3 flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-emerald-600" />
                  <p className="text-[12px] text-emerald-700">
                    Compliance verified via ZK proof on Monad block #{selectedTx.blockNumber?.toLocaleString()}
                  </p>
                </div>
              )}

              {selectedTx.status === "rejected" && (
                <div className="bg-red-50 rounded-lg p-3 flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-red-500" />
                  <p className="text-[12px] text-red-700">
                    Transaction rejected: exceeded budget cap or vendor not on allowlist
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
