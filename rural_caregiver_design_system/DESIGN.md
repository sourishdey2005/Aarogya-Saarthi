---
name: Rural Caregiver Design System
colors:
  surface: '#f8f9ff'
  surface-dim: '#d0dbed'
  surface-bright: '#f8f9ff'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#eff4ff'
  surface-container: '#e6eeff'
  surface-container-high: '#dee9fc'
  surface-container-highest: '#d9e3f6'
  on-surface: '#121c2a'
  on-surface-variant: '#574238'
  inverse-surface: '#27313f'
  inverse-on-surface: '#eaf1ff'
  outline: '#8a7266'
  outline-variant: '#ddc1b3'
  surface-tint: '#9c4500'
  primary: '#9c4500'
  on-primary: '#ffffff'
  primary-container: '#e8762b'
  on-primary-container: '#502000'
  inverse-primary: '#ffb68e'
  secondary: '#00696b'
  on-secondary: '#ffffff'
  secondary-container: '#8ff3f4'
  on-secondary-container: '#007072'
  tertiary: '#006d38'
  on-tertiary: '#ffffff'
  tertiary-container: '#3ba965'
  on-tertiary-container: '#003619'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#ffdbca'
  primary-fixed-dim: '#ffb68e'
  on-primary-fixed: '#331200'
  on-primary-fixed-variant: '#773300'
  secondary-fixed: '#8ff3f4'
  secondary-fixed-dim: '#72d6d8'
  on-secondary-fixed: '#002020'
  on-secondary-fixed-variant: '#004f51'
  tertiary-fixed: '#8df9ac'
  tertiary-fixed-dim: '#71dc92'
  on-tertiary-fixed: '#00210d'
  on-tertiary-fixed-variant: '#005229'
  background: '#f8f9ff'
  on-background: '#121c2a'
  surface-variant: '#d9e3f6'
typography:
  headline-lg:
    fontFamily: Noto Sans
    fontSize: 30px
    fontWeight: '700'
    lineHeight: 40px
  headline-lg-mobile:
    fontFamily: Noto Sans
    fontSize: 26px
    fontWeight: '700'
    lineHeight: 36px
  headline-md:
    fontFamily: Noto Sans
    fontSize: 22px
    fontWeight: '700'
    lineHeight: 30px
  headline-sm:
    fontFamily: Noto Sans
    fontSize: 18px
    fontWeight: '600'
    lineHeight: 26px
  body-lg:
    fontFamily: Noto Sans
    fontSize: 18px
    fontWeight: '500'
    lineHeight: 28px
  body-md:
    fontFamily: Noto Sans
    fontSize: 16px
    fontWeight: '400'
    lineHeight: 24px
  label-lg:
    fontFamily: Inter
    fontSize: 16px
    fontWeight: '600'
    lineHeight: 22px
    letterSpacing: 0.01em
  label-md:
    fontFamily: Inter
    fontSize: 14px
    fontWeight: '600'
    lineHeight: 20px
    letterSpacing: 0.02em
  label-sm:
    fontFamily: Inter
    fontSize: 13px
    fontWeight: '500'
    lineHeight: 18px
    letterSpacing: 0.02em
rounded:
  sm: 0.25rem
  DEFAULT: 0.5rem
  md: 0.75rem
  lg: 1rem
  xl: 1.5rem
  full: 9999px
spacing:
  gutter: 1rem
  margin: 1rem
  space-xs: 0.25rem
  space-sm: 0.5rem
  space-md: 1rem
  space-lg: 1.5rem
  space-xl: 2.25rem
---

## Brand & Style

This design system is engineered specifically for Accredited Social Health Activists (ASHA workers) operating in rural and peri-urban India. The visual and interaction design prioritizes clarity, extreme legibility under harsh sunlight, high emotional reassurance, and effortless operation on budget Android smartphones.

### Design Movement: Humanist Tactile Realism
The aesthetic avoids sterile, clinical tech patterns in favor of a warm, grounded visual language rooted in Indian public healthcare realities. Key tenets include:
- **High-Affordance Tactility:** Controls use tangible depth, distinct outlines, and physical container separation so users immediately recognize interactive areas.
- **Cognitive Ease & Dual-Script Harmony:** Every primary data point and control couples Noto Sans Devanagari with structural Inter English subtitles. Every critical action features dual encoding (color + universal iconography + descriptive text).
- **Voice-First & Audio Reassurance:** Audio prompts, mic triggers, and recorded regional instructions are treated as first-class UI citizens.
- **Uncompromising Offline Transparency:** Persistent visual states show whether records are synced, pending local sync, or requiring manual retries without technical jargon.

