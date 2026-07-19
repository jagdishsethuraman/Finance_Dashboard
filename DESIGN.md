---
name: Tidal Finance Design System
description: Precision command deck interface for family financial management
colors:
  primary: "#007AFF"
  canvas-dark: "#0A0A0C"
  surface-dark: "#151518"
  ink-primary-dark: "#F5F5F7"
  ink-secondary-dark: "#8E8E93"
  border-dark: "#252528"
  canvas-light: "#F5F5F7"
  surface-light: "#FFFFFF"
  ink-primary-light: "#1C1C1E"
  ink-secondary-light: "#68686E"
  border-light: "#E5E5EA"
  positive: "#34C759"
  negative: "#FF453A"
typography:
  display:
    fontFamily: "Satoshi, sans-serif"
    fontSize: "clamp(2rem, 5vw, 3.5rem)"
    fontWeight: 700
    lineHeight: 1.1
    letterSpacing: "-0.03em"
  body:
    fontFamily: "Satoshi, sans-serif"
    fontSize: "14px"
    fontWeight: 400
    lineHeight: 1.5
    letterSpacing: "normal"
  mono:
    fontFamily: "Geist Mono, monospace"
    fontSize: "13px"
    fontWeight: 500
    lineHeight: 1.4
    letterSpacing: "-0.01em"
rounded:
  sm: "4px"
  md: "8px"
  lg: "12px"
spacing:
  xs: "4px"
  sm: "8px"
  md: "16px"
  lg: "24px"
  xl: "32px"
components:
  button-primary:
    backgroundColor: "{colors.primary}"
    textColor: "#FFFFFF"
    rounded: "{rounded.md}"
    padding: "10px 16px"
  card:
    rounded: "{rounded.lg}"
    padding: "24px"
---

# Design System: Tidal Finance

## 1. Overview

**Creative North Star: "The Command Deck"**

Tidal Finance is a high-precision, personal developer-tool-styled financial dashboard. The system rejects typical modern AI-style soft-pastel gradients, round card containers within cards, and arbitrary spacing. Instead, it relies on structural layouts, clear grid lines, high-contrast states, and monospaced typography for critical balance numbers.

### Key Characteristics:
* **Strict Border Grid:** Modules are separated by thin, clean boundaries (`1px` solid borders).
* **High Contrast Actions:** Highly focused blue accents for interactive elements and state indicators.
* **Geist Mono for Numerics:** Monospaced alignment for easy visual scanning of numbers.
* **Restrained Animations:** Zero decorative motion. Transitions are restricted to interactive state changes only.

---

## 2. Colors

A dual-mode palette optimized for absolute clarity under both dark and light conditions.

### Primary
* **Command Blue** (`#007AFF`): Active state highlights, selection indicators, primary action triggers.

### Neutral
* **Canvas BG (Dark)** (`#0A0A0C`) / **Canvas BG (Light)** (`#F5F5F7`): Main application canvas background.
* **Surface BG (Dark)** (`#151518`) / **Surface BG (Light)** (`#FFFFFF`): Panel card backgrounds.
* **Border (Dark)** (`#252528` / `rgba(255,255,255,0.08)`) / **Border (Light)** (`#E5E5EA`): Panel grid separators.
* **Ink Primary (Dark)** (`#F5F5F7`) / **Ink Primary (Light)** (`#1C1C1E`): Primary body text and headings.
* **Ink Secondary (Dark)** (`#8E8E93`) / **Ink Secondary (Light)** (`#68686E`): Labels and descriptive text.

### Named Rules:
**The High-Contrast Accenting Rule.** The command blue primary color must only be used on interactive components (buttons, links, toggles) or state markers. It must never be used for purely decorative highlights.

---

## 3. Typography

**Display Font:** Satoshi (Geometric Sans-Serif)
**Body Font:** Satoshi (Geometric Sans-Serif)
**Label/Mono Font:** Geist Mono (Monospaced typeface optimized for reading alignment)

### Hierarchy
* **Display** (Bold (700), clamp(2rem, 5vw, 3.5rem), 1.1): Large Net Worth figures and major headings.
* **Headline** (Bold (700), 20px, 1.3): Sidebar sections and overview subtitles.
* **Body** (Regular (400), 14px, 1.5): Standard descriptive labels and text.
* **Label** (Medium (500), 12px, 1.4): Small secondary headers, rate listings.
* **Numeric (Mono)** (Medium (500), 13px/14px/15px, 1.4): All balances, currency listings, tables, buy/sell amounts.

---

## 4. Elevation

The Command Deck rejects physical elevation, drop shadows, and soft ambient glows. Depth is communicated strictly through structural layering and border contrasts.

### Named Rules:
**The Border Grid Depth Rule.** Components exist on the same flat layer. Overlapping or floating components (like dropdown lists or modal dialogs) must be bounded by a solid `1px` border instead of a diffuse ambient shadow.

---

## 5. Components

### Buttons
* **Shape:** Bounded squircle corners (`8px` radius).
* **Primary:** Command Blue background, clean white text, medium padding (`10px 16px`).
* **Hover:** Subtle opacity scaling (`0.9`), transition of background color over `0.2s`.

### Cards / Containers
* **Corner Style:** Squircle corners (`12px` radius).
* **Border:** Structural border (`1px` solid `--whisper-border`).
* **Padding:** Multi-layered padding (`24px`).
* **Grid Separation:** Bounded directly by the CSS border, no nested card structures allowed.

### Inputs / Fields
* **Style:** Bounded by thin border, solid background.
* **Focus:** Bright border shift to Primary Command Blue, no glowing drop-shadow.

---

## 6. Do's and Don'ts

### Do:
* **Do** display every dollar and rupee amount using the monospaced `Geist Mono` font family.
* **Do** split screens using strict borders (`1px`) to divide modules cleanly.
* **Do** enforce WCAG AA (>= 4.5:1) color contrast on all form inputs and button states.

### Don't:
* **Don't** use decorative gradients (e.g. text background-clip gradients).
* **Don't** nest card components inside other cards.
* **Don't** use thick left-side accent color stripes for alert messages or badge lists.
* **Don't** add drop shadows for hover effects; use border color updates or opacity changes.
