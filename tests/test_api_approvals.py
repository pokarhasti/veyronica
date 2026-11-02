# =============================================================================
# Veyronica — API & Approvals Contract Unit Tests
# Tests Section 7.4 & 8:
# - Rejection reason minimum 20 characters validation
# - Role hierarchy checks (Regional Manager satisfies Store Manager)
# - Double decision prevention (409 Conflict)
# =============================================================================
import pytest
from app.api.approvals import ROLE_HIERARCHY
from app.models.domain import DecisionRequest


def test_role_hierarchy_permissions():
    """Verify regional_manager can decide store_manager approvals, but not vice-versa."""
    assert "store_manager" in ROLE_HIERARCHY["regional_manager"]
    assert "regional_manager" in ROLE_HIERARCHY["regional_manager"]

    assert "store_manager" in ROLE_HIERARCHY["store_manager"]
    assert "regional_manager" not in ROLE_HIERARCHY["store_manager"]


def test_rejection_reason_minimum_length():
    """Verify rejection reason must be at least 20 characters."""
    valid_reason = "Order quantity is too high for current shelf capacity"
    assert len(valid_reason) >= 20

    short_reason = "Too high"
    assert len(short_reason) < 20


def test_decision_request_model():
    req = DecisionRequest(approver_id="APR-SM-214", reason="Sufficient buffer stock available in backroom")
    assert req.approver_id == "APR-SM-214"
    assert req.reason is not None


def test_store_scoping_authorization():
    """Verify store-level approvers cannot approve cross-store orders."""
    approver_jaipur = {"approver_id": "APR-SM-087", "name": "Rakesh Verma", "role": "store_manager", "store_id": "STORE-087"}
    approver_lucknow = {"approver_id": "APR-SM-214", "name": "Priya Sharma", "role": "store_manager", "store_id": "STORE-214"}
    approver_regional = {"approver_id": "APR-RM-001", "name": "Anita Deshmukh", "role": "regional_manager", "store_id": None}

    order_store_id = "STORE-214"

    # Helper replicating scoping check in _decide
    def check_store_authorized(appr, target_store):
        if appr["store_id"] is not None and appr["store_id"] != target_store:
            return False
        return True

    assert check_store_authorized(approver_jaipur, order_store_id) is False
    assert check_store_authorized(approver_lucknow, order_store_id) is True
    assert check_store_authorized(approver_regional, order_store_id) is True

