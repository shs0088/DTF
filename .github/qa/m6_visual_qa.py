import json
import os
import re
import sys
from pathlib import Path
from urllib.parse import urljoin

from playwright.sync_api import sync_playwright, TimeoutError as PlaywrightTimeoutError

BASE_URL = os.environ.get("M6_BASE_URL", "http://127.0.0.1")
DB = os.environ.get("M6_DB", "odoo_m6_visual")
ACTION_ID = os.environ["M6_ACTION_ID"]
ADMIN_LOGIN = "m6-admin@example.test"
OPERATOR_LOGIN = "m6-operator@example.test"
ADMIN_PASSWORD = os.environ["M6_ADMIN_PASSWORD"]
OPERATOR_PASSWORD = os.environ["M6_OPERATOR_PASSWORD"]

OUT = Path("artifacts/m6-visual")
OUT.mkdir(parents=True, exist_ok=True)

report = {
    "head_under_test": os.environ.get("M6_SOURCE_HEAD", ""),
    "admin_login": "NOT VERIFIED",
    "printing_operator_login": "NOT VERIFIED",
    "printing_job_list": "NOT VERIFIED",
    "printing_job_form": "NOT VERIFIED",
    "ready_to_print_master_display": "NOT VERIFIED",
    "master_download": "NOT VERIFIED",
    "status_transitions": "NOT VERIFIED",
    "operator_permissions": "NOT VERIFIED",
    "desktop": "NOT VERIFIED",
    "tablet": "NOT VERIFIED",
    "mobile": "NOT VERIFIED",
    "console_errors": "NOT CHECKED",
    "network_errors": "NOT CHECKED",
    "visual_defects": [],
    "notes": [],
    "screenshots": [],
}
console_errors = []
page_errors = []
network_errors = []


def mark_defect(message):
    if message not in report["visual_defects"]:
        report["visual_defects"].append(message)


def attach_observers(page, label):
    def on_console(msg):
        if msg.type == "error":
            console_errors.append({"page": label, "text": msg.text})
    def on_page_error(exc):
        page_errors.append({"page": label, "text": str(exc)})
    def on_response(resp):
        if resp.status >= 400 and "favicon" not in resp.url:
            network_errors.append({"page": label, "status": resp.status, "url": resp.url})
    page.on("console", on_console)
    page.on("pageerror", on_page_error)
    page.on("response", on_response)


def body_text(page):
    try:
        return page.locator("body").inner_text(timeout=10000)
    except Exception:
        return ""


def screenshot(page, name):
    path = OUT / name
    page.screenshot(path=str(path), full_page=True)
    report["screenshots"].append(name)


def login(page, login_name, password, result_key):
    page.goto(f"{BASE_URL}/web/login?db={DB}", wait_until="domcontentloaded", timeout=60000)
    page.locator('input[name="login"]').fill(login_name)
    page.locator('input[name="password"]').fill(password)
    page.locator('button[type="submit"]').click()
    try:
        page.wait_for_load_state("domcontentloaded", timeout=30000)
    except PlaywrightTimeoutError:
        pass
    page.wait_for_timeout(3000)
    login_box = page.locator('input[name="login"]')
    if "/web/login" not in page.url and login_box.count() == 0:
        report[result_key] = "PASS"
        return True
    screenshot(page, f"{result_key}-login-failed.png")
    report[result_key] = "FAIL"
    report["notes"].append(f"{result_key}: login did not leave the Odoo login page")
    return False


def open_printing_jobs(page):
    candidates = [
        f"{BASE_URL}/web?db={DB}#action={ACTION_ID}",
        f"{BASE_URL}/web#action={ACTION_ID}",
        f"{BASE_URL}/odoo/action-{ACTION_ID}?db={DB}",
    ]
    for url in candidates:
        page.goto(url, wait_until="domcontentloaded", timeout=60000)
        page.wait_for_timeout(3500)
        text = body_text(page)
        if "M6 Customer" in text or "Printing Jobs" in text:
            return True
    return False


def responsive_capture(page, prefix):
    viewports = [
        ("desktop", 1440, 1050),
        ("tablet", 1024, 900),
        ("mobile", 390, 844),
    ]
    for label, width, height in viewports:
        page.set_viewport_size({"width": width, "height": height})
        page.wait_for_timeout(600)
        screenshot(page, f"{prefix}-{label}.png")
        overflow = page.evaluate(
            "() => document.documentElement.scrollWidth > window.innerWidth + 3"
        )
        if overflow:
            mark_defect(f"{prefix}: document-level horizontal overflow at {label} viewport ({width}px)")
            report[label] = "FAIL"
        elif report[label] != "FAIL":
            report[label] = "PASS"


