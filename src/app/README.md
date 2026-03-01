# /src/app Directory

The core React application directory. Contains the root component, route definitions, and all page/layout components.

---

## Files

### `App.tsx` (Root Component)

```tsx
import { RouterProvider } from "react-router";
import { router } from "./routes";

export default function App() {
  return <RouterProvider router={router} />;
}
```

- **Must have a default export** (required by the build system)
- Uses React Router's **Data mode** pattern (`RouterProvider` + `createBrowserRouter`)
- This is the single entry point -- all routing, layout, and pages flow from here

### `routes.tsx` (Route Definitions)

Defines all application routes using `createBrowserRouter`:

```tsx
createBrowserRouter([
  {
    path: "/",
    Component: Layout,          // Wraps ALL pages with sidebar + top bar
    children: [
      { index: true, Component: Dashboard },      // /
      { path: "agents", Component: AgentManager }, // /agents
      { path: "rules", Component: ComplianceRules }, // /rules
      { path: "audit", Component: AuditReports },   // /audit
      { path: "transactions", Component: TransactionFeed }, // /transactions
      { path: "demo", Component: AgentDemo },        // /demo
    ],
  },
]);
```

**To add a new page:**
1. Create the component in `/src/app/components/YourPage.tsx`
2. Export it as a named export: `export function YourPage() { ... }`
3. Import it in `routes.tsx`
4. Add a new child route: `{ path: "your-path", Component: YourPage }`
5. Add a nav item in `Layout.tsx`'s `navItems` array

**Important:** Use `react-router` (not `react-router-dom`). The `react-router-dom` package does not work in this environment.

---

## Components Directory

See [/src/app/components/README.md](./components/README.md) for detailed documentation of every component.
