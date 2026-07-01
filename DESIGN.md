---
name: Vibrant Living Narrative
colors:
  surface: '#fff8f5'
  surface-dim: '#ead6c9'
  surface-bright: '#fff8f5'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#fff1e9'
  surface-container: '#ffeadd'
  surface-container-high: '#f9e4d7'
  surface-container-highest: '#f3dfd1'
  on-surface: '#241912'
  on-surface-variant: '#564334'
  inverse-surface: '#3a2e25'
  inverse-on-surface: '#ffede3'
  outline: '#897362'
  outline-variant: '#ddc1ae'
  surface-tint: '#904d00'
  primary: '#904d00'
  on-primary: '#ffffff'
  primary-container: '#ff8c00'
  on-primary-container: '#623200'
  inverse-primary: '#ffb77d'
  secondary: '#645e52'
  on-secondary: '#ffffff'
  secondary-container: '#e8ded0'
  on-secondary-container: '#686256'
  tertiary: '#5f5e5e'
  on-tertiary: '#ffffff'
  tertiary-container: '#aba9a9'
  on-tertiary-container: '#3e3e3e'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#ffdcc3'
  primary-fixed-dim: '#ffb77d'
  on-primary-fixed: '#2f1500'
  on-primary-fixed-variant: '#6e3900'
  secondary-fixed: '#ebe1d3'
  secondary-fixed-dim: '#cec5b7'
  on-secondary-fixed: '#1f1b12'
  on-secondary-fixed-variant: '#4c463b'
  tertiary-fixed: '#e4e2e1'
  tertiary-fixed-dim: '#c8c6c6'
  on-tertiary-fixed: '#1b1c1c'
  on-tertiary-fixed-variant: '#474747'
  background: '#fff8f5'
  on-background: '#241912'
  surface-variant: '#f3dfd1'
typography:
  headline-lg:
    fontFamily: Inter
    fontSize: 32px
    fontWeight: '700'
    lineHeight: 40px
    letterSpacing: -0.02em
  headline-lg-mobile:
    fontFamily: Inter
    fontSize: 24px
    fontWeight: '700'
    lineHeight: 32px
    letterSpacing: -0.01em
  headline-md:
    fontFamily: Inter
    fontSize: 24px
    fontWeight: '600'
    lineHeight: 32px
  headline-sm:
    fontFamily: Inter
    fontSize: 20px
    fontWeight: '600'
    lineHeight: 28px
  body-lg:
    fontFamily: Inter
    fontSize: 18px
    fontWeight: '400'
    lineHeight: 28px
  body-md:
    fontFamily: Inter
    fontSize: 16px
    fontWeight: '400'
    lineHeight: 24px
  body-sm:
    fontFamily: Inter
    fontSize: 14px
    fontWeight: '400'
    lineHeight: 20px
  label-md:
    fontFamily: Inter
    fontSize: 14px
    fontWeight: '600'
    lineHeight: 16px
    letterSpacing: 0.05em
  label-sm:
    fontFamily: Inter
    fontSize: 12px
    fontWeight: '500'
    lineHeight: 16px
rounded:
  sm: 0.25rem
  DEFAULT: 0.5rem
  md: 0.75rem
  lg: 1rem
  xl: 1.5rem
  full: 9999px
spacing:
  base: 8px
  xs: 4px
  sm: 12px
  md: 24px
  lg: 48px
  xl: 64px
  gutter: 24px
  margin-mobile: 16px
  margin-desktop: 40px
---

## Brand & Style

The design system is built for a contemporary dormitory management experience, prioritizing clarity, energy, and ease of use. The brand personality is efficient yet welcoming, bridging the gap between institutional reliability and the warmth of a residential home.

The aesthetic follows a **Minimalist** philosophy with a focus on high-quality whitespace and intentional hierarchy. By utilizing a "light and airy" approach, the interface reduces the cognitive load for students and administrators alike. The emotional response should be one of "organized vitality" — where the vibrant orange accents provide a sense of activity and optimism against a calm, structured backdrop. Clean lines and subtle depth ensure the platform feels modern and professional.

## Colors

The palette is centered around a singular, high-energy **Vibrant Orange** (#FF8C00) used for primary actions and brand presence. To prevent visual fatigue, this is balanced by **Soft Orange/Peach** (#FFF5E6), which serves as a gentle background for containers, chips, and highlighted states.

- **Primary:** #FF8C00 — Actionable elements, branding, important states
- **Secondary:** #FFF5E6 — Surface accents, hover states, soft backgrounds
- **Neutral/Text:** #333333 — High-readability charcoal for body and headings
- **Surface:** #FFFFFF — Foundation of the "airy" feel, main background and card faces
- **Subtle Gray:** #F2F2F2 — Dividers and hairline borders only

## Typography

**Inter** font for all text. Tight and functional type scale.

- **Headlines:** Bold (700) or Semi-Bold (600). Generous line heights for the airy aesthetic.
- **Body:** Regular (400), Dark Charcoal (#333333) for high contrast.
- **Labels:** Medium (500) or Semi-Bold (600). Uppercase only for small section headers or metadata.

## Layout & Spacing

Fluid Grid system based on an **8px root unit**.

- **Desktop:** 12-column, 24px gutters, 40px outer margins
- **Tablet:** 8-column, 24px gutters, 24px outer margins
- **Mobile:** 4-column, 16px gutters, 16px outer margins

Favor MD and LG spacing to emphasize the minimalist, "roomy" feel.

## Elevation & Depth

Tonal layers + ambient shadows for soft depth.

- **Level 0 (Floor):** Pure White (#FFFFFF)
- **Level 1 (Cards):** White + 1px border (#F2F2F2) + shadow (blur 15px, opacity 4%)
- **Level 2 (Dropdowns/Modals):** Shadow (blur 30px, opacity 8%)

Shadows should never feel heavy — used only to lift cards off the background.

## Shapes

Consistently **Rounded** corners.

- **Inputs, Buttons:** 0.5rem (8px)
- **Cards, Modals:** 1rem (16px)
- **Promotional Banners:** 1.5rem (24px)
- **Focus ring:** 4px, Primary Orange at 20% opacity

## Components

- **Primary Button:** Solid #FF8C00 background, white text, 0.5rem radius, slight lift on hover
- **Secondary Button:** #FFF5E6 background, #FF8C00 text
- **Cards:** 1rem radius, 1px soft gray border, Level 1 shadow. Card headers have #F2F2F2 bottom border.
- **Input Fields:** #F9F9F9 background, 8px radius. On focus: Primary Orange border + soft glow.
- **Chips (room status):** Pill-shaped, #FFF5E6 background, #FF8C00 text
- **Lists:** Borderless, 8px vertical spacing. Hover: #FFF5E6 background transition.
- **Checkboxes/Radios:** Primary Orange for checked state. Minimum 44px hit area.
- **Navigation Sidebar:** White background, charcoal text. Active state: 4px vertical pill indicator in Primary Orange.
