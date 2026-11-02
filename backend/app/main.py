# =============================================================================
# Veyronica — FastAPI Application
# V-Mart Governed Agentic Replenishment Platform
#
# Startup: uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
# =============================================================================
from __future__ import annotations

import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import get_settings

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(name)s] %(levelname)s: %(message)s",
)
logger = logging.getLogger("veyronica")


@asynccontextmanager
async def lifespan(app: FastAPI):
    """
    Application startup and shutdown lifecycle.
    On startup: verify DB connectivity, run reconciliation for unsignalled approvals.
    """
    logger.info("🚀 Veyronica starting up...")

    # Verify Postgres connectivity
    try:
        from app.db import get_async_session_factory
        from sqlalchemy import text
        factory = get_async_session_factory()
        async with factory() as session:
            await session.execute(text("SELECT 1"))
        logger.info("✅ PostgreSQL connected")
    except Exception as e:
        logger.error("❌ PostgreSQL connection failed: %s", e)
        logger.error("   Set DATABASE_URL in .env and ensure Postgres is running")

    # Run reconciliation: re-send Temporal signals for decided-but-unsignalled approvals
    try:
        await _reconcile_unsignalled_approvals()
    except Exception as e:
        logger.warning("Reconciliation check failed (non-fatal): %s", e)

    yield

    logger.info("Veyronica shutting down...")


async def _reconcile_unsignalled_approvals():
    """
    SAFETY: On startup, find any approval_requests that are decided
    (approved/rejected) but whose run is still in 'awaiting_approval' status.
    This means the Temporal signal was never delivered. Re-send it.
    """
    from app.db import get_async_session_factory
    from sqlalchemy import text

    factory = get_async_session_factory()
    async with factory() as session:
        result = await session.execute(text("""
            SELECT ar.approval_id, ar.action_id, ar.status as decision, ar.decided_by,
                   ar.rejection_reason, r.run_id, r.temporal_wf_id
            FROM approval_requests ar
            JOIN runs r ON r.run_id = ar.run_id
            WHERE ar.status IN ('approved', 'rejected')
              AND r.status = 'awaiting_approval'
        """))
        rows = result.mappings().all()

        if not rows:
            return

        logger.info("🔄 Reconciling %d unsignalled approval(s)...", len(rows))

        from app.config import get_settings
        settings = get_settings()

        try:
            from temporalio.client import Client
            client = await Client.connect(
                settings.temporal_host,
                namespace=settings.temporal_namespace,
            )
        except Exception as e:
            logger.warning("Cannot reconcile — Temporal unreachable: %s", e)
            return

        for row in rows:
            try:
                handle = client.get_workflow_handle(row["temporal_wf_id"])
                await handle.signal(
                    "decision",
                    {
                        "outcome": row["decision"],
                        "approver_id": row["decided_by"],
                        "reason": row["rejection_reason"],
                    },
                )
                logger.info(
                    "✅ Reconciled approval %s → %s for run %s",
                    row["approval_id"], row["decision"], str(row["run_id"])[:8],
                )
            except Exception as e:
                logger.warning(
                    "Failed to reconcile approval %s: %s",
                    row["approval_id"], e,
                )


def create_app() -> FastAPI:
    """Application factory."""
    settings = get_settings()

    app = FastAPI(
        title="Veyronica",
        description="V-Mart Governed Agentic Replenishment Platform",
        version="0.1.0",
        lifespan=lifespan,
    )

    # CORS — env-driven for easy deployment switching
    origins = settings.cors_origin_list
    allow_all = "*" in origins
    app.add_middleware(
        CORSMiddleware,
        allow_origins=["*"] if allow_all else origins,
        allow_credentials=False if allow_all else True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    # Register all routers
    from app.api.workflows import router as workflows_router
    from app.api.runs import router as runs_router
    from app.api.approvals import router as approvals_router
    from app.api.audit import router as audit_router
    from app.api.dashboard import router as dashboard_router
    from app.api.approvers import router as approvers_router
    from app.api.adapters import router as adapters_router
    from app.api.admin import router as admin_router

    app.include_router(workflows_router)
    app.include_router(runs_router)
    app.include_router(approvals_router)
    app.include_router(audit_router)
    app.include_router(dashboard_router)
    app.include_router(approvers_router)
    app.include_router(adapters_router)
    app.include_router(admin_router)

    @app.get("/")
    async def root():
        return {
            "name": "Veyronica",
            "description": "V-Mart Governed Agentic Replenishment Platform",
            "version": "0.1.0",
            "status": "running",
            "docs": "/docs",
        }

    return app


# Module-level app instance for uvicorn
app = create_app()
