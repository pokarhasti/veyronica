import time
import json
from playwright.sync_api import sync_playwright

def run_tests():
    results = {}
    console_logs = []
    
    with sync_playwright() as p:
        # Launch Chromium (or system chrome)
        browser = p.chromium.launch()
        context = browser.new_context(viewport={"width": 1440, "height": 900})
        page = context.new_page()
        
        page.on("console", lambda msg: console_logs.append(f"[{msg.type}] {msg.text}"))
        
        print("--- PHASE 1: EXPLORE LIKE A NEW USER ---")
        page.goto("http://localhost:5173", wait_until="networkidle")
        page.wait_for_timeout(1000)
        page.screenshot(path="browser-test/screenshots/phase1_first_impressions.png", full_page=True)
        results["phase1_first_impressions"] = "Captured homepage full view"
        
        # Open balance sheet simulator
        sim_btn = page.locator("button:has-text('Interactive Balance Sheet Simulator'), button:has-text('Simulator')").first
        if sim_btn.count() > 0:
            sim_btn.click()
            page.wait_for_timeout(800)
            page.screenshot(path="browser-test/screenshots/phase1_balance_sheet_simulator.png")
            results["phase1_simulator"] = "Opened and interacted with Balance Sheet Simulator"
            # Try dragging/changing slider or input
            slider = page.locator("input[type='range']").first
            if slider.count() > 0:
                slider.fill("120000")
                page.wait_for_timeout(500)
        
        # Test Primitives Showcase toggle
        prim_btn = page.locator("button:has-text('Design System Primitives'), button:has-text('Showcase')").first
        if prim_btn.count() > 0:
            prim_btn.click()
            page.wait_for_timeout(800)
            page.screenshot(path="browser-test/screenshots/phase1_primitives_showcase.png")
            results["phase1_primitives"] = "Showcased design system primitives"
            prim_btn.click() # close it
            page.wait_for_timeout(400)

        print("--- PHASE 2: TEST EVERY PAGE ONE BY ONE ---")
        # 1. Approval Queue tab
        queue_tab = page.locator("button:has-text('Approval Queue')").first
        queue_tab.click()
        page.wait_for_timeout(1000)
        page.screenshot(path="browser-test/screenshots/phase2_approval_queue.png", full_page=True)
        results["phase2_queue"] = "Loaded Approval Queue"

        # Check if any approval item exists to click into detail
        approval_card = page.locator("div[role='button'], tr, button:has-text('Review'), button:has-text('Decision Card')").first
        # Or look for approval row
        first_approval_link = page.locator("button:has-text('DECISION CARD'), button:has-text('Inspect')").first
        if first_approval_link.count() > 0:
            first_approval_link.click()
            page.wait_for_timeout(1200)
            page.screenshot(path="browser-test/screenshots/phase2_approval_detail.png", full_page=True)
            results["phase2_approval_detail"] = "Loaded Approval Detail page"
            # Go back to queue
            back_btn = page.locator("button:has-text('Back to Queue'), button:has-text('Back')").first
            if back_btn.count() > 0:
                back_btn.click()
                page.wait_for_timeout(600)
        else:
            results["phase2_approval_detail"] = "No pending approvals currently in queue to inspect"

        # 2. Workflow Runs tab
        runs_tab = page.locator("button:has-text('Workflow Runs')").first
        runs_tab.click()
        page.wait_for_timeout(1000)
        page.screenshot(path="browser-test/screenshots/phase2_workflow_runs.png", full_page=True)
        results["phase2_runs"] = "Loaded Workflow Runs table"

        # Click first run to see detail
        first_run_btn = page.locator("button:has-text('VIEW RUN'), button:has-text('View Folio'), tr button").first
        if first_run_btn.count() > 0:
            first_run_btn.click()
            page.wait_for_timeout(1200)
            page.screenshot(path="browser-test/screenshots/phase2_run_detail.png", full_page=True)
            results["phase2_run_detail"] = "Loaded Run Detail docket"
            # Back to runs
            back_btn = page.locator("button:has-text('Back to Runs'), button:has-text('Back')").first
            if back_btn.count() > 0:
                back_btn.click()
                page.wait_for_timeout(600)

        # 3. Audit Trail tab
        audit_tab = page.locator("button:has-text('Audit Trail')").first
        audit_tab.click()
        page.wait_for_timeout(1000)
        page.screenshot(path="browser-test/screenshots/phase2_audit_trail.png", full_page=True)
        results["phase2_audit"] = "Loaded Audit Trail"

        # Verify Audit Integrity button
        verify_btn = page.locator("button:has-text('Verify Integrity'), button:has-text('Run Integrity Verification')").first
        if verify_btn.count() > 0:
            verify_btn.click()
            page.wait_for_timeout(1500)
            page.screenshot(path="browser-test/screenshots/phase2_audit_integrity_verified.png")
            results["phase2_audit_verify"] = "Triggered SHA-256 cryptographic chain verification"

        # 4. Metrics Desk tab
        metrics_tab = page.locator("button:has-text('Metrics Desk')").first
        metrics_tab.click()
        page.wait_for_timeout(1000)
        page.screenshot(path="browser-test/screenshots/phase2_metrics_desk.png", full_page=True)
        results["phase2_metrics"] = "Loaded Metrics Desk"

        # 5. Policy Learning tab
        policy_tab = page.locator("button:has-text('Policy Learning')").first
        policy_tab.click()
        page.wait_for_timeout(1000)
        page.screenshot(path="browser-test/screenshots/phase2_policy_learning.png", full_page=True)
        results["phase2_policy"] = "Loaded Policy Learning engine"

        print("--- PHASE 3: TEST REAL WORKFLOWS END TO END ---")
        # Go to Replenishment Check tab
        trigger_tab = page.locator("button:has-text('Replenishment Check')").first
        trigger_tab.click()
        page.wait_for_timeout(800)

        # Trigger run for STORE-214
        trigger_btn = page.locator("button:has-text('Initiate Replenishment Check'), button:has-text('Run Replenishment')").first
        if trigger_btn.count() > 0:
            trigger_btn.click()
            page.wait_for_timeout(3500) # Wait for run progression
            page.screenshot(path="browser-test/screenshots/phase3_triggered_run.png", full_page=True)
            results["phase3_trigger"] = "Successfully triggered replenishment run for STORE-214"
            
            # Check if navigated to run_detail or queue
            # Let's check the approval queue
            queue_tab = page.locator("button:has-text('Approval Queue')").first
            queue_tab.click()
            page.wait_for_timeout(1500)
            
            # Inspect top pending approval
            decision_btn = page.locator("button:has-text('DECISION CARD'), button:has-text('Review')").first
            if decision_btn.count() > 0:
                decision_btn.click()
                page.wait_for_timeout(1500)
                page.screenshot(path="browser-test/screenshots/phase3_decision_card.png", full_page=True)
                
                # Test Reject with short reason (< 20 chars)
                reject_btn = page.locator("button:has-text('Reject Requisition'), button:has-text('Reject')").first
                if reject_btn.count() > 0:
                    reject_btn.click()
                    page.wait_for_timeout(600)
                    # Enter short reason in modal/input
                    reason_input = page.locator("textarea, input[placeholder*='reason'], input[placeholder*='Reason']").first
                    if reason_input.count() > 0:
                        reason_input.fill("Too expensive")
                        submit_reject = page.locator("button:has-text('Confirm Rejection'), button:has-text('Submit Rejection')").first
                        if submit_reject.count() > 0:
                            submit_reject.click()
                            page.wait_for_timeout(1000)
                            page.screenshot(path="browser-test/screenshots/phase3_approval_rejection_short_error.png")
                            results["phase3_reject_short"] = "Tested short rejection validation"
                            
                            # Now enter valid reason (>= 20 chars)
                            reason_input.fill("Rejection due to budget constraints and excess warehouse stock for this category.")
                            submit_reject.click()
                            page.wait_for_timeout(2000)
                            page.screenshot(path="browser-test/screenshots/phase3_approval_rejected.png", full_page=True)
                            results["phase3_reject_valid"] = "Submitted valid rejection with policy feedback trigger"

        # Now trigger another run and approve it!
        trigger_tab = page.locator("button:has-text('Replenishment Check')").first
        trigger_tab.click()
        page.wait_for_timeout(800)
        trigger_btn = page.locator("button:has-text('Initiate Replenishment Check'), button:has-text('Run Replenishment')").first
        if trigger_btn.count() > 0:
            trigger_btn.click()
            page.wait_for_timeout(3500)
            
            queue_tab = page.locator("button:has-text('Approval Queue')").first
            queue_tab.click()
            page.wait_for_timeout(1500)
            
            decision_btn = page.locator("button:has-text('DECISION CARD'), button:has-text('Review')").first
            if decision_btn.count() > 0:
                decision_btn.click()
                page.wait_for_timeout(1500)
                approve_btn = page.locator("button:has-text('Approve Requisition'), button:has-text('Authorize PO')").first
                if approve_btn.count() > 0:
                    approve_btn.click()
                    page.wait_for_timeout(2500)
                    page.screenshot(path="browser-test/screenshots/phase3_approval_approved.png", full_page=True)
                    results["phase3_approve"] = "Approved requisition and triggered dual execution"

        print("--- PHASE 4: BREAK IT ON PURPOSE & RESPONSIVENESS ---")
        # Resize to Tablet (768x1024)
        page.set_viewport_size({"width": 768, "height": 1024})
        trigger_tab = page.locator("button:has-text('Replenishment Check')").first
        trigger_tab.click()
        page.wait_for_timeout(1000)
        page.screenshot(path="browser-test/screenshots/phase4_tablet_768px.png", full_page=True)
        results["phase4_tablet"] = "Captured 768px tablet layout"

        # Resize to Mobile (390x844)
        page.set_viewport_size({"width": 390, "height": 844})
        page.wait_for_timeout(1000)
        page.screenshot(path="browser-test/screenshots/phase4_mobile_390px.png", full_page=True)
        results["phase4_mobile"] = "Captured 390px mobile layout"

        browser.close()

    print("TEST_RESULTS:", json.dumps(results, indent=2))
    print(f"TOTAL_CONSOLE_LOGS: {len(console_logs)}")

if __name__ == "__main__":
    run_tests()

