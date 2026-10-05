<?php
/**
 * Plugin Name: Lock City AW26 Pre-order
 * Description: Applies the approved AW26 pre-order prices and persists trusted order metadata for Store API checkout.
 * Version: 0.4.0
 * Requires PHP: 7.4
 * Requires Plugins: woocommerce
 */

use Automattic\WooCommerce\StoreApi\Schemas\V1\CheckoutSchema;
use Automattic\WooCommerce\StoreApi\Exceptions\RouteException;

defined( 'ABSPATH' ) || exit;

const LC_AW26_PREORDER_START = '2026-10-10T00:00:00Z';
const LC_AW26_PREORDER_END   = '2026-10-22T23:59:59Z';

/**
 * Render reCAPTCHA on the WooCommerce origin and pass only the short-lived
 * proof to the configured V2 origin. Secret keys never leave WordPress.
 */
function lc_aw26_render_recaptcha_bridge(): void {
	if ( ! isset( $_GET['lock_city_recaptcha'] ) || '1' !== sanitize_text_field( wp_unslash( $_GET['lock_city_recaptcha'] ) ) ) {
		return;
	}
	$origin = defined( 'LOCK_CITY_V2_ORIGIN' ) ? (string) LOCK_CITY_V2_ORIGIN : 'https://lock-city.vercel.app';
	$parts  = wp_parse_url( $origin );
	if ( ! is_array( $parts ) || 'https' !== ( $parts['scheme'] ?? '' ) || empty( $parts['host'] ) ) {
		status_header( 503 );
		exit;
	}
	$origin   = 'https://' . $parts['host'] . ( isset( $parts['port'] ) ? ':' . absint( $parts['port'] ) : '' );
	$settings = get_option( 'woocommerce_ppcp-recaptcha_settings', array() );
	$version  = isset( $_GET['version'] ) && 'v2' === sanitize_text_field( wp_unslash( $_GET['version'] ) ) ? 'v2' : 'v3';
	$site_key = is_array( $settings ) ? (string) ( $settings[ 'site_key_' . $version ] ?? '' ) : '';
	$theme    = is_array( $settings ) && 'dark' === ( $settings['v2_theme'] ?? '' ) ? 'dark' : 'light';
	nocache_headers();
	header( 'Content-Type: text/html; charset=utf-8' );
	header( "Content-Security-Policy: default-src 'none'; script-src 'unsafe-inline' https://www.google.com https://www.gstatic.com; frame-src https://www.google.com; connect-src https://www.google.com; style-src 'unsafe-inline'; frame-ancestors " . $origin );
	$key_json     = wp_json_encode( $site_key );
	$origin_json  = wp_json_encode( $origin );
	$version_json = wp_json_encode( $version );
	if ( '' === $site_key ) {
		echo '<!doctype html><meta charset="utf-8"><script>parent.postMessage({type:"lock-city-recaptcha-error"},' . $origin_json . ');</script>';
		exit;
	}
	if ( 'v2' === $version ) {
		$theme_json = wp_json_encode( $theme );
		echo '<!doctype html><meta charset="utf-8"><div id="captcha"></div><script>function lcReady(){grecaptcha.render("captcha",{sitekey:' . $key_json . ',theme:' . $theme_json . ',callback:function(token){parent.postMessage({type:"lock-city-recaptcha",token:token,version:' . $version_json . '},' . $origin_json . ');}});}</script><script src="https://www.google.com/recaptcha/api.js?onload=lcReady&render=explicit" async defer></script>';
		exit;
	}
	echo '<!doctype html><meta charset="utf-8"><script src="https://www.google.com/recaptcha/api.js?render=' . esc_attr( rawurlencode( $site_key ) ) . '"></script><script>grecaptcha.ready(function(){grecaptcha.execute(' . $key_json . ',{action:"checkout"}).then(function(token){parent.postMessage({type:"lock-city-recaptcha",token:token,version:' . $version_json . '},' . $origin_json . ');}).catch(function(){parent.postMessage({type:"lock-city-recaptcha-error"},' . $origin_json . ');});});</script>';
	exit;
}
add_action( 'template_redirect', 'lc_aw26_render_recaptcha_bridge', 0 );

