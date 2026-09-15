# Lock City V2 production checkout handoff

The executable PHP in `lock-city-v2-return-bridge.zip` is the same version that
completed the staging PayPal Sandbox return flow.

Production installation remains a separate, controlled change:

1. Keep `PAYPAL_CHECKOUT_EXECUTION_ENABLED=false` in Vercel.
2. Rotate `CHECKOUT_BRIDGE_SECRET` in Vercel and set the identical value as
   `LOCK_CITY_V2_BRIDGE_SECRET` in production WordPress during the same change.
3. Set `LOCK_CITY_V2_URL` to `https://lock-city.vercel.app` in production
   WordPress.
4. Upload and activate `lock-city-v2-return-bridge.zip` on production.
5. Verify the plugin is active and its REST endpoint rejects unauthenticated
   requests. Do not place an order during this verification.
6. Keep checkout execution disabled until the controlled live purchase is
   explicitly authorized.

No secret values belong in this repository, WordPress pages, browser storage,
URLs, or logs.
