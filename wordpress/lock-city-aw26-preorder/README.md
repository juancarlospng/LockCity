# Lock City AW26 Pre-order

Server-side WooCommerce enforcement for the AW26 pre-order flow. It keeps all
prices in a fixed product allowlist, applies them during cart total calculation,
rejects mixed carts, discounts and excluded products, and writes trusted order
metadata during Store API checkout.

The plugin defaults to closed. Opening the controlled sales window requires this
server-side constant in WordPress configuration:

```php
define( 'AW26_PREORDER_SALES_ENABLED', true );
```

The one-order controlled test outside the public sales window additionally
requires both constants below. Remove or set them to `false` immediately after
the test:

```php
define( 'AW26_PREORDER_TEST_MODE', true );
define( 'AW26_PREORDER_TEST_PRODUCT_ID', 3915 );
```

Do not enable it until the authorized product is `publish + hidden`, V2 has the
matching server-side flag enabled, and the payment execution flag is enabled for
the controlled test environment. Printful remains configured for manual order
confirmation; this plugin does not call or modify Printful.

Version 0.4.0 also provides the headless reCAPTCHA bridge used by V2. Google
runs on the WooCommerce origin, only a short-lived proof is sent to V2, and the
v2/v3 secret keys remain inside WordPress. Override the allowed parent only when
the production V2 origin changes:

```php
define( 'LOCK_CITY_V2_ORIGIN', 'https://lock-city.vercel.app' );
```

For authenticated, read-only operational checks, version 0.4.0 exposes
`GET /wp-json/lock-city/v1/preorder/status`. It returns only the effective
pre-order switch, WordPress environment type and check time. The route requires
the WooCommerce management capability and never returns configuration contents,
paths or credentials.
