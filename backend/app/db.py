# =============================================================================
# Veyronica — Database Engine & Session
# Async engine for FastAPI routes, sync engine for Alembic migrations & seed.
# =============================================================================
from __future__ import annotations

from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine
from sqlalchemy.orm import DeclarativeBase, Session, sessionmaker
from sqlalchemy import create_engine

from app.config import get_settings


class Base(DeclarativeBase):
    """SQLAlchemy declarative base for all ORM models."""
    pass


def _normalize_async_url(url: str) -> str:
    if not url:
        return url
    if url.startswith("postgres://"):
        url = url.replace("postgres://", "postgresql+asyncpg://", 1)
    elif url.startswith("postgresql://") and not url.startswith("postgresql+asyncpg://"):
        url = url.replace("postgresql://", "postgresql+asyncpg://", 1)
    if "sslmode=require" in url:
        url = url.replace("sslmode=require", "ssl=require")
    return url


def _normalize_sync_url(url: str) -> str:
    if not url:
        return url
    if url.startswith("postgres://"):
        url = url.replace("postgres://", "postgresql://", 1)
    elif url.startswith("postgresql+asyncpg://"):
        url = url.replace("postgresql+asyncpg://", "postgresql://", 1)
    return url


def _build_async_engine():
    settings = get_settings()
    return create_async_engine(
        _normalize_async_url(settings.database_url),
        echo=False,
        pool_pre_ping=True,  # detect stale connections early
        pool_size=10,
        max_overflow=5,
    )


def _build_sync_engine():
    settings = get_settings()
    return create_engine(
        _normalize_sync_url(settings.database_url_sync or settings.database_url),
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
