from pathlib import Path


PLUGIN = (Path(__file__).parent.parent / "wordpress" / "lock-city-aw26-preorder"
          / "lock-city-aw26-preorder.php").read_text(encoding="utf-8")


def test_allow_cancellation_false_is_persisted_explicitly():
    assert "update_meta_data( 'lock_city_allow_cancellation', 'false' )" in PLUGIN
    assert "update_meta_data( 'lock_city_allow_cancellation', false )" not in PLUGIN


def test_preorder_plugin_defaults_to_closed_without_defining_runtime_flag():
    assert "defined( 'AW26_PREORDER_SALES_ENABLED' )" in PLUGIN
    assert "define( 'AW26_PREORDER_SALES_ENABLED', true" not in PLUGIN
