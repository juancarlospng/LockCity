# API integration boundary

Current implementation: read-only `CommerceAdapter.getLatestDrop()` -> `MockCommerceAdapter` -> typed `DropPlaceholder`. This returns only demo copy and explicit pending fields, with no records purporting to be actual merchandise. Reserved product state union: AVAILABLE / PRE_ORDER / COMING_SOON / SOLD_OUT.

Future `LockCityApiAdapter` must normalize LOCK CITY ADMIN API responses on a server boundary. UI should consume normalized domain data; provider-specific payloads stay in the adapter. WooCommerce, Printful, Stripe, PayPal, email and affiliates belong behind the Admin API. Add server-only credential handling, validation, timeouts and non-sensitive error mapping when the approved contract exists. Do not create direct browser-provider clients.

API origin, authentication, response schemas, money/currency representation, tax/shipping, availability rules, preorder behavior, stock, pricing, checkout, fulfillment, returns, legal policy and customer data processing: [INFORMATION PENDING]. No `.env` file is needed or supplied. No production adapter or fake write methods are implemented.
