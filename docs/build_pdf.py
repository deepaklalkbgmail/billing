#!/usr/bin/env python3
"""Build the professional PDF user manual (with screenshots) from USER_MANUAL.md.

Needs: pandoc, poppler-utils (pdftotext), Pillow, and Playwright's Chromium.
Run from the repo root:  python3 docs/build_pdf.py
Screenshots are read from docs/screenshots/.
"""
import os, re, subprocess, html, datetime, sys

ROOT = os.path.dirname(os.path.abspath(__file__))
SHOTS = os.path.join(ROOT, 'screenshots')
MD = os.path.join(ROOT, 'USER_MANUAL.md')
OUT = os.path.join(ROOT, 'RestoPOS_User_Manual.pdf')
TMP = os.path.join(ROOT, '.build')
os.makedirs(TMP, exist_ok=True)

# heading-prefix -> list of (image file, caption)
FIGS = {
    '5.1 Login screen': [('01-login.png', 'The sign-in screen')],
    '6.1 Dashboard': [('02-dashboard.png', 'Dashboard — summary cards, 7-day revenue trend and top-selling dishes')],
    '6.2 POS Billing': [('03-pos-empty.png', 'POS Billing — menu side (left) and order side (right)')],
    '6.2.3 The cart': [('04-pos-cart.png', 'An order in progress: three dishes, GST switched ON, Net Payable at the bottom'),
                        ('05-pos-note.png', 'Special Instructions — a kitchen note for one dish')],
    '6.2.4 Totals area': [('06-pos-discount.png', 'Apply Bill Discount — flat rupees or percent')],
    '6.2.6 Settle Payment': [('07-pos-settle.png', 'Settle Payment — choose the payment mode, split if needed, then Finalize & Print')],
    '6.2.7 Held Orders': [('08-pos-held.png', 'Held Orders — resume a saved or parked bill')],
    '6.3 Menu Manager': [('09-menu.png', 'Menu Manager — categories on the left, dishes on the right'),
                         ('10-menu-dialog.png', 'Add New Menu Item dialog'),
                         ('11-menu-category.png', 'Create Category dialog')],
    '6.4 Inventory': [('12-inventory.png', 'Inventory — stock on hand with minimum thresholds'),
                      ('13-inventory-adjust.png', 'Stock Adjustment dialog (wastage, audit, opening stock)'),
                      ('14-inventory-recipe.png', 'Recipe BOM & Consumption tab')],
    '6.5 Purchases': [('15-purchases.png', 'Purchases — inward purchase orders with payment status'),
                      ('16-purchase-dialog.png', 'Record Inward Purchase dialog'),
                      ('17-vendors.png', 'Vendors & Suppliers tab')],
    '6.6 Expenses': [('18-expenses.png', 'Expenses — summary cards, filters and the expense register'),
                     ('19-expense-dialog.png', 'Record New Expense dialog')],
    '6.7 Day Close': [('20-dayclose-active.png', 'Day Close — an active cash session with the four figures'),
                      ('21-dayclose-count.png', 'Entering the physical cash count before closing the shift')],
    '6.8 Reports': [('22-reports-sales.png', 'Reports — Sales Report'),
                    ('23-reports-gst.png', 'Reports — GST Tax Filing'),
                    ('24-reports-expenses.png', 'Reports — Expenses by category'),
                    ('25-reports-pnl.png', 'Reports — Profit & Loss'),
                    ('26-reports-items.png', 'Reports — Item Analytics')],
    'Branch Profile': [('27-settings-branch.png', 'Settings — Branch Profile')],
    'GST & Taxes': [('28-settings-gst.png', 'Settings — GST & Taxes')],
    'ESC/POS Printer': [('29-settings-printer.png', 'Settings — ESC/POS Printer')],
    'Receipt Template': [('30-settings-receipt.png', 'Settings — Receipt Template')],
    'Payment Modes': [('31-settings-payments.png', 'Settings — Payment Modes')],
    'Staff Users': [('32-settings-users.png', 'Settings — Staff Users'),
                    ('34-settings-adduser.png', 'Add Terminal User dialog')],
    'Database Backup': [('33-settings-backup.png', 'Settings — Database Backup')],
}
MOBILE = ('4.2 On a phone or tablet', [
    ('40-phone-pos.png', 'Phone: Menu view'),
    ('41-phone-cart.png', 'Phone: Cart view'),
    ('42-phone-menu.png', 'Phone: navigation menu (☰)'),
    ('44-tablet-pos.png', 'Tablet: POS')])

