# =============================================================================
# Veyronica — Temporal Replenishment Workflow
# Section 7.3: Durable ReplenishmentWorkflow with structural approval pause.
# Survives worker and server restarts indefinitely. No in-memory sleep.
# =============================================================================
from __future__ import annotations

from dataclasses import dataclass
from datetime import timedelta
from typing import Any

from temporalio import workflow

with workflow.unsafe.imports_passed_through():
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


@dataclass
class DecisionSignal:
    outcome: str  # approved | rejected
    approver_id: str
    reason: str | None = None


@workflow.defn
class ReplenishmentWorkflow:
    """
    Durable workflow orchestrating store replenishment.
    Pauses durably on human approval using workflow.wait_condition.
    """

    def __init__(self) -> None:
        self._decision: DecisionSignal | None = None

    @workflow.signal
    def decision(self, d: dict[str, Any]) -> None:
        """Receive approval decision from API layer."""
        self._decision = DecisionSignal(
            outcome=d.get("outcome", ""),
            approver_id=d.get("approver_id", ""),
            reason=d.get("reason"),
        )

    @workflow.run
    async def run(self, params: dict[str, Any]) -> dict[str, Any]:
        run_id = params["run_id"]
        correlation_id = params["correlation_id"]
        store_id = params["store_id"]

        # 1. Signal Detection Activity
        sig_result = await workflow.execute_activity(
            signal_activity,
            params,
            start_to_close_timeout=timedelta(seconds=60),
        )

        if not sig_result.get("signals"):
            await workflow.execute_activity(
                finalise_activity,
                {"run_id": run_id, "status": "completed", "outcome": "no_signals"},
                start_to_close_timeout=timedelta(seconds=30),
            )
            return {"status": "completed", "outcome": "no_signals"}

        # 2. Constraint Evaluation Activity
        constraint_result = await workflow.execute_activity(
            constraint_activity,
            {"run_id": run_id, "store_id": store_id, "signals": sig_result["signals"]},
            start_to_close_timeout=timedelta(seconds=60),
        )

        # 3. Draft Generation Activity (AI Explanation)
        draft_result = await workflow.execute_activity(
            draft_activity,
            {
                "run_id": run_id,
                "correlation_id": correlation_id,
                "store_id": store_id,
                "signals": sig_result["signals"],
                "checks_by_supplier": constraint_result["checks_by_supplier"],
            },
            start_to_close_timeout=timedelta(seconds=120),
        )

        # 4. Route Evaluation Activity
        route_result = await workflow.execute_activity(
            route_activity,
            {
                "run_id": run_id,
                "drafts": draft_result["drafts"],
            },
            start_to_close_timeout=timedelta(seconds=30),
        )

        # 5. Approval Gate
        if route_result.get("tier") != "auto":
            # Create approval request record in Postgres
            await workflow.execute_activity(
                create_approval_activity,
                {
                    "run_id": run_id,
                    "correlation_id": correlation_id,
                    "drafts": draft_result["drafts"],
                    "route": route_result,
                },
                start_to_close_timeout=timedelta(seconds=30),
            )

            # STRUCTURAL PAUSE: wait durably for human decision signal.
            # Survives worker restarts and server reboots without timeouts.
            await workflow.wait_condition(lambda: self._decision is not None)

            if self._decision and self._decision.outcome == "rejected":
                await workflow.execute_activity(
                    record_rejection_activity,
                    {
                        "run_id": run_id,
                        "correlation_id": correlation_id,
                        "decision": {
                            "outcome": self._decision.outcome,
                            "approver_id": self._decision.approver_id,
                            "reason": self._decision.reason,
                        },
                    },
                    start_to_close_timeout=timedelta(seconds=30),
                )
                return {"status": "rejected", "reason": self._decision.reason}

        # 6. Execution Activity (Dual Gated ERP PO + Supplier Email)
        exec_result = await workflow.execute_activity(
            execute_activity,
            {
                "run_id": run_id,
                "correlation_id": correlation_id,
                "drafts": draft_result["drafts"],
            },
            start_to_close_timeout=timedelta(seconds=60),
        )

        # 7. Finalise Run Activity (Metrics & Audit Completion)
        await workflow.execute_activity(
            finalise_activity,
            {
                "run_id": run_id,
                "correlation_id": correlation_id,
                "status": "completed",
                "execution_result": exec_result,
            },
            start_to_close_timeout=timedelta(seconds=30),
        )

        return {"status": "completed", "execution": exec_result}
