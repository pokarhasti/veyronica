import os
import time
from playwright.sync_api import sync_playwright

BEFORE_DIR = r"D:\Projects 2\Veyronica\design-review\before"
os.makedirs(BEFORE_DIR, exist_ok=True)

def run():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)

        # 1. Desktop Screenshots (1440x900)
        context = browser.new_context(viewport={"width": 1440, "height": 900})
        page = context.new_page()
        page.goto("http://localhost:5173", wait_until="networkidle")
        time.sleep(1)

        print("Capturing 01_home_desktop.png...")
        page.screenshot(path=os.path.join(BEFORE_DIR, "01_home_desktop.png"), full_page=True)

        print("Capturing 02_approval_queue_desktop.png...")
        page.click("button:has-text('Approval Queue')")
        page.wait_for_timeout(1000)
        page.screenshot(path=os.path.join(BEFORE_DIR, "02_approval_queue_desktop.png"), full_page=True)

        # Check if any approval item exists to click
        approval_cards = page.locator("button:has-text('Inspect')")
        if approval_cards.count() > 0:
            print("Capturing 03_approval_detail_desktop.png...")
            approval_cards.first.click()
            page.wait_for_timeout(1000)
            page.screenshot(path=os.path.join(BEFORE_DIR, "03_approval_detail_desktop.png"), full_page=True)
        else:
            print("No approval card to click, will check runs...")

        print("Capturing 04_workflow_runs_desktop.png...")
        page.click("button:has-text('Workflow Runs')")
        page.wait_for_timeout(1000)
        page.screenshot(path=os.path.join(BEFORE_DIR, "04_workflow_runs_desktop.png"), full_page=True)

        # Click first run row if available
        run_rows = page.locator("tr.cursor-pointer, button:has-text('VIEW DOCKET'), button:has-text('Inspect')")
        if run_rows.count() > 0:
            print("Capturing 05_run_detail_desktop.png...")
            run_rows.first.click()
            try:
                page.wait_for_selector("text=Opening execution folio", state="detached", timeout=10000)
            except Exception:
                pass
            page.wait_for_timeout(1500)
            page.screenshot(path=os.path.join(BEFORE_DIR, "05_run_detail_desktop.png"), full_page=True)
        else:
            print("No run row found.")

        print("Capturing 06_audit_trail_desktop.png...")
        page.click("button:has-text('Audit Trail')")
        try:
            page.wait_for_selector("text=Fetching audit transactions", state="detached", timeout=10000)
        except Exception:
            pass
        page.wait_for_timeout(1200)
        page.screenshot(path=os.path.join(BEFORE_DIR, "06_audit_trail_desktop.png"), full_page=True)

        print("Capturing 07_dashboard_desktop.png...")
        page.click("button:has-text('Metrics Desk')")
        page.wait_for_timeout(1200)
        page.screenshot(path=os.path.join(BEFORE_DIR, "07_dashboard_desktop.png"), full_page=True)

        print("Capturing 08_policy_learning_desktop.png...")
        page.click("button:has-text('Policy Learning')")
        page.wait_for_timeout(1000)
        page.screenshot(path=os.path.join(BEFORE_DIR, "08_policy_learning_desktop.png"), full_page=True)

        context.close()

        # 2. Mobile Screenshots (390x844)
        m_context = browser.new_context(viewport={"width": 390, "height": 844}, is_mobile=True)
        m_page = m_context.new_page()
        m_page.goto("http://localhost:5173", wait_until="networkidle")
        time.sleep(1)

        print("Capturing 01_home_mobile.png...")
        m_page.screenshot(path=os.path.join(BEFORE_DIR, "01_home_mobile.png"), full_page=True)

        print("Capturing 02_approval_queue_mobile.png...")
        m_page.click("button:has-text('Approval Queue')")
        m_page.wait_for_timeout(1000)
        m_page.screenshot(path=os.path.join(BEFORE_DIR, "02_approval_queue_mobile.png"), full_page=True)

        # Check if any approval item exists to click on mobile
        m_approval_cards = m_page.locator("button:has-text('Inspect')")
        if m_approval_cards.count() > 0:
            print("Capturing 03_approval_detail_mobile.png...")
            m_approval_cards.first.click()
            m_page.wait_for_timeout(1000)
            m_page.screenshot(path=os.path.join(BEFORE_DIR, "03_approval_detail_mobile.png"), full_page=True)

        print("Capturing 04_workflow_runs_mobile.png...")
        m_page.click("button:has-text('Workflow Runs')")
        m_page.wait_for_timeout(1000)
        m_page.screenshot(path=os.path.join(BEFORE_DIR, "04_workflow_runs_mobile.png"), full_page=True)

        m_run_rows = m_page.locator("tr.cursor-pointer, button:has-text('VIEW DOCKET'), button:has-text('Inspect')")
        if m_run_rows.count() > 0:
            print("Capturing 05_run_detail_mobile.png...")
            m_run_rows.first.click()
            try:
                m_page.wait_for_selector("text=Opening execution folio", state="detached", timeout=10000)
            except Exception:
                pass
            m_page.wait_for_timeout(1500)
            m_page.screenshot(path=os.path.join(BEFORE_DIR, "05_run_detail_mobile.png"), full_page=True)

        print("Capturing 06_audit_trail_mobile.png...")
        m_page.click("button:has-text('Audit Trail')")
        try:
            m_page.wait_for_selector("text=Fetching audit transactions", state="detached", timeout=10000)
        except Exception:
            pass
        m_page.wait_for_timeout(1200)
        m_page.screenshot(path=os.path.join(BEFORE_DIR, "06_audit_trail_mobile.png"), full_page=True)

        print("Capturing 07_dashboard_mobile.png...")
        m_page.click("button:has-text('Metrics Desk')")
        m_page.wait_for_timeout(1200)
        m_page.screenshot(path=os.path.join(BEFORE_DIR, "07_dashboard_mobile.png"), full_page=True)

        print("Capturing 08_policy_learning_mobile.png...")
        m_page.click("button:has-text('Policy Learning')")
        m_page.wait_for_timeout(1000)
        m_page.screenshot(path=os.path.join(BEFORE_DIR, "08_policy_learning_mobile.png"), full_page=True)

        m_context.close()
        browser.close()
        print("All screenshots successfully captured!")

if __name__ == "__main__":
    run()
