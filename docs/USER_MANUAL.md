---
title: "RestoPOS — User Manual"
subtitle: "Multi-Branch Restaurant Billing, Inventory & Expense Management"
---

# 1. About this manual

RestoPOS is a restaurant billing (POS) system that runs on your own computer. It handles billing at the counter, the kitchen ticket (KOT), stock, supplier purchases, daily expenses, cash-drawer closing, GST and reports — for up to four branches plus the owner's head-office view.

This manual explains **every screen, every button and every label** in the software, in plain language. Find your role in the table below and read the chapters marked for you.

| You are… | Read these chapters first |
|---|---|
| **Cashier** (takes orders, bills, counter cash) | 2, 3, 5 (Login, Top bar), 6.2 POS, 6.7 Expenses, 6.8 Day Close, 10 |
| **Branch Manager** (stock, menu, expenses, day close of one branch) | 2, 3, 5, 6.1–6.9, 9, 10 |
| **Owner / Super Admin** (all branches, settings, reports, users) | Everything, especially 6.3, 6.9, 6.10 and 7 |
| **Person installing / maintaining the computer** | 11 (Setup, backup, phone access), 12 (Troubleshooting) |

> **Important to know before you start:** a few things in the original plan are *not available in this version of the software yet* (for example, adding tables, adding branches, inter-branch stock transfer screen, bill history/cancel screen). They are listed honestly in **Chapter 13 — Current limitations**. Please read it so you are not surprised.

---

# 2. The three user roles

Every person who signs in has one role. The role decides which screens they see and what they can change.

| Role | Branch | Purpose |
|---|---|---|
| **Super Admin** (Owner) | All branches | Full control: settings, users, all reports, branch comparison, menu creation, backups. |
| **Branch Manager** | One branch | Runs one outlet: stock, purchases, expenses, day close, reports of that branch. Cannot open *Settings*. |
| **Cashier** | One branch | Billing, KOT, petty-cash expenses, day close. Nothing else. |

## 2.1 What each role can see (left menu)

| Screen | Super Admin | Branch Manager | Cashier |
|---|:--:|:--:|:--:|
| Dashboard | ✔ | ✔ | — |
| POS Billing | ✔ | ✔ | ✔ |
| Menu Manager | ✔ | ✔ (see note) | — |
| Inventory | ✔ | ✔ | — |
| Purchases | ✔ | ✔ | — |
| Expenses | ✔ | ✔ | ✔ |
| Day Close | ✔ | ✔ | ✔ |
| Reports | ✔ | ✔ | — |
| Settings | ✔ | — | — |

**Finer rules**

* **Creating a new menu item** is allowed for the **Super Admin only**. Managers can edit existing items, change availability and delete, and manage categories.
* **Expenses:** a Cashier can *record* a new expense. Only a Manager or Super Admin can *edit or delete* an expense or *create a new expense category*.
* **Branch-wise comparison** on the Dashboard is shown to the Super Admin only.
* A Cashier opening the software lands directly on **POS Billing**. Managers and the Super Admin land on the **Dashboard**.

---

# 3. Quick start (5 minutes)

## 3.1 Cashier — a normal day

1. **Sign in** (Chapter 5.1).
2. Open **Day Close** → type the **Opening Cash Balance Float** (the coins and notes you start with) → press **Open Cash Drawer & Start Billing**.
3. Open **POS Billing**. Choose *Dine-In*, *Takeaway* or *Delivery*.
4. Tap dishes (or type a short code like `101` and press **Enter**). Add notes if needed.
5. Press **Print KOT (F2)** to send the order to the kitchen.
6. When the guest pays, press **Settle (F12)** → choose Cash/UPI/Card → **Finalize & Print**.
7. Record any cash you paid out (vegetables, gas…) in **Expenses**, choosing *Counter Cash Drawer*.
8. At night open **Day Close**, count the physical cash, type it in, press the close button.

## 3.2 Manager — a normal day

1. Check the **Dashboard** for sales.
2. Receive goods → **Purchases → New Inward Purchase** (stock goes up automatically).
3. Check **Inventory → Show Low Stock Only** and order what is low.
4. Review **Expenses** and **Day Close** history for shortages.

## 3.3 Owner — a normal day

1. Open the **Dashboard**, choose *Today / This Week / This Month*.
2. Compare branches in **Branch Performance Matrix**.
3. Open **Reports** for GST, profit & loss and best-selling dishes; press **Export CSV**.
4. Use **Settings → Database Backup → Create Backup Now** regularly.

---

# 4. Opening the software

## 4.1 On the shop computer

Open a browser (Chrome or Edge) and go to **http://localhost:5173** (if started with `npm run dev`) or **http://localhost:3456** (if started with `npm start`). Your installer will tell you which one.

