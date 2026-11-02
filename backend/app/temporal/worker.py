# =============================================================================
# Veyronica — Temporal Worker Process
# Polls task queue and executes ReplenishmentWorkflow and activities.
# Run with: python -m app.temporal.worker
# =============================================================================
from __future__ import annotations

import asyncio
import logging

from temporalio.client import Client
from temporalio.worker import Worker

from app.config import get_settings
from app.temporal.activities import (
    constraint_activity,
    create_approval_activity,
    draft_activity,
    execute_activity,
    finalise_activity,
    record_rejection_activity,
    route_activity,
    signal_activity,
)
from app.temporal.workflows import ReplenishmentWorkflow

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(name)s] %(levelname)s: %(message)s",
)
logger = logging.getLogger("veyronica.temporal.worker")


async def run_worker() -> None:
    settings = get_settings()
    logger.info("Connecting Temporal worker to %s...", settings.temporal_host)

    client = await Client.connect(
        settings.temporal_host,
        namespace=settings.temporal_namespace,
    )

    worker = Worker(
        client,
        task_queue=settings.temporal_task_queue,
        workflows=[ReplenishmentWorkflow],
        activities=[
            signal_activity,
            constraint_activity,
            draft_activity,
            route_activity,
            create_approval_activity,
            record_rejection_activity,
            execute_activity,
            finalise_activity,
        ],
    )

    logger.info("Worker started on task queue '%s'. Waiting for jobs...", settings.temporal_task_queue)
    await worker.run()


if __name__ == "__main__":
    asyncio.run(run_worker())