## Colors

The palette balances cultural warmth, clinical trust, and high-visibility status signaling compliant with WCAG AAA standards on mobile screens.

### Palette Roles
- **Deep Saffron (`#E8762B`):** Primary brand anchor. Used for primary touch targets, floating audio action buttons, current workflow progress, and core navigational highlights.
- **Healing Teal (`#0F8B8D`):** Secondary clinical anchor. Represents medical documentation, beneficiary identification, diagnostic vitals, and verified health records.
- **Leaf Green (`#2E9E5B`):** Tertiary and operational success indicator. Signifies fully synced offline data, completed immunizations, and stable vitals.
- **Amber (`#F2A93B`):** Warning state. Highlights pending offline sync queues, missed follow-ups, and intermediate health monitoring flags.
- **Vermilion (`#C0392B`):** Critical state. Reserved exclusively for high-risk pregnancies, severe acute malnutrition, emergency referrals, and ambulance dispatches.
- **Warm Ivory (`#FDF8F2`):** Primary canvas surface. Softens harsh glare during bright outdoor field use and reduces eye fatigue compared to pure harsh white.
- **Card Surface (`#FFFFFF`):** High-contrast neutral plane for nested lists, modular question sets, and patient profile cards.
- **Charcoal (`#1F2937`):** Dominant text token for all Devanagari and Latin copy to guarantee supreme readability.
- **Muted Slate (`#6B7280`):** Secondary supporting metadata, timestamps, and Latin contextual subtext. Never used below 14px.

## Typography

Typography is calibrated to bridge low-literacy hurdles and regional language characteristics.

### Script Pairing Rules
1. **Devanagari Priority:** Noto Sans Devanagari serves as the primary visual script. Font weights are elevated (minimum `400` regular, frequently `500` or `600`) because intricate Devanagari ligatures (matras and conjuncts) lose definition at thin strokes on low-density mobile panels.
2. **Strict Body Minimum:** Body text must not render below `16px` (`body-md`). Auxiliary indicators or secondary IDs should never fall below `13px` (`label-sm`).
3. **Dual Label Pattern:** Whenever a technical, clinical, or scheme name is presented, render the Hindi/regional translation prominently in `Noto Sans`, followed immediately below by the English identifier in `Inter` (`label-sm` or `label-md`).
4. **Generous Line Heights:** Devanagari ascenders and descenders require 1.4x to 1.5x line heights to prevent overlapping diacritics.

## Layout & Spacing

Field operations require rapid one-handed mobile navigation under variable conditions. The layout follows an aggressive touch-first, thumb-driven architecture.

### Layout Model
- **Grid Architecture:** 4-column fluid mobile grid with `16px` gutters and `16px` outer canvas margins. On tablet viewports (field supervisor tablets), it scales to an 8-column layout with `24px` margins.
- **Touch Target Mandate:** Every clickable control, button, checkbox wrapper, list row, and tab possesses a strict minimum touch area of `56px × 56px`. This accommodates rapid data collection, damp hands, and screen protectors.
- **Bottom-Heavy Hierarchy:** Key navigation elements, offline status toasts, voice input triggers, and confirmation flows remain docked within the lower 40% of the mobile viewport.
- **Rhythm & Scannability:** Consistent vertical spacing (`space-md` between form fields, `space-lg` between distinct clinical sections) creates predictable visual pauses, preventing cognitive fatigue during lengthy patient registrations.

## Elevation & Depth

To remain clear in direct sunlight without requiring excessive screen brightness, this system avoids faint, modern, low-opacity drop shadows. Instead, it pairs structural border outlines with warm, directional ambient shadows.

