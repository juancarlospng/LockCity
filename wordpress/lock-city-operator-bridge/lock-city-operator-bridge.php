<?php
/**
 * Plugin Name: Lock City Operator Bridge
 * Description: Narrow, idempotent Woo-side commands for the Lock City Operator API.
 * Version: 0.1.0
 *
 * @package LockCity
 */

defined( 'ABSPATH' ) || exit;

/**
 * Exposes a deliberately narrow WooCommerce bridge for the Operator API.
 */
final class Lock_City_Operator_Bridge {
	private const ORDER_META        = '_lock_city_operator_operation_id';
	private const EMAIL_META_PREFIX = '_lock_city_operator_email_';
	private const EMAILS            = array(
		'customer_invoice',
		'customer_on_hold_order',
		'customer_processing_order',
	);

	/**
	 * Registers the Operator REST routes.
	 *
	 * @return void
	 */
	public static function register(): void {
		register_rest_route(
			'wc/v3',
			'/lock-city/operator/orders',
			array(
				'methods'             => 'POST',
				'callback'            => array( __CLASS__, 'create_order' ),
				'permission_callback' => array( __CLASS__, 'authorized' ),
			)
		);
		register_rest_route(
			'wc/v3',
			'/lock-city/operator/email-templates',
			array(
				'methods'             => 'GET',
				'callback'            => array( __CLASS__, 'email_templates' ),
				'permission_callback' => array( __CLASS__, 'authorized' ),
			)
		);
		register_rest_route(
			'wc/v3',
			'/lock-city/operator/orders/(?P<id>[1-9][0-9]*)/email',
			array(
				'methods'             => 'POST',
				'callback'            => array( __CLASS__, 'send_email' ),
				'permission_callback' => array( __CLASS__, 'authorized' ),
			)
		);
	}

	/**
	 * Confirms that the authenticated caller may manage WooCommerce.
	 *
	 * @return bool
	 */
	public static function authorized(): bool {
		return current_user_can( 'manage_woocommerce' );
	}

	/**
	 * Creates a sanitized REST error.
	 *
	 * @param string $code   Stable public error code.
	 * @param int    $status HTTP status.
	 * @return WP_Error
	 */
	private static function error( string $code, int $status ): WP_Error {
		return new WP_Error( $code, $code, array( 'status' => $status ) );
	}

	/**
	 * Validates and normalizes an operation UUID.
	 *
	 * @param mixed $value Candidate operation identifier.
	 * @return string|null
	 */
	private static function operation_id( $value ): ?string {
		$value = is_string( $value ) ? strtolower( trim( $value ) ) : '';
		return preg_match( '/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/', $value )
			? $value : null;
	}

	/**
	 * Canonicalizes nested associative arrays before fingerprinting.
	 *
	 * @param mixed $value Value to canonicalize in place.
	 * @return void
	 */
	private static function canonicalize( &$value ): void {
		if ( ! is_array( $value ) ) {
			return;
		}
		foreach ( $value as &$item ) {
			self::canonicalize( $item );
		}
		unset( $item );
		if ( array_keys( $value ) !== range( 0, count( $value ) - 1 ) ) {
			ksort( $value, SORT_STRING );
		}
	}

	/**
	 * Add_option is a single INSERT against WordPress' unique option_name index.
	 * A crash can leave an uncertain reservation, but can never reserve twice.
	 *
	 * @param string $action       Operation action.
	 * @param string $operation_id Unique operation identifier.
	 * @param array  $payload      Canonical request payload.
	 * @return array|WP_Error
	 */
	private static function reserve_operation( string $action, string $operation_id, array $payload ) {
		self::canonicalize( $payload );
		$fingerprint = hash( 'sha256', wp_json_encode( $payload ) );
		$option_key  = '_lock_city_operator_' . hash( 'sha256', $operation_id );
		$record      = array(
			'operation_id' => $operation_id,
			'fingerprint'  => $fingerprint,
			'action'       => $action,
			'state'        => 'writing',
			'entity_id'    => 0,
		);
		if ( add_option( $option_key, $record, '', false ) ) {
			return array(
				'new'    => true,
				'key'    => $option_key,
				'record' => $record,
			);
		}
		$existing = get_option( $option_key, null );
		if ( ! is_array( $existing )
			|| ! isset( $existing['operation_id'], $existing['fingerprint'], $existing['action'], $existing['state'] )
			|| ! hash_equals( (string) $existing['operation_id'], $operation_id )
			|| ! hash_equals( (string) $existing['fingerprint'], $fingerprint )
			|| $existing['action'] !== $action ) {
			return self::error( 'IDEMPOTENCY_KEY_REUSED', 409 );
		}
		if ( 'verified' !== $existing['state'] || empty( $existing['entity_id'] ) ) {
			return self::error( 'OPERATION_UNCERTAIN', 409 );
		}
		return array(
			'new'    => false,
			'key'    => $option_key,
			'record' => $existing,
		);
	}

