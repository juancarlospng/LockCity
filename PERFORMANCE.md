# Performance and verification

## Budget and loading

Local hero WebP: 101,648 bytes; mobile WebP: 30,762 bytes. Intrinsic 1536x1024 desktop / 960x640 mobile dimensions, absolute reserved hero, no image-driven layout shift. Mobile loads its responsive source. Three/R3F/Drei are dynamically split and only requested after desktop capability checks. No remote fonts, models, textures, postprocessing, shadow maps, particles, commerce SDKs or analytics.

Single canvas, 21 simple meshes, DPR <=1.5. Offscreen and hidden pause rendering; mobile/reduced motion/save-data/unsupported WebGL use static HTML and image. PerformanceMonitor progressively lowers quality before removing WebGL after sustained low samples. Static fallback retains the same composition and all information.

## Validation

Completed: lint with zero warnings, standalone strict TypeScript, production static build, and all 6 browser tests passed. Automated Axe scans reported zero WCAG A/AA violations for the tested desktop and mobile states. This is bounded automated coverage, not a full accessibility certification.

Automated suite `tests/prototype.spec.ts` covers desktop landmarks/CTA, mobile menu/Escape/focus, responsive overflow, reduced-motion media emulation, WebGL unavailable, repeated canvas mount/disposal, offscreen pause, context loss and no-JavaScript HTML. Axe WCAG A/AA checks cover desktop and mobile. Visual review through the app browser at 1440x900 and 390x844 confirms the hero, Latest Drop and footer composition, image loading and accessible navigation. The initial 850px minimum hero height was reduced to keep the CTA visible on shorter viewports.

No production device lab or long-duration GPU heap profiling was performed. Repeated canvas disposal checks and code review catch obvious lifecycle issues but do not prove absence of every GPU leak. Lighthouse field metrics, INP/LCP on real devices, Safari/iOS and low-end physical Android validation remain future release checks. Three 0.185 currently emits an upstream Clock deprecation notice via R3F; it is not a runtime error and no console suppression is applied.

Run checks with Node 22.13+; this task uses the available Node 24 runtime. `next build` includes TypeScript, and standalone lint/typecheck are also required. No production service is involved in tests.
