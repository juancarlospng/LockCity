# LOCK CITY V2 — MASTER BUILD BRIEF

You are the lead creative technologist, senior frontend engineer, interaction designer and web performance engineer responsible for building LOCK CITY V2.

This is not a generic ecommerce redesign.

The objective is to create a distinctive digital world for a streetwear/lifestyle brand in which brand, culture, community, product and commerce coexist.

The website should feel like entering LOCK CITY rather than opening a conventional online store.

## 1. PRIMARY OBJECTIVE

Create a premium, experimental, modern, highly interactive ecommerce experience that combines:

* editorial art direction
* streetwear culture
* cinematic interaction
* Three.js/WebGL
* strong typography
* photography
* product storytelling
* community
* performant ecommerce

The experience must be memorable without compromising:

* usability
* mobile performance
* accessibility
* SEO
* ecommerce conversion
* maintainability
* security

The project must never become a Three.js technology demo.

Technology serves LOCK CITY.

LOCK CITY does not serve the technology.

---

# 2. BRAND DIRECTION

LOCK CITY is a streetwear / lifestyle brand.

Its identity should communicate:

* urban culture
* community
* street
* youth
* confidence
* creativity
* independence
* modernity
* cultural relevance
* clarity
* strong visual identity

The visual system should feel:

* strong
* clean
* editorial
* contemporary
* experimental
* premium
* slightly raw
* architectural
* culturally aware

Avoid generic streetwear clichés.

Avoid generic AI-generated design.

Avoid excessive visual clutter.

LOCK CITY should feel capable of becoming a significant international streetwear/lifestyle brand.

---

# 3. CREATIVE CONCEPT

Internal concept:

LOCK CITY — THE CITY IS ALIVE

Treat LOCK CITY as a digital place.

The city becomes a metaphor for the brand.

Collections can behave like districts.

Products can behave like objects.

Drops can behave like events.

The archive preserves the history of the city.

People represent the community.

Journal content represents transmissions from the city.

This concept is an internal design framework and must not automatically be converted into public marketing copy.

Do not invent official brand slogans.

Where official information is unavailable, use:

[INFORMATION PENDING]

---

# 4. EXPERIENCE PRINCIPLE

The homepage is an EXPERIENCE.

The shop is COMMERCE.

The product page is STORY + COMMERCE.

The cart and checkout are CONVERSION.

Therefore the amount of experimental interaction should progressively decrease as the customer approaches payment.

HOME
maximum immersion

COLLECTION
medium immersion

PRODUCT
controlled immersion

CART
minimal immersion

CHECKOUT
zero unnecessary WebGL

---

# 5. REFERENCE PRINCIPLES

Use the supplied reference websites and visual material as inspiration for:

* interaction quality
* transition quality
* spatial composition
* typography
* pacing
* storytelling
* WebGL integration
* navigation concepts

Do NOT clone their layouts, identity, assets, animation choreography, source code or visual language.

Derive principles.

Create an original LOCK CITY system.

---

# 6. TECHNOLOGY

Preferred frontend stack:

* Next.js current stable version
* React
* TypeScript
* Three.js
* React Three Fiber
* Drei
* GSAP
* GSAP ScrollTrigger

Use additional dependencies only when they solve a clear problem.

Avoid dependency bloat.

All critical commerce UI must remain functional independently of WebGL.

Use semantic HTML wherever possible.

---

# 7. ARCHITECTURE

LOCK CITY V2 is a frontend layer.

Business systems must be centralized behind:

LOCK CITY ADMIN API

Target architecture:

LOCK CITY V2
|
v
LOCK CITY ADMIN API
|
+-- WooCommerce
+-- Printful
+-- Stripe
+-- PayPal
+-- Email
+-- Affiliates

Do NOT directly couple the frontend to every third-party service.

Do NOT put provider secrets in client-side code.

Do NOT hardcode API keys, passwords, tokens or credentials.

Never expose secrets in commits.

Use environment variables and server-side boundaries.

---

# 8. COMMERCIAL DATA RULE

Never invent real LOCK CITY:

* prices
* products
* stock
* SKUs
* sales
* customers
* discounts
* inventory
* commissions
* payment information
* availability
* shipping promises
* launch dates

Until the real API is ready, create an isolated mock data adapter.

Mock data must be clearly marked:

DEMO / MOCK DATA