/** Server-owned prices. Browser values are never accepted as prices. */
function lc_aw26_preorder_prices(): array {
	return array(
		3823 => '69.00',
		3854 => '75.00',
		3915 => '32.00',
		3932 => '52.00',
		3941 => '50.00',
		3950 => '43.00',
		3973 => '38.00',
		3979 => '46.00',
		3996 => '57.00',
		4005 => '75.00',
		4022 => '43.00',
		4040 => '38.00',
		4048 => '46.00',
		4067 => '79.00',
		4084 => '57.00',
		4093 => '38.00',
		4143 => '64.00',
	);
}

function lc_aw26_excluded_product_ids(): array {
	return array( 3923, 4102 );
}

function lc_aw26_preorder_sales_enabled(): bool {
	return defined( 'AW26_PREORDER_SALES_ENABLED' ) && true === AW26_PREORDER_SALES_ENABLED;
}

/**
 * Expose only the effective runtime switch to authenticated operators.
 * WooCommerce REST authentication handles Consumer Key/Secret server-side;
 * no configuration values, paths or credentials are returned.
 */
function lc_aw26_register_observability_routes(): void {
	register_rest_route(
		'lock-city/v1',
		'/preorder/status',
		array(
			'methods'             => WP_REST_Server::READABLE,
			'permission_callback' => static function (): bool {
				return current_user_can( 'manage_woocommerce' );
			},
			'callback'            => static function (): WP_REST_Response {
				return new WP_REST_Response(
					array(
						'aw26_preorder_sales_enabled' => lc_aw26_preorder_sales_enabled(),
						'source'                       => 'wordpress_runtime',
						'environment'                  => wp_get_environment_type(),
						'checked_at'                   => gmdate( 'c' ),
					),
					200
				);
			},
		)
	);
}
add_action( 'rest_api_init', 'lc_aw26_register_observability_routes' );

function lc_aw26_preorder_test_mode(): bool {
	return defined( 'AW26_PREORDER_TEST_MODE' ) && true === AW26_PREORDER_TEST_MODE;
}

function lc_aw26_preorder_test_product_id(): int {
	return defined( 'AW26_PREORDER_TEST_PRODUCT_ID' ) ? absint( AW26_PREORDER_TEST_PRODUCT_ID ) : 0;
}

function lc_aw26_preorder_window_open( ?int $timestamp = null ): bool {
	$now = null === $timestamp ? time() : $timestamp;
	return $now >= strtotime( LC_AW26_PREORDER_START ) && $now <= strtotime( LC_AW26_PREORDER_END );
}

function lc_aw26_preorder_open_for_product( int $product_id ): bool {
	if ( ! lc_aw26_preorder_sales_enabled() ) {
		return false;
	}
	if ( lc_aw26_preorder_test_mode() ) {
		return $product_id > 0 && $product_id === lc_aw26_preorder_test_product_id();
	}
	return lc_aw26_preorder_window_open();
}

function lc_aw26_parent_product_id( $product ): int {
	if ( ! $product instanceof WC_Product ) {
		return 0;
	}
	return $product->is_type( 'variation' ) ? $product->get_parent_id() : $product->get_id();
}

function lc_aw26_preorder_price( int $product_id ): ?string {
	$prices = lc_aw26_preorder_prices();
	return isset( $prices[ $product_id ] ) ? $prices[ $product_id ] : null;
}

function lc_aw26_cart_kinds( WC_Cart $cart ): array {
	$has_preorder = false;
	$has_standard = false;
	$has_excluded = false;
	foreach ( $cart->get_cart() as $cart_item ) {
		$product    = isset( $cart_item['data'] ) ? $cart_item['data'] : null;
		$product_id = lc_aw26_parent_product_id( $product );
		if ( in_array( $product_id, lc_aw26_excluded_product_ids(), true ) ) {
			$has_excluded = true;
		} elseif ( null !== lc_aw26_preorder_price( $product_id ) ) {
			$has_preorder = true;
		} else {
			$has_standard = true;
		}
	}
	return compact( 'has_preorder', 'has_standard', 'has_excluded' );
}

