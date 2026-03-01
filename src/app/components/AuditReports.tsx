import { useState } from "react";
import {
  FileText,
  Download,
  Share2,
  CheckCircle2,
  Clock,
  ShieldCheck,
  AlertTriangle,
  Copy,
  ExternalLink,
  Loader2,
  Shield,
} from "lucide-react";
import { auditReports, dashboardStats } from "./mock-data";

export function AuditReports() {
  const [isGenerating, setIsGenerating] = useState(false);
  const [showProofModal, setShowProofModal] = useState<string | null>(null);
  const [copiedHash, setCopiedHash] = useState(false);

  const handleGenerate = () => {
    setIsGenerating(true);
    setTimeout(() => setIsGenerating(false), 2500);
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedHash(true);
    setTimeout(() => setCopiedHash(false), 2000);
  };

  const selectedReport = auditReports.find((r) => r.id === showProofModal);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <p className="text-[13px] text-muted-foreground">
          Generate ZK-verified audit reports with selective disclosure
        </p>
        <button
          onClick={handleGenerate}
          disabled={isGenerating}
          className="flex items-center gap-2 bg-[#7C3AED] text-white px-4 py-2.5 rounded-lg hover:bg-[#6D28D9] transition-colors text-[13px] disabled:opacity-60"
        >
          {isGenerating ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              Generating ZK Proof...
            </>
          ) : (
            <>
              <FileText className="w-4 h-4" />
              Generate Report
            </>
          )}
        </button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-card rounded-xl border border-border p-5">
          <div className="flex items-center gap-2 mb-3">
            <ShieldCheck className="w-5 h-5 text-emerald-500" />
            <span className="text-[12px] text-muted-foreground">Pass Rate</span>
          </div>
          <p className="text-[28px] text-foreground" style={{ fontFamily: "'Roboto Mono', monospace" }}>
            {dashboardStats.complianceRate}%
          </p>
          <p className="text-[11px] text-emerald-600 mt-1">ZK-Verified</p>
        </div>
        <div className="bg-card rounded-xl border border-border p-5">
          <div className="flex items-center gap-2 mb-3">
            <CheckCircle2 className="w-5 h-5 text-[#7C3AED]" />
            <span className="text-[12px] text-muted-foreground">Total Verified</span>
          </div>
          <p className="text-[28px] text-foreground" style={{ fontFamily: "'Roboto Mono', monospace" }}>
            {dashboardStats.totalTransactions.toLocaleString()}
          </p>
          <p className="text-[11px] text-muted-foreground mt-1">All-time transactions</p>
        </div>
        <div className="bg-card rounded-xl border border-border p-5">
          <div className="flex items-center gap-2 mb-3">
            <AlertTriangle className="w-5 h-5 text-red-500" />
            <span className="text-[12px] text-muted-foreground">Rejected</span>
          </div>
          <p className="text-[28px] text-foreground" style={{ fontFamily: "'Roboto Mono', monospace" }}>
            {dashboardStats.rejectedToday}
          </p>
          <p className="text-[11px] text-muted-foreground mt-1">Today</p>
        </div>
        <div className="bg-card rounded-xl border border-border p-5">
          <div className="flex items-center gap-2 mb-3">
            <Shield className="w-5 h-5 text-[#7C3AED]" />
            <span className="text-[12px] text-muted-foreground">Shielded</span>
          </div>
          <p className="text-[28px] text-foreground" style={{ fontFamily: "'Roboto Mono', monospace" }}>
            {dashboardStats.shieldedPercentage}%
          </p>
          <p className="text-[11px] text-muted-foreground mt-1">Unlink-protected</p>
        </div>
      </div>

      {/* Privacy Notice */}
      <div className="bg-[#7C3AED]/5 border border-[#7C3AED]/15 rounded-xl p-5">
        <div className="flex items-start gap-3">
          <Shield className="w-5 h-5 text-[#7C3AED] mt-0.5" />
          <div>
            <h4 className="text-[14px] text-foreground mb-1">Selective Disclosure</h4>
            <p className="text-[13px] text-muted-foreground">
              Audit reports use Unlink ZKP-based selective disclosure. Auditors can verify 
              compliance rates, total transactions, and AML status without accessing individual 
              transaction details, agent identities, or spending patterns.
            </p>
          </div>
        </div>
      </div>

      {/* Reports List */}
      <div className="bg-card rounded-xl border border-border">
        <div className="px-5 py-4 border-b border-border">
          <h3 className="text-[15px] text-foreground">Generated Reports</h3>
        </div>
        <div className="divide-y divide-border">
          {auditReports.map((report) => (
            <div
              key={report.id}
              className="flex items-center justify-between px-5 py-4 hover:bg-muted/30 transition-colors"
            >
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-lg bg-[#7C3AED]/10 flex items-center justify-center">
                  <FileText className="w-5 h-5 text-[#7C3AED]" />
                </div>
                <div>
                  <p className="text-[13px] text-foreground">
                    Compliance Audit Report
                  </p>
                  <p className="text-[11px] text-muted-foreground mt-0.5">
                    {report.generatedAt.toLocaleDateString()} · {report.totalTransactions.toLocaleString()} transactions
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-6">
                <div className="text-right">
                  <div className="flex items-center gap-2">
                    <span
                      className={`text-[13px] ${
                        report.passRate >= 99
                          ? "text-emerald-600"
                          : report.passRate >= 98
                          ? "text-[#7C3AED]"
                          : "text-amber-600"
                      }`}
                      style={{ fontFamily: "'Roboto Mono', monospace" }}
                    >
                      {report.passRate}% pass rate
                    </span>
                  </div>
                  <p className="text-[11px] text-muted-foreground mt-0.5" style={{ fontFamily: "'Roboto Mono', monospace" }}>
                    Block #{report.blockNumber.toLocaleString()}
                  </p>
                </div>
                <div className="flex items-center gap-1">
                  {report.status === "verified" && (
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] bg-emerald-50 text-emerald-700">
                      <CheckCircle2 className="w-3 h-3" />
                      Verified
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => setShowProofModal(report.id)}
                    className="p-2 rounded-md hover:bg-muted transition-colors"
                    title="View Proof"
                  >
                    <ExternalLink className="w-4 h-4 text-muted-foreground" />
                  </button>
                  <button
                    className="p-2 rounded-md hover:bg-muted transition-colors"
                    title="Download"
                  >
                    <Download className="w-4 h-4 text-muted-foreground" />
                  </button>
                  <button
                    className="p-2 rounded-md hover:bg-[#7C3AED]/10 transition-colors"
                    title="Share with Auditor"
                  >
                    <Share2 className="w-4 h-4 text-[#7C3AED]" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Proof Details Modal */}
      {selectedReport && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-card rounded-2xl border border-border w-full max-w-md mx-4 shadow-xl">
            <div className="flex items-center justify-between p-5 border-b border-border">
              <h3 className="text-[16px] text-foreground">ZK Proof Details</h3>
              <button
                onClick={() => setShowProofModal(null)}
                className="p-1.5 rounded-md hover:bg-muted transition-colors text-muted-foreground"
              >
                ✕
              </button>
            </div>
            <div className="p-5 space-y-4">
              <div className="bg-emerald-50 rounded-lg p-4 flex items-center gap-3">
                <CheckCircle2 className="w-6 h-6 text-emerald-600" />
                <div>
                  <p className="text-[14px] text-emerald-800">Cryptographically Verified</p>
                  <p className="text-[12px] text-emerald-600">
                    This proof is verifiable on Monad Testnet
                  </p>
                </div>
              </div>

              <div className="space-y-3">
                <div>
                  <label className="text-[12px] text-muted-foreground">Proof Hash</label>
                  <div className="flex items-center gap-2 mt-1">
                    <code className="flex-1 text-[12px] bg-muted/50 px-3 py-2 rounded-lg break-all" style={{ fontFamily: "'Roboto Mono', monospace" }}>
                      {selectedReport.proofHash}
                    </code>
                    <button
                      onClick={() => copyToClipboard(selectedReport.proofHash)}
                      className="p-2 rounded-md hover:bg-muted transition-colors"
                    >
                      <Copy className={`w-4 h-4 ${copiedHash ? "text-emerald-500" : "text-muted-foreground"}`} />
                    </button>
                  </div>
                </div>
                <div>
                  <label className="text-[12px] text-muted-foreground">Monad Block</label>
                  <p className="text-[13px] text-foreground mt-1" style={{ fontFamily: "'Roboto Mono', monospace" }}>
                    #{selectedReport.blockNumber.toLocaleString()}
                  </p>
                </div>
                <div>
                  <label className="text-[12px] text-muted-foreground">Attestation</label>
                  <p className="text-[13px] text-foreground mt-1">
                    {selectedReport.compliantCount.toLocaleString()} of{" "}
                    {selectedReport.totalTransactions.toLocaleString()} transactions verified compliant
                  </p>
                </div>
                <div>
                  <label className="text-[12px] text-muted-foreground">Sanctions Check</label>
                  <p className="text-[13px] text-emerald-600 mt-1 flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    No OFAC/EU sanctioned entities detected
                  </p>
                </div>
              </div>
            </div>
            <div className="p-5 border-t border-border">
              <button className="w-full flex items-center justify-center gap-2 py-2.5 rounded-lg bg-[#7C3AED] text-white text-[13px] hover:bg-[#6D28D9] transition-colors">
                <Share2 className="w-4 h-4" />
                Share with Auditor
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