The UI should later be able to switch from:

MockCommerceAdapter

to:

LockCityApiAdapter

without rewriting presentation components.

---

# 9. PRODUCT STATES

Support the following states at architecture level:

AVAILABLE
PRE_ORDER
COMING_SOON
SOLD_OUT

Do not invent business rules surrounding payment, delivery dates or fulfillment.

Those rules are:

[INFORMATION PENDING]

---

# 10. HOMEPAGE STRUCTURE

Build the homepage as a sequence of cinematic and editorial moments.

## Scene 00 — Boot

Optional first-visit initialization sequence.

Example tone:

LOCK CITY
SYSTEM 02

INITIALIZING CITY

It must be short and skippable.

Returning visitors should not be forced through a long intro.

## Scene 01 — Enter the City

Fullscreen hero.

Three.js environment.

Large LOCK CITY typography.

Subtle pointer / touch camera response.

Primary commerce CTA must remain visible and accessible.

## Scene 02 — Latest Drop

Introduce the current collection using:

* product imagery
* typography
* motion
* controlled spatial interaction

## Scene 03 — Shop the Drop

Transition from immersive storytelling into usable ecommerce.

Product cards must be normal accessible DOM elements.

## Scene 04 — Districts

Experimental visual navigation representing collections or cultural areas as districts inside LOCK CITY.

Actual taxonomy:

[INFORMATION PENDING]

## Scene 05 — Featured Object

Create a highly cinematic product storytelling module.

Use scroll progress to reveal:

* silhouette
* materials
* graphics
* detail
* product identity

## Scene 06 — The City

Brand/culture storytelling.

Photography, video, text and subtle WebGL.

## Scene 07 — People of the City

Community, creators, ambassadors, artists and collaborators.

## Scene 08 — Archive

Historical drops and projects.

## Scene 09 — Journal / Transmissions

Editorial content.

## Scene 10 — Join the City

Newsletter/community entry.

## Scene 11 — Footer

Strong final brand statement and complete navigation.

---

# 11. REQUIRED ROUTES

Create architecture for:

/
/shop
/new
/collections/[slug]
/product/[slug]
/drops
/drops/[slug]
/archive
/archive/[slug]
/city
/city/story
/city/people
/city/collaborations
/journal
/journal/[slug]
/search
/cart
/account
/contact
/legal

Checkout architecture depends on the final payment/ecommerce implementation.

Mark unresolved checkout integration:

[INFORMATION PENDING]

---

# 12. THREE.JS ARCHITECTURE

Never make the entire website a canvas.

Use two coordinated layers:

DOM/UI layer

and

WebGL experience layer.

DOM handles:

* navigation
* typography
* buttons
* ecommerce
* forms
* accessibility
* SEO
* product information

WebGL handles:

* environments
* lighting
* cameras
* particles
* spatial objects
* visual effects
* selected transitions

The website must remain navigable when WebGL is unavailable.

---

# 13. WEBGL SYSTEM

Create reusable infrastructure rather than page-specific spaghetti code.

Suggested system:

SceneProvider
ExperienceCanvas
SceneManager
CameraRig
PointerController
ScrollController
PerformanceManager
AssetManager
TransitionManager
Environment
Lighting
PostProcessing
DebugPanel

Scene modules must clean up resources correctly.

Dispose unused:

* geometry
* materials
* textures
* render targets

Prevent memory leaks between routes.

---

# 14. DESIGN SYSTEM

Before building final pages, establish reusable design tokens.

Include:

colors
spacing
type scale
grid
breakpoints
motion durations
easing
z-index layers
borders
media ratios

Create reusable components such as:

LCButton
LCLink
LCHeading
LCLabel
LCStatus
LCProductCard
LCProductGrid
LCMedia
LCNavigation
LCMenu
LCCursor
LCScene
LCSceneLoader
LCMarquee
LCDrawer
LCModal
LCNewsletter
LCFooter

Do not duplicate patterns across pages.

---

# 15. VISUAL DIRECTION

Initial palette direction:

void black
bone / off-white
graphite
steel

Brand accent color:

[INFORMATION PENDING]

Visual references:

* industrial surfaces
* concrete
* steel
* glass
* darkness
* controlled light
* architectural composition
* editorial photography
* oversized typography
* technical micro typography

Do not automatically interpret “urban” as graffiti.

Avoid visual stereotypes.