fig_no = [0]
DIALOGS = {'05', '06', '07', '08', '10', '11', '13', '16', '19', '34'}


def fig_html(img, cap):
    fig_no[0] += 1
    cls = 'shot dlg' if img.split('-')[0] in DIALOGS else 'shot'
    return ('<figure class="%s"><img src="%s"/><figcaption><b>Figure %d.</b> %s</figcaption></figure>'
            % (cls, os.path.join(SHOTS, img), fig_no[0], html.escape(cap)))


def md_with_figures():
    text = open(MD, encoding='utf-8').read()
    text = re.sub(r'^---\n.*?\n---\n', '', text, count=1, flags=re.S)
    out = []
    for line in text.split('\n'):
        out.append(line)
        m = re.match(r'^#{1,4}\s+(.*)$', line)
        if not m:
            continue
        title = m.group(1)
        if title.startswith(MOBILE[0]):
            fig_no_start = fig_no[0]
            cells = ''.join(
                '<figure class="shot mini"><img src="%s"/><figcaption><b>Figure %d.</b> %s</figcaption></figure>'
                % (os.path.join(SHOTS, i), fig_no[0] + k + 1, html.escape(c))
                for k, (i, c) in enumerate(MOBILE[1]))
            fig_no[0] += len(MOBILE[1])
            out += ['', '<div class="fig-row">' + cells + '</div>', '']
            continue
        for key, figs in FIGS.items():
            if title.startswith(key):
                for img, cap in figs:
                    if os.path.exists(os.path.join(SHOTS, img)):
                        out += ['', fig_html(img, cap), '']
                break
    return '\n'.join(out)