def open_job_form(page):
    customer = page.get_by_text("M6 Customer", exact=True)
    if customer.count() == 0:
        return False
    customer.first.click()
    page.wait_for_timeout(2500)
    text = body_text(page)
    return "Ready-to-Print Master" in text and "M6 Customer" in text


def verify_master_download(page, context):
    text = body_text(page)
    if "m6-master.png" not in text:
        report["master_download"] = "FAIL"
        return

    link_candidates = page.locator('a[href*="/web/content"], a[download], a[title*="Download" i]')
    for i in range(link_candidates.count()):
        node = link_candidates.nth(i)
        try:
            href = node.get_attribute("href")
            label = (node.inner_text(timeout=1000) or "") + " " + (node.get_attribute("title") or "")
            if "m6-master" not in label.lower() and href and "dtf_master_file" not in href:
                continue
            if href:
                resp = context.request.get(urljoin(BASE_URL, href))
                if resp.ok and len(resp.body()) > 0:
                    report["master_download"] = "PASS"
                    report["notes"].append("Master download endpoint was exercised from the rendered file control.")
                    return
        except Exception:
            pass

    buttons = page.locator('button[title*="Download" i], .o_field_binary_file button, .o_field_binary button')
    for i in range(buttons.count()):
        btn = buttons.nth(i)
        try:
            if not btn.is_visible():
                continue
            with page.expect_download(timeout=5000) as info:
                btn.click()
            download = info.value
            download.save_as(str(OUT / "downloaded-m6-master.png"))
            report["master_download"] = "PASS"
            report["screenshots"].append("downloaded-m6-master.png")
            return
        except Exception:
            continue

    report["master_download"] = "FAIL"
    report["notes"].append("Master filename rendered, but an actionable browser download control could not be proven.")


def visible_named_button(page, pattern):
    locator = page.get_by_role("button", name=re.compile(pattern, re.I))
    for i in range(locator.count()):
        try:
            if locator.nth(i).is_visible():
                return locator.nth(i)
        except Exception:
            pass
    return None


def click_status_button(page, label):
    btn = visible_named_button(page, rf"^{re.escape(label)}$")
    if not btn:
        return False
    btn.click()
    page.wait_for_timeout(2200)
    return True


with sync_playwright() as p:
    browser = p.chromium.launch(headless=True)

    admin_context = browser.new_context(viewport={"width": 1440, "height": 1050}, accept_downloads=True)
    admin_page = admin_context.new_page()
    attach_observers(admin_page, "admin")

    if login(admin_page, ADMIN_LOGIN, ADMIN_PASSWORD, "admin_login"):
        screenshot(admin_page, "admin-home.png")
        if open_printing_jobs(admin_page):
            report["printing_job_list"] = "PASS"
            list_text = body_text(admin_page)
            for expected in ("M6 Customer", "M6 Printable Shirt", "m6-master.png"):
                if expected not in list_text:
                    report["printing_job_list"] = "FAIL"
                    mark_defect(f"Printing Jobs list is missing expected value: {expected}")
            responsive_capture(admin_page, "admin-printing-job-list")

            admin_page.set_viewport_size({"width": 1440, "height": 1050})
            if open_job_form(admin_page):
                report["printing_job_form"] = "PASS"
                form_text = body_text(admin_page)
                if "m6-master.png" in form_text and "Ready-to-Print Master" in form_text:
                    report["ready_to_print_master_display"] = "PASS"
                else:
                    report["ready_to_print_master_display"] = "FAIL"
                if "Protected Evidence" not in form_text:
                    mark_defect("Admin form does not show the Protected Evidence group.")
                    report["printing_job_form"] = "FAIL"
                verify_master_download(admin_page, admin_context)
                responsive_capture(admin_page, "admin-printing-job-form")
            else:
                report["printing_job_form"] = "FAIL"
                report["ready_to_print_master_display"] = "FAIL"
                report["master_download"] = "FAIL"
                screenshot(admin_page, "admin-job-form-open-failed.png")
        else:
            report["printing_job_list"] = "FAIL"
            report["printing_job_form"] = "FAIL"
            report["ready_to_print_master_display"] = "FAIL"
            report["master_download"] = "FAIL"
            screenshot(admin_page, "admin-printing-jobs-open-failed.png")

    operator_context = browser.new_context(viewport={"width": 1440, "height": 1050}, accept_downloads=True)
    operator_page = operator_context.new_page()
    attach_observers(operator_page, "operator")

    if login(operator_page, OPERATOR_LOGIN, OPERATOR_PASSWORD, "printing_operator_login"):
        screenshot(operator_page, "operator-home.png")
        if open_printing_jobs(operator_page):
            screenshot(operator_page, "operator-printing-job-list.png")
            operator_list_text = body_text(operator_page)
            list_ok = "M6 Customer" in operator_list_text and "M6 Printable Shirt" in operator_list_text

            create_visible = visible_named_button(operator_page, r"^(New|Create)$") is not None
            if create_visible:
                mark_defect("Printing Operator can see a New/Create control on Printing Jobs list.")

            if open_job_form(operator_page):
                screenshot(operator_page, "operator-printing-job-form-new.png")
                operator_form_text = body_text(operator_page)
                protected_hidden = "Protected Evidence" not in operator_form_text
                master_visible = "m6-master.png" in operator_form_text and "Ready-to-Print Master" in operator_form_text

                transitions = []
                if click_status_button(operator_page, "Start Preparation"):
                    transitions.append("new->under_preparation")
                    screenshot(operator_page, "operator-under-preparation.png")
                if click_status_button(operator_page, "Mark Ready"):
                    transitions.append("under_preparation->ready")
                    screenshot(operator_page, "operator-ready.png")
                if click_status_button(operator_page, "Complete"):
                    transitions.append("ready->completed")
                    screenshot(operator_page, "operator-completed.png")

                report["status_transitions"] = "PASS" if len(transitions) == 3 else "FAIL"
                if len(transitions) != 3:
                    report["notes"].append(f"Observed status transitions: {transitions}")

                report["operator_permissions"] = (
                    "PASS" if list_ok and protected_hidden and not create_visible else "FAIL"
                )
                if not protected_hidden:
                    mark_defect("Protected Evidence is visible to Printing Operator.")
                if not master_visible:
                    mark_defect("Printing Operator form does not render the Ready-to-Print Master filename.")
            else:
                report["operator_permissions"] = "FAIL"
                report["status_transitions"] = "FAIL"
                screenshot(operator_page, "operator-job-form-open-failed.png")
        else:
            report["operator_permissions"] = "FAIL"
            report["status_transitions"] = "FAIL"
            screenshot(operator_page, "operator-printing-jobs-open-failed.png")

    admin_context.close()
    operator_context.close()
    browser.close()