---

# 16. TYPOGRAPHY

Use two functional typographic roles:

DISPLAY

Large, distinctive, confident.

UTILITY

Highly readable for commerce, UI and information.

Font licensing and final brand fonts:

[INFORMATION PENDING]

Use appropriate fallback fonts during development.

Never commit unlicensed commercial fonts.

---

# 17. MOTION LANGUAGE

Motion should feel physical and intentional.

Use:

* inertia
* depth
* reveal
* spatial movement
* camera movement
* masking
* scale changes
* controlled distortion
* subtle pointer response

Avoid:

* random animation
* excessive bouncing
* animation on every element
* long blocking intros
* gratuitous page transitions
* excessive parallax
* motion that harms usability

Use a coherent easing system.

---

# 18. PERFORMANCE

Performance is a design requirement.

Implement:

* dynamic imports
* route-level code splitting
* responsive images
* AVIF/WebP where appropriate
* lazy loading
* GLTF optimization
* Draco or Meshopt where justified
* compressed GPU textures where appropriate
* texture size budgets
* adaptive DPR
* instancing
* object pooling where useful
* frustum culling
* renderer pause when hidden
* reduced particle counts on mobile
* reduced post-processing on weaker devices
* static fallbacks
* asset preloading only when justified

Create a performance manager capable of choosing approximately:

HIGH
MEDIUM
LOW
STATIC

The system should degrade gracefully.

Do not rely exclusively on unreliable device labels.

Use runtime capabilities and performance measurements when appropriate.

---

# 19. MOBILE

Mobile is a first-class experience.

Do not simply scale down desktop.

Design interaction specifically for:

* thumb reach
* touch
* portrait screens
* weaker GPUs
* slower networks
* smaller memory budgets

Replace hover-only interactions with touch equivalents.

Commerce interactions must remain immediate.

---

# 20. ACCESSIBILITY

Support:

* keyboard navigation
* visible focus states
* semantic landmarks
* appropriate ARIA usage
* alt text architecture
* reduced motion
* sufficient contrast
* screen reader friendly commerce controls

Respect:

prefers-reduced-motion

Reduced-motion mode should remove unnecessary camera and transition movement without removing information.

---

# 21. SEO

Do not sacrifice SEO for the immersive experience.

Critical content must exist in HTML.

Implement architecture for:

* metadata
* Open Graph
* canonical URLs
* product structured data
* collection metadata
* journal metadata
* semantic headings
* sitemap
* robots.txt

Three.js must never be required for search engines to understand the products or brand content.

---

# 22. PRODUCT EXPERIENCE

Product page priorities:

1. product identity
2. imagery
3. price
4. availability
5. variants
6. size
7. add to bag
8. product details
9. shipping/returns information
10. related products

Do not hide critical purchasing information behind visual effects.

Use immersive media only when it improves product understanding.

---

# 23. CART

Cart must prioritize speed.

Use an accessible drawer or page.

Clearly display:

product
variant
quantity
price
subtotal

Real prices and business logic must come from the approved data source.

---

# 24. CHECKOUT

Checkout should be intentionally visually simpler than the homepage.

Do not load unnecessary Three.js environments in checkout.

Prioritize:

trust
clarity
speed
mobile usability
payment safety

Final checkout integration:

[INFORMATION PENDING]

---

# 25. SECURITY

Never expose:

* API keys
* passwords
* tokens
* Stripe secrets
* PayPal secrets
* WooCommerce secrets
* Printful secrets
* customer private data

Never request or store raw payment-card information.

Payment processing must remain with approved payment providers.

---

# 26. ANALYTICS

Prepare a clean event architecture but do not invent the analytics provider.

Possible events:

view_home
enter_city
view_collection
view_product
select_variant
add_to_cart
open_cart
begin_checkout
newsletter_signup

Provider:

[INFORMATION PENDING]

---

# 27. CONTENT MANAGEMENT

Keep content and presentation separated.

Do not bury editable marketing content inside animation components.

Prepare typed content models for:

collections
products
drops
people
journal entries
campaigns

Backend source:

[INFORMATION PENDING]

---

# 28. CODE QUALITY

Use:

* strict TypeScript
* descriptive naming
* small composable components
* reusable hooks
* centralized types
* predictable folder structure
* linting
* formatting
* unit tests where useful
* integration tests for critical commerce flows