	/**
	 * Marks a reserved operation as verified.
	 *
	 * @param array $reservation Atomic reservation record.
	 * @param int   $entity_id   Persisted WooCommerce entity identifier.
	 * @return void
	 */
	private static function complete_operation( array $reservation, int $entity_id ): void {
		$record              = $reservation['record'];
		$record['state']     = 'verified';
		$record['entity_id'] = $entity_id;
		update_option( $reservation['key'], $record, false );
	}

	/**
	 * Validates and sanitizes a billing or shipping address.
	 *
	 * @param mixed $value   Address payload.
	 * @param bool  $billing Whether billing-only fields are required.
	 * @return array|null
	 */
	private static function address( $value, bool $billing ): ?array {
		if ( ! is_array( $value ) ) {
			return null;
		}
		$required = array( 'first_name', 'last_name', 'address_1', 'city', 'postcode', 'country' );
		$allowed  = array_merge( $required, array( 'company', 'address_2', 'state' ) );
		if ( $billing ) {
			$required = array_merge( $required, array( 'email', 'phone' ) );
			$allowed  = array_merge( $allowed, array( 'email', 'phone' ) );
		}
		if ( array_diff( array_keys( $value ), $allowed ) || array_diff( $required, array_keys( $value ) ) ) {
			return null;
		}
		$result = array();
		foreach ( $allowed as $field ) {
			$result[ $field ] = wc_clean( isset( $value[ $field ] ) ? (string) $value[ $field ] : '' );
		}
		$result['country'] = strtoupper( $result['country'] );
		foreach ( $required as $field ) {
			if ( '' === $result[ $field ] ) {
				return null;
			}
		}
		if ( $billing && ! is_email( $result['email'] ) ) {
			return null;
		}
		return $result;
	}

	/**
	 * Resolves a server-calculated shipping rate for validated products.
	 *
	 * @param array  $products    Validated products and quantities.
	 * @param array  $destination Sanitized shipping destination.
	 * @param string $method_id   Requested WooCommerce rate identifier.
	 * @return WC_Shipping_Rate|WP_Error
	 */
	private static function shipping_rate( array $products, array $destination, string $method_id ) {
		$contents      = array();
		$contents_cost = 0.0;
		foreach ( $products as $index => $entry ) {
			$line_total                       = (float) wc_get_price_excluding_tax(
				$entry['product'],
				array( 'qty' => $entry['quantity'] )
			);
			$contents[ 'operator_' . $index ] = array(
				'data'              => $entry['product'],
				'quantity'          => $entry['quantity'],
				'line_total'        => $line_total,
				'line_tax'          => 0,
				'line_subtotal'     => $line_total,
				'line_subtotal_tax' => 0,
			);
			$contents_cost                   += $line_total;
		}
		$package    = array(
			'contents'        => $contents,
			'contents_cost'   => $contents_cost,
			'applied_coupons' => array(),
			'user'            => array( 'ID' => 0 ),
			'destination'     => array(
				'country'   => $destination['country'],
				'state'     => $destination['state'],
				'postcode'  => $destination['postcode'],
				'city'      => $destination['city'],
				'address'   => $destination['address_1'],
				'address_1' => $destination['address_1'],
				'address_2' => $destination['address_2'],
			),
		);
		$calculated = WC()->shipping()->calculate_shipping_for_package( $package, 0 );
		$rates      = isset( $calculated['rates'] ) && is_array( $calculated['rates'] )
			? $calculated['rates'] : array();
		if ( ! isset( $rates[ $method_id ] ) || ! $rates[ $method_id ] instanceof WC_Shipping_Rate ) {
			return self::error( 'SHIPPING_METHOD_UNAVAILABLE', 409 );
		}
		return $rates[ $method_id ];
	}

