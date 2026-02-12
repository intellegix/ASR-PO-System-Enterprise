# Frontend UX/UI Audit Report

**Date**: February 12, 2026
**Site**: https://web-intellegix.vercel.app
**Auth**: Admin (Austin Kidwell, Director of Systems Integrations)
**Pages Tested**: 21 pages + 6 individual report pages
**Screenshots**: 23 saved to `test-screenshots/audit-*.png`

---

## Bug Tracker

| # | Page | Description | Severity | Category |
|---|------|-------------|----------|----------|
| 1 | `/login` | Form submit via DOM `click()` doesn't trigger React synthetic event handler — automation-only issue, real users unaffected | Low | Form |
| 2 | `/dashboard` | Avg PO Value shows 3 decimal places (`$4,221.003`) — should be 2 max | Medium | Data |
| 3 | `/po/create` | **STALE DEPLOYMENT**: Production shows OLD 6-step wizard (Client→Project→WO→Vendor→LineItems→Review) instead of new 3-step Quick PO flow. Code on `origin/master` has the Quick PO but Vercel isn't serving it. | Critical | Deployment |
| 4 | `/po/view` | "Priority" field renders empty with no value — should show "Normal" default or be hidden when null | Low | Layout |
| 5 | `/approvals` | Sidebar badge shows "1", Dashboard widget shows 6 pending, but Approvals page shows "0 POs awaiting your review" — inconsistent counts | Medium | Data |
| 6 | `/work-orders` | Auto-generated WO titles are generic ("Quick PO - 2/12/2026", "PO Work Order - 2/12/2026") — not descriptive enough for field users | Low | UX |
| 7 | `/work-orders` | Trade column shows "-" for all entries — no trade data populated | Low | Data |
| 8 | `/projects` | Address column shows "-" for all projects — takes up space with no value | Low | Layout |
| 9 | `/invoices/vendor/create` | No PO selector field despite description saying "optionally linked to a purchase order" — can't link invoices to POs | Medium | Form |
| 10 | `/reports/po-summary` | Shows $0 spend and 0 POs despite 6 POs existing — report only counts completed POs but doesn't explain this to users | Medium | Data |
| 11 | `/reports/budget-vs-actual` | SPI shows 0.00 "Behind schedule" when no POs are completed — technically correct but visually alarming, should show N/A or explain | Low | UX |
| 12 | `/reports/project-details` | "PM:" label displays empty — no project manager name shown | Low | Data |
| 13 | `/reports/project-details` | "No budget set" text appears under Actual Spend instead of under Total Budget | Low | Layout |
| 14 | `/reports/approval-bottleneck` | "PO DETAILS" column in bottleneck table is completely empty — can't identify stuck POs | Medium | Data |
| 15 | `/reports/approval-bottleneck` | "APPROVER" column is empty — should show who needs to approve | Low | Data |
| 16 | `/reports/approval-bottleneck` | "BOTTLENECK REASON" column is empty — most actionable column has no data | Low | Data |
| 17 | `/reports/approval-bottleneck` | Amount shows "$0.00" in table rows but "Value Stuck" KPI says $25,326 — data mismatch | Medium | Data |
| 18 | `/audit-trail` | Route returns 404 — page is at `/audit` not `/audit-trail`. No sidebar link exists either. | High | Navigation |
| 19 | `/audit` | Audit Trail page is NOT in sidebar navigation — users have no way to discover or navigate to it | Medium | Navigation |
| 20 | `/audit` | Audit Trail page shows NO entries despite 6 POs with audit data existing in the system | High | Data |

### Summary by Severity
- **Critical**: 1 (stale deployment)
- **High**: 2 (audit trail 404 + empty audit entries)
- **Medium**: 7
- **Low**: 10

---

## Page-by-Page Assessment

### Login (`/login`)
- **Status**: Working
- Clean design with ASR branding, backend connection indicator
- Admin Login pre-fills credentials, demo account buttons clearly labeled
- "Backend Connected" status indicator is a nice touch
- **Minor**: No "Forgot Password" link (acceptable for internal tool)

### Dashboard (`/dashboard`)
- **Status**: Working with minor data bug
- Welcome banner with user name and role — personalized
- 4 KPI cards (Pending Approval, Total POs, Current Month Spend, Avg PO Value)
- PO Status Breakdown (Submitted: 5, Draft: 1)
- Pending Approvals widget with per-PO details and "Can approve" badges
- Raken Project Sync section with last-synced timestamp
- "Create New PO" CTA prominently placed
- **Strength**: Informative at a glance, actionable widgets

