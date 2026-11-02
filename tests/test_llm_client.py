# =============================================================================
# Veyronica — LLMClient Fallback Tests
# Tests that LLMClient falls back gracefully to high-quality deterministic templates
# when no API key is provided, ensuring zero-downtime safety net (Plan C).
# =============================================================================
import pytest
from app.llm.client import LLMClient


def _clear_keys(client, monkeypatch):
    monkeypatch.setattr(client.settings, "gemini_api_key", "")
    monkeypatch.setattr(client.settings, "gemini_api_keys", "")
    monkeypatch.setattr(client.settings, "grok_api_key", "")
    monkeypatch.setattr(client.settings, "llm_api_key", "")
    monkeypatch.setattr(client.settings, "llm_fallback_api_key", "")
    for i in range(1, 9):
        monkeypatch.setattr(client.settings, f"gemini_api_key_{i}", "")


@pytest.mark.asyncio
async def test_llm_client_fallback_rationale(monkeypatch):
    client = LLMClient()
    _clear_keys(client, monkeypatch)
    lines = [
        {
            "sku": "SKU-8821",
            "sku_name": "Men's Slim Jeans",
            "days_of_cover": 4.0,
            "sales_velocity_7d": 6.0,
            "qty": 60,
            "unit_cost": 360,
        }
    ]
    rationale, source = await client.generate_rationale("STORE-214", lines, target_cover_days=14)
    assert source == "template"
    assert "STORE-214" in rationale
    assert "SKU-8821" in rationale
    assert "4.0 days of cover" in rationale
    assert "60 units" in rationale


@pytest.mark.asyncio
async def test_llm_client_fallback_email(monkeypatch):
    client = LLMClient()
    _clear_keys(client, monkeypatch)
    lines = [
        {"sku": "SKU-8821", "sku_name": "Men's Slim Jeans", "qty": 60, "unit_cost": 360},
    ]
    email_body, source = await client.generate_supplier_email(
        supplier_name="Supplier A",
        store_id="STORE-214",
        lines=lines,
        total_value=21600.0,
    )
    assert source == "template"
    assert "Supplier A" in email_body
    assert "STORE-214" in email_body
    assert "₹21,600.00" in email_body


def test_gemini_model_resolution(monkeypatch):
    client = LLMClient()

    test_cases = [
        ("Gemini 3.8 Flash", "gemini-3.8-flash"),
        ("gemini-3.8-flash", "gemini-3.8-flash"),
        ("Gemini 3.6 Flash", "gemini-3.6-flash"),
        ("gemini-3.6-flash", "gemini-3.6-flash"),
        ("Gemini 3.5 Flash-Lite", "gemini-3.5-flash-lite"),
        ("gemini-3.5-flash-lite", "gemini-3.5-flash-lite"),
        ("Gemma 4", "gemma-4"),
        ("gemma-4", "gemma-4"),
    ]

    for input_model, expected_resolved in test_cases:
        client.settings.gemini_model = input_model
        assert client._resolve_gemini_model() == expected_resolved


def test_gemini_eight_key_pool():
    from app.config import Settings
    s = Settings(
        gemini_api_key_1="key_1",
        gemini_api_key_2="key_2",
        gemini_api_key_3="key_3",
        gemini_api_key_4="key_4",
        gemini_api_key_5="key_5",
        gemini_api_key_6="key_6",
        gemini_api_key_7="key_7",
        gemini_api_key_8="key_8",
    )
    keys = s.all_gemini_api_keys
    assert len(keys) == 8
    assert keys == [f"key_{i}" for i in range(1, 9)]


@pytest.mark.asyncio
async def test_gemini_multi_key_failover(monkeypatch):
    client = LLMClient()
    client.settings.gemini_api_key_1 = "bad_key_1"
    client.settings.gemini_api_key_2 = "good_key_2"

    attempted_keys = []

    async def mock_call(store_id, lines, target_cover_days, api_key):
        attempted_keys.append(api_key)
        if api_key == "bad_key_1":
            raise RuntimeError("API quota exhausted / key dead (429)")
        return "Store STORE-214 replenished successfully."

    monkeypatch.setattr(client, "_call_gemini_for_rationale", mock_call)

    lines = [{"sku": "SKU-8821", "sku_name": "Men's Slim Jeans", "qty": 60}]
    rationale, source = await client.generate_rationale("STORE-214", lines, target_cover_days=14)

    assert source == "ai_generated"
    assert "Store STORE-214 replenished successfully." in rationale
    assert attempted_keys == ["bad_key_1", "good_key_2"]


def test_numeric_hallucination_guard_clean():
    from app.llm.client import verify_no_hallucinated_numbers

    lines = [
        {"sku": "SKU-8821", "sku_name": "Men's Slim Jeans", "qty": 60, "unit_cost": 700, "line_value": 42000, "current_stock": 24, "days_of_cover": 4.0}
    ]
    # Rationale has 60, 14, 214, 8821, 42,000 -> all authorized
    text = "V-Mart Store STORE-214 requires 60 units of SKU-8821 totaling ₹42,000 to restore 14 days of cover."
    is_valid, stray = verify_no_hallucinated_numbers(text, "STORE-214", lines, target_cover_days=14)
    assert is_valid is True
    assert len(stray) == 0


def test_numeric_hallucination_guard_catches_unauthorized_number():
    from app.llm.client import verify_no_hallucinated_numbers

    lines = [
        {"sku": "SKU-8821", "sku_name": "Men's Slim Jeans", "qty": 60, "unit_cost": 700, "line_value": 42000, "current_stock": 24}
    ]
    # Rationale invents "saving ₹999,999" and "excess 450 units" -> unauthorized!
    text = "Reordering 60 units will unlock savings of ₹999,999 and prevent 450 stockout losses."
    is_valid, stray = verify_no_hallucinated_numbers(text, "STORE-214", lines, target_cover_days=14)
    assert is_valid is False
    assert "999,999" in stray or "999999" in stray
    assert "450" in stray