function lc_aw26_add_to_cart_allowed( bool $passed, int $product_id, int $quantity, int $variation_id = 0 ): bool {
	unset( $quantity );
	$resolved_id = $variation_id > 0 ? wp_get_post_parent_id( $variation_id ) : $product_id;
	if ( in_array( $resolved_id, lc_aw26_excluded_product_ids(), true ) ) {
		wc_add_notice( 'This AW26 product is not available for pre-order.', 'error' );
		return false;
	}
	$is_preorder = null !== lc_aw26_preorder_price( $resolved_id );
	if ( $is_preorder && ! lc_aw26_preorder_open_for_product( $resolved_id ) ) {
		wc_add_notice( 'AW26 pre-order is not open.', 'error' );
		return false;
	}
	if ( WC()->cart instanceof WC_Cart && ! WC()->cart->is_empty() ) {
		$kinds = lc_aw26_cart_kinds( WC()->cart );
		if ( ( $is_preorder && $kinds['has_standard'] ) || ( ! $is_preorder && $kinds['has_preorder'] ) ) {
			wc_add_notice( 'Pre-order and in-stock items must be placed in separate orders.', 'error' );
			return false;
		}
	}
	return $passed;
}
add_filter( 'woocommerce_add_to_cart_validation', 'lc_aw26_add_to_cart_allowed', PHP_INT_MAX, 4 );

/** Apply the trusted unit price before WooCommerce calculates cart totals. */
add_action(
	'woocommerce_before_calculate_totals',
	static function ( WC_Cart $cart ): void {
		foreach ( $cart->get_cart() as $cart_item ) {
			$product = isset( $cart_item['data'] ) ? $cart_item['data'] : null;
			$product_id = lc_aw26_parent_product_id( $product );
			$price   = lc_aw26_preorder_price( $product_id );
			if ( null !== $price && lc_aw26_preorder_open_for_product( $product_id ) && $product instanceof WC_Product ) {
				$product->set_price( $price );
			}
		}
	},
	PHP_INT_MAX
);

/** Block coupons at the WooCommerce layer whenever a pre-order is present. */
add_filter(
	'woocommerce_coupon_is_valid',
	static function ( bool $valid ): bool {
		if ( WC()->cart instanceof WC_Cart && lc_aw26_cart_kinds( WC()->cart )['has_preorder'] ) {
			return false;
		}
		return $valid;
	},
	PHP_INT_MAX
);

/** Validate before Store API creates the checkout order. */
add_action(
	'woocommerce_store_api_cart_errors',
	static function ( WP_Error $errors, WC_Cart $cart ): void {
		$kinds = lc_aw26_cart_kinds( $cart );
		if ( $kinds['has_excluded'] ) {
			$errors->add( 'lock_city_preorder_excluded', 'This AW26 product is not available for pre-order.' );
		}
		if ( ! $kinds['has_preorder'] ) {
			return;
		}
		if ( $kinds['has_standard'] ) {
			$errors->add( 'lock_city_preorder_mixed_cart', 'Pre-order and in-stock items must be placed in separate orders.' );
		}
		if ( count( $cart->get_applied_coupons() ) > 0 ) {
			$errors->add( 'lock_city_preorder_coupon', 'Promotional codes do not apply to pre-order items.' );
		}
		foreach ( $cart->get_cart() as $cart_item ) {
			$product     = isset( $cart_item['data'] ) ? $cart_item['data'] : null;
			$product_id  = lc_aw26_parent_product_id( $product );
			$price       = lc_aw26_preorder_price( $product_id );
			$quantity    = isset( $cart_item['quantity'] ) ? (float) $cart_item['quantity'] : 0.0;
			$expected    = null === $price ? null : (float) $price * $quantity;
			$actual_unit = $product instanceof WC_Product ? (float) $product->get_price( 'edit' ) : -1.0;
			if ( null === $price ) {
				continue;
			}
			if ( ! lc_aw26_preorder_open_for_product( $product_id ) ) {
				$errors->add( 'lock_city_preorder_closed', 'AW26 pre-order is not open for this product.' );
				continue;
			}
			if ( abs( $actual_unit - (float) $price ) > 0.001 ) {
				$errors->add( 'lock_city_preorder_price', 'The pre-order price could not be verified.' );
			}
			if ( isset( $cart_item['line_subtotal'], $cart_item['line_total'] )
				&& ( abs( (float) $cart_item['line_subtotal'] - $expected ) > 0.001
					|| abs( (float) $cart_item['line_total'] - $expected ) > 0.001 ) ) {
				$errors->add( 'lock_city_preorder_discount', 'Discounts do not apply to pre-order items.' );
			}
		}
	},
	PHP_INT_MAX,
	2
);

function lc_aw26_clean_extension_text( $value, int $limit ): string {
	$value = is_string( $value ) ? sanitize_text_field( $value ) : '';
	return strlen( $value ) <= $limit ? $value : '';
}

