import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router";
import { motion, useInView } from "motion/react";
import {
  Shield,
  Bot,
  ArrowRight,
  X,
  Check,
  Users,
  FileText,
  Zap,
  Lock,
  Blocks,
  Eye,
  EyeOff,
  Scale,
  Landmark,
  Receipt,
  ExternalLink,
} from "lucide-react";
import { useBlockNumber } from "../../hooks/useBlockNumber";
import { MONAD_CONFIG } from "../../config/monad";

// ---------------------------------------------------------------------------
// Typewriter hook
// ---------------------------------------------------------------------------
function useTypewriter(phrases: string[], typingSpeed = 60, deletingSpeed = 40, pauseMs = 2000) {
  const [text, setText] = useState("");
  const [phraseIndex, setPhraseIndex] = useState(0);
  const [charIndex, setCharIndex] = useState(0);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    const current = phrases[phraseIndex];
    let timeout: ReturnType<typeof setTimeout>;

    if (!isDeleting && charIndex < current.length) {
      timeout = setTimeout(() => {
        setText(current.slice(0, charIndex + 1));
        setCharIndex((c) => c + 1);
      }, typingSpeed);
    } else if (!isDeleting && charIndex === current.length) {
      timeout = setTimeout(() => setIsDeleting(true), pauseMs);
    } else if (isDeleting && charIndex > 0) {
      timeout = setTimeout(() => {
        setText(current.slice(0, charIndex - 1));
        setCharIndex((c) => c - 1);
      }, deletingSpeed);
    } else if (isDeleting && charIndex === 0) {
      setIsDeleting(false);
      setPhraseIndex((i) => (i + 1) % phrases.length);
    }

    return () => clearTimeout(timeout);
  }, [charIndex, isDeleting, phraseIndex, phrases, typingSpeed, deletingSpeed, pauseMs]);

  return text;
}

// ---------------------------------------------------------------------------
// Count-up hook
// ---------------------------------------------------------------------------
function useCountUp(target: number, duration = 2000, start = false) {
  const [value, setValue] = useState(0);

  useEffect(() => {
    if (!start) return;
    let frame: number;
    const startTime = performance.now();

    const step = (now: number) => {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);
      // ease out cubic
      const eased = 1 - Math.pow(1 - progress, 3);
      setValue(Math.floor(eased * target));
      if (progress < 1) {
        frame = requestAnimationFrame(step);
      } else {
        setValue(target);
      }
    };

    frame = requestAnimationFrame(step);
    return () => cancelAnimationFrame(frame);
  }, [target, duration, start]);

  return value;
}

// ---------------------------------------------------------------------------
// Section wrapper with scroll animation
// ---------------------------------------------------------------------------
function Section({
  children,
  className = "",
  id,
}: {
  children: React.ReactNode;
  className?: string;
  id?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const isInView = useInView(ref, { once: true, margin: "-100px" });

  return (
    <motion.section
      ref={ref}
      id={id}
      initial={{ opacity: 0, y: 60 }}
      animate={isInView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.7, ease: "easeOut" }}
      className={className}
    >
      {children}
    </motion.section>
  );
}

// ---------------------------------------------------------------------------
// Stat card
// ---------------------------------------------------------------------------
function StatCard({
  value,
  suffix,
  label,
  index,
}: {
  value: number;
  suffix: string;
  label: string;
  index: number;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const isInView = useInView(ref, { once: true, margin: "-80px" });
  const count = useCountUp(value, 2200, isInView);

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 30, scale: 0.95 }}
      animate={isInView ? { opacity: 1, y: 0, scale: 1 } : {}}
      transition={{ duration: 0.5, delay: index * 0.1, ease: "easeOut" }}
      className="relative overflow-hidden rounded-2xl border border-white/[0.06] bg-white/[0.03] backdrop-blur-sm p-6 group hover:border-[#7C3AED]/30 transition-colors duration-300"
    >
      <div className="absolute inset-0 bg-gradient-to-br from-[#7C3AED]/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
      <p
        className="relative text-3xl md:text-4xl font-bold text-white mb-1"
        style={{ fontFamily: "'Roboto Mono', monospace" }}
      >
        {suffix === "%" ? `${count}.9%` : suffix === "ms" ? `${count}ms` : count === 0 && value === 0 ? "0" : `${count.toLocaleString()}`}
        {suffix !== "%" && suffix !== "ms" && suffix}
      </p>
      <p className="relative text-sm text-gray-400" style={{ fontFamily: "'Inter', sans-serif" }}>
        {label}
      </p>
    </motion.div>
  );
}

