# /src/styles Directory

All CSS configuration for the CompliAgent application. Uses **Tailwind CSS v4** with the `@tailwindcss/vite` plugin (no `tailwind.config.js` needed).

---

## Files

### `index.css` (Entry Point)

The master CSS file that imports all other CSS files in the correct order:

```css
@import './fonts.css';     /* 1. Font imports (must be first) */
@import './tailwind.css';  /* 2. Tailwind directives */
@import './theme.css';     /* 3. Design tokens + base styles */
```

This file is imported by the application's HTML entry point. **Do not add styles directly here** -- use the specific files below.

---

### `fonts.css` (Font Imports)

Imports Google Fonts via CDN:

| Font         | Weights      | Usage in App                                    |
|-------------|-------------|--------------------------------------------------|
| **Inter**    | 400, 500, 600, 700 | Body text, headings, labels, buttons      |
| **Roboto Mono** | 400, 500 | Transaction hashes, wallet addresses, block numbers, code-like labels |

**Roboto Mono usage pattern** (applied inline throughout components):
```tsx
<span style={{ fontFamily: "'Roboto Mono', monospace" }}>
  0x8f4a...2c1e
</span>
```

**Important:** Font imports MUST only be added to this file. Do not add `@import url(...)` in any other CSS file.

---

### `tailwind.css` (Tailwind Configuration)

```css
@import 'tailwindcss' source(none);        /* Import Tailwind v4 */
@source '../**/*.{js,ts,jsx,tsx}';         /* Scan all source files for class usage */
@import 'tw-animate-css';                  /* Animation utilities (tw-animate-css package) */
```

**Tailwind v4 differences from v3:**
- No `tailwind.config.js` file -- configuration is CSS-native
- Uses `@theme` directive instead of config object
- Uses `@source` instead of `content` array
- The `@tailwindcss/vite` plugin handles PostCSS automatically

**Do NOT create a `tailwind.config.js`** -- it will conflict with the v4 setup.

---

### `theme.css` (Design Tokens)

Contains all CSS custom properties (design tokens) that define the visual system:

#### Color Tokens (Light Mode)

| Token                 | Value              | Purpose                         |
|----------------------|--------------------|---------------------------------|
| `--background`       | `#f8f9fc`          | Page background                 |
| `--foreground`       | `#1a1a2e`          | Primary text                    |
| `--card`             | `#ffffff`          | Card/panel backgrounds          |
| `--primary`          | `#7C3AED`          | **Purple accent** - the brand color |
| `--secondary`        | `#f0ecf9`          | Light purple background         |
| `--muted`            | `#f1f1f5`          | Muted/disabled backgrounds      |
| `--muted-foreground` | `#6b7280`          | Secondary/helper text           |
| `--destructive`      | `#ef4444`          | Error/rejection states          |
| `--border`           | `rgba(0,0,0,0.08)` | Subtle card/panel borders       |

#### How Tokens Map to Tailwind Classes

The `@theme inline` block maps CSS variables to Tailwind color classes:

```css
@theme inline {
  --color-primary: var(--primary);           /* -> bg-primary, text-primary */
  --color-muted-foreground: var(--muted-foreground); /* -> text-muted-foreground */
  --color-border: var(--border);             /* -> border-border */
  /* ... etc */
}
```

This means `className="bg-card text-foreground border-border"` uses the design tokens.

#### Dark Mode

Dark mode tokens are defined under `.dark` class but are **not currently active**. To enable:
1. Add `next-themes` provider (already installed)
2. Toggle `.dark` class on `<html>` element

#### Typography Base Styles

The `@layer base` block sets default styles for HTML elements:

| Element    | Font Size      | Font Weight | Notes                           |
|-----------|---------------|-------------|----------------------------------|
| `h1`      | `--text-2xl`   | 500         | Overridable with Tailwind classes |
| `h2`      | `--text-xl`    | 500         |                                  |
| `h3`      | `--text-lg`    | 500         |                                  |
| `h4`      | `--text-base`  | 500         |                                  |
| `button`  | `--text-base`  | 500         |                                  |
| `input`   | `--text-base`  | 400         |                                  |

These are in `@layer base`, so Tailwind utility classes automatically override them.

---

## Modifying the Design System

### To change the brand color:

1. Open `theme.css`
2. Replace all instances of `#7C3AED` with your new color
3. Also update the `--secondary` and `--accent` tokens (they use light purple variants)
4. Search-and-replace `#7C3AED` in all `.tsx` component files (it's used inline in many places)
5. Optionally update `#6D28D9` (the hover/darker variant of purple used on buttons)

### To add a new font:

1. Add the `@import url(...)` to `fonts.css` (must be at the top of the file)
2. Use it inline in components: `style={{ fontFamily: "'YourFont', sans-serif" }}`

### To add new design tokens:

1. Add the CSS variable to `:root` in `theme.css`
2. Map it to a Tailwind class in the `@theme inline` block
3. Use it in components as `className="bg-your-token"`
