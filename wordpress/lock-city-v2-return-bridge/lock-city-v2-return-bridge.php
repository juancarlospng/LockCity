<?php
/**
 * Plugin Name: Lock City V2 Return Bridge
 * Description: Validates WooCommerce PayPal returns before handing a one-time result to Lock City V2.
 * Version: 0.2.1
 * Requires PHP: 7.4
 * Requires Plugins: woocommerce, woocommerce-paypal-payments
 */

defined( 'ABSPATH' ) || exit;

function lc_v2_frontend_url(): string {
	$url = defined( 'LOCK_CITY_V2_URL' ) ? (string) LOCK_CITY_V2_URL : 'https://lock-city.vercel.app';
	return untrailingslashit( esc_url_raw( $url ) );
}

function lc_v2_bridge_secret(): string {
	if ( defined( 'LOCK_CITY_V2_BRIDGE_SECRET' ) ) {
		return (string) LOCK_CITY_V2_BRIDGE_SECRET;
	}
	return (string) get_option( 'lc_v2_bridge_secret', '' );
}

function lc_v2_store_bridge_secret( string $secret ): bool {
	if ( strlen( $secret ) < 32 ) {
		return false;
	}
	if ( false === get_option( 'lc_v2_bridge_secret', false ) ) {
		return add_option( 'lc_v2_bridge_secret', $secret, '', false );
	}
	return update_option( 'lc_v2_bridge_secret', $secret, false );
}

add_action(
	'admin_menu',
	static function (): void {
		add_options_page(
			'Lock City V2 Bridge',
			'Lock City V2 Bridge',
			'manage_options',
			'lock-city-v2-bridge',
			'lc_v2_bridge_settings_page'
		);
	}
);

function lc_v2_bridge_settings_page(): void {
	if ( ! current_user_can( 'manage_options' ) ) {
		return;
	}
	$configured = strlen( lc_v2_bridge_secret() ) >= 32;
	?>
	<div class="wrap">
		<h1><?php esc_html_e( 'Lock City V2 Return Bridge', 'lock-city-v2' ); ?></h1>
		<?php if ( isset( $_GET['updated'] ) ) : // phpcs:ignore WordPress.Security.NonceVerification.Recommended ?>
			<div class="notice notice-success is-dismissible"><p><?php esc_html_e( 'Bridge settings saved.', 'lock-city-v2' ); ?></p></div>
		<?php endif; ?>
		<p><?php echo esc_html( $configured ? 'Bridge secret is configured.' : 'Bridge secret is not configured.' ); ?></p>
		<form method="post" action="<?php echo esc_url( admin_url( 'admin-post.php' ) ); ?>">
			<input type="hidden" name="action" value="lc_v2_save_bridge_settings">
			<?php wp_nonce_field( 'lc_v2_save_bridge_settings' ); ?>
			<table class="form-table" role="presentation"><tbody><tr>
				<th scope="row"><label for="lc-v2-bridge-secret"><?php esc_html_e( 'Bridge secret', 'lock-city-v2' ); ?></label></th>
				<td><input id="lc-v2-bridge-secret" name="bridge_secret" type="password" class="regular-text" autocomplete="new-password" minlength="32" required>
				<p class="description"><?php esc_html_e( 'Enter the server-side secret. The saved value is never displayed.', 'lock-city-v2' ); ?></p></td>
			</tr></tbody></table>
			<?php submit_button( 'Save bridge secret' ); ?>
		</form>
	</div>
	<?php
}

add_action(
	'admin_post_lc_v2_save_bridge_settings',
	static function (): void {
		if ( ! current_user_can( 'manage_options' ) ) {
			wp_die( esc_html__( 'Unauthorized.', 'lock-city-v2' ), '', array( 'response' => 403 ) );
		}
		check_admin_referer( 'lc_v2_save_bridge_settings' );
		$secret = isset( $_POST['bridge_secret'] ) ? sanitize_text_field( wp_unslash( $_POST['bridge_secret'] ) ) : '';
		if ( strlen( $secret ) < 32 ) {
			wp_die( esc_html__( 'The bridge secret must contain at least 32 characters.', 'lock-city-v2' ), '', array( 'response' => 400 ) );
		}
		lc_v2_store_bridge_secret( $secret );
		wp_safe_redirect( add_query_arg( 'updated', '1', admin_url( 'options-general.php?page=lock-city-v2-bridge' ) ) );
		exit;
	}
);