	/**
	 * Adds a verified WooCommerce shipping rate to an order.
	 *
	 * @param WC_Order         $order Order being built.
	 * @param WC_Shipping_Rate $rate  Verified shipping rate.
	 * @return void
	 */
	private static function add_shipping( WC_Order $order, WC_Shipping_Rate $rate ): void {
		$item = new WC_Order_Item_Shipping();
		$item->set_method_title( $rate->get_label() );
		$item->set_method_id( $rate->get_method_id() );
		$item->set_instance_id( $rate->get_instance_id() );
		$item->set_total( $rate->get_cost() );
		$item->set_taxes( $rate->get_taxes() );
		$order->add_item( $item );
	}

	/**
	 * Lists installed WooCommerce email templates from the strict allowlist.
	 *
	 * @return array
	 */
	public static function email_templates(): array {
		$result = array();
		foreach ( WC()->mailer()->get_emails() as $email ) {
			if ( $email instanceof WC_Email && in_array( $email->id, self::EMAILS, true ) ) {
				$result[] = array(
					'id'      => $email->id,
					'enabled' => $email->is_enabled(),
					'class'   => get_class( $email ),
				);
			}
		}
		return array( 'templates' => $result );
	}

	/**
	 * Creates one pending or on-hold order from server-validated Woo data.
	 *
	 * @param WP_REST_Request $request REST request.
	 * @return array|WP_Error|WP_REST_Response
	 */
	public static function create_order( WP_REST_Request $request ) {
		$body    = $request->get_json_params();
		$allowed = array( 'operation_id', 'status', 'line_items', 'billing', 'shipping', 'shipping_method' );
		if ( ! is_array( $body ) || array_diff( array_keys( $body ), $allowed ) || array_diff( $allowed, array_keys( $body ) ) ) {
			return self::error( 'INVALID_OPERATOR_ORDER', 400 );
		}
		$operation_id = self::operation_id( $body['operation_id'] );
		if ( null === $operation_id || ! in_array( $body['status'], array( 'pending', 'on-hold' ), true ) ) {
			return self::error( 'INVALID_OPERATOR_ORDER', 400 );
		}
		$billing  = self::address( $body['billing'], true );
		$shipping = self::address( $body['shipping'], false );
		if ( null === $billing || null === $shipping || ! is_string( $body['shipping_method'] ) ) {
			return self::error( 'INVALID_OPERATOR_ORDER', 400 );
		}
		if ( ! is_array( $body['line_items'] ) || count( $body['line_items'] ) < 1 || count( $body['line_items'] ) > 20 ) {
			return self::error( 'INVALID_OPERATOR_ORDER', 400 );
		}
		$products = array();
		foreach ( $body['line_items'] as $line ) {
			if ( ! is_array( $line ) || array_diff( array_keys( $line ), array( 'product_id', 'variation_id', 'quantity' ) ) ) {
				return self::error( 'INVALID_OPERATOR_ORDER', 400 );
			}
			$product_id   = absint( $line['product_id'] ?? 0 );
			$variation_id = absint( $line['variation_id'] ?? 0 );
			$quantity     = absint( $line['quantity'] ?? 0 );
			$product      = wc_get_product( $variation_id ? $variation_id : $product_id );
			if ( ! $product || $quantity < 1 || $quantity > 20
				|| ( $variation_id && (int) $product->get_parent_id() !== $product_id )
				|| ! $product->is_purchasable() || ! $product->is_in_stock()
				|| ! $product->has_enough_stock( $quantity ) ) {
				return self::error( 'PRODUCT_NOT_PURCHASABLE', 409 );
			}
			$products[] = array(
				'product'  => $product,
				'quantity' => $quantity,
			);
		}
		// Resolve a server-calculated rate before reserving or creating an order.
		$shipping_rate = self::shipping_rate(
			$products,
			$shipping,
			wc_clean( $body['shipping_method'] )
		);
		if ( is_wp_error( $shipping_rate ) ) {
			return $shipping_rate;
		}
		$fingerprint_payload = $body;
		unset( $fingerprint_payload['operation_id'] );
		$reservation = self::reserve_operation( 'order.create', $operation_id, $fingerprint_payload );
		if ( is_wp_error( $reservation ) ) {
			return $reservation;
		}
		if ( ! $reservation['new'] ) {
			$existing = wc_get_order( absint( $reservation['record']['entity_id'] ) );
			if ( ! $existing ) {
				return self::error( 'OPERATION_UNCERTAIN', 409 );
			}
			return array(
				'order_id' => $existing->get_id(),
				'replayed' => true,
			);
		}
		$order = wc_create_order(
			array(
				'status'      => 'pending',
				'created_via' => 'lock-city-operator',
			)
		);
		if ( is_wp_error( $order ) ) {
			return self::error( 'ORDER_CREATE_FAILED', 502 );
		}
		$order->update_meta_data( self::ORDER_META, $operation_id );
		$order->set_address( $billing, 'billing' );
		$order->set_address( $shipping, 'shipping' );
		foreach ( $products as $entry ) {
			$order->add_product( $entry['product'], $entry['quantity'] );
		}
		self::add_shipping( $order, $shipping_rate );
		$order->calculate_totals( true );
		$order->set_status( $body['status'] );
		$order->save();
		self::complete_operation( $reservation, $order->get_id() );
		return new WP_REST_Response(
			array(
				'order_id' => $order->get_id(),
				'replayed' => false,
			),
			201
		);
	}