// ---------------------------------------------------------------------------
// Architecture node
// ---------------------------------------------------------------------------
const ARCHITECTURE_NODES = [
  { icon: Bot, label: "AI Agent", desc: "Initiates payment" },
  { icon: Zap, label: "HTTP 402", desc: "Payment required" },
  { icon: Shield, label: "CompliAgent", desc: "Validates compliance" },
  { icon: EyeOff, label: "Unlink Pool", desc: "Privacy layer" },
  { icon: Blocks, label: "Monad Chain", desc: "Sub-second finality" },
];

// ---------------------------------------------------------------------------
// Main Component
// ---------------------------------------------------------------------------
export function LandingPage() {
  const navigate = useNavigate();
  const { blockNumber } = useBlockNumber();
  const [activeNode, setActiveNode] = useState(0);

  const subtitleText = useTypewriter(
    ["x402 Agent Payments", "Enterprise Privacy", "ZK Compliance Stamps", "Sub-Second Settlement"],
    70,
    45,
    2200,
  );

  // Architecture flow animation
  useEffect(() => {
    const interval = setInterval(() => {
      setActiveNode((prev) => (prev + 1) % ARCHITECTURE_NODES.length);
    }, 1600);
    return () => clearInterval(interval);
  }, []);

  const explorerBase = `${MONAD_CONFIG.explorerUrl}/address/`;

  const contracts = [
    { name: "ComplianceRegistry", address: MONAD_CONFIG.contracts.complianceRegistry },
    { name: "BudgetVault", address: MONAD_CONFIG.contracts.budgetVault },
    { name: "MockUSDC", address: MONAD_CONFIG.contracts.mockUSDC },
    { name: "AffiliateSettler", address: MONAD_CONFIG.contracts.affiliateSettler },
  ];

  return (
    <div className="min-h-screen bg-[#0d0d1a] text-white overflow-x-hidden" style={{ fontFamily: "'Inter', sans-serif" }}>
      {/* ============================================================= */}
      {/* HERO */}
      {/* ============================================================= */}
      <section className="relative min-h-screen flex flex-col items-center justify-center px-4 overflow-hidden">
        {/* Gradient background */}
        <div className="absolute inset-0 bg-gradient-to-b from-[#7C3AED] via-[#4c1d95] to-[#1a1a2e]" />

        {/* Animated orbs */}
        <div
          className="absolute w-[600px] h-[600px] rounded-full opacity-20 blur-[120px]"
          style={{
            background: "radial-gradient(circle, #7C3AED, transparent 70%)",
            top: "-10%",
            left: "-10%",
            animation: "orbFloat1 8s ease-in-out infinite",
          }}
        />
        <div
          className="absolute w-[500px] h-[500px] rounded-full opacity-15 blur-[100px]"
          style={{
            background: "radial-gradient(circle, #a855f7, transparent 70%)",
            bottom: "-5%",
            right: "-8%",
            animation: "orbFloat2 10s ease-in-out infinite",
          }}
        />
        <div
          className="absolute w-[350px] h-[350px] rounded-full opacity-10 blur-[80px]"
          style={{
            background: "radial-gradient(circle, #6d28d9, transparent 70%)",
            top: "40%",
            right: "20%",
            animation: "orbFloat3 12s ease-in-out infinite",
          }}
        />

        {/* Content */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          className="relative z-10 text-center max-w-4xl mx-auto"
        >
          {/* Logo */}
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.6, delay: 0.1 }}
            className="flex items-center justify-center gap-3 mb-8"
          >
            <div className="w-12 h-12 rounded-lg bg-white/10 backdrop-blur-sm border border-white/20 flex items-center justify-center">
              <Shield className="w-7 h-7 text-white" />
            </div>
            <span className="text-2xl font-semibold tracking-tight">CompliAgent</span>
          </motion.div>

          {/* Headline */}
          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.2 }}
            className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-bold leading-tight mb-6 tracking-tight"
          >
            The Autonomous Compliance Layer{" "}
            <span className="bg-gradient-to-r from-purple-300 to-pink-300 bg-clip-text text-transparent">
              for the Machine Economy
            </span>
          </motion.h1>

          {/* Typewriter subtitle */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5 }}
            className="h-12 flex items-center justify-center mb-10"
          >
            <span
              className="text-lg sm:text-xl md:text-2xl text-purple-200/80"
              style={{ fontFamily: "'Roboto Mono', monospace" }}
            >
              {subtitleText}
              <span className="inline-block w-[2px] h-6 bg-purple-300 ml-1 align-middle animate-pulse" />
            </span>
          </motion.div>

          {/* Block number badge */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.7 }}
            className="flex justify-center mb-10"
          >
            <div
              className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/[0.08] backdrop-blur-sm border border-white/[0.12] text-sm"
              style={{ fontFamily: "'Roboto Mono', monospace" }}
            >
              <span className="relative flex h-2.5 w-2.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500" />
              </span>
              <span className="text-emerald-300">
                {blockNumber !== null
                  ? `Monad Block #${blockNumber.toLocaleString()}`
                  : "Connecting to Monad..."}
              </span>
            </div>
          </motion.div>

          {/* CTA Buttons */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.9 }}
            className="flex flex-col sm:flex-row items-center justify-center gap-4"
          >
            <button
              onClick={() => navigate("/dashboard")}
              className="group px-8 py-3.5 rounded-xl bg-[#7C3AED] hover:bg-[#6d28d9] text-white font-medium text-base transition-all duration-200 flex items-center gap-2 shadow-lg shadow-purple-500/25 hover:shadow-purple-500/40 cursor-pointer"
            >
              Enter Dashboard
              <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
            </button>
            <button
              onClick={() => navigate("/demo")}
              className="px-8 py-3.5 rounded-xl border border-white/20 hover:border-white/40 text-white font-medium text-base transition-all duration-200 backdrop-blur-sm hover:bg-white/[0.05] cursor-pointer"
            >
              Watch Demo
            </button>
          </motion.div>
        </motion.div>

        {/* Scroll indicator */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.5 }}
          className="absolute bottom-8 left-1/2 -translate-x-1/2"
        >
          <motion.div
            animate={{ y: [0, 8, 0] }}
            transition={{ duration: 1.5, repeat: Infinity }}
            className="w-6 h-10 rounded-full border-2 border-white/20 flex items-start justify-center p-1.5"
          >
            <div className="w-1.5 h-2.5 rounded-full bg-white/40" />
          </motion.div>
        </motion.div>
      </section>

      {/* ============================================================= */}
      {/* MARKET STATS */}
      {/* ============================================================= */}
      <Section className="py-24 md:py-32 px-4">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-5xl font-bold mb-4">The Machine Economy is Here</h2>
            <div className="w-20 h-1 bg-[#7C3AED] mx-auto rounded-full" />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            <StatCard value={307} suffix="B+" label="Stablecoin Market Cap" index={0} />
            <StatCard value={33} suffix="T" label="Transaction Volume (2025)" index={1} />
            <StatCard value={62} suffix="%" label="B2B Payment Share" index={2} />
            <StatCard value={10000} suffix="" label="TPS on Monad" index={3} />
            <StatCard value={800} suffix="ms" label="Finality" index={4} />
            <StatCard value={0} suffix="" label="Data Leaks with Unlink" index={5} />
          </div>
        </div>
      </Section>

      {/* ============================================================= */}
      {/* ARCHITECTURE FLOW */}
      {/* ============================================================= */}
      <Section className="py-24 md:py-32 px-4 bg-gradient-to-b from-transparent via-[#7C3AED]/[0.04] to-transparent">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-5xl font-bold mb-4">How CompliAgent Works</h2>
            <div className="w-20 h-1 bg-[#7C3AED] mx-auto rounded-full" />
          </div>

          {/* Desktop horizontal flow */}
          <div className="hidden lg:flex items-center justify-center gap-0">
            {ARCHITECTURE_NODES.map((node, i) => {
              const Icon = node.icon;
              const isActive = activeNode === i;
              return (
                <div key={node.label} className="flex items-center">
                  <motion.div
                    animate={{
                      scale: isActive ? 1.08 : 1,
                      borderColor: isActive ? "#7C3AED" : "rgba(255,255,255,0.08)",
                    }}
                    transition={{ duration: 0.4 }}
                    className="relative flex flex-col items-center p-6 rounded-2xl border bg-white/[0.03] backdrop-blur-sm w-[170px]"
                  >
                    <motion.div
                      animate={{
                        boxShadow: isActive
                          ? "0 0 30px rgba(124,58,237,0.5)"
                          : "0 0 0px rgba(124,58,237,0)",
                      }}
                      transition={{ duration: 0.4 }}
                      className={`w-14 h-14 rounded-xl flex items-center justify-center mb-3 transition-colors duration-300 ${
                        isActive ? "bg-[#7C3AED]" : "bg-white/[0.06]"
                      }`}
                    >
                      <Icon className={`w-7 h-7 ${isActive ? "text-white" : "text-gray-400"}`} />
                    </motion.div>
                    <p className="text-sm font-semibold text-white mb-0.5">{node.label}</p>
                    <p className="text-xs text-gray-500">{node.desc}</p>
                    {isActive && (
                      <motion.div
                        layoutId="activeGlow"
                        className="absolute -inset-px rounded-2xl border-2 border-[#7C3AED]/50"
                        transition={{ duration: 0.3 }}
                      />
                    )}
                  </motion.div>
                  {i < ARCHITECTURE_NODES.length - 1 && (
                    <div className="flex items-center mx-1">
                      <svg width="48" height="20" viewBox="0 0 48 20" className="text-gray-600">
                        <line
                          x1="0"
                          y1="10"
                          x2="38"
                          y2="10"
                          stroke="currentColor"
                          strokeWidth="2"
                          strokeDasharray="6 4"
                          className={
                            activeNode === i
                              ? "stroke-[#7C3AED] transition-colors duration-300"
                              : "transition-colors duration-300"
                          }
                        />
                        <polygon
                          points="38,5 48,10 38,15"
                          fill="currentColor"
                          className={
                            activeNode === i
                              ? "fill-[#7C3AED] transition-colors duration-300"
                              : "transition-colors duration-300"
                          }
                        />
                      </svg>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Mobile vertical flow */}
          <div className="lg:hidden flex flex-col items-center gap-3">
            {ARCHITECTURE_NODES.map((node, i) => {
              const Icon = node.icon;
              const isActive = activeNode === i;
              return (
                <div key={node.label} className="flex flex-col items-center">
                  <motion.div
                    animate={{
                      scale: isActive ? 1.05 : 1,
                      borderColor: isActive ? "#7C3AED" : "rgba(255,255,255,0.08)",
                    }}
                    transition={{ duration: 0.4 }}
                    className="flex items-center gap-4 p-4 rounded-xl border bg-white/[0.03] backdrop-blur-sm w-full max-w-xs"
                  >
                    <div
                      className={`w-12 h-12 rounded-lg flex items-center justify-center shrink-0 transition-colors duration-300 ${
                        isActive ? "bg-[#7C3AED]" : "bg-white/[0.06]"
                      }`}
                    >
                      <Icon className={`w-6 h-6 ${isActive ? "text-white" : "text-gray-400"}`} />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-white">{node.label}</p>
                      <p className="text-xs text-gray-500">{node.desc}</p>
                    </div>
                  </motion.div>
                  {i < ARCHITECTURE_NODES.length - 1 && (
                    <div className="h-6 flex items-center">
                      <svg width="20" height="24" viewBox="0 0 20 24">
                        <line
                          x1="10"
                          y1="0"
                          x2="10"
                          y2="16"
                          stroke="#4b5563"
                          strokeWidth="2"
                          strokeDasharray="4 3"
                          className={isActive ? "stroke-[#7C3AED]" : ""}
                        />
                        <polygon
                          points="5,16 10,24 15,16"
                          fill="#4b5563"
                          className={isActive ? "fill-[#7C3AED]" : ""}
                        />
                      </svg>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </Section>

      {/* ============================================================= */}
      {/* PROBLEM / SOLUTION */}
      {/* ============================================================= */}
      <Section className="py-24 md:py-32 px-4">
        <div className="max-w-6xl mx-auto">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Problem */}
            <motion.div
              initial={{ opacity: 0, x: -40 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true, margin: "-80px" }}
              transition={{ duration: 0.6 }}
              className="rounded-2xl border border-red-500/20 bg-red-500/[0.03] p-8"
            >
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 rounded-lg bg-red-500/10 flex items-center justify-center">
                  <Eye className="w-5 h-5 text-red-400" />
                </div>
                <h3 className="text-xl font-bold text-red-300">The Public Blockchain Problem</h3>
              </div>
              <div className="space-y-4">
                {[
                  "Who paid whom",
                  "How much was spent",
                  "What was purchased",
                  "Corporate strategy exposed",
                ].map((item) => (
                  <div key={item} className="flex items-center gap-3">
                    <div className="w-6 h-6 rounded-full bg-red-500/10 flex items-center justify-center shrink-0">
                      <X className="w-3.5 h-3.5 text-red-400" />
                    </div>
                    <span className="text-gray-300 text-sm">{item}</span>
                  </div>
                ))}
              </div>
              <div className="mt-6 pt-5 border-t border-red-500/10">
                <p className="text-xs text-red-400/60" style={{ fontFamily: "'Roboto Mono', monospace" }}>
                  Every transaction is permanently visible on-chain
                </p>
              </div>
            </motion.div>

            {/* Solution */}
            <motion.div
              initial={{ opacity: 0, x: 40 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true, margin: "-80px" }}
              transition={{ duration: 0.6 }}
              className="rounded-2xl border border-emerald-500/20 bg-emerald-500/[0.03] p-8"
            >
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 rounded-lg bg-emerald-500/10 flex items-center justify-center">
                  <Lock className="w-5 h-5 text-emerald-400" />
                </div>
                <h3 className="text-xl font-bold text-emerald-300">The CompliAgent Solution</h3>
              </div>
              <div className="space-y-4">
                {[
                  "Transaction is legal",
                  "Budget compliant",
                  "AML clean",
                  "Zero data exposed",
                ].map((item) => (
                  <div key={item} className="flex items-center gap-3">
                    <div className="w-6 h-6 rounded-full bg-emerald-500/10 flex items-center justify-center shrink-0">
                      <Check className="w-3.5 h-3.5 text-emerald-400" />
                    </div>
                    <span className="text-gray-300 text-sm">{item}</span>
                  </div>
                ))}
              </div>
              <div className="mt-6 pt-5 border-t border-emerald-500/10">
                <p className="text-xs text-emerald-400/60" style={{ fontFamily: "'Roboto Mono', monospace" }}>
                  Compliant, private, and verifiable by design
                </p>
              </div>
            </motion.div>
          </div>
        </div>
      </Section>

      {/* ============================================================= */}
      {/* DEMO FLOW CARDS */}
      {/* ============================================================= */}
      <Section className="py-24 md:py-32 px-4 bg-gradient-to-b from-transparent via-[#7C3AED]/[0.04] to-transparent">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-5xl font-bold mb-4">See It In Action</h2>
            <div className="w-20 h-1 bg-[#7C3AED] mx-auto rounded-full" />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[
              {
                icon: Bot,
                title: "x402 Agent Purchase",
                desc: "Watch an AI agent autonomously discover, negotiate, and purchase API data using the HTTP 402 payment protocol with full compliance checks.",
              },
              {
                icon: Users,
                title: "Affiliate Settlement",
                desc: "See how a 3-party commission split is executed atomically on-chain with privacy-preserving settlement through Unlink pools.",
              },
              {
                icon: FileText,
                title: "ZK Audit Report",
                desc: "Generate a zero-knowledge compliance proof that verifies transaction legality without revealing sensitive payment details.",
              },
            ].map((card, i) => {
              const Icon = card.icon;
              return (
                <motion.div
                  key={card.title}
                  initial={{ opacity: 0, y: 30 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, margin: "-60px" }}
                  transition={{ duration: 0.5, delay: i * 0.12 }}
                  whileHover={{ y: -6, transition: { duration: 0.2 } }}
                  onClick={() => navigate("/demo")}
                  className="group relative overflow-hidden rounded-2xl border border-white/[0.06] bg-white/[0.03] backdrop-blur-sm p-7 cursor-pointer hover:border-[#7C3AED]/30 transition-colors duration-300"
                >
                  <div className="absolute inset-0 bg-gradient-to-br from-[#7C3AED]/8 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                  <div className="relative">
                    <div className="w-12 h-12 rounded-xl bg-[#7C3AED]/10 flex items-center justify-center mb-5">
                      <Icon className="w-6 h-6 text-[#7C3AED]" />
                    </div>
                    <h3 className="text-lg font-semibold text-white mb-2">{card.title}</h3>
                    <p className="text-sm text-gray-400 leading-relaxed mb-4">{card.desc}</p>
                    <div className="flex items-center gap-1.5 text-[#7C3AED] text-sm font-medium">
                      <span>Try it</span>
                      <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform duration-200" />
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>
        </div>
      </Section>

      {/* ============================================================= */}
      {/* REGULATORY TAILWINDS */}
      {/* ============================================================= */}
      <Section className="py-24 md:py-32 px-4">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-5xl font-bold mb-4">Regulatory Tailwinds</h2>
            <p className="text-gray-400 max-w-2xl mx-auto text-base md:text-lg">
              The regulatory landscape is shifting in favor of compliant stablecoin infrastructure
            </p>
            <div className="w-20 h-1 bg-[#7C3AED] mx-auto rounded-full mt-6" />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[
              {
                icon: Landmark,
                title: "GENIUS Act",
                desc: "Stablecoin regulation framework creating compliance requirements",
              },
              {
                icon: Scale,
                title: "CLARITY Act",
                desc: "Digital asset market structure bringing regulatory clarity",
              },
              {
                icon: Receipt,
                title: "IRS 1099-DA",
                desc: "Broker reporting requirements for digital asset transactions",
              },
            ].map((card, i) => {
              const Icon = card.icon;
              return (
                <motion.div
                  key={card.title}
                  initial={{ opacity: 0, y: 30 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, margin: "-60px" }}
                  transition={{ duration: 0.5, delay: i * 0.12 }}
                  className="rounded-2xl border border-white/[0.06] bg-white/[0.03] backdrop-blur-sm p-7"
                >
                  <div className="w-12 h-12 rounded-xl bg-amber-500/10 flex items-center justify-center mb-5">
                    <Icon className="w-6 h-6 text-amber-400" />
                  </div>
                  <h3 className="text-lg font-semibold text-white mb-2">{card.title}</h3>
                  <p className="text-sm text-gray-400 leading-relaxed">{card.desc}</p>
                </motion.div>
              );
            })}
          </div>
        </div>
      </Section>

      {/* ============================================================= */}
      {/* FOOTER */}
      {/* ============================================================= */}
      <footer className="border-t border-white/[0.06] bg-[#0a0a14]">
        <div className="max-w-6xl mx-auto px-4 py-16">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
            {/* Left: Logo + tagline */}
            <div>
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-lg bg-[#7C3AED] flex items-center justify-center">
                  <Shield className="w-5 h-5 text-white" />
                </div>
                <span className="text-xl font-semibold tracking-tight">CompliAgent</span>
              </div>
              <p className="text-gray-400 text-sm max-w-sm leading-relaxed mb-6">
                The autonomous compliance layer for AI agent payments. Private, compliant,
                and verifiable on-chain settlement.
              </p>
              <p
                className="text-xs text-gray-600"
                style={{ fontFamily: "'Roboto Mono', monospace" }}
              >
                Built on Monad + Unlink
              </p>
            </div>

            {/* Right: Contract addresses */}
            <div>
              <h4
                className="text-sm font-semibold text-gray-300 mb-4 uppercase tracking-wider"
                style={{ fontFamily: "'Inter', sans-serif" }}
              >
                Deployed Contracts
              </h4>
              <div className="space-y-3">
                {contracts.map((c) => (
                  <div key={c.name} className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-3">
                    <span className="text-xs text-gray-500 w-40 shrink-0">{c.name}</span>
                    <a
                      href={`${explorerBase}${c.address}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 text-xs text-[#7C3AED] hover:text-purple-300 transition-colors truncate"
                      style={{ fontFamily: "'Roboto Mono', monospace" }}
                    >
                      {c.address}
                      <ExternalLink className="w-3 h-3 shrink-0" />
                    </a>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="mt-12 pt-8 border-t border-white/[0.06] flex flex-col sm:flex-row items-center justify-between gap-4">
            <p className="text-xs text-gray-600" style={{ fontFamily: "'Roboto Mono', monospace" }}>
              CompliAgent {new Date().getFullYear()} &mdash; Hackathon Build
            </p>
            <div className="flex items-center gap-2 text-xs text-gray-600">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
              </span>
              <span style={{ fontFamily: "'Roboto Mono', monospace" }}>
                {blockNumber !== null
                  ? `Monad Block #${blockNumber.toLocaleString()}`
                  : "Connecting..."}
              </span>
            </div>
          </div>
        </div>
      </footer>

      {/* ============================================================= */}
      {/* GLOBAL KEYFRAME STYLES */}
      {/* ============================================================= */}
      <style>{`
        @keyframes orbFloat1 {
          0%, 100% { transform: translate(0, 0) scale(1); }
          50% { transform: translate(60px, 40px) scale(1.1); }
        }
        @keyframes orbFloat2 {
          0%, 100% { transform: translate(0, 0) scale(1); }
          50% { transform: translate(-50px, -30px) scale(1.15); }
        }
        @keyframes orbFloat3 {
          0%, 100% { transform: translate(0, 0) scale(1); }
          50% { transform: translate(30px, -50px) scale(1.05); }
        }
      `}</style>
    </div>
  );
}
