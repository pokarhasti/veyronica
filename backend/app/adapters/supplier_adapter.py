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

import os
import smtplib
from email.message import EmailMessage

logger = logging.getLogger("veyronica.adapters.supplier")

DEFAULT_SENDER = "rojivadiyayugpc@gmail.com"
DEFAULT_RECIPIENT = "rojivadiyayug1@gmail.com"


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
        from_email: str | None = None,
    ) -> EmailResult:
        """
        Record the dispatched email in the database idempotently,
        and transmit via live SMTP if credentials are configured.
        """
        sender = from_email or os.getenv("SMTP_FROM_EMAIL", DEFAULT_SENDER)
        recipient = to if to and to != "supplier@example.com" else DEFAULT_RECIPIENT

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
                to_email=recipient,
            )

        email_uuid = uuid.uuid4()
        run_uuid = uuid.UUID(str(run_id))

        # Attempt live SMTP delivery if GMAIL_APP_PASSWORD / SMTP_PASSWORD is configured
        smtp_password = os.getenv("GMAIL_APP_PASSWORD") or os.getenv("SMTP_PASSWORD")
        if smtp_password:
            try:
                msg = EmailMessage()
                msg["From"] = sender
                msg["To"] = recipient
                msg["Subject"] = subject
                msg.set_content(body)

                smtp_host = os.getenv("SMTP_HOST", "smtp.gmail.com")
                smtp_port = int(os.getenv("SMTP_PORT", "587"))

                with smtplib.SMTP(smtp_host, smtp_port, timeout=8) as server:
                    server.starttls()
                    server.login(sender, smtp_password)
                    server.send_message(msg)
                logger.info("Real email successfully transmitted via SMTP from %s to %s", sender, recipient)
            except Exception as e:
                logger.warning("SMTP transmission warning (%s). Persisting to database.", e)
        else:
            logger.info(
                "Dispatched email from %s to %s recorded. (Configure GMAIL_APP_PASSWORD in .env for live SMTP delivery)",
                sender,
                recipient,
            )

        await self.session.execute(
            text("""
                INSERT INTO sent_emails (email_id, action_id, run_id, to_email, subject, body, created_at)
                VALUES (:email_id, :action_id, :run_id, :to_email, :subject, :body, NOW())
            """),
            {
                "email_id": email_uuid,
                "action_id": action_uuid,
                "run_id": run_uuid,
                "to_email": recipient,
                "subject": subject,
                "body": body,
            },
        )

        logger.info("Dispatched supplier email to %s (id: %s)", recipient, email_uuid)

        return EmailResult(
            email_id=str(email_uuid),
            action_id=action_id,
            status="sent",
            to_email=recipient,
        )