## 4.2 On a phone or tablet (same Wi-Fi)

1. On the shop PC, press **Windows key**, type `cmd`, press Enter, type `ipconfig` and note the **IPv4 Address** (for example `192.168.1.20`).
2. On the phone/tablet browser open `http://192.168.1.20:3456` (use your own address and port).
3. In the browser menu choose **Add to Home screen** to get an app-like icon.

The software automatically adapts to the screen size:

* **Phone / small tablet:** the left menu hides behind a **☰** button; POS shows either *Menu* or *Cart* with a switch bar at the bottom.
* **Large tablet in landscape / laptop / desktop:** the full layout with the permanent left menu.

> The computer running RestoPOS must be switched on and on the same network. If the phone cannot open the page, see Chapter 12.

---

# 5. Common screen elements

## 5.1 Login screen

| Label | What to do |
|---|---|
| **Username** | Type your user name, e.g. `cashier1`. |
| **Password** | Type your password. |
| **Sign In to Terminal** | Press to enter. A green message "Welcome back, *your name*!" confirms. |

If the username or password is wrong, a red message appears; try again. Ask the owner to reset a forgotten password (6.10, *Staff Users*).

## 5.2 The top bar

| Item | Meaning |
|---|---|
| **☰ (phones/tablets only)** | Opens the left menu. |
| **Branch box** | *Super Admin:* a drop-down **Select Branch** — choose which outlet you are working on. Everything (menu prices, stock, bills, reports) then refers to that branch. *Manager/Cashier:* shows your branch name (fixed). |
| **Mouse / Keyboard icon** | Switches POS style between **Touch Mode** (tap items) and **Keyboard Mode** (type short codes). Hover to read the current mode. |
| **Sun / Moon icon** | Choose **Light**, **Dark** or **System** colour theme. |
| **Person icon / your name** | Shows who is signed in and the role (name appears on larger screens). |

> **Super Admin:** always choose a branch before billing. If no branch is selected the POS will say *"Please select a branch (top bar) before billing"*.

## 5.3 The left menu

Lists the screens your role can open (table in 2.1). At the bottom you see your name, role and **Logout**. On a laptop/desktop use the small **‹ / ›** arrow at the top to shrink the menu to icons only.

## 5.4 Messages (toasts)

Small boxes at the top-right confirm or warn: green tick = done, red = failed/needs attention. Read them — if a save fails the software tells you and does **not** pretend it saved.

## 5.5 Money and units

* All amounts are in **Indian Rupees (₹)**, shown with two decimals.
* The final bill amount is **rounded to the nearest whole rupee**; the difference is shown as **Round Off**.
* Stock quantities use units such as kg, litre, piece, cylinder.

---

# 6. Screen-by-screen guide

## 6.1 Dashboard (Owner & Manager)

Purpose: a quick picture of how the business is doing.

**Top right controls**

| Label | Meaning |
|---|---|
| **Today / This Week / This Month** | Period for the figures below ("This Week" = last 7 days, "This Month" = from the 1st). |
| **Refresh** | Reload the latest numbers. |

**Four summary cards**

| Card | Meaning |
|---|---|
| **Total Revenue** | Total sales (net bill amounts, cancelled bills excluded) in the period. |
| **Bills Generated** | Number of bills; below it **Avg ticket** = revenue ÷ bills. |
| **Total Expenses** | All recorded expenses in the period (counter cash and bank). |
| **Net Collection** | Revenue minus expenses. |

**Revenue Trend (Last 7 Days)** — bar chart, one bar per day, amounts in ₹ thousands (always the last 7 days).

**Top 5 Selling Items** — most popular dishes by quantity, with number sold and sales value.

**Branch Performance Matrix** *(Super Admin only)* — one row per branch:

| Column | Meaning |
|---|---|
| **Code** | Branch code (B1…B4). |
| **Branch Name** | Outlet name. |
| **Today's Sales** | Sales for the selected period. |
| **Orders** | Number of bills. |
| **Expenses** | Expenses for the period. |
| **Net Margin** | Sales minus expenses. |
| **Status** | Active. |

When the database is new, everything shows **₹0.00 / 0** and empty lists — that is correct.

## 6.2 POS Billing (everyone)

The heart of the software. It has a **menu side** (left) and an **order/cart side** (right). On phones/small tablets use the bottom switch **Menu | Cart (n) · ₹total**.

### 6.2.1 Order type and customer details (top of the menu side)

| Button / box | Meaning |
|---|---|
| **Dine-In** | Guest eats in the restaurant. Shows the **Table** box. |
| **Takeaway** | Parcel; shows **Customer Name / Customer Phone** and the **Parcel** button. |
| **Delivery** | Home delivery; also shows **Customer Name / Customer Phone** and **Parcel**. |
| **Table: Select Table** | Choose the table number/name for dine-in. *(Tables must already exist — see Chapter 13.)* |
| **Customer Name / Customer Phone** | Optional details for takeaway/delivery (useful for credit/due customers and delivery calls). |
| **Held Bills (F6)** | Opens the list of orders that are saved but not paid (6.2.5). |