### Elevation Hierarchy
- **Level 0 (Canvas Base):** Warm Ivory (`#FDF8F2`). Completely flat.
- **Level 1 (Content Cards & Form Blocks):** Pure White (`#FFFFFF`) surface enclosed by a solid `1.5px` border in `#E5DCD0` with an ambient shadow: `0px 2px 4px rgba(31, 41, 55, 0.06)`.
- **Level 2 (Active Selections & Dropdowns):** Pure White (`#FFFFFF`) surface with a `2px` Healing Teal or Deep Saffron border and an elevated shadow: `0px 4px 12px rgba(31, 41, 55, 0.10)`.
- **Level 3 (Emergency Drawers, Alerts & Modals):** Pure White (`#FFFFFF`) with a `2px` Vermilion border (for urgent referrals) and an elevated shadow: `0px 8px 24px rgba(31, 41, 55, 0.16)`.
- **Level 4 (Floating Voice Action - Mic FAB):** Deep Saffron (`#E8762B`) solid fill with a high-contrast shadow: `0px 6px 16px rgba(232, 118, 43, 0.35)`.

## Shapes

The design system utilizes roundedness level `2` (8px standard corner radius, 16px for large cards, 24px for floating panels). This approach softens the clinical experience, making technology feel approachable, while retaining the structural boundaries needed for distinct visual grouping.

### Shape Guidelines
- **Cards and Containers:** `rounded-lg` (16px) creates distinct, card-like units of work.
- **Buttons and Input Fields:** `rounded` (8px) ensures inputs feel solid and clearly delineated from surrounding background space.
- **Voice Mic & Status Badges:** Fully circular (`rounded-full`) for instant differentiation from square structured content.

## Components

### 1. Buttons
- **Primary Action:** Solid Deep Saffron (`#E8762B`) fill, White text, minimum height `56px`. Contains both an icon on the left (24px) and bilingual text (Devanagari top, English subtext bottom).
- **Secondary Action:** Outlined Pure White surface with a `2px` border in Healing Teal (`#0F8B8D`) and Healing Teal text.
- **Urgent Referral Action:** Solid Vermilion (`#C0392B`) fill, White text, warning siren or cross icon. Pulsing outline ring when critical.
- **Audio Assistant Button (Voice Input):** Persistent 64px floating circular button (`#E8762B`) with a prominent microphone glyph. When tapped, waves radiate in Leaf Green (`#2E9E5B`) to indicate active listening.

### 2. Cards & Patient Dossiers
- Standard patient cards feature a two-column header: Beneficiary Photo / Avatar on the left (64px rounded square) and Name / Village / RCH ID on the right.
- Left edge features a dedicated 6px vertical status stripe:
  - Green: Fully vaccinated / Low risk.
  - Amber: Pending follow-up / Local sync pending.
  - Vermilion: High-risk pregnancy / Severe acute malnutrition / Emergency alert.

### 3. Form Inputs & Selection Chips
- **Text Inputs:** Height 60px with embedded floating labels that never shrink below 14px. Includes an integrated mic icon inside the right edge of every text field for speech-to-text entry in local dialects.
- **Selection Chips & Toggles:** Minimum touch target `56px`. Unselected chips feature a `#FFFFFF` fill with a `1.5px` border. Selected chips switch to `#0F8B8D` with a white checkmark and bold text. Avoids ambiguous dropdown menus; all options are visible as selectable cards or chips whenever choices are under five.

### 4. Checkboxes & Radio Buttons
- Enlarged touch containers (`56px × 56px`) with the actual tick/radio circle rendered at `28px × 28px`.
- High-contrast states: Checked displays a solid Teal or Saffron fill with an interior White checkmark; unchecked has an explicit `2px` Charcoal border.

### 5. Offline & Synchronization Status Banner
- Persistent sticky status bar pinned directly below the app header:
  - **Online/Synced:** Leaf Green dot with "सिंक पूर्ण (All Synced)".
  - **Offline/Saved Locally:** Amber cloud icon with "ऑफ़लाइन मोड - 12 रिकॉर्ड सुरक्षित (Offline - 12 Saved)".
  - **Sync Error:** Vermilion alert triangle with "पुनः प्रयास करें (Tap to retry)".

### 6. Audio-Visual Instruction Cards
- Used for low-literacy patients during doorstep visits. Each card features an illustrative graphic (vector line drawing with warm local cultural cues), a brief title in `Noto Sans` (20px), and an embedded one-touch `Play Audio` button that plays medical instructions aloud in the chosen dialect.