# =============================================================================
# Veyronica — Postgres-backed Simulated Supplier Adapter
# Differentiator 2: Supplier email notification as a second gated action.
# Idempotent write: duplicate action_id returns existing email record.
# =============================================================================
from __future__ import annotations

import logging
import uuid
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from app.adapters.protocols import EmailResult

logger = logging.getLogger("veyronica.adapters.supplier")


class PostgresSupplierAdapter:
    """Dispatches supplier confirmation emails and persists in sent_emails table."""

    def __init__(self, session: AsyncSession):
        self.session = session

    async def send_email(
        self,
        to: str,
        subject: str,
        body: str,
        action_id: str,
        run_id: str,
    ) -> EmailResult:
        """
        Record the dispatched email in the database idempotently.
        """
        action_uuid = uuid.UUID(str(action_id))
        existing = await self.session.execute(
            text("SELECT email_id FROM sent_emails WHERE action_id = :action_id"),
            {"action_id": action_uuid},
        )
        row = existing.mappings().first()
        if row:
            logger.info("Email already recorded for action_id %s (idempotent replay)", action_id)
            return EmailResult(
                email_id=str(row["email_id"]),
                action_id=action_id,
                status="sent",
                to_email=to,
            )

        email_uuid = uuid.uuid4()
        run_uuid = uuid.UUID(str(run_id))

        await self.session.execute(
            text("""
                INSERT INTO sent_emails (email_id, action_id, run_id, to_email, subject, body, created_at)
                VALUES (:email_id, :action_id, :run_id, :to_email, :subject, :body, NOW())
            """),
            {
                "email_id": email_uuid,
                "action_id": action_uuid,
                "run_id": run_uuid,
                "to_email": to,
                "subject": subject,
                "body": body,
            },
        )

        logger.info("Dispatched supplier email to %s (id: %s)", to, email_uuid)

        return EmailResult(
            email_id=str(email_uuid),
            action_id=action_id,
            status="sent",
            to_email=to,
        )