report["console_errors"] = "PASS" if not console_errors and not page_errors else "FAIL"
report["network_errors"] = "PASS" if not network_errors else "FAIL"
report["console_error_details"] = console_errors
report["page_error_details"] = page_errors
report["network_error_details"] = network_errors

json_path = OUT / "m6-visual-report.json"
json_path.write_text(json.dumps(report, indent=2, ensure_ascii=False), encoding="utf-8")

lines = [
    "# M6 VISUAL INSPECTION",
    "",
    f"HEAD: {report['head_under_test']}",
    "",
]
labels = [
    ("ADMIN LOGIN", "admin_login"),
    ("PRINTING OPERATOR LOGIN", "printing_operator_login"),
    ("PRINTING JOB LIST", "printing_job_list"),
    ("PRINTING JOB FORM", "printing_job_form"),
    ("READY-TO-PRINT MASTER DISPLAY", "ready_to_print_master_display"),
    ("MASTER DOWNLOAD", "master_download"),
    ("STATUS TRANSITIONS", "status_transitions"),
    ("OPERATOR PERMISSIONS", "operator_permissions"),
    ("DESKTOP", "desktop"),
    ("TABLET", "tablet"),
    ("MOBILE", "mobile"),
    ("CONSOLE ERRORS", "console_errors"),
    ("NETWORK ERRORS", "network_errors"),
]
for label, key in labels:
    lines.extend([f"## {label}", report[key], ""])

lines.append("## VISUAL DEFECTS")
if report["visual_defects"]:
    for i, item in enumerate(report["visual_defects"], 1):
        lines.append(f"{i}. {item}")
else:
    lines.append("None detected by automated viewport/visibility checks.")
lines.append("")
lines.append("## SCREENSHOTS / ARTIFACTS")
for item in report["screenshots"]:
    lines.append(f"- {item}")
lines.append("")
if report["notes"]:
    lines.append("## NOTES")
    for item in report["notes"]:
        lines.append(f"- {item}")

(OUT / "m6-visual-report.md").write_text("\n".join(lines) + "\n", encoding="utf-8")

required = [
    "admin_login",
    "printing_operator_login",
    "printing_job_list",
    "printing_job_form",
    "ready_to_print_master_display",
    "master_download",
    "status_transitions",
    "operator_permissions",
    "desktop",
    "tablet",
    "mobile",
    "console_errors",
    "network_errors",
]
failed = [key for key in required if report[key] != "PASS"]
print(json.dumps(report, indent=2, ensure_ascii=False))
if failed:
    print("M6 VISUAL QA FAILED:", ", ".join(failed), file=sys.stderr)
    sys.exit(1)
print("M6 VISUAL QA PASSED")
