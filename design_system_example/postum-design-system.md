# Postum Design System (ThoughtStream Adapted)

Humanized, calm, respectful, and distraction-free.

## Overview

The Postum Design System is an adaptation of ThoughtStream, tailored for a legacy mapping and post-mortem notification platform (Dead Man's Switch). It combines the editorial elegance and contemplative warmth of ThoughtStream with the necessary UI/UX ergonomics of a modern SaaS dashboard. Every element is crafted to convey maximum security, privacy, and empathy—treating a sensitive topic with clarity and dignified restraint.

---

## Colors

### Brand Palette

| Token     | Hex       | Role                                                  |
|-----------|-----------|-------------------------------------------------------|
| Primary   | `#0F172A` | Slate 900 — anchors main UI, primary buttons, header  |
| Accent    | `#0D9488` | Teal 600 — subtle trust indicator, success actions   |
| Secondary | `#78716C` | Stone 500 — supporting icons, borders, muted elements |

### Surface Palette

| Token          | Hex       | Role                                        |
|----------------|-----------|---------------------------------------------|
| Background     | `#FAFAF9` | Warm off-white page background              |
| Surface        | `#F5F5F4` | Card and section backgrounds                |
| Surface Raised | `#EFEDEB` | Hover states, active callouts, modal overlays|

### Content Palette

| Token          | Hex       | Role                                       |
|----------------|-----------|--------------------------------------------|
| Text Primary   | `#1C1917` | Body copy, primary headings                |
| Text Secondary | `#57534E` | Metadata, instructions, captions           |
| Text Tertiary  | `#A8A29E` | Placeholders, disabled states              |

### Border Palette

| Token         | Hex       | Usage                                      |
|---------------|-----------|--------------------------------------------|
| Border Subtle | `#E7E5E4` | Card borders, subtle dividers              |
| Border Medium | `#D6D3D1` | Input outlines, active component borders   |
| Border Strong | `#78716C` | Focused inputs, primary borders            |

### Semantic & Status Colors

| Token               | Hex       | Usage                                           |
|---------------------|-----------|-------------------------------------------------|
| Status Active       | `#059669` | Protocol active, check-in up to date            |
| Status Warning      | `#D97706` | Check-in pending, grace period active           |
| Status Critical     | `#DC2626` | Final notice / Grace period ending              |
| Status Neutral      | `#6B7280` | Paused / Archived                               |

---

## Typography

### Font Stack

| Role               | Font                                              | Usage                                     |
|--------------------|---------------------------------------------------|-------------------------------------------|
| Editorial/Headings | Libre Baskerville, Georgia, serif                 | Landing page headlines, Notice letters    |
| UI/Body            | Inter, -apple-system, sans-serif                  | Dashboard UI, buttons, inputs, body copy  |
| Mono               | Source Code Pro, Consolas, monospace              | Protocol IDs, system timestamps           |

### Type Scale

| Level        | Font              | Size   | Weight | Line Height | Usage                                     |
|--------------|-------------------|--------|--------|-------------|-------------------------------------------|
| Display      | Libre Baskerville | 36px   | 700    | 1.25        | Hero landing titles, main notice heading  |
| Headline     | Libre Baskerville | 28px   | 700    | 1.30        | Section titles, letter titles             |
| Subhead      | Inter             | 20px   | 600    | 1.40        | Dashboard section headings                |
| Body Large   | Inter             | 18px   | 400    | 1.65        | Featured instructions, onboarding copy    |
| Body         | Inter             | 15px   | 400    | 1.60        | Standard reading, dashboard labels        |
| Body Small   | Inter             | 13px   | 400    | 1.50        | Helper text, metadata, tooltips           |
| Caption      | Inter             | 11px   | 600    | 1.40        | Status tags, uppercase labels             |

---

## Spacing

Aligned to an **8px / 12px base grid** for intuitive SaaS layout rhythm.

| Token      | Value | Usage                                      |
|------------|-------|--------------------------------------------|
| Space 2XS  | 4px   | Micro gaps, badge padding                  |
| Space XS   | 8px   | Input inner gap, label margin              |
| Space S    | 12px  | Compact padding, button vertical padding   |
| Space M    | 16px  | Standard card inner padding, row gaps      |
| Space L    | 24px  | Card padding, container margins            |
| Space XL   | 32px  | Section gaps inside dashboard              |
| Space 2XL  | 48px  | Major section dividers                     |

---

## Border Radius (Humanized Softness)

Unlike rigid 0px systems, Postum uses subtle rounding to create a welcoming, approachable feel while maintaining professional gravity.

| Token   | Value | Usage                                      |
|---------|-------|--------------------------------------------|
| Small   | 4px   | Badges, status chips, tooltips             |
| Medium  | 6px   | Inputs, buttons, dropdown items            |
| Large   | 8px   | Dashboard cards, modals, containers        |
| Full    | 9999px| Avatars, pill tags                         |

---

## Elevation & Shadows

Used sparingly to maintain a clean editorial feel while providing necessary depth hierarchy for modals and floating overlays.

| Level   | CSS Value                                           | Usage                                  |
|---------|-----------------------------------------------------|----------------------------------------|
| Flat    | `none`                                              | Standard cards, page sections          |
| Subtle  | `0 1px 3px 0 rgba(0, 0, 0, 0.05)`                   | Interactive cards on hover             |
| Floating| `0 10px 25px -5px rgba(0, 0, 0, 0.08)`              | Modals, dropdowns, sticky action bars  |
| Focus   | `0 0 0 2px #FAFAF9, 0 0 0 4px #0F172A`              | Accessibility focus indicators         |

---

## Components

### Buttons

**Primary (Action/CTA)**
- Background: `#0F172A`
- Text: `#FAFAF9`
- Radius: `6px`
- Padding: 12px 24px
- Font: Inter, 15px, weight 600
- Hover: `#1E293B`
- Active: `#020617`

**Secondary (Outline)**
- Background: transparent
- Text: `#1C1917`
- Border: `1px solid #D6D3D1`
- Radius: `6px`
- Padding: 12px 24px
- Font: Inter, 15px, weight 600
- Hover: Background `#F5F5F4`

**Check-in Life Button (Special Hero Button)**
- Background: `#0D9488`
- Text: `#FFFFFF`
- Radius: `8px`
- Padding: 16px 32px
- Font: Inter, 16px, weight 600
- Hover: `#0F766E`
- Shadow: `0 4px 12px rgba(13, 148, 136, 0.2)`

---

### Inputs & Modals

**Text Input**
- Height: 44px
- Background: `#FAFAF9`
- Border: `1px solid #D6D3D1`
- Radius: `6px`
- Padding: 10px 14px
- Text: `#1C1917`
- Placeholder: `#A8A29E`
- Focus: Border `#0F172A`, ring `0 0 0 2px #FAFAF9, 0 0 0 4px #0F172A`

**Modals & Dialogs**
- Background: `#FAFAF9`
- Border: `1px solid #E7E5E4`
- Radius: `8px`
- Shadow: `0 10px 25px -5px rgba(0, 0, 0, 0.08)`
- Overlay: `rgba(15, 23, 42, 0.4)` (Backdrop blur 2px)

---

### Status Badges

**Protocol Active (Check-in OK)**
- Background: `#ECFDF5`
- Text: `#047857`
- Border: `1px solid #A7F3D0`
- Radius: `4px`
- Padding: 4px 10px

**Grace Period (Notice Pending)**
- Background: `#FEF3C7`
- Text: `#B45309`
- Border: `1px solid #FDE68A`
- Radius: `4px`
- Padding: 4px 10px

---

## UX Principles for Postum

1. **Empathetic Restraint:** Never use gamification, aggressive popups, or cheery celebratory animations.
2. **Clarity First:** Highlight check-in countdowns and recipient delivery lists with zero ambiguity.
3. **Graceful Fallbacks:** Visual indicators must make clear that missing a check-in triggers a grace period, not an immediate exposure.
4. **Accessible Contrast:** Ensure high contrast for all reading materials (Notice letters and guidelines).