### 6.2.2 Finding and adding dishes

* **Search box** — "Search dishes or type item shortcode and press Enter (e.g. 101)". Type part of a dish name to filter, or type the exact **short code** and press **Enter** to add it instantly. Pressing Enter with only one match also adds that match.
* **Category tabs** — **All Items**, Starters, Main Course, … Tap one to show only that category.
* **Dish cards** — each card shows the **short code** (blue), a **green/red dot** (green = vegetarian, red = non-vegetarian), the **name** and the **price**. **Tap a card to add one**; tap again to add more.
* **No menu items match your criteria / Reset Filters** — appears when the search finds nothing; press **Reset Filters** to start over.
* Dishes marked *not available* in the Menu Manager cannot be ordered.

### 6.2.3 The cart (right side)

Header: **Current Order**, the order type badge, and "Table: …" or customer name. The **↺ (clear)** icon (shortcut **F9**) empties the cart after asking you to confirm.

Each line shows: dish name, price each, line total, and:

| Control | Meaning |
|---|---|
| **− / +** | Decrease / increase quantity. Reducing to 0 removes the line. |
| **Add Note** (small note icon) | Opens **Special Instructions** — type a kitchen note such as "Less spicy, no onion" → **Save Note**. The note prints on the KOT. |
| **Trash icon** | **Remove Item** from the order. |

An empty cart shows **Order Cart is Empty — Select items from the left menu or enter short codes to begin billing.**

### 6.2.4 Totals area and quick options

| Label | Meaning |
|---|---|
| **Add Discount** | Opens **Apply Bill Discount**: choose **Flat ₹** (a rupee amount) or **Percent %**, type the value, press **Apply Discount**. **Remove** cancels the discount. The discount applies to the whole bill. |
| **GST (F8) ON / OFF** | Switches GST on or off for *this bill only* (see Chapter 8). |
| **Parcel** *(Takeaway/Delivery only)* | Adds or removes a **₹20 packing charge** with one tap. |
| **Subtotal** | Sum of dish totals. |
| **Discount** | Shown only when a discount is applied (negative). |
| **CGST (2.5%) / SGST (2.5%)** | Shown when GST is ON; half of the tax each. |
| **Parcel / Packing** | The packing charge, if added. |
| **Round Off** | Small ± amount to make the total a whole rupee. |
| **NET PAYABLE** | **The final amount to collect.** |

### 6.2.5 Action buttons

| Button | Shortcut | What it does |
|---|---|---|
| **Save & Print (F1)** | F1 | Saves the bill as an **open bill** and prints the customer receipt. The bill stays *unpaid* — use this to hand the guest the bill before they pay. Settle it later from **Held Bills**. |
| **Print KOT (F2)** | F2 | Prints the **Kitchen Order Ticket** for items not yet sent to the kitchen. Items already sent are not printed twice ("All items … already sent to KOT"). |
| **Hold Bill (F4)** | F4 | Parks the order so you can serve another customer. It appears under **Held Bills**. |
| **Settle (F12)** | F12 | Opens payment (6.2.6). |

### 6.2.6 Settle Payment dialog

Shows the amount due at the top right.

| Label | Meaning |
|---|---|
| **CASH / UPI / CARD / ZOMATO / SWIGGY / PAYTM / CREDIT** | Quick buttons to choose the first payment type. **CREDIT** means the customer will pay later (a due customer). |
| **Payment-mode box, amount box (₹), Ref # (optional)** | One row per payment: choose the mode, enter the amount, and optionally a UPI/card reference number. |
| **Add Split Tender Row** | Add another row for **split payments** — e.g., ₹300 Cash + ₹200 UPI. |
| **Total Tendered / Remaining Due** | Running total of what is entered and what is still pending. The green **Fully Paid** shows when it is covered. |
| **Finalize & Print** | Completes the bill and prints the receipt. Disabled until the full amount is covered. |
| **Cancel** | Close without paying. |

When settled, the bill is closed, the cart clears, **cash payments are added to the day's cash drawer**, and a green message confirms.

### 6.2.7 Held Orders dialog (F6)

Lists open/held bills with bill number, table or customer and amount. Press **Resume** to load it back into the cart for more items or payment. (This is where "Save & Print" bills are settled later.)

### 6.2.8 Keyboard shortcuts (POS)

