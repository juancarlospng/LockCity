# Lock City V2 return bridge

This plugin is source code for the planned PayPal return flow. It has not been
installed on production by this change.

Before activation, define these server-side constants in WordPress without
committing their values:

- `LOCK_CITY_V2_URL` (`https://lock-city.vercel.app` in production)
- `LOCK_CITY_V2_BRIDGE_SECRET` (a random value of at least 32 characters,
  shared only with V2 as `CHECKOUT_BRIDGE_SECRET`)

The plugin leaves PayPal's success callback on WooCommerce. Once the PayPal
plugin has processed that callback, the bridge validates either the callback's
return URL or WooCommerce's final `order-received` endpoint. It then creates a
five-minute one-time result and posts it to `/order-confirmation`. V2 redeems the
code server-to-server and signs a short-lived HttpOnly result cookie. Order IDs,
keys, customer data, and credentials are not put in a return URL.

Cancellation goes through a fixed WooCommerce endpoint and returns to
`/checkout?payment=cancelled`; it never creates a paid confirmation.
