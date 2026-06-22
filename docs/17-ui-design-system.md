# 17. UI Design System

## 1. Typography & Hierarchy
The design system focuses on clean readability with a premium, high-tech athletic feel.

- **Primary Headings Font**: `Outfit` (sans-serif)
- **Body & Operations Font**: `Inter` (sans-serif)

| Token Name | Font Size | Line Height | Weight | Usage |
| :--- | :--- | :--- | :--- | :--- |
| **Display** | 2.25rem (36px) | 2.5rem | Bold (700) | Landing headers, big stats |
| **Heading 1**| 1.875rem (30px)| 2.25rem | Semibold (600)| Page titles |
| **Heading 2**| 1.5rem (24px) | 2.0rem | Semibold (600)| Card titles |
| **Body** | 1.0rem (16px) | 1.5rem | Regular (400) | Standard text, inputs |
| **Caption** | 0.875rem (14px)| 1.25rem | Medium (500) | Form labels, small notes |

---

## 2. Color Palette (Dark Theme Default)
The system leverages a dark aesthetic with bright neon/vibrant accents to convey energy:

- **Global Background**: Slate-950 (`#020617`)
- **Card/Surface Background**: Slate-900 (`#0f172a`)
- **Border/Dividers**: Slate-800 (`#1e293b`)
- **Accent Primary**: Dynamic theme variable (`var(--color-primary)`, default: Amber-500 `#f59e0b`)
- **Success Accent**: Emerald-500 (`#10b981`) -> Active member status, paid invoices.
- **Danger Accent**: Rose-500 (`#f43f5e`) -> Suspended status, overdue payments.
- **Warning Accent**: Amber-500 (`#f59e0b`) -> Frozen status, pending check-ins.

---

## 3. Core UI Components

### I. Stat Card (Dashboard Dashboard)
- **Structure**: Title (gray-400), Big Value (white), Icon container (accent color background, opacity 10%), Trend Indicator (green/red arrow).
- **CSS Layout (Tailwind Classes)**:
  `bg-slate-900 border border-slate-800 rounded-xl p-6 shadow-lg hover:shadow-2xl transition-all duration-300`

### II. Dynamic Action Buttons
- **Primary Button**: Filled with `var(--color-primary)`, text color contrasts appropriately.
- **Ghost Button**: Transparent with a border of Slate-800, text changes color on hover.
- **Micro-Animations**:
  - Hover: `hover:scale-[1.02] active:scale-[0.98] transition-transform duration-200`
  - Loading: Spinnable SVG ring inline, blocks input events.

### III. Form Input Fields
- Dark slate fill (`bg-slate-950 border border-slate-800 text-white focus:ring-2 focus:ring-amber-500 rounded-lg px-4 py-2.5 outline-none`)

---

## 4. Accessibility (WCAG 2.1) & ARIA Guidelines
- **Contrast Ratios**: Normal text must maintain at least a **4.5:1** contrast ratio against backgrounds.
- **Keyboard Navigation**: Interactive elements must support standard focus ring boundaries (`focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-primary-500`).
- **Semantic HTML & Roles**:
  - Sidebar links must reside in `<nav>` container elements.
  - Interactive custom elements must declare appropriate `role="button"` and `aria-label` properties.
