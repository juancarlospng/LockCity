# Design system

Source: `app/tokens.css`; composition: `app/globals.css`.

Void #101110, bone #efeee8, graphite #252724, steel #a9ada5. Rectilinear grid, hairline dividers, no rounded cards. Display role: system Impact/Arial Narrow; utility: Arial/Helvetica; micro labels: Courier New. These are temporary font fallbacks, not claims about approved brand typography. Font licenses/final fonts and accent: [INFORMATION PENDING].

Spacing scale: 8/16/24/32/48/80px at the default font size. Fluid gutters 20–64px; fluid display scale. Body 16px; regular controls 14px; secondary labels 12px. Links are at least 44px high with visible keyboard focus. `LCLink` provides the shared outlined/filled action. Mobile enhancement boundary is 48rem, matching `lib/experience.ts`. Editorial ratio is 4:3.

Header/hero/drop/footer use shared tokens. Mobile uses a disclosure menu (not a modal, so no focus trap), stacked content, static imagery and full-width CTA. Reduced motion disables all CSS transitions/reveals and smooth scrolling. Campaign area is intentionally a labeled placeholder per task scope, not simulated merchandise.