| Key | Action |
|---|---|
| **Enter** (in search) | Add item by short code / single match |
| **F1** | Save & Print bill |
| **F2** | Print KOT |
| **F4** | Hold bill |
| **F6** | Held Bills |
| **F8** | GST on/off |
| **F9** | Clear cart |
| **F12** | Settle / payment |
| **Esc** | Close the open dialog |

> On a PC, switch to **Keyboard Mode** (top bar icon) for fastest billing: type code → Enter → type next code → Enter → F12.

### 6.2.9 Typical flows

**Dine-in:** Dine-In → pick Table → add dishes → **F2** KOT → (guest finishes) → **F1** print bill (optional) → **F12** Settle.

**Takeaway:** Takeaway → add dishes → *Parcel* if charged → **F12** → Cash → Finalize & Print.

**Rush hour:** Order 1 → **F4** Hold → serve Order 2 → **F6** → Resume Order 1.

## 6.3 Menu Manager (Manager & Owner)

Purpose: your dish list, categories, prices and GST rates.

**Buttons at the top:** **Add Category**, **Add Menu Item** *(Super Admin only)*.

**Categories panel (left):** **All Items** plus each category with the number of dishes. Tap one to filter the table. Use the small edit/delete icons beside a category to rename (**Edit Category**) or delete it. A category that still has dishes **cannot be deleted** ("Cannot delete category with associated items").

**Category dialog**

| Field | Meaning |
|---|---|
| **Category Name** | e.g. *Starters, Desserts*. |
| **Display Order** | Smaller numbers appear first on the POS. |
| **Save Category** | Saves. |

**Dish table**

| Column | Meaning |
|---|---|
| **Code** | Short code used for fast keyboard billing (must be unique). |
| **Item Name** | Dish name. |
| **Category** | Category. |
| **Base Price** | Standard selling price (all branches unless overridden). |
| **GST Rate** | GST % applied when GST is ON. |
| **Type** | Veg / Non-veg. |
| **Status** | Available or not. |
| **Actions** | **Branch Price Override** (₹ icon), **Edit Item**, **Delete Item**. |

A **search box** ("Search dish or item code…") filters the table. **No dishes found → Add Dish Now** appears when empty.

**Add / Edit Menu Item dialog**

| Field | Meaning |
|---|---|
| **Dish / Item Name** | Name shown on POS and bill. |
| **Short Code (POS hotkey)** | Number you type in POS, e.g. 101. |
| **Select Category** | Category. |
| **Base Price (₹)** | Price in rupees. |
| **GST Rate (%)** | 0% (Nil), 5% (Standard Restaurant), 12%, 18% (AC/Bar), 28%. |
| **Vegetarian?** | On = green dot. |
| **Available for Order?** | Off hides the dish from ordering (e.g. sold out). |
| **Track Direct Stock** | Marks the dish as stock-tracked (see 6.4 and Chapter 13). |
| **Create Item / Save Changes** | Saves. |

**Branch Price Overrides** — set a different price for one outlet only (e.g. Branch 2 charges ₹10 more). Leave blank to use the base price. Press **Save Overrides**.

## 6.4 Inventory (Manager & Owner)

Purpose: know what raw material and packed goods you have.

Two tabs: **Stock Inventory** and **Recipe BOM & Consumption**.

### Stock Inventory tab

| Control | Meaning |
|---|---|
| **Add Stock Item** | Create a new raw material / stock item. |
| **Search raw material / item…** | Filter by name. |
| **Show Low Stock Only (n)** | Switch: only items at or below their minimum. The number is how many are low. |

**Table columns**

| Column | Meaning |
|---|---|
| **Item Name** | Raw material (Rice, Oil, Chicken, Gas cylinder…). |
| **Unit** | kg, litre, piece, … |
| **Current Stock** | Quantity on hand now. |
| **Min Threshold** | The level at which you want a warning. |
| **Avg Cost / Unit** | Average buying price per unit. |
| **Status** | Shows a **Low** warning badge when stock is at or below the minimum (the page also shows "n Low" at the top). |
| **Actions** | **Adjust Stock (+/-)**, **Stock History Logs**, **Edit Item**. |

**Add / Edit item dialog:** **Item Name**, **Unit of Measure** (kg, gram, litre, ml, piece, cylinder, packet), **Cost Per Unit (₹)**, **Min Low-Stock Threshold**.

**Stock Adjustment dialog** — shows **Current Balance**, then:

| Field | Meaning |
|---|---|
| **Adjustment Reason** | *Physical Count Audit*, *Direct Purchase Intake*, *Damage / Spoilage / Wastage*, *Opening Inventory Reset*. |
| **Adjustment Quantity** | Positive to add (+5) or negative to remove (−2.5). |
| **Reference / Remarks** | Short note, e.g. "Audited by Head Chef". |
| **Record Adjustment** | Saves; recorded in the history log. |

