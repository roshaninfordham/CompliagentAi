import { Outlet, NavLink, useLocation } from "react-router";
import {
  LayoutDashboard,
  Bot,
  ShieldCheck,
  FileText,
  Activity,
  Bell,
  Settings,
  Shield,
  ChevronRight,
  Play,
} from "lucide-react";
import { useState } from "react";
import { Toaster } from "sonner";

const navItems = [
  { to: "/", icon: LayoutDashboard, label: "Dashboard" },
  { to: "/demo", icon: Play, label: "Live Demo" },
  { to: "/agents", icon: Bot, label: "Agents" },
  { to: "/rules", icon: ShieldCheck, label: "Compliance Rules" },
  { to: "/audit", icon: FileText, label: "Audit Reports" },
  { to: "/transactions", icon: Activity, label: "Transactions" },
];

export function Layout() {
  const location = useLocation();
  const [notifications] = useState(3);

  const getPageTitle = () => {
    const path = location.pathname;
    if (path === "/") return "Dashboard Overview";
    if (path === "/agents") return "Agent Manager";
    if (path === "/rules") return "Compliance Rules";
    if (path === "/audit") return "Audit Reports";
    if (path === "/transactions") return "Transaction Feed";
    if (path === "/demo") return "Live Demo";
    return "CompliAgent";
  };

  return (
    <div className="flex h-screen w-full overflow-hidden bg-background">
      {/* Sidebar */}
      <aside className="w-[260px] min-w-[260px] border-r border-border bg-card flex flex-col">
        {/* Logo */}
        <div className="p-6 border-b border-border">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-[#7C3AED] flex items-center justify-center">
              <Shield className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-[17px] tracking-tight text-foreground" style={{ fontFamily: "'Inter', sans-serif" }}>
                CompliAgent
              </h1>
              <p className="text-[11px] text-muted-foreground tracking-wide uppercase">
                Monad Testnet
              </p>
            </div>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-3 space-y-1">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === "/"}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all text-[14px] ${
                  isActive
                    ? "bg-[#7C3AED] text-white"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground"
                }`
              }
            >
              <item.icon className="w-[18px] h-[18px]" />
              <span>{item.label}</span>
            </NavLink>
          ))}
        </nav>

        {/* Bottom section */}
        <div className="p-3 border-t border-border">
          <div className="px-3 py-3 rounded-lg bg-[#7C3AED]/5 border border-[#7C3AED]/10">
            <div className="flex items-center gap-2 mb-1">
              <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span className="text-[12px] text-[#7C3AED]" style={{ fontFamily: "'Roboto Mono', monospace" }}>
                Monad Connected
              </span>
            </div>
            <p className="text-[11px] text-muted-foreground" style={{ fontFamily: "'Roboto Mono', monospace" }}>
              Block #1,847,296
            </p>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Top Bar */}
        <header className="h-16 min-h-16 border-b border-border bg-card flex items-center justify-between px-6">
          <div className="flex items-center gap-2">
            <h2 className="text-[18px] text-foreground">{getPageTitle()}</h2>
            <ChevronRight className="w-4 h-4 text-muted-foreground" />
            <span className="text-[13px] text-muted-foreground" style={{ fontFamily: "'Roboto Mono', monospace" }}>
              Enterprise Compliance Dashboard
            </span>
          </div>
          <div className="flex items-center gap-4">
            <div className="relative">
              <Bell className="w-5 h-5 text-muted-foreground cursor-pointer hover:text-foreground transition-colors" />
              {notifications > 0 && (
                <span className="absolute -top-1.5 -right-1.5 w-4 h-4 rounded-full bg-[#7C3AED] text-white text-[10px] flex items-center justify-center">
                  {notifications}
                </span>
              )}
            </div>
            <Settings className="w-5 h-5 text-muted-foreground cursor-pointer hover:text-foreground transition-colors" />
            <div className="h-8 w-px bg-border" />
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-[#7C3AED] flex items-center justify-center text-white text-[12px]">
                RS
              </div>
              <span className="text-[13px] text-foreground">CFO Admin</span>
            </div>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 overflow-auto p-6">
          <Outlet />
        </main>
      </div>

      <Toaster
        position="bottom-right"
        toastOptions={{
          style: {
            fontFamily: "'Inter', sans-serif",
          },
        }}
      />
    </div>
  );
}