Avoid giant monolithic components.

Avoid magical constants.

Avoid duplicated animation logic.

Document complex shaders and animation systems.

---

# 29. DEVELOPMENT EXPERIENCE

Create:

README.md
ARCHITECTURE.md
DESIGN_SYSTEM.md
THREE_SYSTEM.md
API_INTEGRATION.md
PERFORMANCE.md

Document:

* installation
* scripts
* architecture
* environment variables
* asset pipeline
* development workflow
* deployment assumptions

---

# 30. GIT STRATEGY

Work incrementally.

Never replace the entire project unnecessarily.

Use logical commits.

Examples:

feat: establish lock city design system
feat: add three experience canvas
feat: implement homepage hero scene
feat: add commerce adapter
perf: optimize homepage webgl assets

Before major refactors, understand the existing architecture.

---

# 31. DO NOT GENERATE GENERIC AI DESIGN

Explicitly avoid:

* purple AI gradients
* generic SaaS aesthetics
* excessive rounded cards
* random glassmorphism
* fake testimonials
* fake statistics
* generic stock imagery
* excessive blur
* meaningless 3D blobs
* decorative WebGL unrelated to the brand
* template-looking ecommerce
* arbitrary neon cyberpunk styling

LOCK CITY is not a SaaS startup.

LOCK CITY is not a videogame.

LOCK CITY is not a WebGL portfolio.

LOCK CITY is a streetwear/lifestyle brand creating a digital cultural space.

---

# 32. CREATIVE STANDARD

Before implementing a visual feature ask:

Does this make LOCK CITY more distinctive?

Does this communicate the brand?

Does this improve storytelling?

Does this improve product understanding?

Does this improve the feeling of entering the city?

If the answer to all of these is no, remove the effect.

---

# 33. COMMERCIAL STANDARD

Before implementing an ecommerce interaction ask:

Can the customer understand what this product is?

Can they understand the price?

Can they understand availability?

Can they choose the correct variant?

Can they add it to cart quickly?

Can they complete the process on mobile?

Experimental design must never obstruct these tasks.

---

# 34. FIRST IMPLEMENTATION MILESTONE

Do NOT attempt to complete the entire website in the first pass.

First build a polished vertical prototype containing:

1. global design tokens
2. typography system
3. navigation
4. responsive layout system
5. homepage Three.js canvas architecture
6. Enter The City hero
7. Latest Drop transition
8. one product editorial section
9. one product grid
10. one Districts prototype
11. footer
12. mock commerce adapter
13. responsive mobile implementation
14. reduced-motion implementation
15. performance monitoring

Use mock content clearly labeled as mock.

Do not connect production ecommerce yet.

---

# 35. QUALITY GATE

Before calling the first milestone complete verify:

DESKTOP

* visually coherent
* smooth interactions
* no layout shifts
* no obvious WebGL leaks
* clean navigation

MOBILE

* usable with one hand
* stable
* no hover dependencies
* acceptable graphics workload

ACCESSIBILITY

* keyboard navigable
* reduced motion works
* semantic controls

PERFORMANCE

* lazy assets
* reasonable bundle architecture
* adaptive WebGL
* no permanent background rendering when unnecessary

ENGINEERING

* strict types
* reusable architecture
* documented code
* no credentials
* no invented production data

---

# 36. WORKING METHOD

Before coding a major feature:

1. inspect the existing repository
2. explain the relevant architecture internally
3. identify reusable pieces
4. implement the smallest coherent version
5. test
6. inspect visually
7. optimize
8. document important decisions

Do not blindly rewrite working systems.

---

# 37. FIRST TASK

Begin by analyzing the repository.

Then create:

ARCHITECTURE.md

containing:

* proposed frontend architecture
* route map
* component architecture
* WebGL architecture
* commerce adapter architecture
* state boundaries
* asset strategy
* mobile strategy
* accessibility strategy
* performance strategy

Then establish the project foundation and implement the FIRST IMPLEMENTATION MILESTONE.

Do not connect live WooCommerce, Printful, Stripe, PayPal or production APIs.

Where real Lock City business information is unavailable, write:

[INFORMATION PENDING]

Where development data is needed, use clearly identified MOCK DATA.

The result should feel authored, deliberate and culturally relevant.

The objective is not merely to build a modern website.

The objective is to build a digital place that people remember as LOCK CITY.
