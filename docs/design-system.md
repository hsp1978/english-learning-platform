# Design System Specification: The Dual-Experience Framework

## 1. Overview & Creative North Star
This design system is built upon the concept of **"The Adaptive Storybook."** It is a dual-natured ecosystem designed to bridge the gap between whimsical, cognitive play for children and the sophisticated, data-driven oversight required by parents.

The system rejects the "cookie-cutter" SaaS aesthetic. Instead of rigid grids and 1px borders, we utilize **Organic Asymmetry** and **Tonal Depth**. The Child Theme focuses on "Tactile Softness," using oversized radii and springy physics to encourage exploration. The Parent Theme pivots to "Editorial Precision," utilizing glassmorphism and high-contrast typography to provide a sense of professional authority and clarity.

---

## 2. Color & Surface Philosophy

### The "No-Line" Rule
To achieve a high-end editorial feel, **1px solid borders are strictly prohibited for sectioning.** Structural separation must be achieved through background shifts or elevation.
* **Child Theme:** Use `surface-container-low` for secondary sections sitting on a `surface` background.
* **Parent Theme:** Use the `outline-variant` at 10-20% opacity only when absolutely necessary for accessibility; otherwise, rely on `surface-bright` and `surface-dim` to define zones.

### Surface Hierarchy & Nesting
Treat the UI as a series of physical layers.
1. **Base:** `surface` (The canvas).
2. **Sectioning:** `surface-container-low` (Subtle grouping).
3. **Actionable Cards:** `surface-container-lowest` (The most "elevated" and bright surface).
4. **Information Wells:** `surface-container-high` (Recessed areas for metadata or secondary tools).

### The Glass & Gradient Rule
Standard flat hex codes feel "default." To create a signature feel:
* **Parent Theme:** Apply `backdrop-blur-xl` and `bg-surface/60` to navigation bars and floating modals to create a frosted glass effect.
* **Signature Textures:** For Hero CTAs, use a linear gradient: `from-primary to-primary-container` at a 135-degree angle. This adds "soul" and prevents the UI from looking like a wireframe.

---

## 3. Typography: The Dual-Voice Scale

We utilize two distinct font pairings to signal the mental shift between "Learning Mode" and "Management Mode."

| Role | Token | Font Family | Size | Intent |
| :--- | :--- | :--- | :--- | :--- |
| **Display** | `display-lg` | Plus Jakarta Sans | 3.5rem | Bold, geometric, and authoritative. |
| **Headline** | `headline-md`| Plus Jakarta Sans | 1.75rem| Clear hierarchy for dashboard headers. |
| **Title** | `title-lg` | Be Vietnam Pro | 1.375rem| Sophisticated, modern editorial feel. |
| **Body** | `body-lg` | Be Vietnam Pro | 1rem | High legibility for long-form content. |
| **Label** | `label-md` | Plus Jakarta Sans | 0.75rem| Professional micro-copy. |

*Note: In the Child Theme, swap Be Vietnam Pro for Quicksand/Nunito to introduce rounded terminals that match the `rounded-xl` components.*

---

## 4. Elevation & Depth

### The Layering Principle
Forget traditional drop shadows for every element. Depth is achieved via **Tonal Layering**:
* Place a `surface-container-lowest` card on top of a `surface-container` background. The difference in luminance creates a natural "lift."

### Ambient Shadows
When a floating effect is required (e.g., a Child Theme "Play" button):
* **Child Theme:** Use `shadow-[0_20px_40px_-15px_rgba(160,55,59,0.12)]`. The shadow is large, soft, and tinted with the `primary` color (not black).
* **Parent Theme:** Use a tighter, professional shadow: `shadow-[0_8px_30px_rgb(0,0,0,0.04)]` combined with `backdrop-blur`.

### The Ghost Border Fallback
If an element lacks contrast against its background, use a **Ghost Border**: `border border-outline-variant/20`. Never use 100% opacity for borders.

---

## 5. Components

### Buttons: The Signature Interaction
* **Primary:** `bg-primary text-on-primary rounded-xl`. In the Child Theme, use `rounded-3xl` and add a `hover:scale-105 transition-transform duration-500 cubic-bezier(0.34, 1.56, 0.64, 1)` for a "springy" feel.
* **Secondary:** `bg-secondary-container text-on-secondary-container rounded-xl`. No border.
* **Tertiary:** `text-primary font-bold`. Use only `padding-x` shifts on hover rather than underlines.

### Cards & Lists: The No-Divider Rule
* **Cards:** Forbid the use of divider lines between header and body. Use a `spacing-6` (2rem) gap or a subtle `bg-surface-variant` shift for the header area.
* **Input Fields:** `bg-surface-container-highest/50 border-none rounded-md`. Focus state should use a `ring-2 ring-primary/30`. Avoid the "boxed" look; favor the "recessed" look.

### The "Floating Progress" Component
For the Parent Dashboard, use a glassmorphic progress ring. Use `tertiary` (Emerald) for success states. The background of the ring should be `tertiary-container` at 30% opacity.

---

## 6. Do’s and Don’ts

### Do:
* **Do** use asymmetrical margins. If the left margin is `spacing-8`, consider making the right margin `spacing-12` for a more editorial, high-end feel.
* **Do** use `on-surface-variant` for helper text to maintain a soft hierarchy.
* **Do** optimize for Dark Mode by ensuring `surface-container` tiers stay distinguishable (the system automatically handles this if using the provided tokens).

### Don’t:
* **Don't** use 1px solid black or grey borders. This immediately makes the design look "templated."
* **Don't** use standard "Ease-in-out" transitions for the Child Theme. Use custom cubic-beziers to give the UI a playful, liquid personality.
* **Don't** cram information. If a dashboard feels crowded, increase the spacing from `spacing-4` to `spacing-8`. White space is a functional tool, not a luxury.