Use this for **wastage/spoilage** and for **end-of-day manual consumption** (enter the quantity used as a negative number).

**Stock History Logs** — the audit trail for one item: type (Purchase, Sale deduction, Wastage…), quantity, balance after, reference and date.

### Recipe BOM & Consumption tab

A **recipe (BOM = Bill of Materials)** lists how much raw material one portion of a dish uses.

1. **Select Dish / Menu Item.**
2. **Add Ingredient** → choose the stock item and type quantity used per portion (e.g. Paneer 0.25 kg).
3. **Save Dish Recipe.**

> In this version recipes are stored for reference and costing. Automatic stock deduction for each sold dish is **not yet switched on** — see Chapter 13.

## 6.5 Purchases (Manager & Owner)

Purpose: record goods bought from suppliers; stock rises automatically.

Two tabs: **Purchase Orders** and **Vendors & Suppliers (n)**.

**Buttons:** **New Inward Purchase**, **Add Supplier**.

### Purchase Orders tab

Search: "Search invoice# or supplier…". Empty list shows **Create First Purchase**.

| Column | Meaning |
|---|---|
| **Invoice #** | Supplier's bill number. |
| **Date** | Invoice date. |
| **Supplier** | Vendor. |
| **Items** | Count of lines. |
| **Total Amount** | Bill total. |
| **Paid Amount** | Amount paid so far. |
| **Status** | Paid / Partial / Unpaid (credit). |
| **Action** | **Update Payment** (when you pay the supplier later). |

**Record Inward Purchase dialog**

| Field | Meaning |
|---|---|
| **Select Supplier** | Vendor (add one first via *Add Supplier*). |
| **Invoice Number / Invoice Date** | From the supplier's bill. |
| **Line items — item, Qty, Price** | One row per product; add rows as needed; trash icon removes a row. |
| **Payment Mode** | CASH, UPI, Bank Transfer, Cheque. |
| **Payment Status** | **Fully Paid**, **Partially Paid**, **Unpaid (Credit)**. |
| **Notes / Payment Reference…** | Cheque no., UPI ref, remarks. |
| **Save Inward Purchase** | Saves and **increases stock** ("Purchase recorded and stock balances updated!"). |

**Update Purchase Payment dialog:** shows **Invoice** and **Total Bill**; enter **Paid Amount (₹)** and **Save Payment**. The status updates automatically.

### Vendors & Suppliers tab

Columns: **Vendor / Supplier**, **Contact Phone**, **Address**, **GSTIN**, **Actions** (edit).
**Register New Supplier** fields: **Company / Business Name** (required), **Phone Number**, **Business Address**, **GSTIN (Optional)**; **Save Supplier**.

## 6.6 Expenses (Everyone)

Purpose: record money spent on the business.

**Buttons:** **New Category**, **Record Expense**.

**Summary cards**

| Card | Meaning |
|---|---|
| **Total Expenses** | Sum of listed expenses and number of transactions. |
| **Counter Cash Paid** | Spent from the drawer (reduces the day-close cash). |
| **Owner Bank Paid** | Paid from the owner's bank / UPI (does not touch the drawer). |

**Filters:** search "Search description or category…", **All Sources / Counter Cash / Owner Bank**, **All Categories**.

**Table:** **Date, Category, Description / Reason, Paid From, Mode, Amount, Actions** (edit/delete — managers and owner only).

**Record New Expense dialog**

| Field | Meaning |
|---|---|
| **Expense Description** | What was bought, e.g. "Vegetables from Mandi". |
| **Select Category** | Raw Materials, Salary, Electricity/Water, Rent, Maintenance, Packaging, Miscellaneous… |
| **Amount (₹)** | Rupees. |
| **Payment Source** | **Counter Cash Drawer** *(reduces expected closing cash)* or **Owner Bank Account**. |
| **Payment Mode** | CASH, UPI / QR Code, Bank Transfer / IMPS. |
| **Expense Date** | Defaults to today. |
| **Reference # / Bill No** | Optional. |
| **Record Expense** | Saves. |

**Add Expense Category dialog:** **Category Name** (e.g. *Repairs & Plumber*) → **Create Category**.

> **Golden rule:** If you took money out of the counter cash drawer, you **must** record it here with *Counter Cash Drawer* — otherwise the day close will show a shortage.

## 6.7 Day Close & Cash Reconciliation (Everyone)

Purpose: make sure the cash in the drawer matches the books.

### Opening the drawer (start of shift)

Screen title **Open Daily Cash Drawer**.

| Field | Meaning |
|---|---|
| **Opening Cash Balance Float (₹)** | The money already in the drawer to give change. |
| **Open Cash Drawer & Start Billing** | Starts the shift. Cash bills are counted from now on. |

### During the shift — Active Cash Session