CSS = """
@page { size: A4; margin: 22mm 16mm 20mm 16mm;
  @bottom-left { content: "RestoPOS User Manual"; font: 8pt Inter, sans-serif; color: #64748b; }
  @bottom-right { content: counter(page); font: 8pt Inter, sans-serif; color: #64748b; }
  @top-right { content: string(chapter); font: 8pt Inter, sans-serif; color: #64748b; } }
@page toc { @top-right { content: "Contents" } }
* { box-sizing: border-box; }
html { counter-reset: page 1; font-family: Inter, 'Segoe UI', Arial, sans-serif; font-size: 10pt; color: #0f172a; line-height: 1.5; }
body { margin: 0; }
.cover { height: 296mm; width: 210mm; overflow: hidden; position: relative; background: #0b1f5c;
  background: linear-gradient(160deg, #0b1f5c 0%, #1e40af 60%, #2563eb 100%); color: #fff; padding: 40mm 22mm; }
.cover .brand { font-size: 13pt; letter-spacing: 4px; text-transform: uppercase; opacity: .85; }
.cover h1 { page-break-before: avoid; font-size: 44pt; line-height: 1.05; margin: 14mm 0 6mm; font-weight: 800; border: 0; padding: 0; color: #fff; string-set: none; }
.cover .sub { font-size: 16pt; opacity: .95; max-width: 150mm; }
.cover .bar { width: 40mm; height: 3mm; background: #f59e0b; margin: 12mm 0; border-radius: 2px; }
.cover .meta { position: absolute; bottom: 30mm; left: 22mm; right: 22mm; font-size: 10.5pt; opacity: .9; border-top: 1px solid rgba(255,255,255,.35); padding-top: 6mm; }
.cover .meta b { display: block; font-size: 11pt; }
.toc-page { page: toc; page-break-after: always; }
.toc-page h1 { font-size: 22pt; color: #1e40af; border: 0; margin-top: 0; page-break-before: avoid; string-set: chapter "Contents"; }
.toc-page ul { list-style: none; margin: 0; padding: 0; }
.toc-page li { display: flex; align-items: baseline; margin: 0; padding: 1.2px 0; }
.toc-page li .t { flex: none; }
.toc-page li .d { flex: 1; border-bottom: 1px dotted #94a3b8; margin: 0 4px; transform: translateY(-3px); }
.toc-page li .p { flex: none; color: #334155; font-variant-numeric: tabular-nums; }
.toc-page li.l1 { margin-top: 7px; font-weight: 700; color: #0f172a; font-size: 10.5pt; }
.toc-page li.l2 { padding-left: 7mm; font-size: 9pt; color: #334155; }
h1 { font-size: 20pt; color: #1e40af; border-bottom: 3px solid #f59e0b; padding-bottom: 3mm; margin: 0 0 6mm; page-break-before: always; string-set: chapter content(); }
h1.nobreak { page-break-before: avoid; }
h2 { font-size: 14pt; color: #1e3a8a; margin: 8mm 0 3mm; page-break-after: avoid; border-left: 4px solid #1e40af; padding-left: 3mm; }
h3 { font-size: 11.5pt; color: #1d4ed8; margin: 6mm 0 2mm; page-break-after: avoid; }
p { margin: 0 0 3mm; orphans: 3; widows: 3; }
ul, ol { margin: 0 0 3mm; padding-left: 6mm; }
li { margin-bottom: 1mm; }
code { font-family: 'DejaVu Sans Mono', monospace; font-size: 8.5pt; background: #eef2ff; color: #1e3a8a; padding: 0 3px; border-radius: 3px; }
pre { background: #0f172a; color: #e2e8f0; padding: 3mm 4mm; border-radius: 4px; font-size: 8.5pt; page-break-inside: avoid; }
pre code { background: none; color: inherit; padding: 0; }
table { width: 100%; border-collapse: collapse; margin: 2mm 0 5mm; font-size: 8.8pt; page-break-inside: auto; }
thead { display: table-header-group; }
tr { page-break-inside: avoid; }
th { background: #1e40af; color: #fff; text-align: left; padding: 2mm 2.5mm; font-weight: 600; }
td { padding: 1.8mm 2.5mm; border-bottom: 1px solid #e2e8f0; vertical-align: top; }
tbody tr:nth-child(even) td { background: #f8fafc; }
blockquote { margin: 3mm 0 5mm; padding: 3mm 4mm; background: #fffbeb; border-left: 4px solid #f59e0b; border-radius: 0 4px 4px 0; page-break-inside: avoid; }
blockquote p:last-child { margin: 0; }
hr { border: 0; border-top: 1px solid #e2e8f0; margin: 6mm 0; }
figure.shot { margin: 3mm 0 6mm; page-break-inside: avoid; text-align: center; }
figure.shot img { max-width: 100%; max-height: 135mm; max-width: 100%; border: 1px solid #cbd5e1; border-radius: 6px; box-shadow: 0 2px 8px rgba(15,23,42,.12); }
figure.dlg img { max-width: 118mm; }
figure.shot figcaption { font-size: 8.5pt; color: #475569; margin-top: 2mm; font-style: italic; }
.fig-row { display: flex; gap: 4mm; justify-content: space-between; align-items: flex-start; page-break-inside: avoid; margin: 3mm 0 6mm; }
figure.mini { flex: 1; margin: 0; }
figure.mini img { max-height: 95mm; }
.end { text-align: center; color: #64748b; margin-top: 10mm; }
"""


def pandoc_html(md_text):
    src = os.path.join(TMP, 'body.md')
    open(src, 'w', encoding='utf-8').write(md_text)
    r = subprocess.run(['pandoc', src, '-f', 'markdown+raw_html-implicit_figures', '-t', 'html5', '--no-highlight'],
                       capture_output=True, text=True, check=True)
    return r.stdout


def toc_entries(body):
    ents = []
    for m in re.finditer(r'<h([12])[^>]*>(.*?)</h\1>', body, flags=re.S):
        t = re.sub(r'<[^>]+>', '', m.group(2))
        ents.append((int(m.group(1)), html.unescape(t).strip()))
    return ents


