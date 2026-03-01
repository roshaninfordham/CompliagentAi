import { createBrowserRouter } from "react-router";
import { Layout } from "./components/Layout";
import { Dashboard } from "./components/Dashboard";
import { AgentManager } from "./components/AgentManager";
import { ComplianceRules } from "./components/ComplianceRules";
import { AuditReports } from "./components/AuditReports";
import { TransactionFeed } from "./components/TransactionFeed";
import { AgentDemo } from "./components/AgentDemo";

export const router = createBrowserRouter([
  {
    path: "/",
    Component: Layout,
    children: [
      { index: true, Component: Dashboard },
      { path: "agents", Component: AgentManager },
      { path: "rules", Component: ComplianceRules },
      { path: "audit", Component: AuditReports },
      { path: "transactions", Component: TransactionFeed },
      { path: "demo", Component: AgentDemo },
    ],
  },
]);
