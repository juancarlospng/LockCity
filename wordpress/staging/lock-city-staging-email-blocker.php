<?php
/**
 * Plugin Name: Lock City Staging Email Blocker
 * Description: Prevents all outbound WordPress email on the Lock City staging domain only.
 * Version: 1.0.0
 */

declare( strict_types = 1 );

const LOCK_CITY_STAGING_HOST = 'pruebasv2.lockcityclothes.com';

function lock_city_is_staging_host(): bool {
	$host = wp_parse_url( home_url( '/' ), PHP_URL_HOST );

	return is_string( $host ) && strtolower( $host ) === LOCK_CITY_STAGING_HOST;
}

if ( lock_city_is_staging_host() ) {
	/**
	 * Short-circuit wp_mail() successfully so staging workflows continue without
	 * transmitting messages to customers or administrators.
	 */
	add_filter(
		'pre_wp_mail',
		static function ( $return, array $attributes ) {
			return true;
		},
		10,
		2
	);

	add_action(
		'admin_notices',
		static function (): void {
			echo '<div class="notice notice-warning"><p><strong>Lock City staging:</strong> outbound WordPress email is blocked.</p></div>';
		}
	);
}
