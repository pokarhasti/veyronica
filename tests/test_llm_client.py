# =============================================================================
# Veyronica — LLMClient Fallback Tests
# Tests that LLMClient falls back gracefully to high-quality deterministic templates
# when no API key is provided, ensuring zero-downtime safety net (Plan C).
# =============================================================================
import pytest
from app.llm.client import LLMClient


@pytest.mark.asyncio
async def test_llm_client_fallback_rationale():
    client = LLMClient()
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
async def test_llm_client_fallback_email():
    client = LLMClient()
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