Shows when it opened and by whom, with four figures:

| Figure | Meaning |
|---|---|
| **Starting cash in drawer** | Your opening float. |
| **From settled bills** | Cash received from paid bills (+). |
| **Direct counter payouts** | Expenses paid from the drawer (−). |
| **Expected closing count** | Opening + Cash sales − Counter payouts. |

### Closing (end of day)

| Field | Meaning |
|---|---|
| **Actual Physical Cash Count (₹)** | Count the notes and coins and type the total. |
| **Shift Notes / Audit Remarks** | Optional explanation, e.g. "₹50 short — coin change". |
| **Expected / Counted** | Shown live while typing, with the **difference**: green = matches or excess, red = **shortage**. |
| **Close Shift & Generate Z-Report** | Completes and locks the shift ("Day close completed and reconciled!") and opens the Z-Report. |

### Shift Reconciliation History

A table of past shifts: **Closed At, Cashier, Opening Float, Cash Sales, Expenses, Expected, Actual Count, Variance, Z-Report**. Press the document icon to open the **Z-Report** — a printable summary (*DAILY Z-REPORT*: cashier, shift ID, opening float, cash sales, cash expenses, expected till total, actual counted cash, variance/shortage). **Print Z-Report** sends it to the printer; **Close** shuts it.

> UPI, card and online-app payments are **not** counted in the drawer — only CASH.

## 6.8 Reports (Manager & Owner)

At the top: **From date → to date** boxes and **Export CSV** (saves the current table to a spreadsheet file). Choose the tab, then the date range.

| Tab | What it shows |
|---|---|
| **Sales Report** | **Group by Day / Week / Month**. Chart **Revenue Timeline** and table **Time Period, Bills Generated, Average Ticket, Gross Revenue**. |
| **GST Tax Filing** | **Taxable Sales Turnover**, **CGST Total**, **SGST Total**, **Total Tax Payable**, and the panel **GST vs Non-GST Invoices Breakdown** — *GST Invoices Issued* (bills count, taxable base, collected GST) against *Non-GST Retail Receipts* (net non-tax base, "Exempt / Non-GST"). |
| **Expenses** | **Expense By Category** pie chart and the **Category Breakdown** table (**Category, Entries, Total Amount**). |
| **Profit & Loss** | **Income Statement** — Sales Revenue (+), Raw Material Purchases (−), Operational & Petty Expenses (−), **Gross Operating Margin**, final net profit and margin %. |
| **Item Analytics** | **Menu Dish, Portions Sold, Total Sales (₹)** — your best sellers. |

*Managers* see their own branch. *The Owner* sees the branch currently selected in the top bar.

## 6.9 Settings (Owner only)

Press **Save Changes** (top right) after editing a branch-related tab. Tabs:

### Branch Profile — *Outlet Details*

| Field | Meaning |
|---|---|
| **Outlet / Branch Name** | Printed on receipts. |
| **Branch Identifier Code** | B1…B4 (read-only). |
| **Physical Address** | Printed on receipts. |
| **Contact Phone** | Printed on receipts. |
| **FSSAI Food License Number** | Printed on receipts if enabled. |
| **GSTIN (Tax Registration)** | Printed on GST receipts. |

### GST & Taxes — *GST Configuration*

| Field | Meaning |
|---|---|
| **Enable GST Calculations** | Master switch for this branch (default for new bills). Off = *Bill of Supply* (no tax shown). |
| **GST Mode** | *Tax Exclusive (Added on top of menu price)* or *Tax Inclusive (Prices include tax)*. |
| **Standard Restaurant Slab** | Information about the standard 5% slab (2.5% CGST + 2.5% SGST). |

### ESC/POS Printer — *Thermal ESC/POS Receipt Printer*

| Field | Meaning |
|---|---|
| **Printer Connection Interface** | **None (Disabled)**, **USB Thermal (Virtual COM/Raw)**, **LAN / Network (TCP/IP Port 9100)**. |
| **Network Address / COM Port** | e.g. `192.168.1.200:9100` or `USB001`. |
| **Paper Roll Width** | **80mm (Standard Full Width)** or **58mm (Compact Mobile Width)**. |
| **Send Test Print** | Prints a test ticket so you can check connection and width. |

### Receipt Template — *Receipt Customization*

Switches: **Print Brand Header**, **Print FSSAI & GSTIN**, **Print Cashier Operator Name**, **Print Detailed GST Slab Summary**; text boxes **Receipt Header Welcome Text** and **Receipt Footer Greeting** (e.g. "Thank you! Visit us again.").

### Payment Modes — *Payment Methods*

Table (**Mode Name, Order, Status**) of the tender types the shop uses (Cash, UPI, Card, Zomato, Swiggy, Paytm, Credit…).

### Staff Users — *User Management*