def build_html(body, pages):
    ents = toc_entries(body)
    lis = ''.join(
        '<li class="l%d"><span class="t">%s</span><span class="d"></span><span class="p">%s</span></li>'
        % (lv, html.escape(t), pages.get(t, '··'))
        for lv, t in ents)
    today = datetime.date.today().strftime('%B %Y')
    cover = ('<section class="cover"><div class="brand">RestoPOS</div><h1>User Manual</h1><div class="bar"></div>'
             '<div class="sub">Multi-Branch Restaurant Billing, Inventory &amp; Expense Management</div>'
             '<div class="meta"><b>For Cashiers · Branch Managers · Owners</b>Every screen, button and label explained · Version 1.0 · %s</div></section>' % today)
    toc = '<section class="toc-page"><h1>Contents</h1><ul>%s</ul></section>' % lis
    return cover, ('<!doctype html><html><head><meta charset="utf-8"><title>RestoPOS User Manual</title><style>%s</style></head><body>%s%s'
            '<p class="end">— End of manual —</p></body></html>' % (CSS, toc, body))


def render(html_path, pdf_path):
    js = """
const { chromium } = require('playwright');
(async()=>{const b=await chromium.launch();const p=await b.newPage();
await p.goto('file://%s');await p.waitForTimeout(800);
await p.pdf({path:'%s',format:'A4',printBackground:true,preferCSSPageSize:true});await b.close();})();
""" % (html_path, pdf_path)
    f = os.path.join(TMP, 'r.cjs')
    open(f, 'w').write(js)
    root = subprocess.run(['npm', 'root', '-g'], capture_output=True, text=True).stdout.strip()
    env = dict(os.environ, NODE_PATH=root)
    subprocess.run(['node', f], check=True, env=env)


def cover_rules():
    return ''.join(re.findall(r'\.cover[^{]*\{[^}]*\}', CSS))


def find_pages(pdf, ents):
    n = int(re.search(r'Pages:\s+(\d+)', subprocess.run(['pdfinfo', pdf], capture_output=True, text=True).stdout).group(1))
    texts = []
    for i in range(1, n + 1):
        t = subprocess.run(['pdftotext', '-f', str(i), '-l', str(i), '-layout', pdf, '-'], capture_output=True, text=True).stdout
        texts.append(re.sub(r'\s+', ' ', t))
    pages = {}
    start = 2  # body page 1 is the contents page
    while start <= n and 'Contents' in texts[start - 1][:60]:
        start += 1
    cur = start
    for lv, t in ents:
        key = re.sub(r'\s+', ' ', t)
        for i in range(cur, n + 1):
            if key in texts[i - 1]:
                pages[t] = str(i + 1)
                cur = i
                break
    return pages


COVER_CSS = "@page{size:A4;margin:0} html,body{margin:0;padding:0;height:296mm;overflow:hidden;font-family:Inter,'Segoe UI',Arial,sans-serif}"


def main():
    body = pandoc_html(md_with_figures())
    ents = toc_entries(body)
    cover, page = build_html(body, {})
    cover_doc = ('<!doctype html><html><head><meta charset="utf-8"><style>%s%s</style></head><body>%s</body></html>'
                 % (COVER_CSS, cover_rules(), cover))
    ch = os.path.join(TMP, 'cover.html')
    open(ch, 'w', encoding='utf-8').write(cover_doc)
    cpdf = os.path.join(TMP, 'cover.pdf')
    render(ch, cpdf)
    h = os.path.join(TMP, 'manual.html')
    bpdf = os.path.join(TMP, 'body.pdf')
    open(h, 'w', encoding='utf-8').write(page)
    render(h, bpdf)
    pages = find_pages(bpdf, ents)          # pass 1: find page numbers
    _, page = build_html(body, pages)
    open(h, 'w', encoding='utf-8').write(page)
    render(h, bpdf)                          # pass 2: contents with page numbers
    subprocess.run(['pdfunite', cpdf, bpdf, OUT], check=True)
    print('Wrote', OUT)


if __name__ == '__main__':
    main()
