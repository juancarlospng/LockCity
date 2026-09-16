# Lock City V2 production checkout handoff

Version 0.2.0 of `lock-city-v2-return-bridge.zip` keeps the validated return
flow and adds a protected WordPress admin screen for the bridge secret. The
saved value is server-side, not autoloaded, and is never displayed again.

Production configuration:

1. Keep `PAYPAL_CHECKOUT_EXECUTION_ENABLED=false` in Vercel.
2. Rotate `CHECKOUT_BRIDGE_SECRET` in Vercel and save the identical value under
   **Settings > Lock City V2 Bridge** in production WordPress during the same
   change. Do not place it in `wp-config.php`.
3. The production destination defaults to `https://lock-city.vercel.app`.
   `LOCK_CITY_V2_URL` remains an optional server-side override.
4. Upload, activate, and verify `lock-city-v2-return-bridge.zip` on production.
5. Confirm the settings page reports **Bridge secret is configured** and the
   plugin REST endpoint rejects unauthenticated
   requests. Do not place an order during this verification.
6. Keep checkout execution disabled until the controlled live purchase is
   explicitly authorized.

No secret values belong in this repository, WordPress pages, browser storage,
URLs, or logs.
