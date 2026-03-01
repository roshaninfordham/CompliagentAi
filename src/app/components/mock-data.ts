// Mock data for CompliAgent dashboard

export interface Agent {
  id: string;
  name: string;
  wallet: string;
  budgetAllocated: number;
  budgetUsed: number;
  status: "active" | "inactive" | "paused";
  lastTransaction: string;
  complianceStatus: "compliant" | "flagged" | "pending";
  type: string;
}

export interface Transaction {
  id: string;
  agentName: string;
  agentId: string;
  vendor: string;
  amount: number;
  status: "compliant" | "rejected" | "pending";
  txHash: string;
  timestamp: Date;
  shielded: boolean;
  type: string;
  proofHash?: string;
  blockNumber?: number;
}

export interface ComplianceRule {
  id: string;
  name: string;
  type: "budget_cap" | "vendor_allowlist" | "aml_threshold" | "rate_limit";
  value: string;
  enabled: boolean;
  updatedAt: Date;
  updatedBy: string;
}

export interface AuditReport {
  id: string;
  generatedAt: Date;
  totalTransactions: number;
  compliantCount: number;
  rejectedCount: number;
  passRate: number;
  proofHash: string;
  blockNumber: number;
  status: "verified" | "pending" | "expired";
}

export const agents: Agent[] = [
  {
    id: "agent-001",
    name: "Alpha Data Scout",
    wallet: "0x7a3B...4f2E",
    budgetAllocated: 50000,
    budgetUsed: 32450,
    status: "active",
    lastTransaction: "2 min ago",
    complianceStatus: "compliant",
    type: "Data Acquisition",
  },
  {
    id: "agent-002",
    name: "Beta Market Analyzer",
    wallet: "0x9c1D...8a3F",
    budgetAllocated: 75000,
    budgetUsed: 41200,
    status: "active",
    lastTransaction: "5 min ago",
    complianceStatus: "compliant",
    type: "Market Research",
  },
  {
    id: "agent-003",
    name: "Gamma Compute Buyer",
    wallet: "0x2e5F...1b7C",
    budgetAllocated: 100000,
    budgetUsed: 89750,
    status: "active",
    lastTransaction: "1 min ago",
    complianceStatus: "flagged",
    type: "Compute Resources",
  },
  {
    id: "agent-004",
    name: "Delta Feed Collector",
    wallet: "0x6d8A...3e9B",
    budgetAllocated: 25000,
    budgetUsed: 12800,
    status: "active",
    lastTransaction: "8 min ago",
    complianceStatus: "compliant",
    type: "Data Feeds",
  },
  {
    id: "agent-005",
    name: "Epsilon API Hunter",
    wallet: "0x4f2C...7d1A",
    budgetAllocated: 60000,
    budgetUsed: 58900,
    status: "paused",
    lastTransaction: "15 min ago",
    complianceStatus: "pending",
    type: "API Access",
  },
  {
    id: "agent-006",
    name: "Zeta Geo Intel",
    wallet: "0x1a7E...5c4D",
    budgetAllocated: 150000,
    budgetUsed: 67300,
    status: "active",
    lastTransaction: "3 min ago",
    complianceStatus: "compliant",
    type: "Geospatial Data",
  },
  {
    id: "agent-007",
    name: "Eta Research Bot",
    wallet: "0x8b3F...2e6A",
    budgetAllocated: 40000,
    budgetUsed: 39200,
    status: "inactive",
    lastTransaction: "2 hrs ago",
    complianceStatus: "compliant",
    type: "Research Papers",
  },
  {
    id: "agent-008",
    name: "Theta Price Oracle",
    wallet: "0x5d9C...4a8E",
    budgetAllocated: 30000,
    budgetUsed: 18500,
    status: "active",
    lastTransaction: "30 sec ago",
    complianceStatus: "compliant",
    type: "Price Feeds",
  },
];