	/**
	 * Sends one allowlisted WooCommerce email to the order recipient.
	 *
	 * @param WP_REST_Request $request REST request.
	 * @return array|WP_Error
	 */
	public static function send_email( WP_REST_Request $request ) {
		$body = $request->get_json_params();
		if ( ! is_array( $body ) || array_diff( array_keys( $body ), array( 'operation_id', 'template' ) )
			|| ! isset( $body['operation_id'], $body['template'] ) ) {
			return self::error( 'INVALID_OPERATOR_EMAIL', 400 );
		}
		$operation_id = self::operation_id( $body['operation_id'] );
		$template     = is_string( $body['template'] ) ? $body['template'] : '';
		$order        = wc_get_order( absint( $request['id'] ) );
		if ( null === $operation_id || ! in_array( $template, self::EMAILS, true ) || ! $order ) {
			return self::error( 'INVALID_OPERATOR_EMAIL', 400 );
		}
		if ( ! is_email( $order->get_billing_email() ) ) {
			return self::error( 'ORDER_EMAIL_UNAVAILABLE', 409 );
		}
		$selected = null;
		foreach ( WC()->mailer()->get_emails() as $email ) {
			if ( $email instanceof WC_Email && $email->id === $template ) {
				$selected = $email;
				break;
			}
		}
		if ( ! $selected ) {
			return self::error( 'EMAIL_TEMPLATE_UNAVAILABLE', 409 );
		}
		$reservation = self::reserve_operation(
			'order.email',
			$operation_id,
			array(
				'order_id' => $order->get_id(),
				'template' => $template,
			)
		);
		if ( is_wp_error( $reservation ) ) {
			return $reservation;
		}
		if ( ! $reservation['new'] ) {
			return array(
				'sent'     => true,
				'replayed' => true,
			);
		}
		$selected->trigger( $order->get_id(), $order );
		$meta_key = self::EMAIL_META_PREFIX . hash( 'sha256', $operation_id );
		$order->update_meta_data(
			$meta_key,
			array(
				'operation_id' => $operation_id,
				'state'        => 'sent',
			)
		);
		$order->save_meta_data();
		self::complete_operation( $reservation, $order->get_id() );
		return array(
			'sent'     => true,
			'replayed' => false,
		);
	}
}

add_action( 'rest_api_init', array( 'Lock_City_Operator_Bridge', 'register' ) );