| Control | Meaning |
|---|---|
| **Add User** | Opens **Add Terminal User**: **Username**, **Full Name**, **Password**, **Role** — *Cashier (POS & Till only)*, *Branch Manager*, *Super Admin (All Outlets)* — then **Create User**. A Cashier/Manager is attached to the branch currently selected. |
| **Table: Username, Full Name, Role, Actions** | Existing staff with an **Active** badge. |
| **Reset Password (key icon)** | Opens **Reset User Password** → type **New Password** → **Save Password**. |

### Database Backup — *Offline SQLite Backups*

| Control | Meaning |
|---|---|
| **Create Backup Now** | Copies the database file into the `backups` folder inside the program folder. |
| **Snapshot Filename, Archive Size, Created At, VERIFIED** | The list of backups made. |

### About

Shows the version and the technology used.

---

# 7. The Owner's routine

**Daily:** Dashboard → Branch Performance Matrix → check each branch's Day Close variance (Day Close → history).
**Weekly:** Reports → Item Analytics (what sells), Expenses (where money goes).
**Monthly:** Reports → GST Tax Filing → **Export CSV** for your accountant; Profit & Loss; create a **Backup** and copy the backup file to a pen-drive or cloud drive.
**Staff changes:** Settings → Staff Users → add new staff; reset passwords; (a person who leaves should have their password changed immediately).

---

# 8. GST explained simply

* **GST Off (Bill of Supply):** no tax columns; the customer pays exactly the menu price.
* **GST On:** each dish uses its own **GST Rate** (set in Menu Manager). The tax is shown on the bill split into **CGST** and **SGST** (half each).
* **Per bill switch:** on the POS press **F8** (or tap **GST (F8) ON/OFF**) to turn GST on or off for that one bill.
* **Reports → GST Tax Filing** summarises GST bills separately from non-GST bills, ready for your accountant (use **Export CSV**).
* In this version the POS adds GST **on top** of the menu price when GST is ON (the *exclusive* method). Discuss with your accountant before choosing inclusive pricing.

---

# 9. How the parts work together (what happens when…)

| When you… | The software automatically… |
|---|---|
| Settle a bill with **CASH** | Adds the cash to the open Day Close session. |
| Settle with UPI / Card / apps | Records it in sales and reports, but **not** in the cash drawer. |
| Record an expense from **Counter Cash Drawer** | Reduces *Expected closing count* in Day Close. |
| Record an inward purchase | Increases stock and shows the supplier's balance/status. |
| Make a stock adjustment | Changes stock and writes a history log entry. |
| Turn GST on | Adds tax to the bill and the GST report. |

---

# 10. Daily workflows

## 10.1 Opening checklist (Cashier / Manager)

1. Switch on computer and printer; open the software and sign in.
2. (Owner) pick the branch in the top bar.
3. Day Close → enter opening float → *Open Cash Drawer & Start Billing*.
4. In POS, check that today's dishes are available (Manager: Menu Manager → *Available for Order?*).

## 10.2 During service

* Orders: POS (6.2). Kitchen: **F2**. Payment: **F12**.
* Money out of the drawer: Expenses → *Counter Cash Drawer*.
* Goods received: Purchases → New Inward Purchase.

## 10.3 Closing checklist

1. Settle or cancel every open bill (**F6** to see held/open bills).
2. Day Close → count cash → enter → close.
3. Read the **variance**. A shortage must be explained in *Shift Notes*.
4. Print the **Z-Report**.
5. (Owner/Manager) Settings → Create Backup Now.

---

# 11. Setup, backup and phone access (for the person maintaining the computer)

## 11.1 First-time setup on Windows

1. Install **Node.js (LTS 20 or 22)** from nodejs.org.
2. Copy the program folder to `C:\billing` (do **not** keep it inside OneDrive).
3. Open **Command Prompt** in that folder and run:

```
npm install
npm run setup
```

4. Start the program:
   * For testing: `npm run dev` → open **http://localhost:5173**
   * For daily use: `npm run build` then `npm start` → open **http://localhost:3456**

## 11.2 Starting every morning

Open Command Prompt in `C:\billing`, run `npm start`, and keep that window open all day. Closing it stops the software.

## 11.3 Default logins (change them!)

| Role | Username | Password |
|---|---|---|
| Super Admin | `admin` | `admin123` |
| Branch Manager | `manager1` | `manager123` |
| Cashier | `cashier1` | `cashier123` |

Change these immediately after first login: *Settings → Staff Users → Reset Password*.

## 11.4 Backups

* **Manual:** Settings → Database Backup → *Create Backup Now*. Files go to the `backups` folder in the program folder.
* **Safety copy:** copy the `backups` folder to a pen-drive or cloud storage at least weekly.
* The live data lives in `prisma\data\restopos.db`.
* To restore: stop the program, replace `restopos.db` with a backup copy, start again.