export const transactions: Transaction[] = [
  {
    id: "tx-001",
    agentName: "Alpha Data Scout",
    agentId: "agent-001",
    vendor: "DataStream Pro API",
    amount: 245.0,
    status: "compliant",
    txHash: "0x8f4a...2c1e",
    timestamp: new Date(Date.now() - 120000),
    shielded: true,
    type: "x402 Data Purchase",
    proofHash: "0xZK01...a3f2",
    blockNumber: 1847293,
  },
  {
    id: "tx-002",
    agentName: "Beta Market Analyzer",
    agentId: "agent-002",
    vendor: "MarketPulse Analytics",
    amount: 1200.0,
    status: "compliant",
    txHash: "0x3b7d...9e4f",
    timestamp: new Date(Date.now() - 300000),
    shielded: true,
    type: "x402 Market Data",
    proofHash: "0xZK02...b7e1",
    blockNumber: 1847291,
  },
  {
    id: "tx-003",
    agentName: "Gamma Compute Buyer",
    agentId: "agent-003",
    vendor: "CloudCompute Inc.",
    amount: 8500.0,
    status: "rejected",
    txHash: "0x1c9e...5a2b",
    timestamp: new Date(Date.now() - 60000),
    shielded: false,
    type: "x402 Compute",
    blockNumber: 1847294,
  },
  {
    id: "tx-004",
    agentName: "Delta Feed Collector",
    agentId: "agent-004",
    vendor: "RealTime Feeds Co.",
    amount: 89.5,
    status: "compliant",
    txHash: "0x6e2f...8d3c",
    timestamp: new Date(Date.now() - 480000),
    shielded: true,
    type: "x402 Data Feed",
    proofHash: "0xZK03...c4d8",
    blockNumber: 1847288,
  },
  {
    id: "tx-005",
    agentName: "Theta Price Oracle",
    agentId: "agent-008",
    vendor: "PriceOracle Network",
    amount: 15.0,
    status: "compliant",
    txHash: "0x4a1b...7f6e",
    timestamp: new Date(Date.now() - 30000),
    shielded: true,
    type: "x402 Price Feed",
    proofHash: "0xZK04...d9a1",
    blockNumber: 1847295,
  },
  {
    id: "tx-006",
    agentName: "Zeta Geo Intel",
    agentId: "agent-006",
    vendor: "SatView Geospatial",
    amount: 3200.0,
    status: "compliant",
    txHash: "0x9d5c...1a8b",
    timestamp: new Date(Date.now() - 180000),
    shielded: true,
    type: "x402 Geospatial",
    proofHash: "0xZK05...e2b3",
    blockNumber: 1847292,
  },
  {
    id: "tx-007",
    agentName: "Alpha Data Scout",
    agentId: "agent-001",
    vendor: "FinData Premium",
    amount: 450.0,
    status: "compliant",
    txHash: "0x2f8a...4c7d",
    timestamp: new Date(Date.now() - 600000),
    shielded: true,
    type: "x402 Financial Data",
    proofHash: "0xZK06...f5c4",
    blockNumber: 1847286,
  },
  {
    id: "tx-008",
    agentName: "Epsilon API Hunter",
    agentId: "agent-005",
    vendor: "Suspicious Vendor X",
    amount: 25000.0,
    status: "rejected",
    txHash: "0x7b3e...2d9f",
    timestamp: new Date(Date.now() - 900000),
    shielded: false,
    type: "x402 Unknown",
    blockNumber: 1847280,
  },
  {
    id: "tx-009",
    agentName: "Beta Market Analyzer",
    agentId: "agent-002",
    vendor: "TradeSig Intelligence",
    amount: 780.0,
    status: "pending",
    txHash: "0x5c1d...8e4a",
    timestamp: new Date(Date.now() - 15000),
    shielded: true,
    type: "x402 Trading Signals",
    blockNumber: 1847296,
  },
  {
    id: "tx-010",
    agentName: "Gamma Compute Buyer",
    agentId: "agent-003",
    vendor: "GPU Cluster Ltd.",
    amount: 4200.0,
    status: "compliant",
    txHash: "0x8e2f...3b7c",
    timestamp: new Date(Date.now() - 240000),
    shielded: true,
    type: "x402 GPU Compute",
    proofHash: "0xZK07...a8d2",
    blockNumber: 1847290,
  },
];

