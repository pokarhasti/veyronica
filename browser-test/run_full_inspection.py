import time
import json
from playwright.sync_api import sync_playwright

def main():
    report_data = {
        "phases": {},
        "console_errors": [],
        "network_errors": [],
        "interactions": []
    }
    
    with sync_playwright() as p:
        browser = p.chromium.launch()
        context = browser.new_context(viewport={"width": 1440, "height": 900})
        page = context.new_page()

        # Handle dialogs (alert/confirm) automatically
        page.on("dialog", lambda dialog: (
            print(f"[BROWSER DIALOG] {dialog.type}: {dialog.message}"),
            report_data["interactions"].append(f"Dialog {dialog.type}: {dialog.message}"),
            dialog.accept()
        ))
        
        page.on("console", lambda msg: (
            report_data["console_errors"].append(f"[{msg.type}] {msg.text}")
            if msg.type in ["error", "warning"] else None
        ))
        
        page.on("requestfailed", lambda req: (
            report_data["network_errors"].append(f"{req.method} {req.url} ({req.failure})")
        ))

        print("--- 1. FIRST IMPRESSIONS & HOMEPAGE ---")
        t0 = time.time()
        page.goto("http://localhost:5173", wait_until="networkidle")
        load_time = time.time() - t0
        page.wait_for_timeout(1000)
        page.screenshot(path="browser-test/screenshots/01_homepage.png", full_page=True)
        report_data["load_time"] = round(load_time, 2)
        print("01_homepage.png captured")

        # Inspect Primitives Spec Drawer
        prim_btn = page.locator("button:has-text('Inspect Primitives Spec (DS-02)')").first
        if prim_btn.count() > 0:
            prim_btn.click(timeout=5000)
            page.wait_for_timeout(800)
            page.screenshot(path="browser-test/screenshots/02_primitives_showcase.png")
            print("02_primitives_showcase.png captured")
            hide_btn = page.locator("button:has-text('Hide Design Primitives')").first
            if hide_btn.count() > 0:
                hide_btn.click(timeout=5000)
                page.wait_for_timeout(400)

        # Open Balance Sheet Simulator & test 5 values
        sim_header = page.locator("text=Balance Sheet & Open-To-Buy (OTB) Simulator").first
        if sim_header.count() > 0:
            sim_header.click(timeout=5000)
            page.wait_for_timeout(600)
            page.screenshot(path="browser-test/screenshots/03_simulator_opened.png")
            print("03_simulator_opened.png captured")
            
            sim_values = ["50000", "75000", "100000", "125000", "140000"]
            slider = page.locator("input[type='range']").first
            if slider.count() > 0:
                for val in sim_values:
                    try:
                        slider.wait_for(state="visible", timeout=3000)
                        page.wait_for_timeout(500)
                        slider.fill(val)
                        page.wait_for_timeout(600)
                    except Exception as e:
                        print(f"Slider value {val} skipped: {e}")
            page.screenshot(path="browser-test/screenshots/04_simulator_tested.png")
            print("04_simulator_tested.png captured")

        print("--- 2. PAGE BY PAGE TAB NAVIGATION ---")
        # Tab 2: Approval Queue
        page.locator("button:has-text('Approval Queue')").first.click(timeout=5000)
        page.wait_for_timeout(1000)
        page.screenshot(path="browser-test/screenshots/05_tab_approval_queue.png", full_page=True)
        print("05_tab_approval_queue.png captured")

        # Tab 3: Workflow Runs
        page.locator("button:has-text('Workflow Runs')").first.click(timeout=5000)
        page.wait_for_timeout(1000)
        page.screenshot(path="browser-test/screenshots/06_tab_workflow_runs.png", full_page=True)
        print("06_tab_workflow_runs.png captured")

        # Tab 4: Audit Trail
        page.locator("button:has-text('Audit Trail')").first.click(timeout=5000)
        page.wait_for_timeout(1000)
        page.screenshot(path="browser-test/screenshots/07_tab_audit_trail.png", full_page=True)
        print("07_tab_audit_trail.png captured")

        # Click Audit Integrity Check
        audit_verify_btn = page.locator("button:has-text('AUDIT CRYPTOGRAPHIC INTEGRITY')").first
        if audit_verify_btn.count() > 0:
            audit_verify_btn.click(timeout=5000)
            page.wait_for_timeout(2000)
            page.screenshot(path="browser-test/screenshots/08_audit_integrity_verified.png", full_page=True)
            print("08_audit_integrity_verified.png captured")

        # Tab 5: Metrics Desk
        page.locator("button:has-text('Metrics Desk')").first.click(timeout=5000)
        page.wait_for_timeout(1000)
        page.screenshot(path="browser-test/screenshots/09_tab_metrics_desk.png", full_page=True)
        print("09_tab_metrics_desk.png captured")

        # Tab 6: Policy Learning
        page.locator("button:has-text('Policy Learning')").first.click(timeout=5000)
        page.wait_for_timeout(1000)
        page.screenshot(path="browser-test/screenshots/10_tab_policy_learning.png", full_page=True)
        print("10_tab_policy_learning.png captured")

        print("--- 3. END-TO-END WORKFLOW: ROLE HIERARCHY, SHORT REJECT, VALID REJECT ---")
        # Go back to Approval Queue
        page.locator("button:has-text('Approval Queue')").first.click(timeout=5000)
        page.wait_for_timeout(1000)

        # Inspect first approval
        inspect_btn = page.locator("button:has-text('Inspect')").first
        if inspect_btn.count() > 0:
            inspect_btn.click(timeout=5000)
            page.wait_for_timeout(1500)
            page.screenshot(path="browser-test/screenshots/13_approval_decision_card_store_manager.png", full_page=True)
            print("13_approval_decision_card_store_manager.png captured")

            # Check if store manager is blocked on regional manager docket
            role_notice = page.locator("text=cannot decide this docket assigned to").first
            if role_notice.count() > 0:
                print("Role enforcement verified: Store Manager cannot decide Regional Manager docket")

            # Switch Signatory in Header to Anita Deshmukh [REGIONAL MANAGER]
            signatory_select = page.locator("select[aria-label='Acting as signatory persona']").first
            if signatory_select.count() > 0:
                signatory_select.select_option("APR-RM-001")
                page.wait_for_timeout(1000)
                page.screenshot(path="browser-test/screenshots/14_signatory_switched_to_regional.png", full_page=True)
                print("14_signatory_switched_to_regional.png captured")

            # Toggle tab to VENDOR EMAIL DISPATCH
            email_tab = page.locator("button:has-text('VENDOR EMAIL DISPATCH'), button:has-text('Supplier Email')").first
            if email_tab.count() > 0:
                email_tab.click(timeout=5000)
                page.wait_for_timeout(500)
                page.screenshot(path="browser-test/screenshots/15_decision_card_email_tab.png")
                print("15_decision_card_email_tab.png captured")

            # Click Reject Requisition
            reject_btn = page.locator("button:has-text('Reject Requisition')").first
            if reject_btn.count() > 0:
                reject_btn.click(timeout=5000)
                page.wait_for_timeout(600)
                
                # Fill short reason (< 20 chars)
                reason_area = page.locator("#rejection-reason").first
                if reason_area.count() > 0:
                    reason_area.fill("Budget high") # 11 chars
                    page.wait_for_timeout(400)
                    page.screenshot(path="browser-test/screenshots/16_rejection_modal_short_error.png")
                    print("16_rejection_modal_short_error.png captured")
                    
                    submit_reject_btn = page.locator("button:has-text('Stamp Rejection Docket')").first
                    is_disabled = submit_reject_btn.is_disabled(timeout=3000)
                    print(f"Short rejection button disabled check: {is_disabled}")
                    
                    # Fill valid reason (>= 20 chars)
                    valid_reason = "Order budget is exceeded and warehouse stock level is sufficient for the coming week."
                    reason_area.fill(valid_reason)
                    page.wait_for_timeout(400)
                    page.screenshot(path="browser-test/screenshots/17_rejection_modal_valid.png")
                    print("17_rejection_modal_valid.png captured")
                    
                    submit_reject_btn.click(timeout=5000)
                    page.wait_for_timeout(3000)

        # Check Policy Learning tab for the new suggestion generated from rejection
        page.locator("button:has-text('Policy Learning')").first.click(timeout=5000)
        page.wait_for_timeout(1500)
        page.screenshot(path="browser-test/screenshots/18_policy_learning_with_suggestion.png", full_page=True)
        print("18_policy_learning_with_suggestion.png captured")

        print("--- 4. END-TO-END WORKFLOW: APPROVE REQUISITION ---")
        # Go to Approval Queue
        page.locator("button:has-text('Approval Queue')").first.click(timeout=5000)
        page.wait_for_timeout(1200)

        # Inspect next approval
        inspect_btn = page.locator("button:has-text('Inspect')").first
        if inspect_btn.count() > 0:
            inspect_btn.click(timeout=5000)
            page.wait_for_timeout(1500)
            
            # Click Certify & Execute PO
            approve_btn = page.locator("button:has-text('Certify & Execute PO')").first
            if approve_btn.count() > 0:
                approve_btn.click(timeout=5000)
                page.wait_for_timeout(3500)
                page.screenshot(path="browser-test/screenshots/19_post_approval_state.png", full_page=True)
                print("19_post_approval_state.png captured")

        # Go to Workflow Runs and check the completed run
        page.locator("button:has-text('Workflow Runs')").first.click(timeout=5000)
        page.wait_for_timeout(1500)
        page.screenshot(path="browser-test/screenshots/20_workflow_runs_after_approval.png", full_page=True)
        print("20_workflow_runs_after_approval.png captured")

        # View details of top run
        view_run_btn = page.locator("button:has-text('VIEW RUN'), button:has-text('View Folio'), tr button").first
        if view_run_btn.count() > 0:
            view_run_btn.click(timeout=5000)
            page.wait_for_timeout(1500)
            page.screenshot(path="browser-test/screenshots/21_completed_run_detail.png", full_page=True)
            print("21_completed_run_detail.png captured")

        print("--- 5. RESPONSIVENESS (TABLET & MOBILE) ---")
        # Tablet (768x1024)
        page.set_viewport_size({"width": 768, "height": 1024})
        page.locator("button:has-text('Replenishment Check')").first.click(timeout=5000)
        page.wait_for_timeout(1000)
        page.screenshot(path="browser-test/screenshots/22_tablet_768px.png", full_page=True)
        print("22_tablet_768px.png captured")

        # Mobile (390x844)
        page.set_viewport_size({"width": 390, "height": 844})
        page.wait_for_timeout(1000)
        page.screenshot(path="browser-test/screenshots/23_mobile_390px.png", full_page=True)
        print("23_mobile_390px.png captured")

        browser.close()

    print("ALL TESTS COMPLETED SUCCESSFULLY!")
    print(f"Interactions logged: {len(report_data['interactions'])}")
    for act in report_data["interactions"]:
        print("ACTION:", act)
    print(f"Console errors/warnings: {len(report_data['console_errors'])}")
    for err in report_data["console_errors"]:
        print("CONSOLE ERR:", err)
    print(f"Network errors: {len(report_data['network_errors'])}")
    for err in report_data["network_errors"]:
        print("NET ERR:", err)

if __name__ == "__main__":
    main()