## 11.5 Clearing all test data

Run `npm run db:clear`. It first saves a backup copy, then deletes all data except users and branches. Afterwards re-enter your menu, categories, expense categories, etc.

## 11.6 Phone / tablet access and Windows Firewall

If phones cannot open the page, run this **once** in an Administrator PowerShell:

```
New-NetFirewallRule -DisplayName "RestoPOS" -Direction Inbound -Protocol TCP -LocalPort 5173,3456 -Action Allow
```

---

# 12. Troubleshooting & FAQ

| Problem | What to do |
|---|---|
| **Page does not open** | Is the program window (`npm start`) still running? Is the address right? |
| **Phone cannot open the page** | Same Wi-Fi? Correct IP from `ipconfig`? Run the firewall command (11.6). |
| **"Please select a branch" in POS** | Owner: choose a branch in the top bar. |
| **No tables to choose** | Tables cannot yet be added from the screen (Chapter 13) — ask your installer to add them. |
| **A dish is missing in POS** | Menu Manager → check **Available for Order?** and the category. |
| **Short code not found** | Check the code in Menu Manager; codes are unique per dish. |
| **Cannot add a menu item (Manager)** | Only the Super Admin can create new items. |
| **Cannot delete a category** | Move or delete its dishes first. |
| **Day Close shows a shortage** | Check that every cash expense was recorded with *Counter Cash Drawer*, and every cash bill was settled. |
| **Settle button disabled** | The amounts entered do not yet cover **NET PAYABLE**. |
| **Printer does not print** | Settings → ESC/POS Printer → check interface, address and width → *Send Test Print*. |
| **Forgot password** | Owner: Settings → Staff Users → Reset Password. |
| **A red message says a save failed** | Nothing was saved. Check your connection and try again. |
| **Everything is empty after setup** | Normal for a new database — add menu, categories, suppliers, etc. |

---

# 13. Current limitations (please read)

This version already covers daily billing, KOT, stock, purchases, expenses, day close, GST and reports. The following items from the original plan are **not available as screens yet**. They are noted here so that you can plan around them:

| Area | Status in this version | Workaround |
|---|---|---|
| **Add / edit tables** | No screen to create dine-in tables. | Ask your installer to add tables to the database, or ask for this feature to be built. |
| **Add new branches** | No screen. Four branches (B1–B4) exist; rename them in *Settings → Branch Profile*. | Use the four existing branches. |
| **Create/edit payment modes** | Settings shows the list only; the POS offers CASH, UPI, CARD, ZOMATO, SWIGGY, PAYTM, CREDIT. | Use the POS list. |
| **Inter-branch stock transfer** | Not available as a screen. | Record *Damage/Adjustment* at the sender and a *Purchase/Adjustment* at the receiver. |
| **Bill history / cancel / reprint older bills** | No bills list screen. | Reports show totals; ask for this feature. |
| **Automatic recipe (BOM) stock deduction when a dish sells** | Recipes are saved; automatic deduction is not active. Direct stock tracking has no item-link screen yet. | Use **Inventory → Adjust Stock** for end-of-day usage. |
| **Receipt Template switches** | Switches are shown but their values are not yet stored. | Header/footer text per branch can be saved with *Save Changes*. |
| **Item-level discounts, Zomato/Swiggy settlement** | Only whole-bill discount. | Use *Add Discount*. |
| **Master/HQ sync of 4 branches** | Each computer keeps its own database. | Use one central PC for all branches on the same network, or ask for a sync feature. |
| **Change my own password** | Only the Owner can reset passwords. | Ask the Owner. |

---

# 14. Glossary

| Term | Meaning |
|---|---|
| **POS** | Point of Sale — the billing screen. |
| **KOT** | Kitchen Order Ticket — the slip printed for the kitchen. |
| **Dine-In / Takeaway / Delivery** | Order types. |
| **Short code** | The number you type to add a dish quickly. |
| **Held bill** | A bill saved but not paid. |
| **Settle** | Receive payment and close a bill. |
| **Split tender** | Paying one bill with more than one method. |
| **Float** | Starting cash kept in the drawer for change. |
| **Z-Report** | End-of-day cash summary of a shift. |
| **Variance** | Counted cash minus expected cash (negative = shortage). |
| **GST / CGST / SGST** | Goods & Services Tax; central and state halves. |
| **GSTIN** | Business's GST registration number. |
| **FSSAI** | Food-licence number. |
| **BOM** | Bill of Materials — a dish's ingredient list. |
| **Round Off** | Adjustment to a whole rupee. |
| **Bill of Supply** | A bill without GST. |

---

*End of manual — RestoPOS v1.0.0*
