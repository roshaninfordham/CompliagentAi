# /src Directory

The `src/` directory contains all source code for the CompliAgent application, organized into three subdirectories.

---

## Directory Structure

```
src/
├── app/          # React application code (components, routes, entry point)
├── imports/      # Reference documentation (architecture blueprints)
└── styles/       # CSS files (Tailwind, fonts, theme tokens)
```

---

## /src/app/

The main application directory. See [/src/app/README.md](./app/README.md) for full details.

- `App.tsx` - Root component, renders `<RouterProvider>` with the app's router
- `routes.tsx` - All route definitions using `createBrowserRouter`
- `components/` - All page components, layout, mock data, and UI primitives

## /src/imports/

Reference documentation files used during development. These are NOT imported into the running application -- they are Markdown files for developer reference only.

| File                          | Purpose                                                        |
|-------------------------------|----------------------------------------------------------------|
| `compliagent-blueprint.md`    | Full architecture blueprint: flows, contracts, SDK integration, deployment plan, API specs |
| `compliagent-dashboard.md`    | Dashboard UI specification: page layouts, component hierarchy, badge systems, mock data schemas |

**When to consult these files:**
- Before wiring up Unlink SDK methods, read the blueprint for exact method signatures and flow sequences
- Before modifying page layouts, read the dashboard spec for the intended UX patterns
- Before deploying smart contracts, read the blueprint section on Solidity contracts

## /src/styles/

CSS configuration for the entire application. See [/src/styles/README.md](./styles/README.md) for full details.

- `index.css` - Master entry point (imports the other three CSS files in order)
- `fonts.css` - Google Fonts imports (Inter + Roboto Mono)
- `tailwind.css` - Tailwind CSS v4 directives and animation plugin
- `theme.css` - Design tokens (CSS custom properties for colors, radii, typography, dark mode)

---

## Path Alias

The Vite config (`/vite.config.ts`) defines a path alias:

```typescript
resolve: {
  alias: {
    '@': path.resolve(__dirname, './src'),
  },
}
```

This means you can import from anywhere in `src/` using `@/`:

```typescript
import { agents } from "@/app/components/mock-data";
```

However, the current codebase uses relative imports throughout. Either approach works.