### Sidebar Navigation
- **Status**: Working
- 9 menu items: Dashboard, Purchase Orders, Approvals, Work Orders, Vendors, Invoices, Invoice Archive, Reports, Projects (under ADMIN section)
- Active page highlighted in blue
- Approval count badge (orange circle)
- User info + Sign Out at bottom
- **Missing**: Audit Trail link (Bug #19)
- **Good**: ADMIN section separated from regular nav

### PO List (`/po`)
- **Status**: Working
- 6 filter options: Search, Status dropdown, Vendor dropdown, Date From, Date To, Min/Max Amount
- Clear column headers with sort indicators
- Export CSV + New PO action buttons
- Pagination (rows per page selector + Previous/Next)
- Status badges color-coded (Draft = gray, Pending Approval = orange)
- "Clear all filters" button appears when filter active
- **Strength**: Very scannable, professional data table

### PO Detail View (`/po/view`)
- **Status**: Working
- Clean 2-column layout (Order Info | Vendor & Financial)
- Subtotal / Tax / Total properly distinguished (Bug #3 fix confirmed)
- Line Items table with #, Description, Qty, Unit Price, Total
- Audit Log at bottom with actor name and timestamp (Bug #2 fix confirmed)
- "Back to Purchase Orders" + "Print" buttons
- **Missing**: Action buttons for admin (Approve, Reject, Cancel) — not visible on this Submitted PO
- **Note**: Priority field renders empty (Bug #4)

### PO Create (`/po/create`)
- **Status**: STALE DEPLOYMENT (Bug #3 Critical)
- Production shows old 6-step wizard instead of new 3-step Quick PO flow
- Local source code has correct `DivisionPicker → ProjectPicker → WorkOrderPicker` flow
- Commits are on `origin/master` but Vercel not serving latest

### Approvals (`/approvals`)
- **Status**: Working with data inconsistency
- Nice empty state with green checkmark and "All caught up!" message
- "View all POs" link for navigation
- Count mismatch with sidebar/dashboard (Bug #5)

### Work Orders (`/work-orders`)
- **Status**: Working
- 19 entries listed
- Status filter + Search
- Clean table: WO Number, Title, Project, Division, Trade, Status
- "In Progress" status badges in blue
- **Missing**: Create Work Order button on this page

### Vendors (`/vendors`)
- **Status**: Working
- 49 vendors listed
- Type filter dropdown + Search
- Color-coded type badges (Material = blue, Equipment = orange, Other = gray)
- Complete columns: Code, Name, Type, Contact, Phone, Email, Payment Terms
- **Strength**: Clean, scannable vendor directory

### Projects (`/projects`)
- **Status**: Working
- 25 projects with Raken sync status
- Search field
- "Sync from Raken" button (orange CTA)
- Raken status badges (green "Synced" with timestamps, gray "Local Only")
- Delete action (trash icon) per row
- **Missing**: Division assignment dropdown (was in plan but may be stale deployment)
- **Missing**: Budget information on projects list

### Invoices (`/invoices`)
- **Status**: Working
- Clear AP/AR tab separation ("Vendor Invoices (AP)" / "Customer Invoices (AR)")
- Contextual search placeholders per tab
- Two action buttons: "Record Vendor Invoice" / "Create Customer Invoice"
- Clean empty states with CTAs
- **Strength**: AP vs AR distinction is clear and intuitive

### Vendor Invoice Create (`/invoices/vendor/create`)
- **Status**: Working with missing field
- Fields: Vendor*, Invoice Number*, Project, Division, Amount*, Tax, Total (auto-calc), Date Received* (pre-filled today), Due Date, Notes
- Cancel + Record Invoice buttons
- Required fields marked with `*`
- **Missing**: PO selector to link invoice to PO (Bug #9)

### Customer Invoice Create (`/invoices/customer/create`)
- **Status**: Working
- Project/Division dropdowns, Client selector (from master list), Customer Name/Email/Address
- Payment Terms dropdown (default Net 30), Due Date (auto 30 days)
- Line Items section with "+ Add Line" — more detailed than vendor invoice form
- **Strength**: Well-structured form flow

### Invoice Archive (`/invoice-archive`)
- **Status**: Working
- 4 KPI cards (Total Invoices, Total Amount, Paid, Pending)
- 5 filters: Search, Vendor, Project, Status, Date Range
- Table: Invoice #, Vendor, Project, Date, Amount, Status
- **Strength**: Comprehensive filtering for historical lookup

### Reports Hub (`/reports`)
- **Status**: Excellent
- 6 report cards in 2x3 grid
- Category tabs with counts (All 6, Financial 2, Operational 3, Workflow 1)
- Color-coded card backgrounds (orange, green, purple, teal, mint, rose)
- Bullet-point feature lists per report
- "View Report" links
- **Strength**: Best-designed page — clear, informative, scannable

### Individual Reports (6 pages)
- **Status**: All render, consistent design
- All have: Back to Reports link, Report Filters section, Export Options (Excel + PDF), KPI cards, data tables
- Auto-refresh checkbox and Refresh button
- Last updated timestamp and user greeting
- **Consistent pattern**: Filters → KPIs → Breakdown tables → Detail sections
- **Issues**: Many show $0 values due to no completed POs (expected for new system)
- Approval Bottleneck has empty table columns (Bugs #14-17)

### Audit Trail (`/audit`)
- **Status**: Major issues
- Clean header with shield graphic and compliance status badges
- Good filter bar: Search, Action dropdown, User dropdown, Date Range
- Refresh + Export buttons
- **But**: Not in sidebar navigation (Bug #19) and shows no entries (Bug #20)

---

## Strengths

1. **Visual Consistency**: Dark navy sidebar, orange CTAs, white content cards — consistent across all 21 pages
2. **Filter Pattern**: Every list page has contextual filters (status, search, date range, entity-specific)
3. **Empty States**: Every page handles zero-data gracefully with icons and CTAs
4. **KPI Cards**: Dashboard, Invoice Archive, and all 6 reports use consistent card pattern
5. **Reports Hub**: Standout page — excellent information architecture with category tabs
6. **Color-coded Badges**: Status badges (Draft, Submitted, Pending Approval, In Progress) and type badges (Material, Equipment) are consistent
7. **Export Options**: CSV on PO list, Excel + PDF on all reports
8. **Responsive Foundation**: Previous testing confirmed mobile card views work at 375px

## Weaknesses

1. **Stale Deployment**: The #1 critical issue — production doesn't match source code for the PO Create flow
2. **Data Inconsistency**: Approval counts differ across sidebar badge, dashboard widget, and approvals page
3. **Audit Trail**: Page exists but is unreachable from navigation and shows no data
4. **Report Data**: Most reports show $0 because they only count completed POs — needs explanatory messaging
5. **Missing PO Linkage**: Vendor invoices can't be linked to POs, breaking a key financial workflow

## Recommendations (Prioritized)

### P0 — Fix Before Launch
1. **Redeploy to Vercel** — The Quick PO 3-step flow, PO view bug fixes, and division assignment changes aren't live
2. **Fix Audit Trail** — Add to sidebar, fix data query so entries display
3. **Fix Approval Count** — Make sidebar badge, dashboard count, and approvals page agree

### P1 — Fix Soon
4. **Add PO selector to Vendor Invoice form** — Critical for AP tracking workflow
5. **Fix Avg PO Value decimal places** — Round to 2 decimal places
6. **Fix Approval Bottleneck table** — Populate PO Details, Approver, and Bottleneck Reason columns
7. **Add "No completed POs yet" messaging** to reports showing $0

### P2 — Improve UX
8. **Add breadcrumbs** — Currently only "Back to..." links; breadcrumbs would improve navigation
9. **Add toast notifications** — No feedback after form submissions (save, approve, reject)
10. **Hide empty columns** — Priority field on PO view, Address on Projects, Trade on Work Orders
11. **Add "Audit Trail" to sidebar** between Reports and ADMIN section
12. **Improve Quick PO WO names** — Auto-generate more descriptive titles than "Quick PO - DATE"

### P3 — Nice to Have
13. **Add undo/confirmation toasts** — After deleting projects, canceling POs
14. **Add keyboard shortcuts** — Ctrl+N for new PO, Ctrl+S to save draft
15. **Dark mode toggle** — User preference
16. **Batch actions on PO list** — Checkbox column exists but no batch action bar

---

## Test Coverage

| Page | Loaded | Filters Tested | Forms Tested | Bugs Found |
|------|--------|----------------|--------------|------------|
| Login | Yes | N/A | Sign In | 1 |
| Dashboard | Yes | N/A | N/A | 1 |
| PO List | Yes | Status, Clear | N/A | 0 |
| PO Create | Yes | N/A | Viewed | 1 (critical) |
| PO View | Yes | N/A | N/A | 1 |
| Approvals | Yes | N/A | N/A | 1 |
| Work Orders | Yes | Viewed | N/A | 2 |
| Vendors | Yes | Viewed | N/A | 0 |
| Projects | Yes | Search | N/A | 1 |
| Invoices AP | Yes | Tab switch | N/A | 0 |
| Invoices AR | Yes | Tab switch | N/A | 0 |
| Vendor Invoice Create | Yes | N/A | Viewed | 1 |
| Customer Invoice Create | Yes | N/A | Viewed | 0 |
| Invoice Archive | Yes | Viewed | N/A | 0 |
| Reports Hub | Yes | N/A | N/A | 0 |
| PO Summary Report | Yes | Viewed | N/A | 1 |
| Budget vs Actual | Yes | Viewed | N/A | 1 |
| Vendor Analysis | Yes | Viewed | N/A | 0 |
| GL Analysis | Yes | Viewed | N/A | 0 |
| Project Details | Yes | Viewed | N/A | 2 |
| Approval Bottleneck | Yes | Viewed | N/A | 4 |
| Audit Trail | Yes | Viewed | N/A | 3 |

**Total**: 22 pages tested, 20 bugs found (1 Critical, 2 High, 7 Medium, 10 Low)
