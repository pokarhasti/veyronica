# =============================================================================
# Veyronica — Database Engine & Session
# Async engine for FastAPI routes, sync engine for Alembic migrations & seed.
# =============================================================================
from __future__ import annotations

from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine
from sqlalchemy.orm import DeclarativeBase, Session, sessionmaker
from sqlalchemy import create_engine

import os
import urllib.parse
from typing import Any

from app.config import get_settings


class Base(DeclarativeBase):
    """SQLAlchemy declarative base for all ORM models."""
    pass


def mask_database_url(raw_url: str) -> str:
    """Mask password in database URL for safe logging and error reporting."""
    if not raw_url:
        return ""
    try:
        parsed = urllib.parse.urlsplit(raw_url)
        if parsed.password:
            netloc = parsed.netloc.replace(f":{parsed.password}@", ":***@")
        else:
            netloc = parsed.netloc
        return urllib.parse.urlunsplit((parsed.scheme, netloc, parsed.path, parsed.query, parsed.fragment))
    except Exception:
        return "***"


def normalize_database_url(raw_url: str, is_async: bool = True) -> tuple[str, dict[str, Any]]:
    """
    Parses and normalizes a database URL for asyncpg (or sync psycopg2).
    - Uses urllib.parse for robust parsing across formats (Neon, local Postgres, Supabase).
    - Handles postgres://, postgresql://, and postgresql+asyncpg:// schemes.
    - Strips driver-unsupported parameters like channel_binding.
    - Maps sslmode (require, verify-full, prefer, disable) to asyncpg connect_args['ssl'].
    - Enforces TLS by default for any non-local host.
    - Disables prepared statement cache (statement_cache_size=0) when connected to a pooler
      host (e.g. Neon PgBouncer) because transaction poolers rotate physical backend connections,
      which would break session-level prepared statements.
    Returns (clean_url, connect_args).
    """
    if not raw_url:
        return "", {}

    parsed = urllib.parse.urlsplit(raw_url)
    target_scheme = "postgresql+asyncpg" if is_async else "postgresql"

    hostname = (parsed.hostname or "").lower()
    is_local = hostname in ("localhost", "127.0.0.1", "::1", "") or hostname.endswith(".local")
    is_pooler = "-pooler" in hostname

    query_params = urllib.parse.parse_qsl(parsed.query, keep_blank_values=True)
    retained_params: list[tuple[str, str]] = []
    connect_args: dict[str, Any] = {}
    ssl_setting: bool | None = None

    for k, v in query_params:
        k_lower = k.lower()
        if k_lower == "channel_binding":
            # Unsupported by asyncpg; safely strip
            continue
        elif k_lower == "sslmode":
            v_lower = v.lower()
            if v_lower in ("disable", "allow"):
                ssl_setting = False
            elif v_lower in ("require", "prefer", "verify-ca", "verify-full"):
                ssl_setting = True
            # Strip sslmode from URL query string
            continue
        elif k_lower == "ssl":
            v_lower = v.lower()
            ssl_setting = False if v_lower in ("0", "false", "f", "disable") else True
            continue
        else:
            retained_params.append((k, v))

    # Apply default SSL policy: local defaults to False, remote defaults to True
    if ssl_setting is None:
        ssl_setting = False if is_local else True

    if is_async:
        if ssl_setting is not None:
            connect_args["ssl"] = ssl_setting
        if is_pooler:
            # Neon uses PgBouncer in transaction pooling mode.
            # Disabling prepared statement cache prevents 'prepared statement does not exist' errors.
            connect_args["statement_cache_size"] = 0
            connect_args["prepared_statement_cache_size"] = 0
    else:
        # Sync engine (psycopg2) supports sslmode in query params
        if ssl_setting is False:
            retained_params.append(("sslmode", "disable"))
        elif ssl_setting is True:
            retained_params.append(("sslmode", "require"))

    clean_query = urllib.parse.urlencode(retained_params)
    clean_url = urllib.parse.urlunsplit((target_scheme, parsed.netloc, parsed.path, clean_query, parsed.fragment))

    return clean_url, connect_args


def _normalize_async_url(url: str) -> str:
    """Backward compatibility wrapper returning clean async URL string."""
    clean_url, _ = normalize_database_url(url, is_async=True)
    return clean_url


def _normalize_sync_url(url: str) -> str:
    """Backward compatibility wrapper returning clean sync URL string."""
    clean_url, _ = normalize_database_url(url, is_async=False)
    return clean_url


def _build_async_engine():
    settings = get_settings()
    clean_url, connect_args = normalize_database_url(settings.database_url, is_async=True)
    return create_async_engine(
        clean_url,
        connect_args=connect_args,
        echo=False,
        pool_pre_ping=True,  # detect stale connections early
        pool_size=10,
        max_overflow=5,
    )


def _build_sync_engine():
    settings = get_settings()
    raw = settings.database_url_sync or settings.database_url
    # If primary database_url is remote (e.g. Neon) but database_url_sync was left at default localhost
    if settings.database_url_sync and "localhost" in settings.database_url_sync and "localhost" not in settings.database_url:
        raw = settings.database_url
    clean_url, connect_args = normalize_database_url(raw, is_async=False)
    return create_engine(
        clean_url,
        connect_args=connect_args,
        echo=False,
        pool_pre_ping=True,
    )


# Lazy singletons — created on first import
_async_engine = None
_sync_engine = None
_async_session_factory = None
_sync_session_factory = None


def get_async_engine():
    global _async_engine
    if _async_engine is None:
        _async_engine = _build_async_engine()
    return _async_engine


def get_sync_engine():
    global _sync_engine
    if _sync_engine is None:
        _sync_engine = _build_sync_engine()
    return _sync_engine


def get_async_session_factory() -> async_sessionmaker[AsyncSession]:
    global _async_session_factory
    if _async_session_factory is None:
        _async_session_factory = async_sessionmaker(
            bind=get_async_engine(),
            class_=AsyncSession,
            expire_on_commit=False,
        )
    return _async_session_factory


def get_sync_session_factory() -> sessionmaker[Session]:
    global _sync_session_factory
    if _sync_session_factory is None:
        _sync_session_factory = sessionmaker(
            bind=get_sync_engine(),
            expire_on_commit=False,
        )
    return _sync_session_factory


async def get_db() -> AsyncSession:
    """FastAPI dependency — yields an async session, commits on success."""
    factory = get_async_session_factory()
    async with factory() as session:
        try:
            yield session
            await session.commit()
        except Exception:
            await session.rollback()
            raise


async def apply_migrations_if_needed():
    """Apply 001_initial.sql and 002_policy_suggestions.sql if core tables are absent."""
    import logging
    logger = logging.getLogger("veyronica.db")
    migrations_dir = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "migrations")
    mig1 = os.path.join(migrations_dir, "001_initial.sql")
    mig2 = os.path.join(migrations_dir, "002_policy_suggestions.sql")

    engine = get_async_engine()
    async with engine.begin() as conn:
        raw_conn = await conn.get_raw_connection()
        if os.path.exists(mig1):
            with open(mig1, "r", encoding="utf-8") as f:
                await raw_conn.driver_connection.execute(f.read())
            logger.info("✅ Applied 001_initial.sql successfully")
        if os.path.exists(mig2):
            with open(mig2, "r", encoding="utf-8") as f:
                await raw_conn.driver_connection.execute(f.read())
            logger.info("✅ Applied 002_policy_suggestions.sql successfully")