/** Register the only browser-supplied fields: attribution, never pricing. */
add_action(
	'woocommerce_blocks_loaded',
	static function (): void {
		if ( ! function_exists( 'woocommerce_store_api_register_endpoint_data' ) || ! class_exists( CheckoutSchema::class ) ) {
			return;
		}
		woocommerce_store_api_register_endpoint_data(
			array(
				'endpoint'        => CheckoutSchema::IDENTIFIER,
				'namespace'       => 'lock-city-preorder',
				'data_callback'   => static function (): array {
					return array();
				},
				'schema_callback' => static function (): array {
					return array(
						'affiliate_id'    => array( 'type' => 'string', 'maxLength' => 100 ),
						'affiliate_code'  => array( 'type' => 'string', 'maxLength' => 100 ),
						'referral_source' => array( 'type' => 'string', 'maxLength' => 500 ),
						'attributed_at'   => array( 'type' => 'string', 'format' => 'date-time' ),
					);
				},
				'schema_type'     => ARRAY_A,
			)
		);
	}
);

/** Persist server-derived campaign data and sanitized attribution on the real order. */
add_action(
	'woocommerce_store_api_checkout_update_order_from_request',
	static function ( WC_Order $order, WP_REST_Request $request ): void {
		$prices       = array();
		$product_ids  = array();
		$has_standard = false;
		foreach ( $order->get_items( 'line_item' ) as $item ) {
			$product_id = $item->get_product_id();
			if ( in_array( $product_id, lc_aw26_excluded_product_ids(), true ) ) {
				throw new RouteException( 'lock_city_preorder_excluded', 'This AW26 product is not available for pre-order.', 409 );
			}
			$price = lc_aw26_preorder_price( $product_id );
			if ( null === $price ) {
				$has_standard = true;
				continue;
			}
			$quantity = (float) $item->get_quantity();
			$expected = (float) $price * $quantity;
			if ( abs( (float) $item->get_subtotal() - $expected ) > 0.001
				|| abs( (float) $item->get_total() - $expected ) > 0.001 ) {
				throw new RouteException( 'lock_city_preorder_price', 'The pre-order price could not be verified.', 409 );
			}
			$prices[] = $price;
			$product_ids[] = $product_id;
			$item->add_meta_data( 'lock_city_preorder_price', $price, true );
			$item->save();
		}
		if ( empty( $prices ) ) {
			return;
		}
		if ( $has_standard || count( array_filter( $product_ids, 'lc_aw26_preorder_open_for_product' ) ) !== count( $product_ids )
			|| count( $order->get_coupon_codes() ) > 0 ) {
			throw new RouteException( 'lock_city_preorder_invalid', 'The pre-order checkout could not be validated.', 409 );
		}
		$order->update_meta_data( 'lock_city_order_type', 'PRE_ORDER' );
		$order->update_meta_data( 'lock_city_campaign', 'AW26' );
		$order->update_meta_data( 'lock_city_preorder_start', LC_AW26_PREORDER_START );
		$order->update_meta_data( 'lock_city_preorder_end', LC_AW26_PREORDER_END );
		if ( 1 === count( array_unique( $prices ) ) ) {
			$order->update_meta_data( 'lock_city_preorder_price', reset( $prices ) );
		}
		$order->update_meta_data( 'lock_city_fulfillment_hold', true );
		$order->update_meta_data( 'lock_city_allow_cancellation', false );

		$extensions  = $request->get_param( 'extensions' );
		$attribution = is_array( $extensions ) && isset( $extensions['lock-city-preorder'] )
			&& is_array( $extensions['lock-city-preorder'] ) ? $extensions['lock-city-preorder'] : array();
		$fields      = array(
			'affiliate_id'    => array( 'limit' => 100, 'meta' => 'lock_city_affiliate_id' ),
			'affiliate_code'  => array( 'limit' => 100, 'meta' => 'lock_city_affiliate_code' ),
			'referral_source' => array( 'limit' => 500, 'meta' => 'lock_city_referral_source' ),
			'attributed_at'   => array( 'limit' => 40, 'meta' => 'lock_city_attributed_at' ),
		);
		foreach ( $fields as $field => $definition ) {
			$value = lc_aw26_clean_extension_text( $attribution[ $field ] ?? '', $definition['limit'] );
			if ( 'attributed_at' === $field && '' !== $value && false === strtotime( $value ) ) {
				$value = '';
			}
			if ( '' !== $value ) {
				$order->update_meta_data( $definition['meta'], $value );
			}
		}
	},
	PHP_INT_MAX,
	2
);
