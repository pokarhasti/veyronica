# =============================================================================
# Veyronica — Unit Tests: Database URL Normalization
# Tests for requirement 6:
# - Neon URL with pooler & channel_binding
# - Plain local Postgres URL
# - sslmode=disable
# - missing sslmode on remote
# - pooler host disabling prepared statement cache
# - unknown extra query parameters
# Does not contain any real secrets.
# =============================================================================
import pytest
from app.db import normalize_database_url, mask_database_url


def test_normalize_neon_pooler_url():
    """Verify Neon-style pooler URL strips channel_binding and sets statement_cache_size=0."""
    raw = "postgresql://mock_user:mock_pass@ep-mock-pooler.c-2.ap-southeast-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require"
    clean_url, connect_args = normalize_database_url(raw, is_async=True)

    assert "channel_binding" not in clean_url
    assert "sslmode" not in clean_url
    assert clean_url.startswith("postgresql+asyncpg://")
    assert connect_args.get("ssl") is True
    assert connect_args.get("statement_cache_size") == 0
    assert connect_args.get("prepared_statement_cache_size") == 0


def test_normalize_local_url():
    """Verify local Postgres URL defaults to ssl=False and preserves no pooler args."""
    raw = "postgresql://mock_user:mock_pass@localhost:5432/veyronica_test"
    clean_url, connect_args = normalize_database_url(raw, is_async=True)

    assert clean_url == "postgresql+asyncpg://mock_user:mock_pass@localhost:5432/veyronica_test"
    assert connect_args.get("ssl") is False
    assert "statement_cache_size" not in connect_args


def test_normalize_sslmode_disable():
    """Verify explicit sslmode=disable sets ssl=False even for remote host."""
    raw = "postgresql://mock_user:mock_pass@remote.db.com:5432/mydb?sslmode=disable"
    clean_url, connect_args = normalize_database_url(raw, is_async=True)

    assert "sslmode" not in clean_url
    assert connect_args.get("ssl") is False


def test_normalize_missing_sslmode_remote():
    """Verify remote host with no sslmode parameter defaults to ssl=True."""
    raw = "postgres://mock_user:mock_pass@remote.db.com:5432/mydb"
    clean_url, connect_args = normalize_database_url(raw, is_async=True)

    assert clean_url.startswith("postgresql+asyncpg://")
    assert connect_args.get("ssl") is True


def test_normalize_pooler_host():
    """Verify any host containing '-pooler' disables prepared statement cache."""
    raw = "postgresql://mock_user:mock_pass@my-custom-pooler.internal:5432/proddb"
    clean_url, connect_args = normalize_database_url(raw, is_async=True)

    assert connect_args.get("statement_cache_size") == 0
    assert connect_args.get("prepared_statement_cache_size") == 0


def test_normalize_unknown_extra_parameters():
    """Verify unknown parameters are preserved while unsupported ones are removed."""
    raw = "postgresql://mock_user:mock_pass@localhost:5432/mydb?application_name=veyronica&channel_binding=require"
    clean_url, connect_args = normalize_database_url(raw, is_async=True)

    assert "application_name=veyronica" in clean_url
    assert "channel_binding" not in clean_url


def test_mask_database_url():
    """Verify passwords are masked as ***."""
    raw = "postgresql://super_admin:super_secret_password_123@localhost:5432/mydb"
    masked = mask_database_url(raw)

    assert "super_secret_password_123" not in masked
    assert "super_admin:***@localhost:5432/mydb" in masked
