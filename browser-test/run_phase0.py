import time
from playwright.sync_api import sync_playwright

console_logs = []
network_errors = []

start_time = time.time()
with sync_playwright() as p:
    browser = p.chromium.launch()
    page = browser.new_page(viewport={"width": 1440, "height": 900})
    
    page.on("console", lambda msg: console_logs.append(f"[{msg.type}] {msg.text}"))
    page.on("requestfailed", lambda req: network_errors.append(f"FAILED: {req.method} {req.url} - {req.failure}"))
    
    t0 = time.time()
    response = page.goto("http://localhost:5173", wait_until="networkidle")
    load_time = time.time() - t0
    
    # Wait an extra second for any rendering/animations
    page.wait_for_timeout(1000)
    
    screenshot_path = "browser-test/screenshots/phase0_first_screen.png"
    page.screenshot(path=screenshot_path, full_page=True)
    
    title = page.title()
    content = page.content()
    
    browser.close()

print(f"LOAD_TIME: {load_time:.2f}s")
print(f"TITLE: {title}")
print(f"CONSOLE_LOGS_COUNT: {len(console_logs)}")
for log in console_logs:
    print("CONSOLE:", log)
print(f"NETWORK_ERRORS_COUNT: {len(network_errors)}")
for err in network_errors:
    print("NETWORK_ERROR:", err)