export const complianceRules: ComplianceRule[] = [
  {
    id: "rule-001",
    name: "Max Single Transaction",
    type: "budget_cap",
    value: "$10,000",
    enabled: true,
    updatedAt: new Date(Date.now() - 86400000),
    updatedBy: "CFO Admin",
  },
  {
    id: "rule-002",
    name: "Vendor Allowlist",
    type: "vendor_allowlist",
    value: "12 vendors approved",
    enabled: true,
    updatedAt: new Date(Date.now() - 172800000),
    updatedBy: "Compliance Officer",
  },
  {
    id: "rule-003",
    name: "AML Threshold Check",
    type: "aml_threshold",
    value: "$5,000 auto-flag",
    enabled: true,
    updatedAt: new Date(Date.now() - 3600000),
    updatedBy: "CFO Admin",
  },
  {
    id: "rule-004",
    name: "Rate Limit (per agent)",
    type: "rate_limit",
    value: "50 txns/hour",
    enabled: true,
    updatedAt: new Date(Date.now() - 7200000),
    updatedBy: "System",
  },
  {
    id: "rule-005",
    name: "Daily Agent Budget Cap",
    type: "budget_cap",
    value: "$25,000/day",
    enabled: true,
    updatedAt: new Date(Date.now() - 259200000),
    updatedBy: "CFO Admin",
  },
  {
    id: "rule-006",
    name: "Sanctioned Entity Screen",
    type: "aml_threshold",
    value: "OFAC + EU list",
    enabled: true,
    updatedAt: new Date(Date.now() - 604800000),
    updatedBy: "Compliance Officer",
  },
];

export const auditReports: AuditReport[] = [
  {
    id: "audit-001",
    generatedAt: new Date(Date.now() - 3600000),
    totalTransactions: 1247,
    compliantCount: 1231,
    rejectedCount: 16,
    passRate: 98.7,
    proofHash: "0xZKAudit01...f8a2c3",
    blockNumber: 1847200,
    status: "verified",
  },
  {
    id: "audit-002",
    generatedAt: new Date(Date.now() - 86400000),
    totalTransactions: 3892,
    compliantCount: 3864,
    rejectedCount: 28,
    passRate: 99.3,
    proofHash: "0xZKAudit02...d4e1b7",
    blockNumber: 1846100,
    status: "verified",
  },
  {
    id: "audit-003",
    generatedAt: new Date(Date.now() - 172800000),
    totalTransactions: 2156,
    compliantCount: 2134,
    rejectedCount: 22,
    passRate: 98.9,
    proofHash: "0xZKAudit03...a9c5f2",
    blockNumber: 1845000,
    status: "verified",
  },
];

export const vendorAllowlist = [
  "DataStream Pro API",
  "MarketPulse Analytics",
  "CloudCompute Inc.",
  "RealTime Feeds Co.",
  "PriceOracle Network",
  "SatView Geospatial",
  "FinData Premium",
  "TradeSig Intelligence",
  "GPU Cluster Ltd.",
  "BioData Research Hub",
  "NLP Models Inc.",
  "Chain Analytics Pro",
];

export const dashboardStats = {
  totalAgents: 8,
  activeAgents: 6,
  totalTransactions: 14892,
  complianceRate: 98.7,
  totalBudget: 530000,
  budgetUsed: 370100,
  rejectedToday: 3,
  avgSettlementTime: "0.8s",
  shieldedPercentage: 94.2,
};
