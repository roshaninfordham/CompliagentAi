# Contributing to CompliAgent AI

Thank you for your interest in contributing! This guide will help you get started.

## Table of Contents

- [Code of Conduct](#code-of-conduct)
- [Getting Started](#getting-started)
- [Development Workflow](#development-workflow)
- [Commit Conventions](#commit-conventions)
- [Pull Request Process](#pull-request-process)
- [Code Style](#code-style)
- [Architecture Notes](#architecture-notes)

---

## Code of Conduct

Be respectful, inclusive, and constructive. We follow the [Contributor Covenant](https://www.contributor-covenant.org/version/2/1/code_of_conduct/).

## Getting Started

1. Fork the repository
2. Clone your fork:
   ```bash
   git clone https://github.com/<your-username>/CompliagentAi.git
   cd CompliagentAi
   ```
3. Follow the [Setup Guide](SETUP.md) to install dependencies and configure your environment
4. Create a feature branch:
   ```bash
   git checkout -b feat/your-feature-name
   ```

## Development Workflow

```
┌──────────┐     ┌──────────┐     ┌──────────┐     ┌──────────┐
│  Create   │ ──▶ │  Write   │ ──▶ │  Test    │ ──▶ │  Open    │
│  Branch   │     │  Code    │     │  Locally │     │   PR     │
└──────────┘     └──────────┘     └──────────┘     └──────────┘
     │                                                    │
     │              feat/my-feature                       │
     └────────────── branch from main ───────────────────┘
```

### Running Locally

```bash
# Terminal 1 — Backend
cd backend && npm install && node server.js

# Terminal 2 — Frontend
pnpm install && pnpm dev

# Terminal 3 — Contracts (only if modifying)
cd contracts && npm install
npx hardhat compile
```

## Commit Conventions

We use [Conventional Commits](https://www.conventionalcommits.org/):

```
<type>(<scope>): <short description>

[optional body]

[optional footer]
```

### Types

| Type | When to Use | Example |
|------|------------|---------|
| `feat` | New feature | `feat(agents): add batch wallet creation` |
| `fix` | Bug fix | `fix(backend): handle ESM import for Unlink SDK` |
| `docs` | Documentation only | `docs: add architecture diagram to README` |
| `style` | Formatting, no logic change | `style(ui): fix button padding` |
| `refactor` | Code change, no new feature/fix | `refactor(hooks): extract polling logic` |
| `test` | Adding/fixing tests | `test(contracts): add ComplianceRegistry tests` |
| `chore` | Build, CI, tooling | `chore: update pnpm lockfile` |
| `perf` | Performance improvement | `perf(dashboard): debounce RPC polling` |

### Scopes

Use these scopes for clarity:

- `backend` — Express server, routes, services
- `contracts` — Solidity smart contracts
- `ui` — shadcn/ui components
- `hooks` — React hooks
- `agents` — Agent management features
- `compliance` — Compliance engine logic
- `unlink` — Unlink SDK integration
- `monad` — Monad blockchain interactions

## Pull Request Process

1. **Update documentation** if you change any user-facing behavior
2. **Test your changes** — run the frontend and backend locally
3. **Keep PRs focused** — one feature or fix per PR
4. **Fill in the PR template** with:
   - What changed and why
   - Screenshots (for UI changes)
   - Testing steps

### PR Checklist

- [ ] Code compiles without errors (`pnpm build`)
- [ ] Backend starts without errors (`node backend/server.js`)
- [ ] Frontend loads correctly (`pnpm dev`)
- [ ] New files have appropriate documentation
- [ ] Commit messages follow conventional format
- [ ] No secrets or private keys committed

## Code Style

### TypeScript / React (Frontend)

- **Components**: Functional components with hooks
- **Naming**: PascalCase for components, camelCase for functions/variables
- **Imports**: Absolute imports from `@/` (maps to `src/`)
- **State**: React state + custom hooks (no Redux)
- **Styling**: Tailwind CSS utility classes, no inline styles
- **UI Components**: Use existing shadcn/ui primitives before building custom

```tsx
// ✅ Good
export function AgentCard({ agent }: { agent: Agent }) {
  const { availableBudget } = useMonadContracts();
  return (
    <Card>
      <CardHeader>
        <CardTitle>{agent.name}</CardTitle>
      </CardHeader>
    </Card>
  );
}

// ❌ Avoid
export default class AgentCard extends React.Component { ... }
```

### JavaScript (Backend)

- **Module system**: CommonJS (`require` / `module.exports`)
- **Async**: `async/await` everywhere (no callbacks)
- **Error handling**: Try/catch in all route handlers
- **Naming**: camelCase for variables, UPPER_SNAKE for constants
- **ESM packages**: Use dynamic `import()` for ESM-only deps (like `@unlink-xyz/core`)

```javascript
// ✅ Good — async handler with try/catch
router.post("/create", async (req, res) => {
  try {
    const unlink = await getUnlink();
    const result = await unlink.sdk.accounts.create();
    res.json({ success: true, data: result });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});
```

### Solidity (Contracts)

- **Version**: `pragma solidity ^0.8.20;`
- **Libraries**: OpenZeppelin 5.x contracts
- **Naming**: PascalCase for contracts, camelCase for functions, UPPER_SNAKE for constants
- **Events**: Emit for all state changes
- **Access**: Use `Ownable` for admin functions

## Architecture Notes

Before contributing, understand the three-layer architecture:

```
┌──────────────────────────────────────────────────────────┐
│  FRONTEND (React)                                        │
│  Dashboard ↔ Hooks ↔ API calls to backend                │
├──────────────────────────────────────────────────────────┤
│  BACKEND (Express)                                       │
│  Routes → ComplianceEngine → Unlink SDK → Monad RPC      │
├──────────────────────────────────────────────────────────┤
│  BLOCKCHAIN (Monad Testnet)                              │
│  ComplianceRegistry · BudgetVault · AffiliateSettler     │
└──────────────────────────────────────────────────────────┘
```

Key integration points:
- **Unlink SDK** is ESM-only — backend uses dynamic `import()` with lazy singleton
- **Monad RPC** at `https://testnet-rpc.monad.xyz` — used for balance, events, stamps
- **Privacy pool** — funds go in/out through Unlink SDK, never touching agent wallets directly

## Questions?

Open a [GitHub Issue](https://github.com/roshaninfordham/CompliagentAi/issues) for questions or proposals.
