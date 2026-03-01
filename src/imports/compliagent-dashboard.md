Absolutely! Here’s a **detailed, technical prompt** for Figma AI to generate a frontend system for CompliAgent, tailored to leverage Monad’s capabilities and your privacy/compliance requirements. This prompt is structured to maximize clarity for Figma AI and ensure the resulting UI is both enterprise-grade and developer-friendly.

---

## Figma AI Prompt: CompliAgent Frontend System for Monad

### **Project Overview**
Design a frontend dashboard for **CompliAgent**, an autonomous compliance and settlement layer for multi-party, privacy-preserving transactions on the Monad blockchain. The UI must support real-time monitoring, compliance management, agent orchestration, and privacy-centric audit reporting. The system will integrate with Monad’s high-throughput EVM-compatible chain and Unlink SDK for shielded transactions and selective disclosure.

---

### **Design Principles**
- **Institutional-grade**: Clean, professional, and trustworthy. Avoid “crypto-bro” aesthetics.
- **Privacy-first**: Never expose sensitive data in the UI. Use badges, summaries, and cryptographic proof indicators.
- **Real-time**: Live updates for transactions, compliance status, and agent activity.
- **Modular**: Components should be reusable and composable for rapid development.
- **Accessible**: WCAG-compliant, keyboard navigable, and responsive.

---

### **Branding & Theme**
- **Primary Accent**: Purple (#7C3AED)
- **Typography**: Use “Britti Sans” for headlines/titles, “Roboto Mono” for code, labels, and buttons ([Monad Brand Kit Reference](https://www.monad.xyz/brand-and-media-kit))
- **Color Palette**: Institutional neutrals (white, light gray, dark gray, black), with purple accent for highlights and actionable elements.

---

### **Core Pages & Components**

#### 1. **Dashboard Overview**
- **Cards**:  
  - Total Agents Deployed  
  - Transactions Processed  
  - Compliance Pass Rate (%)  
  - Budget Utilization (progress bar)
- **Live Transaction Feed**:  
  - Scrolling list of recent transactions  
  - Each entry: Agent name, vendor, timestamp, compliance badge (Compliant/Rejected), Monad tx hash (truncated), privacy icon if shielded
- **Quick Actions**:  
  - “Deploy Agent” button  
  - “Generate Audit Report” button

#### 2. **Agent Manager**
- **Table/List View**:  
  - Columns: Agent Name, Wallet Address (truncated), Budget Allocated, Budget Used (progress bar), Status (Active/Inactive), Last Transaction, Compliance Status
- **Agent Card Modal**:  
  - Detailed view: Agent metadata, compliance history, transaction log, “Allocate Budget” action, “Deactivate Agent” action

#### 3. **Compliance Rules**
- **Rule List**:  
  - Vendor Allowlist (editable list, add/remove vendors)
  - Budget Caps (per agent, per vendor)
  - AML/KYT Thresholds (numeric, toggleable)
- **Rule Editor Modal**:  
  - Form to create/edit rules, with validation and preview
- **Rule Change History**:  
  - Timeline of rule updates, with admin user and timestamp

#### 4. **Audit Reports**
- **Generate Report**:  
  - Button to trigger selective disclosure audit report
- **Report Summary**:  
  - Total transactions, compliance pass/fail count, cryptographic proof badge (ZK-verified), “Share with Auditor” action (copy/share link)
- **Proof Details Modal**:  
  - Show ZK proof hash, Monad block number, attestation status

#### 5. **Transaction Feed**
- **Live Feed**:  
  - Infinite scroll, filter by agent/vendor/compliance status
  - Each row: Agent, Vendor, Amount (obfuscated if shielded), Status badge, Monad tx hash, timestamp
- **Transaction Details Modal**:  
  - Show compliance proof, shielded transfer indicator, audit trail link

#### 6. **Notifications & Badges**
- **ComplianceBadge**:  
  - Green “Compliant”, Red “Rejected”, Gray “Pending”, with tooltip for reason
- **PrivacyBadge**:  
  - Icon indicating shielded/Unlink transaction, with tooltip “Privacy-preserving: details hidden”
- **Toast Notifications**:  
  - Success/failure for actions (agent deployed, rule updated, report generated)

---

### **UI System & Components**
- **Button**: Primary, secondary, icon-only, loading state
- **Input**: Text, number, select, toggle, multi-select (for allowlists)
- **Modal**: For agent details, rule editing, proof details
- **Card**: For dashboard stats, agent summary
- **ProgressBar**: For budget utilization, compliance rate
- **Table**: Sortable, filterable, paginated
- **Badge**: Status indicators (compliance, privacy, agent status)
- **Tooltip**: For all icons and abbreviations
- **Sidebar Navigation**: Dashboard, Agents, Rules, Audit, Settings
- **Topbar**: App title, user profile, notifications

---

### **Advanced Features**
- **Real-time Data Hooks**:  
  - Design for integration with WebSocket or polling for live Monad transaction updates.
- **Dark Mode**:  
  - Optional, with same accent and accessibility standards.
- **Responsive Design**:  
  - Mobile, tablet, and desktop layouts.

---

### **Integration Notes**
- **All sensitive data (amounts, agent/vendor identities) must be obfuscated or replaced with privacy badges if shielded by Unlink.**
- **All compliance statuses must be cryptographically verifiable (show proof hash, Monad block number).**
- **Design for easy integration with React (Vite) + Tailwind CSS.**
- **All components should be exportable as Figma variants for rapid developer handoff.**

---

### **References**
- [Monad Brand Kit](https://www.monad.xyz/brand-and-media-kit)
- [Monad Docs](https://docs.monad.xyz/)
- [Unlink SDK Docs](https://docs.unlink.xyz/)
- [x402 Protocol Spec](https://github.com/coinbase/x402)

---

## **Summary for Figma AI**
**Design a modular, privacy-first, institutional-grade dashboard for CompliAgent, supporting real-time compliance and agent management on Monad. Use the provided color, typography, and component guidelines. All UI must be ready for integration with a React + Tailwind frontend and support privacy-preserving flows using Unlink SDK.**

---

Would you like a sample wireframe or a breakdown of component props for React integration as well?