function lc_v2_code(): string {
	return rtrim( strtr( base64_encode( random_bytes( 32 ) ), '+/', '-_' ), '=' );
}

function lc_v2_transient_key( string $code ): string {
	return 'lc_v2_checkout_' . hash( 'sha256', $code );
}

function lc_v2_queue_order_result( WC_Order $order ): ?string {
	try {
		$code = lc_v2_code();
	} catch ( Throwable $error ) {
		return null;
	}
	set_transient(
		lc_v2_transient_key( $code ),
		array(
			'order_id'  => $order->get_id(),
			'order_key' => $order->get_order_key(),
		),
		5 * MINUTE_IN_SECONDS
	);
	wc_setcookie( 'lc_v2_bridge', $code, time() + ( 5 * MINUTE_IN_SECONDS ), true, true );
	return $code;
}

function lc_v2_verified_order_result( $record ): ?array {
	if ( ! is_array( $record ) || empty( $record['order_id'] ) || empty( $record['order_key'] ) ) {
		return null;
	}
	$order = wc_get_order( absint( $record['order_id'] ) );
	if ( ! $order instanceof WC_Order
		|| 'ppcp-gateway' !== $order->get_payment_method()
		|| ! hash_equals( $order->get_order_key(), (string) $record['order_key'] ) ) {
		return null;
	}
	return array(
		'verified'     => true,
		'status'       => $order->is_paid() ? 'paid' : ( $order->has_status( array( 'pending', 'on-hold' ) ) ? 'pending' : 'failed' ),
		'order_number' => (string) $order->get_order_number(),
	);
}

/** Keep the PayPal success callback on WooCommerce; only cancellation changes. */
add_filter(
	'ppcp_create_order_request_body_data',
	static function ( array $data, string $payment_method ): array {
		if ( 'ppcp-gateway' !== $payment_method || empty( $data['payment_source']['paypal'] ) ) {
			return $data;
		}
		$cancel_url = home_url( '/?wc-api=lock_city_v2_cancel' );
		$paypal     = $data['payment_source']['paypal'];
		if ( is_object( $paypal ) && isset( $paypal->experience_context ) ) {
			if ( is_object( $paypal->experience_context ) ) {
				$paypal->experience_context->cancel_url = $cancel_url;
			} elseif ( is_array( $paypal->experience_context ) ) {
				$paypal->experience_context['cancel_url'] = $cancel_url;
			}
			$data['payment_source']['paypal'] = $paypal;
		} elseif ( is_array( $paypal ) && isset( $paypal['experience_context'] ) ) {
			if ( is_object( $paypal['experience_context'] ) ) {
				$paypal['experience_context']->cancel_url = $cancel_url;
			} elseif ( is_array( $paypal['experience_context'] ) ) {
				$paypal['experience_context']['cancel_url'] = $cancel_url;
			}
			$data['payment_source']['paypal'] = $paypal;
		}
		return $data;
	},
	20,
	2
);

/** Called by WooCommerce PayPal Payments only after its own return handler. */
add_filter(
	'woocommerce_get_return_url',
	static function ( string $return_url, $order ): string {
		$endpoint = isset( $_GET['wc-ajax'] ) ? sanitize_key( wp_unslash( $_GET['wc-ajax'] ) ) : ''; // phpcs:ignore WordPress.Security.NonceVerification.Recommended
		if ( 'ppc-return-url' !== $endpoint || ! $order instanceof WC_Order || 'ppcp-gateway' !== $order->get_payment_method() ) {
			return $return_url;
		}
		if ( null === lc_v2_queue_order_result( $order ) ) {
			return $return_url;
		}
		return home_url( '/?wc-api=lock_city_v2_complete' );
	},
	100,
	2
);

/**
 * PayPal Payments 4.1.x can send the browser directly to the order-received
 * endpoint after it has processed the callback. Validate that endpoint before
 * handing the result to V2. The order key never leaves WordPress.
 */
add_action(
	'template_redirect',
	static function (): void {
		if ( ! function_exists( 'is_wc_endpoint_url' ) || ! is_wc_endpoint_url( 'order-received' ) ) {
			return;
		}
		$order_id = absint( get_query_var( 'order-received' ) );
		$order_key = isset( $_GET['key'] ) ? wc_clean( wp_unslash( $_GET['key'] ) ) : ''; // phpcs:ignore WordPress.Security.NonceVerification.Recommended
		$order = $order_id > 0 ? wc_get_order( $order_id ) : false;
		if ( ! $order instanceof WC_Order
			|| 'ppcp-gateway' !== $order->get_payment_method()
			|| '' === $order_key
			|| ! hash_equals( $order->get_order_key(), $order_key ) ) {
			return;
		}
		if ( null === lc_v2_queue_order_result( $order ) ) {
			return;
		}
		wp_safe_redirect( home_url( '/?wc-api=lock_city_v2_complete' ), 303, 'Lock City V2' );
		exit;
	},
	20
);

add_action(
	'woocommerce_api_lock_city_v2_complete',
	static function (): void {
		$code = isset( $_COOKIE['lc_v2_bridge'] ) ? sanitize_text_field( wp_unslash( $_COOKIE['lc_v2_bridge'] ) ) : '';
		$record = preg_match( '/^[A-Za-z0-9_-]{43}$/', $code ) ? get_transient( lc_v2_transient_key( $code ) ) : false;
		if ( null === lc_v2_verified_order_result( $record ) ) {
			wp_die( esc_html__( 'The checkout result could not be verified.', 'lock-city-v2' ), '', array( 'response' => 400 ) );
		}
		wc_setcookie( 'lc_v2_bridge', '', time() - HOUR_IN_SECONDS, true, true );
		$action    = esc_url( lc_v2_frontend_url() . '/order-confirmation' );
		$csp_nonce = lc_v2_code();
		nocache_headers();
		header( "Content-Security-Policy: default-src 'none'; script-src 'nonce-" . $csp_nonce . "'; form-action " . esc_url_raw( lc_v2_frontend_url() ) . "; base-uri 'none'; frame-ancestors 'none'" );
		header( 'Referrer-Policy: no-referrer' );
		?>
		<!doctype html><html lang="en"><head><meta charset="utf-8"><title>Returning to Lock City</title></head>
		<body><form id="lc-v2-return" method="post" action="<?php echo $action; ?>">
		<input type="hidden" name="bridge_code" value="<?php echo esc_attr( $code ); ?>"></form>
		<script nonce="<?php echo esc_attr( $csp_nonce ); ?>">document.getElementById('lc-v2-return').submit();</script>
		<noscript><button type="submit" form="lc-v2-return">Continue to Lock City</button></noscript></body></html>
		<?php
		exit;
	}
);

add_action(
	'woocommerce_api_lock_city_v2_cancel',
	static function (): void {
		wp_redirect( lc_v2_frontend_url() . '/checkout?payment=cancelled', 303, 'Lock City V2' ); // phpcs:ignore WordPress.Security.SafeRedirect.wp_redirect_wp_redirect
		exit;
	}
);

add_action(
	'rest_api_init',
	static function (): void {
		register_rest_route(
			'lock-city/v1',
			'/checkout-result',
			array(
				'methods'             => WP_REST_Server::CREATABLE,
				'permission_callback' => static function ( WP_REST_Request $request ) {
					$secret = lc_v2_bridge_secret();
					$header = $request->get_header( 'authorization' );
					$token  = 0 === stripos( $header, 'Bearer ' ) ? substr( $header, 7 ) : '';
					return strlen( $secret ) >= 32 && hash_equals( $secret, $token )
						? true
						: new WP_Error( 'lock_city_unauthorized', 'Unauthorized.', array( 'status' => 401 ) );
				},
				'callback'            => static function ( WP_REST_Request $request ) {
					$code = sanitize_text_field( (string) $request->get_param( 'code' ) );
					if ( ! preg_match( '/^[A-Za-z0-9_-]{43}$/', $code ) ) {
						return new WP_Error( 'lock_city_invalid_code', 'Invalid result.', array( 'status' => 400 ) );
					}
					$key    = lc_v2_transient_key( $code );
					$record = get_transient( $key );
					delete_transient( $key );
					$result = lc_v2_verified_order_result( $record );
					if ( null === $result ) {
						return new WP_Error( 'lock_city_mismatch', 'Result mismatch.', array( 'status' => 409 ) );
					}
					return rest_ensure_response( $result );
				},
			)
		);
	}
);
