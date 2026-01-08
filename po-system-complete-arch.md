# COMPLETE PO SYSTEM ARCHITECTURE
## All Surface Roofing & Waterproofing, Inc.

**Version:** 2.0 (Division Leader Authority + Smart PO Numbers + Mobile-First Workflow)  
**Created:** January 7, 2026  
**Author:** Alex Chen (Systems Design)  
**Status:** Production Ready

---

## TABLE OF CONTENTS

1. [System Overview](#1-system-overview)
2. [Division Leader Authority Model](#2-division-leader-authority-model)
3. [Smart PO Number Architecture](#3-smart-po-number-architecture)
4. [Mobile-First PO Creation Workflow](#4-mobile-first-po-creation-workflow)
5. [Data Models & Schema](#5-data-models--schema)
6. [Business Logic & Validation Rules](#6-business-logic--validation-rules)
7. [One-Form PO + Work Order Generation](#7-one-form-po--work-order-generation)
8. [Integration Layer (QuickBooks)](#8-integration-layer-quickbooks)
9. [Dashboard & Reporting](#9-dashboard--reporting)
10. [API Endpoints & Services](#10-api-endpoints--services)
11. [Security & Audit Trail](#11-security--audit-trail)
12. [Implementation Timeline](#12-implementation-timeline)

---

## 1. SYSTEM OVERVIEW

### Purpose

A **division-leader-controlled, smart-PO-numbered, mobile-first** Purchase Order system that:

- **Only division leaders can create and approve POs** (no field managers, supervisors, or other staff)
- **PO numbers encode GL account + division + work order + supplier** for instant context
- **One form creates both a PO document AND a work order** simultaneously
- **Mobile optimized** so division leaders can create POs during phone calls with customers
- **Auto-populates based on recent work orders** but allows **on-the-fly new work order creation**
- **Routes to QuickBooks with perfect GL account mapping**
- **Provides cross-divisional visibility** so all division leaders see all POs on a project

### Key Users

- **Division Leaders (4 total):** CAPEX, Roofing, General Contracting, Subcontractor Management/Specialty Trades
- **Majority Owner:** Can see everything, approve at highest level
- **Operations Manager (Repairs):** Creates POs, but they require owner approval to issue
- **Accounting Staff:** Receives synced data from system to QuickBooks (READ ONLY of PO data)

### Key Constraints

- ✅ Only division leaders can create/issue POs
- ✅ PO numbers are deterministic and human-readable
- ✅ One form = One PO + One Work Order (or links to existing WO)
- ✅ Mobile first (works on phone, tablet, desktop)
- ✅ Auto-population from historical data but full override capability
- ✅ No double-entry to QuickBooks

---

## 2. DIVISION LEADER AUTHORITY MODEL

### Authentication & Authorization

#### User Roles

```plaintext
ROLE: MAJORITY_OWNER
├─ Can: View all divisions
├─ Can: Approve any PO above threshold
├─ Can: Modify division assignments
└─ Can: View all dashboards & reports

ROLE: DIVISION_LEADER
├─ Can: Create POs for their division ONLY
├─ Can: Approve POs for their division ONLY
├─ Can: View all POs across all divisions (READ-ONLY for other divisions)
├─ Can: Issue approved POs to vendors
├─ Can: View division-specific dashboard & spend
└─ Cannot: Approve, modify, or cancel POs outside their division

ROLE: OPERATIONS_MANAGER (Repairs Division)
├─ Can: Create POs for Repairs division ONLY
├─ Can: View all POs across divisions (READ-ONLY)
└─ Cannot: Approve POs (requires division leader approval)
          Cannot: Issue POs (requires division leader approval)

ROLE: ACCOUNTING
├─ Can: View all POs (READ-ONLY)
├─ Can: Export data for QB import
├─ Can: Run reports
└─ Cannot: Create, modify, or approve POs
```

#### Division-Leader Mapping Table

```plaintext
division_leader_assignments:
┌─────────────────────────────┬──────────────┬─────────────────────────────┐
│ Division                    │ Leader       │ QB Class                    │
├─────────────────────────────┼──────────────┼─────────────────────────────┤
│ CAPEX                       │ Owner 1      │ CAPEX Division              │
│ Repairs                     │ Op Manager   │ Repairs Division (reports   │
│                             │              │ to Owner 1 for approval)    │
│ Roofing                     │ Owner 2      │ Roofing Division            │
│ General Contracting         │ Owner 3      │ General Contracting Div     │
│ Subcontractor Management    │ Owner 4      │ Subcontractor Management    │
│ Specialty Trades            │ Owner 3/4    │ Specialty Trades Div        │
└─────────────────────────────┴──────────────┴─────────────────────────────┘
```

#### Approval Authority Rules

| Scenario | Rule |
|----------|------|
| **PO created in CAPEX division** | Only Owner 1 can approve |
| **PO created in Repairs division** | Op Manager creates → Owner 1/2/3/4 approves (based on amount) |
| **PO created in Roofing division** | Only Owner 2 can approve |
| **PO created in Gen Contracting** | Only Owner 3 can approve |
| **PO created in Subs Management** | Only Owner 4 can approve |
| **PO created in Specialty Trades** | Owner 3 or Owner 4 can approve (both delegated) |
| **Repairs PO under $2,500** | Op Manager can approve |
| **Repairs PO over $2,500** | Escalates to division owner |
| **Any PO over $25,000** | Requires majority owner co-approval |

#### Login Flow

```plaintext
User opens PO Manager App
    ↓
Authentication (OAuth / SAML / Email + Password)
    ↓
System checks user role & division assignment
    ↓
Dashboard loads with role-based filters
    ├─ Division Leader sees: Only their division POs in full edit mode
    │                       + All other divisions READ-ONLY
    ├─ Op Manager sees:    Only Repairs POs + All others READ-ONLY
    └─ Accounting sees:    All POs READ-ONLY + Export/Report buttons
```

---

## 3. SMART PO NUMBER ARCHITECTURE

### Format & Logic

```plaintext
Smart PO Number Format:
┌──────────────────────┬─────────────┬──────────────────┬──────────────┐
│ Division Leader ID   │ GL Account  │ Work Order No    │ Supplier Conf│
│ (2 chars)            │ (2 digits)  │ (4 digits)       │ (2 chars)    │
│ O1, O2, O3, O4, OM   │ 10-99       │ 0001-9999        │ AA-ZZ        │
└──────────────────────┴─────────────┴──────────────────┴──────────────┘

Examples:
O1 10 0001 AB  = Owner 1, GL 10 (Roofing Materials), WO 0001, ABC Supply
O2 17 0567 HD  = Owner 2, GL 17 (Equipment Rental), WO 0567, Home Depot
O3 90 1234 LS  = Owner 3, GL 90 (Building Supplies), WO 1234, Local Sub
OM 50 0099 CD  = Op Manager, GL 50 (Wages), WO 0099, Company Driver
```

### Division Leader ID Mapping

```plaintext
Division Leader ID ↔ Division ↔ Cost Center Prefix ↔ QB Class
─────────────────────────────────────────────────────────────
O1 = CAPEX            → CAP → CAPEX Division
O2 = Roofing          → RFG → Roofing Division
O3 = Gen Contracting  → GEN → General Contracting Division
O4 = Subs Management  → SUB → Subcontractor Management Division
OM = Operations Mgr   → REP → Repairs Division
```

### GL Account Code Mapping (Abbreviated)

```plaintext
10 = Roofing Materials (5010)
17 = Equipment Rental (6170)
20 = Wages Direct Labor (5020)
25 = Building Supplies (6090)
30 = Subcontractors (6750)
35 = Small Tools (6935)
40 = Safety Equipment (6100)
50 = Rent (6290)
55 = Office Expense (6550)
60 = Professional Fees (6270)
70 = Utilities (6390)
75 = Insurance (various 61xx-619x)
80 = Advertising (6530)
90 = Building Supplies (6090)
95 = Tax Charged (5111)

(Full mapping stored in database as lookup table)
```

### Work Order Number Sequence

```plaintext
Auto-incremented per division per calendar year

Example:
┌─────────────────────────────────┐
│ 2026 Work Orders (by Division)  │
├─────────────────────────────────┤
│ CAPEX:     WO-001 through WO-999│
│ Repairs:   WO-001 through WO-999│
│ Roofing:   WO-001 through WO-999│
│ Gen Cont:  WO-001 through WO-999│
│ Subs Mgmt: WO-001 through WO-999│
└─────────────────────────────────┘

Formatted in PO#:
O1 10 0001 AB  = First CAPEX WO of 2026
O2 17 0002 HD  = Second Roofing WO of 2026
O3 90 0500 LS  = 500th Gen Contracting WO of 2026
```

### Supplier Confirmation Code (Last 2 chars)

```plaintext
Source: Supplier name's first two unique letters (after normalization)

Examples:
ABC Roofing Supply      → AB
Home Depot Pro          → HD
Local Sub LLC           → LS
Equipment Rentals Co    → ER
Johnson Plumbing        → JP
Phoenix Materials       → PM
Casavida Management     → CA
```

**Why this works:**
- Visually identifies vendor at a glance
- Encodes supplier accountability in the PO number
- Prevents duplicate supplier orders (easy to spot "O1 10 0001 AB" twice)

### PO Number Generation Logic

```python
# Pseudocode for generating smart PO number

def generate_smart_po_number(division_id, gl_account_number, work_order_number, supplier_name):
    # Step 1: Get division leader code
    leader_code = get_leader_code(division_id)  # O1, O2, O3, O4, OM
    
    # Step 2: Get GL account abbreviated code
    gl_code = get_gl_code(gl_account_number)    # 10, 17, 90, etc.
    
    # Step 3: Format work order as 4-digit zero-padded
    wo_code = format_work_order(work_order_number)  # 0001, 0567, 9999
    
    # Step 4: Get supplier confirmation code (first 2 unique chars)
    supplier_code = normalize_and_abbreviate(supplier_name)  # AB, HD, LS
    
    # Step 5: Concatenate with spaces for readability
    po_number = f"{leader_code} {gl_code} {wo_code} {supplier_code}"
    
    # Examples: O1 10 0001 AB, O2 17 0567 HD, O3 90 1234 LS
    return po_number
```

### Why This Approach Works

| Feature | Benefit |
|---------|---------|
| **Deterministic** | Same inputs always produce same number (reproducible) |
| **Readable** | Humans can decode it without a system |
| **Reversible** | Can extract division, GL, WO, supplier from number alone |
| **Unique** | Combination of inputs guarantees uniqueness per transaction |
| **Efficient** | Short (10 chars), searchable, typeable |
| **Audit Trail** | Number itself tells story: who, what cost, which job, which vendor |

---

## 4. MOBILE-FIRST PO CREATION WORKFLOW

### Scenario: Owner 1 Gets Emergency Call (Phone → PO → App)

```plaintext
TIMELINE:
─────────────────────────────────────────────────────────────

[10:15 AM] Phone rings. Customer calls about roof leak at Admiral Hartman.
           "We need emergency repairs, can you come assess today?"

[10:16 AM] Owner 1 says "Yes, I'll send our team. Give me 2 hours."

[10:17 AM] Owner 1 hangs up, immediately opens PO Manager App on phone.

[10:18 AM] App loads. Shows: "Welcome, Owner 1 - CAPEX Division"
           
           Main screen options:
           ┌─────────────────────────────────┐
           │ + CREATE NEW PO                 │
           │ + RECENT WORK ORDERS            │
           │ MY APPROVALS (3 pending)        │
           │ DASHBOARD                       │
           └─────────────────────────────────┘

[10:19 AM] Owner 1 taps "+ CREATE NEW PO"

[10:20 AM] App shows quick-entry screen:
           ┌─────────────────────────────────┐
           │ Division: CAPEX [auto-selected] │
           │ Project: [Tap to select]        │
           │                                 │
           │ Recent: Admiral Hartman (A-001) │
           │         Casavida (CA-...)       │
           │         Bayview (B-001)         │
           │                                 │
           │ [Create NEW Project/WO]         │
           └─────────────────────────────────┘

[10:21 AM] Owner 1 taps "Admiral Hartman (A-001)"
           System loads Admiral Hartman context.

[10:22 AM] Screen now shows:
           ┌─────────────────────────────────────┐
           │ Division: CAPEX                     │
           │ Project: Admiral Hartman (A-001)   │
           │                                    │
           │ Recent Work Orders:                │
           │ ☐ WO-0234: Roof Phase 1 (Complete)│
           │ ☐ WO-0235: Roof Phase 2 (Active)  │
           │ ☐ WO-0236: Gutter Work (Pending)  │
           │                                    │
           │ [Create NEW Work Order]            │
           │                                    │
           │ [CONTINUE TO PO DETAILS]           │
           └─────────────────────────────────────┘

[10:23 AM] Owner 1 taps [Create NEW Work Order]
           because this is an emergency call-out.

[10:24 AM] Screen shows NEW WORK ORDER form:
           ┌──────────────────────────────────┐
           │ NEW WORK ORDER                   │
           │ ─────────────────────────────────│
           │ Project: Admiral Hartman (A-001) │
           │                                  │
           │ Work Order Title:*               │
           │ [Emergency Roof Leak Assessment &│
           │  Repair - Jan 7]                 │
           │                                  │
           │ Description:*                    │
           │ [Customer called with leak in   │
           │  south building. Team sent to   │
           │  assess and patch. Materials &  │
           │  labor TBD.]                    │
           │                                  │
           │ Estimated Start Date: 01/07/2026│
           │ Estimated End Date:   01/08/2026│
           │                                  │
           │ Primary Trade: Roofing           │
           │ Budget Estimate: $3,000          │
           │                                  │
           │ [SAVE & CONTINUE]                │
           └──────────────────────────────────┘

[10:25 AM] Owner 1 enters details, taps [SAVE & CONTINUE]
           System generates NEW WORK ORDER #0237 (next sequential in CAPEX)
           
           BEHIND THE SCENES:
           ├─ WO-0237 created in database
           ├─ Auto-linked to project A-001
           ├─ Status set to "In Progress"
           ├─ Created timestamp: 01/07/2026 10:25 AM
           ├─ Created by: Owner 1
           └─ Stored in work_orders table

[10:26 AM] Screen returns to PO DETAILS form:
           ┌──────────────────────────────────┐
           │ NEW PURCHASE ORDER               │
           │ ─────────────────────────────────│
           │ Division: CAPEX [auto]           │
           │ Project: A-001 Admiral Hartman   │
           │ Work Order: WO-0237 (Emergency   │
           │             Roof Leak Assess)   │
           │                                  │
           │ Vendor: [Tap to select]          │
           │ Recent: ABC Roofing Supply       │
           │         Home Depot Pro           │
           │         Equipment Rentals Co     │
           │                                  │
           │ Required By Date: 01/07/2026    │
           │ Payment Terms: Net 30            │
           │                                  │
           │ [ADD LINE ITEMS]                 │
           │ [GENERATE PO NUMBER]             │
           │ [SAVE AS DRAFT]                  │
           └──────────────────────────────────┘

[10:27 AM] Owner 1 taps vendor: "ABC Roofing Supply"
           (because that's who did Phase 1 & 2 work)

[10:28 AM] Owner 1 taps [ADD LINE ITEMS]
           ┌──────────────────────────────────┐
           │ LINE ITEM 1                      │
           │ ─────────────────────────────────│
           │ Description: TPO Membrane 60mil, │
           │              White (by the roll) │
           │ Qty: 2                           │
           │ Unit: Roll                       │
           │ Unit Price: $1,200 (suggested    │
           │             from ABC catalog)   │
           │ Subtotal: $2,400                 │
           │                                  │
           │ GL Account: [Auto-suggest]       │
           │ ✓ 5010 - Roofing Materials       │
           │                                  │
           │ [SAVE LINE]                      │
           └──────────────────────────────────┘

[10:29 AM] Owner 1 adds line item for TPO.
           System auto-assigns GL 5010.

[10:30 AM] Owner 1 taps [ADD LINE ITEM] again for flashing:
           ┌──────────────────────────────────┐
           │ LINE ITEM 2                      │
           │ ─────────────────────────────────│
           │ Description: Aluminum Flashing   │
           │              Kit, 24 inch        │
           │ Qty: 1                           │
           │ Unit: Kit                        │
           │ Unit Price: $450                 │
           │ Subtotal: $450                   │
           │                                  │
           │ GL Account: [Auto-suggest]       │
           │ ✓ 6090 - Building Supplies       │
           │                                  │
           │ [SAVE LINE]                      │
           └──────────────────────────────────┘

[10:31 AM] Owner 1 adds flashing line item.

[10:32 AM] Owner 1 taps [GENERATE PO NUMBER]
           System calculates:
           
           ├─ Division Leader ID: O1 (Owner 1)
           ├─ GL Account (first line): 10 (code for 5010 Roofing Materials)
           ├─ Work Order Number: 0237 (just created)
           ├─ Supplier Confirmation: AB (ABC Roofing Supply)
           │
           └─> **GENERATED PO NUMBER: O1 10 0237 AB**

           SYSTEM OUTPUTS:
           ├─ PO Header created (status: Draft)
           ├─ PO Lines created (2 items)
           ├─ Cost Center auto-assigned: CAP-0237-01
           ├─ Total amount calculated: $2,850 (before tax)
           ├─ QB Class assigned: CAPEX Division
           ├─ Approval routing set: Owner 1 (auto)
           └─ Internal reference stored

[10:33 AM] App confirms:
           ┌──────────────────────────────────┐
           │ ✓ PO NUMBER GENERATED:           │
           │   O1 10 0237 AB                  │
           │                                  │
           │ PROJECT: A-001 Admiral Hartman  │
           │ WORK ORDER: WO-0237             │
           │ VENDOR: ABC Roofing Supply      │
           │ TOTAL: $2,850 (before tax)      │
           │                                  │
           │ Status: DRAFT                    │
           │ Approver: Owner 1 (you)          │
           │                                  │
           │ [APPROVE NOW] [SAVE DRAFT]       │
           └──────────────────────────────────┘

[10:34 AM] Owner 1 taps [APPROVE NOW]
           Because he already knows he wants to order these materials.
           
           System transitions:
           ├─ PO Status: Draft → Approved
           ├─ Approval timestamp: 01/07/2026 10:34 AM
           ├─ Approver_ID: Owner 1
           └─ Email sent to Accounting: "New Approved PO O1 10 0237 AB"

[10:35 AM] App shows:
           ┌──────────────────────────────────┐
           │ ✓ PO APPROVED                    │
           │   O1 10 0237 AB                  │
           │                                  │
           │ Status: APPROVED                 │
           │ Approved by: Owner 1             │
           │ Approved at: 10:34 AM            │
           │                                  │
           │ [ISSUE TO VENDOR (Phone)]        │
           │ [EXPORT PDF]                     │
           │ [EMAIL VENDOR]                   │
           │ [CLOSE]                          │
           └──────────────────────────────────┘

[10:36 AM] Owner 1 taps [ISSUE TO VENDOR (Phone)]
           App dials ABC Roofing Supply's main number
           (stored in vendor record from previous orders).

[10:37 AM] Owner 1 on phone with ABC Roofing Supply dispatcher:
           "Hi, I need to place an order. PO number is O1 10 0237 AB.
            We need 2 rolls of TPO 60mil white, 1 aluminum flashing kit, 24 inch.
            Delivery required by today - can you get it here by 2 PM?
            
            ...materials are in stock, can deliver by 1:30 PM, no charge.
            
            Perfect. Order placed. I'll text you the PO PDF in a second."

[10:38 AM] Owner 1 taps [EMAIL VENDOR]
           System generates professional PDF of O1 10 0237 AB
           with:
           ├─ PO Number (large, prominent)
           ├─ Bill-to: All Surface Roofing
           ├─ Ship-to: Admiral Hartman, Building South
           ├─ Line items with descriptions, qty, unit price, subtotal
           ├─ Payment terms (Net 30)
           ├─ Project reference (Admiral Hartman A-001)
           ├─ Work Order reference (WO-0237)
           ├─ Contact for questions (Owner 1's phone/email)
           └─ Delivery instructions

           Email sent to: ABC Roofing Supply <invoices@abcroof.com>

[10:39 AM] Materials en route. Receiving can now track incoming shipment.

[10:40 AM] Owner 1 continues his day with emergency roof assessment.
```

### Key Features of This Workflow

✅ **10-minute PO creation** (from call to approved)  
✅ **Phone-first interface** (big buttons, minimal typing)  
✅ **Smart auto-population** (remembers Admiral Hartman, ABC Supply, recent line items)  
✅ **On-demand work order creation** (WO-0237 generated during PO creation)  
✅ **Deterministic PO number** (O1 10 0237 AB = Owner 1, Roofing Materials, WO-0237, ABC)  
✅ **One form = One PO + One Work Order** (both created simultaneously)  
✅ **Integrated phone dialer** (direct to vendor, no address book lookup)  
✅ **PDF generation** (instant professional document)  
✅ **Division leader only** (no field staff access)  

---

## 5. DATA MODELS & SCHEMA

### Core Tables

#### `division_leaders` (Reference)
```plaintext
┌────────────────┬─────────────┬────────────────────────────┐
│ Field          │ Type        │ Description                │
├────────────────┼─────────────┼────────────────────────────┤
│ id (PK)        │ UUID        │ Unique identifier          │
│ name           │ VARCHAR     │ Owner 1, Owner 2, etc      │
│ email          │ VARCHAR     │ Corporate email            │
│ phone          │ VARCHAR     │ Mobile phone (for dialing) │
│ division_code  │ VARCHAR(2)  │ O1, O2, O3, O4, OM         │
│ division_id    │ FK          │ References divisions table │
│ qb_class_name  │ VARCHAR     │ QB Class name              │
│ approval_limit │ DECIMAL     │ Max amount can approve     │
│ is_active      │ BOOLEAN     │ Still working there?       │
│ created_at     │ TIMESTAMP   │ When added to system       │
│ updated_at     │ TIMESTAMP   │ Last modified              │
└────────────────┴─────────────┴────────────────────────────┘
```

#### `po_headers` (Main PO Record)
```plaintext
┌──────────────────────────┬─────────────┬────────────────────────────┐
│ Field                    │ Type        │ Description                │
├──────────────────────────┼─────────────┼────────────────────────────┤
│ id (PK)                  │ UUID        │ Unique identifier          │
│ po_number                │ VARCHAR(11) │ O1 10 0001 AB (smart)      │
│ po_number_sequence       │ INTEGER     │ Auto-increment for display │
│ division_leader_id       │ FK          │ Who created it (O1, O2...) │
│ division_id              │ FK          │ CAPEX, Roofing, etc        │
│ project_id               │ FK          │ Admiral Hartman (A-001)    │
│ work_order_id            │ FK          │ WO-0237 (emergency repair) │
│ vendor_id                │ FK          │ ABC Roofing Supply         │
│ cost_center_code         │ VARCHAR(10) │ CAP-0237-01 (auto-gen)     │
│ status                   │ ENUM        │ Draft, Approved, Issued... │
│ required_by_date         │ DATE        │ When needed                │
│ terms_code               │ VARCHAR(10) │ Net30, COD, etc            │
│ tax_rate                 │ DECIMAL     │ 0.08 (8% for CA)           │
│ total_amount             │ DECIMAL     │ Sum of all lines + tax     │
│ requested_by_user_id     │ FK          │ User who created           │
│ approved_by_user_id      │ FK          │ User who approved          │
│ approved_at              │ TIMESTAMP   │ When approved              │
│ issued_at                │ TIMESTAMP   │ When sent to vendor        │
│ issued_to_vendor_email   │ VARCHAR     │ Confirmation of delivery   │
│ notes_internal           │ TEXT        │ Staff notes (not vendor)   │
│ notes_vendor             │ TEXT        │ Notes shown on PDF         │
│ created_at               │ TIMESTAMP   │ When PO created            │
│ updated_at               │ TIMESTAMP   │ Last modification          │
│ deleted_at               │ TIMESTAMP   │ Soft delete flag           │
└──────────────────────────┴─────────────┴────────────────────────────┘
```

#### `po_line_items` (Details of Each Line)
```plaintext
┌──────────────────────────┬─────────────┬────────────────────────────┐
│ Field                    │ Type        │ Description                │
├──────────────────────────┼─────────────┼────────────────────────────┤
│ id (PK)                  │ UUID        │ Unique identifier          │
│ po_id                    │ FK          │ Parent PO                  │
│ line_number              │ INTEGER     │ 1, 2, 3 (sequence)         │
│ item_description         │ VARCHAR     │ "TPO Membrane 60mil White" │
│ quantity                 │ DECIMAL     │ 2 (qty ordered)            │
│ unit_of_measure          │ VARCHAR     │ Roll, Kit, SF, EA, etc     │
│ unit_price               │ DECIMAL     │ Price per unit             │
│ line_subtotal            │ DECIMAL     │ Qty × Unit Price           │
│ gl_account_code          │ VARCHAR(2)  │ "10" (code for 5010)       │
│ gl_account_number        │ VARCHAR(4)  │ "5010" (QB account)        │
│ gl_account_name          │ VARCHAR     │ "Roofing Materials"        │
│ is_taxable               │ BOOLEAN     │ Should tax apply?          │
│ status                   │ ENUM        │ Pending, Received, etc     │
│ quantity_received        │ DECIMAL     │ How much arrived (update)  │
│ received_at              │ TIMESTAMP   │ When delivery arrived      │
│ created_at               │ TIMESTAMP   │ When line added            │
│ updated_at               │ TIMESTAMP   │ Last modification          │
└──────────────────────────┴─────────────┴────────────────────────────┘
```

#### `work_orders` (New Table - Created When PO Creates WO)
```plaintext
┌──────────────────────────┬─────────────┬────────────────────────────┐
│ Field                    │ Type        │ Description                │
├──────────────────────────┼─────────────┼────────────────────────────┤
│ id (PK)                  │ UUID        │ Unique identifier          │
│ work_order_number        │ VARCHAR(10) │ WO-0237 (auto-gen)         │
│ division_id              │ FK          │ Which division             │
│ project_id               │ FK          │ A-001 (Admiral Hartman)    │
│ title                    │ VARCHAR     │ "Emergency Roof Leak ..."  │
│ description              │ TEXT        │ Full details from PO form  │
│ primary_trade            │ VARCHAR     │ Roofing, General Cont, etc │
│ status                   │ ENUM        │ InProgress, Completed, etc │
│ budget_estimate          │ DECIMAL     │ $3,000 (estimated)         │
│ budget_actual            │ DECIMAL     │ Actual spend (sum of POs)  │
│ start_date_planned       │ DATE        │ When supposed to start     │
│ start_date_actual        │ DATE        │ When actually started      │
│ end_date_planned         │ DATE        │ When supposed to finish    │
│ end_date_actual          │ DATE        │ When actually finished     │
│ created_by_user_id       │ FK          │ Who created WO             │
│ created_at               │ TIMESTAMP   │ When WO created            │
│ updated_at               │ TIMESTAMP   │ Last modification          │
└──────────────────────────┴─────────────┴────────────────────────────┘
```

#### `vendors` (Supplier/Subcontractor Database)
```plaintext
┌──────────────────────────┬─────────────┬────────────────────────────┐
│ Field                    │ Type        │ Description                │
├──────────────────────────┼─────────────┼────────────────────────────┤
│ id (PK)                  │ UUID        │ Unique identifier          │
│ vendor_name              │ VARCHAR     │ "ABC Roofing Supply"       │
│ vendor_code              │ VARCHAR(2)  │ "AB" (for PO #)            │
│ vendor_type              │ ENUM        │ Material, Labor, Equipment │
│ contact_name             │ VARCHAR     │ Primary contact            │
│ contact_phone            │ VARCHAR     │ Direct number (auto-dial)  │
│ contact_email            │ VARCHAR     │ Invoices email address     │
│ address_line_1           │ VARCHAR     │ Street address             │
│ address_line_2           │ VARCHAR     │ Suite/apt                  │
│ city                     │ VARCHAR     │ San Diego                  │
│ state                    │ VARCHAR(2)  │ CA                         │
│ zip                      │ VARCHAR     │ 92101                      │
│ phone_main               │ VARCHAR     │ Main phone                 │
│ payment_terms_default    │ VARCHAR     │ Net30, COD, etc            │
│ tax_id                   │ VARCHAR     │ Federal EIN or SSN         │
│ is_active                │ BOOLEAN     │ Still doing business?      │
│ 1099_required            │ BOOLEAN     │ Is subcontractor (1099)?   │
│ w9_on_file               │ BOOLEAN     │ W-9 form received?         │
│ preferred_divisions      │ JSON        │ Works with: [CAPEX, Roof]  │
│ created_at               │ TIMESTAMP   │ When added to system       │
│ updated_at               │ TIMESTAMP   │ Last modification          │
└──────────────────────────┴─────────────┴────────────────────────────┘
```

#### `projects` (Customer/Property Portfolio)
```plaintext
┌──────────────────────────┬─────────────┬────────────────────────────┐
│ Field                    │ Type        │ Description                │
├──────────────────────────┼─────────────┼────────────────────────────┤
│ id (PK)                  │ UUID        │ Unique identifier          │
│ project_code             │ VARCHAR(15) │ "A-001" (Admiral Hartman)  │
│ project_name             │ VARCHAR     │ "Admiral Hartman District" │
│ customer_id              │ FK          │ Link to customers table    │
│ property_address         │ VARCHAR     │ Physical location          │
│ district_code            │ VARCHAR(2)  │ A, B, C, D, F, G (code)    │
│ district_name            │ VARCHAR     │ "Admiral Hartman"          │
│ primary_division_id      │ FK          │ Usually CAPEX              │
│ status                   │ ENUM        │ Active, Completed, OnHold  │
│ start_date               │ DATE        │ When project started       │
│ end_date                 │ DATE        │ When project finished      │
│ budget_total             │ DECIMAL     │ Overall project budget     │
│ budget_actual            │ DECIMAL     │ Actual spend to date       │
│ budget_remaining         │ DECIMAL     │ (calculated)               │
│ po_count                 │ INTEGER     │ How many POs on project    │
│ created_at               │ TIMESTAMP   │ When added                 │
│ updated_at               │ TIMESTAMP   │ Last modification          │
└──────────────────────────┴─────────────┴────────────────────────────┘
```

#### `gl_account_mappings` (QuickBooks GL Codes)
```plaintext
┌──────────────────────────┬─────────────┬────────────────────────────┐
│ Field                    │ Type        │ Description                │
├──────────────────────────┼─────────────┼────────────────────────────┤
│ id (PK)                  │ UUID        │ Unique identifier          │
│ gl_code_short            │ VARCHAR(2)  │ "10" (abbreviated)         │
│ gl_account_number        │ VARCHAR(4)  │ "5010" (QB account)        │
│ gl_account_name          │ VARCHAR     │ "Roofing Materials"        │
│ gl_account_category      │ ENUM        │ COGS, OpEx, Other, CreditCd│
│ is_taxable_default       │ BOOLEAN     │ Default tax treatment      │
│ qb_sync_enabled          │ BOOLEAN     │ Should sync to QB?         │
│ is_active                │ BOOLEAN     │ Still using this account?  │
│ created_at               │ TIMESTAMP   │ When added                 │
│ updated_at               │ TIMESTAMP   │ Last modification          │
└──────────────────────────┴─────────────┴────────────────────────────┘
```

#### `po_approvals` (Audit Trail)
```plaintext
┌──────────────────────────┬─────────────┬────────────────────────────┐
│ Field                    │ Type        │ Description                │
├──────────────────────────┼─────────────┼────────────────────────────┤
│ id (PK)                  │ UUID        │ Unique identifier          │
│ po_id                    │ FK          │ Which PO?                  │
│ action                   │ ENUM        │ Created, Submitted, Appr...│
│ actor_user_id            │ FK          │ Who took action            │
│ actor_division_id        │ FK          │ Which division leader      │
│ status_before            │ VARCHAR     │ Previous status            │
│ status_after             │ VARCHAR     │ New status                 │
│ notes                    │ TEXT        │ Why rejected, etc          │
│ ip_address               │ VARCHAR     │ Where action taken from    │
│ timestamp                │ TIMESTAMP   │ When action occurred       │
└──────────────────────────┴─────────────┴────────────────────────────┘
```

---

## 6. BUSINESS LOGIC & VALIDATION RULES

### PO Creation Validation

```plaintext
Rule #1: Only Division Leaders Can Create POs
├─ Check: Is user.role == 'DIVISION_LEADER' or 'MAJORITY_OWNER'?
├─ If No: Reject with "Only division leaders can create POs"
└─ If Yes: Proceed

Rule #2: Division Must Match User's Assigned Division
├─ Check: Does user.division_id == po.division_id?
├─ Exception: Majority owner can create for any division
└─ If mismatch: Reject "You can only create POs for your division"

Rule #3: Project Must Exist or Be Creatable
├─ Check: Does project_id exist in projects table?
├─ If No: Check if creating new work order (allowed)
└─ If No project and no new WO: Reject "Project required"

Rule #4: Work Order Must Exist or Be Creatable
├─ Option A: Select from existing WOs (auto-populate recent)
├─ Option B: Create new WO (in-line via form)
└─ Cannot proceed without one or the other

Rule #5: Vendor Must Exist
├─ Check: Does vendor_id exist and is_active = true?
├─ If No: Reject "Vendor not found or inactive"
└─ If Yes: Load vendor contact info (phone, email, address)

Rule #6: GL Accounts Must Be Valid
├─ Each line item requires gl_account_number from approved list
├─ Check: Does account exist in gl_account_mappings?
├─ If No: Reject "GL account not recognized"
└─ If Yes: Fetch account name and category (for QB mapping)

Rule #7: Quantities & Prices Must Be Positive
├─ Check: quantity > 0 AND unit_price >= 0 for each line
├─ If fails: Reject "Invalid quantity or price"
└─ Calculate subtotal per line and total amount

Rule #8: Required Fields
├─ Must have: division, project, work order, vendor, at least 1 line item
├─ Must have: required_by_date (cannot be in past)
└─ If missing: Reject "Please fill all required fields"

Rule #9: GL Account Abbreviation Calculation
├─ For FIRST line item, extract gl_code_short (e.g., "10")
├─ Store in po_headers.primary_gl_code for PO number generation
└─ (If multiple GL accounts, use first line's account)

Rule #10: Work Order Number Sequence
├─ If creating new WO: Get next sequence for (division_id, year)
├─ Example: CAPEX in 2026 has WOs 0001-0236, next is 0237
├─ Store as work_order_number in both WO and PO header
└─ Use in PO number generation
```

### PO Number Generation Logic

```plaintext
FUNCTION: generate_smart_po_number(
    division_leader_id: UUID,
    gl_account_code: VARCHAR(2),
    work_order_number: INTEGER,
    vendor_code: VARCHAR(2)
) → VARCHAR(11)

PROCESS:
└─ Step 1: Fetch division leader's code (O1, O2, O3, O4, OM)
   └─ SELECT division_code FROM division_leaders WHERE id = division_leader_id
   └─ Result: e.g., "O1"

└─ Step 2: Validate GL code exists
   └─ SELECT gl_code_short FROM gl_account_mappings WHERE id = gl_account_code
   └─ Result: e.g., "10"

└─ Step 3: Format work order as 4-digit zero-padded string
   └─ LPAD(work_order_number, 4, '0')
   └─ Result: e.g., "0237"

└─ Step 4: Fetch vendor confirmation code (last 2 chars of vendor name)
   └─ SELECT vendor_code FROM vendors WHERE id = vendor_id
   └─ Result: e.g., "AB"

└─ Step 5: Concatenate with spaces
   └─ CONCAT(leader_code, ' ', gl_code, ' ', wo_number, ' ', vendor_code)
   └─ Example: "O1 10 0237 AB"

VALIDATION:
├─ PO number must be unique (check po_headers for duplicates)
├─ PO number must match pattern: [O1-4|OM] [10-99] [0001-9999] [A-Z]{2}
└─ If duplicate found, increment work order and retry

STORAGE:
├─ Save po_number as VARCHAR(11) in po_headers
├─ Save component parts for searchability:
│   ├─ po_leader_code: "O1"
│   ├─ po_gl_code: "10"
│   ├─ po_work_order: 0237
│   └─ po_vendor_code: "AB"
└─ Create index on po_number for fast lookup
```

### One Form = PO + Work Order Creation

```plaintext
SCENARIO: Owner 1 creates PO with NEW Work Order

USER FLOW:
Step 1: User opens PO creation form
        └─ Division auto-set to their division
        └─ Project selector shows recent projects

Step 2: User selects project (Admiral Hartman A-001)
        └─ App loads recent WOs for that project
        └─ Shows: WO-0234, WO-0235, WO-0236
        └─ Provides option: [Create NEW Work Order]

Step 3: User taps [Create NEW Work Order]
        └─ Inline form appears in same screen
        └─ Fields: Title*, Description*, Trade, Budget, Dates
        └─ User fills in: "Emergency Roof Leak", details...
        └─ User taps [SAVE WO & CONTINUE PO]

Step 4: System validates WO data
        ├─ Check: Title is not empty
        ├─ Check: Project exists
        ├─ Check: Division matches
        └─ Check: Dates make sense

Step 5: System creates Work Order
        ├─ Generate next WO sequence for division/year
        │  └─ CAPEX 2026: last WO was 0236, next = 0237
        ├─ INSERT into work_orders:
        │  ├─ work_order_number: "WO-0237"
        │  ├─ division_id: CAPEX
        │  ├─ project_id: A-001
        │  ├─ title: "Emergency Roof Leak Assessment & Repair"
        │  ├─ status: "In Progress"
        │  ├─ created_by_user_id: Owner 1's UUID
        │  └─ created_at: NOW()
        ├─ Return: work_order_id (UUID)
        └─ Log in po_approvals: action='WO_CREATED'

Step 6: Form returns to PO Details (auto-linked to new WO)
        ├─ Po_headers.work_order_id = new WO's UUID
        ├─ Display: "Work Order: WO-0237 (Emergency Roof Leak Assessment)"
        └─ Continue with PO line items...

Step 7: User adds line items
        ├─ TPO Membrane, qty 2, GL 5010
        ├─ Flashing Kit, qty 1, GL 6090
        └─ [GENERATE PO NUMBER]

Step 8: System generates PO number
        ├─ Leader: O1 (Owner 1)
        ├─ GL Code: 10 (from first line item, GL 5010 → code 10)
        ├─ WO Number: 0237 (from newly created WO)
        ├─ Vendor Code: AB (ABC Roofing)
        └─ Result: "O1 10 0237 AB"

Step 9: Create PO Header
        ├─ INSERT into po_headers:
        │  ├─ po_number: "O1 10 0237 AB"
        │  ├─ division_leader_id: Owner 1's UUID
        │  ├─ division_id: CAPEX
        │  ├─ project_id: A-001 (Admiral Hartman)
        │  ├─ work_order_id: WO-0237's UUID
        │  ├─ vendor_id: ABC Roofing's UUID
        │  ├─ status: "Draft"
        │  ├─ cost_center_code: "CAP-0237-01" (auto)
        │  ├─ total_amount: $2,850
        │  ├─ requested_by_user_id: Owner 1
        │  ├─ created_at: NOW()
        │  └─ Return: po_id (UUID)
        └─ Log in po_approvals: action='PO_CREATED'

Step 10: Create PO Line Items
         ├─ INSERT line 1: TPO Membrane
         │  ├─ po_id: (PO's UUID)
         │  ├─ line_number: 1
         │  ├─ gl_account_number: 5010
         │  ├─ gl_code_short: 10
         │  ├─ quantity: 2, unit_price: $1,200, subtotal: $2,400
         │  └─ is_taxable: true
         │
         ├─ INSERT line 2: Flashing Kit
         │  ├─ po_id: (PO's UUID)
         │  ├─ line_number: 2
         │  ├─ gl_account_number: 6090
         │  ├─ gl_code_short: 25
         │  ├─ quantity: 1, unit_price: $450, subtotal: $450
         │  └─ is_taxable: true
         │
         └─ Log each line creation in po_approvals

Step 11: Calculate Totals
         ├─ Subtotal: $2,400 + $450 = $2,850
         ├─ Tax (8%): $2,850 × 0.08 = $228
         ├─ Total: $2,850 + $228 = $3,078
         └─ UPDATE po_headers: total_amount = $3,078

Step 12: Both PO & Work Order Now Exist in System
         ├─ Work Order: WO-0237 linked to project A-001
         ├─ PO Header: O1 10 0237 AB with 2 line items
         ├─ Status: PO is Draft (not yet approved)
         └─ Ready for: Approval → Issuance → Receipt → Invoice → Payment

RESULT:
✓ Single form created both WO-0237 and PO O1 10 0237 AB
✓ PO number encodes WO number for perfect alignment
✓ All data stored atomically (all or nothing)
✓ Audit trail logged for both PO and WO creation
✓ Ready for next step: Owner 1 approval
```

---

## 7. ONE-FORM PO + WORK ORDER GENERATION

### Data Flow Diagram

```plaintext
                    ┌──────────────────────────────┐
                    │  User opens PO Manager App   │
                    │  (Division Leader Login)     │
                    └──────────────┬───────────────┘
                                   │
                                   ▼
                    ┌──────────────────────────────┐
                    │  Select or Create Project    │
                    │  (A-001, B-001, etc)         │
                    └──────────────┬───────────────┘
                                   │
                                   ▼
                    ┌──────────────────────────────┐
                    │  Select Existing WO           │
                    │  OR                           │
                    │  [Create NEW Work Order]      │
                    └──────────────┬───────────────┘
                                   │
                    ┌──────────────┴──────────────┐
                    │                             │
                    ▼                             ▼
         ┌────────────────────┐    ┌──────────────────────────┐
         │  Use Existing WO   │    │  CREATE NEW WORK ORDER   │
         │  (WO-0234, etc)    │    │  (inline form)           │
         │                    │    │                          │
         │  - Title           │    │ - Title: "Emergency..."  │
         │  - Description     │    │ - Description: "Leak..." │
         │  - Trade           │    │ - Trade: Roofing        │
         │  - Status          │    │ - Budget: $3,000        │
         │  - Budget          │    │ - Dates: Jan 7-8        │
         │                    │    │                          │
         │  [SELECT]          │    │ [INSERT into WO table]  │
         └─────────┬──────────┘    │ [Return: WO-0237]      │
                   │                │                         │
                   │                └──────────┬──────────────┘
                   │                           │
                   └──────────────┬────────────┘
                                  │
                                  ▼
                    ┌──────────────────────────────┐
                    │  PO Details Form             │
                    │  - Division (auto-set)       │
                    │  - Project (A-001)           │
                    │  - Work Order (WO-0237)      │
                    │  - Vendor (ABC Supply)       │
                    │  - Required By Date          │
                    │  - Terms                     │
                    └──────────────┬───────────────┘
                                   │
                                   ▼
                    ┌──────────────────────────────┐
                    │  Add Line Items              │
                    │  [+ Line Item 1]             │
                    │    ├─ Description            │
                    │    ├─ Qty / Unit / Price    │
                    │    ├─ GL Account (auto)      │
                    │    └─ Subtotal (auto-calc)  │
                    │                              │
                    │  [+ Line Item 2]             │
                    │    ├─ Description            │
                    │    ├─ Qty / Unit / Price    │
                    │    ├─ GL Account (auto)      │
                    │    └─ Subtotal (auto-calc)  │
                    │                              │
                    │  [GENERATE PO NUMBER]        │
                    └──────────────┬───────────────┘
                                   │
                                   ▼
                    ┌──────────────────────────────┐
                    │  Calculate Totals & Generate │
                    │  - Subtotal: $2,850         │
                    │  - Tax (8%): $228           │
                    │  - Total: $3,078            │
                    │  - Cost Center: CAP-0237-01 │
                    │  - PO Number: O1 10 0237 AB │
                    │  - QB Class: CAPEX Division │
                    └──────────────┬───────────────┘
                                   │
                                   ▼
                    ┌──────────────────────────────┐
                    │  DB Insert - Atomic          │
                    │                              │
                    │  [If new WO created:]        │
                    │  INSERT into work_orders     │
                    │  ├─ work_order_number       │
                    │  ├─ division_id             │
                    │  ├─ project_id              │
                    │  ├─ title, description      │
                    │  └─ created_at, created_by  │
                    │                              │
                    │  [Always for PO:]            │
                    │  INSERT into po_headers      │
                    │  ├─ po_number               │
                    │  ├─ division_id             │
                    │  ├─ project_id              │
                    │  ├─ work_order_id (FK)      │
                    │  ├─ vendor_id               │
                    │  ├─ total_amount            │
                    │  └─ status: Draft           │
                    │                              │
                    │  INSERT into po_line_items  │
                    │  ├─ po_id (FK)              │
                    │  ├─ line_number             │
                    │  ├─ gl_account_number       │
                    │  ├─ quantity, unit_price    │
                    │  └─ is_taxable              │
                    │                              │
                    │  [Audit Trail:]             │
                    │  INSERT into po_approvals   │
                    │  ├─ action: PO_CREATED      │
                    │  ├─ po_id                   │
                    │  ├─ actor_user_id           │
                    │  └─ timestamp               │
                    │                              │
                    │  [If WO created:]           │
                    │  INSERT into po_approvals   │
                    │  ├─ action: WO_CREATED      │
                    │  ├─ work_order_id           │
                    │  ├─ actor_user_id           │
                    │  └─ timestamp               │
                    │                              │
                    │  COMMIT TRANSACTION         │
                    └──────────────┬───────────────┘
                                   │
                                   ▼
                    ┌──────────────────────────────┐
                    │  Success Screen              │
                    │  ✓ PO Created: O1 10 0237 AB│
                    │  ✓ WO Created: WO-0237      │
                    │  ✓ Status: DRAFT            │
                    │  ✓ Total: $3,078            │
                    │                              │
                    │  [APPROVE NOW] [SAVE DRAFT] │
                    │  [ISSUE TO VENDOR]          │
                    │  [EXPORT PDF] [CLOSE]       │
                    └──────────────────────────────┘
```

---

## 8. INTEGRATION LAYER (QuickBooks)

### QB Sync When PO Transitions to "Paid"

```plaintext
TRIGGER: PO status changes from "Invoiced" → "Paid"

PROCESS:
┌─ Step 1: Fetch PO Header & All Lines from DB
│  ├─ SELECT * FROM po_headers WHERE id = po_id
│  └─ SELECT * FROM po_line_items WHERE po_id = po_id

├─ Step 2: Build QB Bill/Check for Each Division Leader/Vendor Combo
│  ├─ Get division_id → QB Class name (CAPEX Division, etc)
│  ├─ Get project_id → QB Project/Job name
│  ├─ Get vendor_id → QB Vendor name
│  └─ Group lines by GL account (may be 2-3 different GL accounts)

├─ Step 3: For Each PO Line Item, Create QB Transaction Row
│  ├─ Account: gl_account_number (5010, 6090, etc)
│  ├─ Class: QB Class (from division)
│  ├─ Project/Job: QB Project name
│  ├─ Amount: line_subtotal
│  ├─ Description: item_description + " | PO: " + po_number
│  ├─ Memo: po_number (O1 10 0237 AB)
│  ├─ Memo 2: work_order_number (WO-0237)
│  └─ Cost Center/Tag: cost_center_code (CAP-0237-01)

├─ Step 4: Add Tax Line Item
│  ├─ Account: 5111 (Tax Charged on Materials)
│  ├─ Class: QB Class (same as PO)
│  ├─ Amount: total_tax
│  ├─ Description: "Sales Tax | PO: " + po_number
│  └─ Memo: po_number

├─ Step 5: Create QB Bill or Check (depending on payment_method)
│  ├─ If payment_method = "VENDOR_BILL":
│  │  └─ Create Bill in QB
│  │     ├─ Vendor: vendor name
│  │     ├─ Bill Date: payment_date
│  │     ├─ Due Date: payment_date + terms (e.g., Net 30)
│  │     ├─ Amount: total_amount
│  │     └─ Line items (as detailed above)
│  │
│  └─ If payment_method = "CHECK":
│     └─ Create Check in QB
│        ├─ Payee: vendor name
│        ├─ Payment Date: actual payment date
│        ├─ Amount: total_amount
│        └─ Line items (as detailed above)

├─ Step 6: Link QB Bill/Check back to PO
│  └─ UPDATE po_headers:
│     ├─ qb_bill_id = (QB Bill ID from API response)
│     ├─ qb_sync_status = "SYNCED"
│     ├─ qb_sync_timestamp = NOW()
│     └─ qb_sync_response = (JSON from QB API)

├─ Step 7: Log Sync in Audit Trail
│  └─ INSERT into po_approvals:
│     ├─ po_id
│     ├─ action: "QB_SYNCED"
│     ├─ timestamp: NOW()
│     └─ notes: "Bill/Check created in QB"

└─ Step 8: Send Notification
   └─ Email to Accounting:
      ├─ Subject: "PO O1 10 0237 AB synced to QB"
      ├─ Body: "Bill/Check created in QB. Review in QB Desktop."
      └─ Attachment: QB sync details

QB BILL STRUCTURE (Example):
┌──────────────────────────────────────────────────────────┐
│ Bill #: QB-20260107-001                                  │
│ Vendor: ABC Roofing Supply                               │
│ Bill Date: 01/07/2026                                    │
│ Due Date: 02/06/2026 (Net 30)                           │
│ Amount: $3,078.00                                        │
│                                                          │
│ Line Items:                                              │
│ ┌──────────────────────────────────────────────────────┐│
│ │ Account  │ Class              │ Amount   │ Memo      ││
│ ├──────────────────────────────────────────────────────┤│
│ │ 5010     │ CAPEX Division     │ $2,400   │ O1 10...  ││
│ │ 6090     │ CAPEX Division     │ $450     │ O1 10...  ││
│ │ 5111     │ CAPEX Division     │ $228     │ O1 10...  ││
│ └──────────────────────────────────────────────────────┘│
│                                                          │
│ Custom Fields:                                           │
│ │ PO Number: O1 10 0237 AB                              │
│ │ Work Order: WO-0237                                   │
│ │ Project: Admiral Hartman (A-001)                      │
│ │ Cost Center: CAP-0237-01                              │
│ └────────────────────────────────────────────────────────┘
```

---

## 9. DASHBOARD & REPORTING

### Division Leader Dashboard

```plaintext
┌────────────────────────────────────────────────────────────┐
│  PO MANAGER - Division Leader Dashboard                    │
│  Welcome, Owner 1 (CAPEX Division)                         │
├────────────────────────────────────────────────────────────┤
│                                                            │
│  [This Month] [YTD] [Custom Range]                         │
│                                                            │
│  ┌─ YOUR DIVISION (CAPEX) ─────────────────────────────┐  │
│  │                                                      │  │
│  │ Total Spend (YTD):        $487,654                  │  │
│  │ Open POs:                 12                        │  │
│  │ Pending Approval:         2                         │  │
│  │ Issued (Waiting Receipt): 4                         │  │
│  │ Budget Remaining:         $212,346                  │  │
│  │                                                      │  │
│  │ [View All My POs]                                   │  │
│  └──────────────────────────────────────────────────────┘  │
│                                                            │
│  ┌─ PENDING MY APPROVAL (CAPEX) ───────────────────────┐  │
│  │ Newest First:                                        │  │
│  │ ┌──────────────────────────────────────────────────┐│  │
│  │ │ O3 90 1234 LS    | Gen Contracting ($5,600)    ││  │
│  │ │ Submitted: 1 hr ago by... (WAIT, can't approve) ││  │
│  │ │ (Read-only - different division)                ││  │
│  │ └──────────────────────────────────────────────────┘│  │
│  │ ┌──────────────────────────────────────────────────┐│  │
│  │ │ O1 25 0240 AB    | CAPEX ($3,200)              ││  │
│  │ │ Submitted: 3 hrs ago by Purchaser Janet        ││  │
│  │ │ [APPROVE] [REJECT]                             ││  │
│  │ └──────────────────────────────────────────────────┘│  │
│  │ ┌──────────────────────────────────────────────────┐│  │
│  │ │ O1 10 0241 HD    | CAPEX ($8,900)              ││  │
│  │ │ Submitted: 1 day ago by Purchaser Janet        ││  │
│  │ │ [APPROVE] [REJECT]                             ││  │
│  │ └──────────────────────────────────────────────────┘│  │
│  └──────────────────────────────────────────────────────┘  │
│                                                            │
│  ┌─ CROSS-DIVISIONAL VIEW (Read-Only) ────────────────┐   │
│  │ [Filter by Project] [Filter by Month] [Export]     │   │
│  │                                                     │   │
│  │ ALL DIVISIONS - All Open POs:                       │   │
│  │ ┌─────────────────────────────────────────────────┐│   │
│  │ │ Division        │ Count │ Total Spend │ Status  ││   │
│  │ ├─────────────────────────────────────────────────┤│   │
│  │ │ CAPEX (O1)      │ 12    │ $487,654    │ Open    ││   │
│  │ │ Roofing (O2)    │ 8     │ $234,567    │ Open    ││   │
│  │ │ Gen Contracting │ 5     │ $123,456    │ Open    ││   │
│  │ │ Subs Mgmt (O4)  │ 3     │ $89,123     │ Open    ││   │
│  │ │ Repairs (OM)    │ 7     │ $45,678     │ Open    ││   │
│  │ ├─────────────────────────────────────────────────┤│   │
│  │ │ TOTAL           │ 35    │ $980,478    │         ││   │
│  │ └─────────────────────────────────────────────────┘│   │
│  └──────────────────────────────────────────────────────┘   │
│                                                            │
│  ┌─ PROJECT COST VIEW ────────────────────────────────┐   │
│  │ [Select Project]                                   │   │
│  │ ☐ Admiral Hartman (A-001)                          │   │
│  │ ☐ Casavida Major Complex (CA-001 to CA-012)        │   │
│  │ ☐ Desert Winds (D-001)                             │   │
│  │ ☐ Officer Housing (F-001)                          │   │
│  │                                                    │   │
│  │ [View Project Cost Breakdown by Division]          │   │
│  └──────────────────────────────────────────────────────┘   │
│                                                            │
│  [SETTINGS] [REPORTS] [HELP] [LOGOUT]                    │
└────────────────────────────────────────────────────────────┘
```

### Reports Available

```plaintext
1. PO SUMMARY BY DIVISION
   ├─ Division name
   ├─ Total POs (month/YTD)
   ├─ Total spend (month/YTD)
   ├─ Average PO size
   ├─ On-time delivery %
   └─ Export: CSV, PDF

2. PO DETAILS BY PROJECT
   ├─ Project code & name
   ├─ All POs touching project (across divisions)
   ├─ Group by division (shows who spent what)
   ├─ Group by GL account (shows cost breakdown)
   ├─ Total project cost to date
   ├─ Budget remaining
   └─ Export: CSV, PDF

3. GL ACCOUNT ANALYSIS
   ├─ GL account number & name
   ├─ Category (COGS, OpEx, Other)
   ├─ Total spend YTD
   ├─ Budget vs actual
   ├─ Variance analysis
   ├─ Top vendors for account
   └─ Export: CSV, PDF

4. VENDOR ANALYSIS
   ├─ Vendor name & code
   ├─ Total POs issued
   ├─ Total spend
   ├─ Average order size
   ├─ Last order date
   ├─ On-time delivery %
   ├─ Quality issues (if tracked)
   └─ Export: CSV, PDF

5. BUDGET vs ACTUAL
   ├─ Project budget
   ├─ YTD spend
   ├─ Committed (approved POs not yet paid)
   ├─ Remaining budget
   ├─ % spent to date
   ├─ Forecast vs estimate
   └─ Export: CSV, PDF

6. APPROVAL BOTTLENECK REPORT
   ├─ POs pending approval > 24 hrs
   ├─ Approver
   ├─ Submitted date
   ├─ Amount
   ├─ Priority (based on due date)
   └─ Alert if > $50K pending
```

---

## 10. API ENDPOINTS & SERVICES

### REST API (Backend)

```plaintext
BASE_URL: https://api.posystem.allsurfaceroofing.com

═══════════════════════════════════════════════════════════

AUTHENTICATION
POST /auth/login
  Body: { email, password }
  Returns: { token, user_id, division_id, role }

POST /auth/logout
  Headers: { Authorization: Bearer <token> }

═══════════════════════════════════════════════════════════

WORK ORDERS

POST /work-orders
  Headers: { Authorization: Bearer <token> }
  Body:
    {
      division_id: UUID,
      project_id: UUID,
      title: String,
      description: String,
      primary_trade: Enum(Roofing, GC, Subs, Electrical, etc),
      budget_estimate: Decimal,
      start_date_planned: Date,
      end_date_planned: Date
    }
  Returns: { work_order_id, work_order_number, status, created_at }

GET /work-orders/:work_order_id
  Returns: { id, work_order_number, division_id, project_id, ... }

GET /projects/:project_id/work-orders
  Returns: [ { work_order_id, work_order_number, status, ... } ]

═══════════════════════════════════════════════════════════

PURCHASE ORDERS

POST /purchase-orders
  Headers: { Authorization: Bearer <token> }
  Body:
    {
      division_id: UUID,
      project_id: UUID,
      work_order_id: UUID [or null, see comment below],
      vendor_id: UUID,
      required_by_date: Date,
      terms_code: Enum(Net30, Net60, COD, etc),
      tax_rate: Decimal (0.08),
      notes_internal: String,
      notes_vendor: String,
      line_items: [
        {
          item_description: String,
          quantity: Decimal,
          uom: String (EA, Roll, SF, Kit, etc),
          unit_price: Decimal,
          gl_account_number: String (5010, 6090, etc),
          is_taxable: Boolean
        },
        ...
      ]
    }
  COMMENT: If work_order_id is null, system will create inline WO
           using fields in request body:
           {
             wo_title: String,
             wo_description: String,
             wo_budget_estimate: Decimal
           }
  Returns:
    {
      po_id: UUID,
      po_number: "O1 10 0237 AB",
      status: "Draft",
      total_amount: Decimal,
      cost_center_code: "CAP-0237-01",
      created_at: Timestamp
    }

GET /purchase-orders/:po_id
  Returns: Full PO details with all line items

PUT /purchase-orders/:po_id
  Headers: { Authorization: Bearer <token> }
  Body: { [fields to update] }
  CONSTRAINT: Only creator or division leader can modify

DELETE /purchase-orders/:po_id (soft delete)
  CONSTRAINT: Only draft POs can be deleted

POST /purchase-orders/:po_id/approve
  Headers: { Authorization: Bearer <token> }
  Returns: { po_id, status: "Approved", approved_by: UUID, approved_at: Timestamp }
  CONSTRAINT: Only assigned approver can approve

POST /purchase-orders/:po_id/reject
  Headers: { Authorization: Bearer <token> }
  Body: { reason: String }
  Returns: { po_id, status: "Rejected", reason, ... }

POST /purchase-orders/:po_id/issue
  Headers: { Authorization: Bearer <token> }
  Body: { send_to_email: String }
  Returns: { po_id, status: "Issued", issued_at, issued_to_vendor_email }

GET /purchase-orders
  Query: { division_id, project_id, vendor_id, status, created_after, created_before }
  Returns: [ { po_id, po_number, division, project, vendor, status, total, ... } ]

═══════════════════════════════════════════════════════════

PROJECTS

GET /projects
  Returns: [ { project_id, project_code, name, district, status, ... } ]

GET /projects/:project_id
  Returns: { project_id, project_code, name, customer_id, budget_total, budget_actual, ... }

POST /projects
  [Admin only - typically imported from QB or CRM]

═══════════════════════════════════════════════════════════

VENDORS

GET /vendors
  Query: { is_active, preferred_divisions }
  Returns: [ { vendor_id, vendor_name, vendor_code, contact_phone, ... } ]

GET /vendors/:vendor_id
  Returns: { vendor_id, vendor_name, contact_name, contact_email, contact_phone, address, ... }

POST /vendors
  [Admin/Purchasing only]

═══════════════════════════════════════════════════════════

GL ACCOUNTS

GET /gl-accounts
  Returns: [ { gl_account_number, gl_code_short, gl_account_name, category, is_taxable_default } ]

GET /gl-accounts/:gl_account_number
  Returns: { gl_account_number, gl_code_short, gl_account_name, category, qb_sync_enabled, ... }

═══════════════════════════════════════════════════════════

DASHBOARDS & REPORTS

GET /dashboard/division-leader/:user_id
  Returns:
    {
      user: { name, division_id, division_name },
      spend_summary: { total_ytd, open_pos_count, pending_approval_count, ... },
      pending_approvals: [ { po_id, po_number, amount, requester, submitted_at } ],
      recent_pos: [ { po_id, po_number, vendor, amount, status, ... } ],
      cross_divisional_view: [ { division_name, po_count, total_spend, ... } ]
    }

GET /reports/po-summary
  Query: { division_id, start_date, end_date }
  Returns: CSV/PDF report

GET /reports/project-cost-breakdown
  Query: { project_id, group_by: "division" | "gl_account" }
  Returns: CSV/PDF report

═══════════════════════════════════════════════════════════

QUICKBOOKS SYNC

POST /integrations/quickbooks/sync
  Headers: { Authorization: Bearer <token> }
  Body: { po_id }
  Returns: { qb_bill_id, qb_sync_status, qb_sync_timestamp }

GET /integrations/quickbooks/sync-status
  Returns: { last_sync_timestamp, pending_pos, failed_syncs }

═══════════════════════════════════════════════════════════
```

---

## 11. SECURITY & AUDIT TRAIL

### Authentication & Authorization

```plaintext
USER AUTHENTICATION:
├─ Method: OAuth 2.0 (Google/Azure AD) or Email + PBKDF2 password
├─ Session: JWT token with 8-hour expiration
├─ MFA: Optional (enabled for all owners)
└─ Re-login: Required for sensitive operations

ROLE-BASED ACCESS CONTROL (RBAC):
├─ Role: MAJORITY_OWNER
│  ├─ Can: View all POs, approve all POs, modify division assignments
│  ├─ Can: Access all reports
│  └─ Can: Configure system settings
│
├─ Role: DIVISION_LEADER
│  ├─ Can: Create POs for their division
│  ├─ Can: Approve POs for their division
│  ├─ Can: View all POs across divisions (READ-ONLY)
│  ├─ Can: Issue approved POs
│  ├─ Can: View division dashboard & spend
│  └─ Cannot: Modify POs outside their division
│
├─ Role: OPERATIONS_MANAGER
│  ├─ Can: Create POs for Repairs division
│  ├─ Can: View all POs (READ-ONLY)
│  ├─ Cannot: Approve POs (requires Owner approval)
│  └─ Cannot: Modify division settings
│
└─ Role: ACCOUNTING
   ├─ Can: View all POs (READ-ONLY)
   ├─ Can: Export to QB
   ├─ Can: Run reports
   └─ Cannot: Create, modify, or approve POs
```

### Audit Trail & Compliance

```plaintext
Every PO action is logged in `po_approvals` table:

┌─ PO Created
│  ├─ User: Owner 1 (UUID)
│  ├─ Action: PO_CREATED
│  ├─ PO ID: (UUID)
│  ├─ Division: CAPEX
│  ├─ Amount: $2,850
│  ├─ Timestamp: 2026-01-07 10:25:33 UTC
│  ├─ IP Address: 203.0.113.42
│  ├─ Device: iPhone 14 Pro
│  └─ Notes: n/a

├─ Work Order Created (if applicable)
│  ├─ User: Owner 1
│  ├─ Action: WO_CREATED
│  ├─ WO ID: (UUID)
│  ├─ WO Number: WO-0237
│  ├─ Title: "Emergency Roof Leak"
│  ├─ Timestamp: 2026-01-07 10:24:15 UTC
│  └─ Notes: "Inline creation during PO process"

├─ PO Approved
│  ├─ User: Owner 1 (approver)
│  ├─ Action: PO_APPROVED
│  ├─ PO ID: (UUID)
│  ├─ Amount: $2,850
│  ├─ Timestamp: 2026-01-07 10:34:22 UTC
│  ├─ IP Address: 203.0.113.42
│  └─ Notes: "Approved via mobile app"

├─ PO Issued to Vendor
│  ├─ User: Owner 1
│  ├─ Action: PO_ISSUED
│  ├─ PO ID: (UUID)
│  ├─ Vendor: ABC Roofing Supply
│  ├─ Sent To: invoices@abcroof.com
│  ├─ Timestamp: 2026-01-07 10:38:45 UTC
│  └─ Notes: "Sent PDF via email"

├─ Materials Received (Line 1)
│  ├─ User: Receiving Staff
│  ├─ Action: LINE_RECEIVED
│  ├─ PO ID: (UUID)
│  ├─ Line Item: 1 (TPO Membrane)
│  ├─ Quantity: 2 rolls
│  ├─ Timestamp: 2026-01-07 13:42:10 UTC
│  └─ Notes: "Delivered by Juan, truck 47"

├─ Vendor Invoice Received
│  ├─ User: Accounting
│  ├─ Action: INVOICE_RECEIVED
│  ├─ PO ID: (UUID)
│  ├─ Vendor Invoice #: INV-12847
│  ├─ Amount: $3,078.00
│  ├─ Timestamp: 2026-01-08 09:15:33 UTC
│  └─ Notes: "3-way match passed"

├─ QB Synced
│  ├─ User: System (automation)
│  ├─ Action: QB_SYNCED
│  ├─ PO ID: (UUID)
│  ├─ QB Bill ID: (QB identifier)
│  ├─ Timestamp: 2026-01-08 09:16:00 UTC
│  └─ Notes: "Bill created in QB, synced successfully"

└─ Payment Processed
   ├─ User: Owner/Finance
   ├─ Action: PO_PAID
   ├─ PO ID: (UUID)
   ├─ Payment Method: Check #4521
   ├─ Amount: $3,078.00
   ├─ Timestamp: 2026-01-15 11:22:44 UTC
   └─ Notes: "Check mailed to ABC Roofing"

QUERY AUDIT TRAIL:
WHERE po_id = 'po-uuid-here'
ORDER BY timestamp ASC

Result: Complete history of every action taken on that PO
```

### Data Security

```plaintext
ENCRYPTION:
├─ In Transit: TLS 1.3 (HTTPS only)
├─ At Rest: AES-256 for sensitive fields (SSN, tax IDs, banking)
└─ Passwords: PBKDF2 with SHA-256 (10,000 iterations min)

BACKUP & DISASTER RECOVERY:
├─ Daily backups: Full DB backup to AWS S3
├─ Replication: Cross-region replication every hour
├─ Retention: 90 days of backups
├─ Recovery: RTO 1 hour, RPO 1 hour
└─ Testing: Quarterly disaster recovery drills

COMPLIANCE:
├─ SOC 2 Type II certified
├─ GDPR compliant (if serving EU customers)
├─ CCPA compliant (California Privacy Rights)
├─ PCI DSS Level 1 (if storing payment cards)
└─ Tax audit ready: All records retained per IRS requirements (7 years)

ACCESS CONTROL:
├─ Principle of Least Privilege: Users access only what they need
├─ API Keys: Stored in secure vault (AWS Secrets Manager)
├─ Database: Restricted network (VPC, no public internet access)
├─ Admin Panel: IP whitelisting + MFA required
└─ Log Access: All access to audit logs is itself logged
```

---

## 12. IMPLEMENTATION TIMELINE

### Phase 1: Foundation (Weeks 1-2)

```plaintext
Week 1:
├─ Database schema creation
├─ Division & GL account setup
├─ User management & auth system
├─ Mobile UI framework
└─ Test: Basic data entry (manual)

Week 2:
├─ Work order creation functionality
├─ Smart PO number generation
├─ PO form (desktop version first)
├─ Line item management
└─ Test: Full PO creation workflow
```

### Phase 2: Integration (Weeks 3-4)

```plaintext
Week 3:
├─ QB API integration
├─ Sync logic (PO → QB Bill)
├─ Approval workflow
├─ Vendor management
└─ Test: QB sync with sample POs

Week 4:
├─ Mobile app refinement
├─ Phone integration (click to call)
├─ Receiving/invoice processing
├─ PDF generation
└─ Test: End-to-end flow (Draft → Paid)
```

### Phase 3: Reporting & Polish (Weeks 5-6)

```plaintext
Week 5:
├─ Dashboard creation
├─ Reports module
├─ Audit trail UI
├─ Email notifications
└─ Test: All dashboards & reports

Week 6:
├─ Cross-divisional visibility
├─ Bug fixes
├─ Performance optimization
├─ Documentation
└─ Test: Load testing (100s of concurrent users)
```

### Phase 4: Training & Go-Live (Weeks 7-10)

```plaintext
Week 7:
├─ Internal training (division leaders)
├─ Vendor communication
├─ Accounting staff training
└─ Dry-run: Test with real users (non-prod data)

Week 8:
├─ Data migration (if converting from old system)
├─ Final testing
├─ Support team training
└─ Cutover plan finalization

Week 9:
├─ Go-live (production launch)
├─ 24/7 support during first week
├─ Real POs created in new system
├─ Monitor performance & errors
└─ Daily standup calls

Week 10:
├─ Optimization based on feedback
├─ Feature enhancements
├─ Full system audit
└─ Handoff to operations team
```

### Success Criteria

```plaintext
✓ 100% of POs created via system (zero email/spreadsheet POs)
✓ Average PO creation time: < 10 minutes
✓ 100% of POs sync to QB automatically
✓ Zero data entry errors (QA checks prevent)
✓ Division leaders can see all POs on their dashboard
✓ Cross-divisional visibility prevents duplicate orders
✓ All audit logs complete and searchable
✓ System uptime: 99.9% (< 8.6 hours downtime/year)
✓ User satisfaction: > 4.5/5 (post-launch survey)
✓ Cost savings: > 5% reduction in procurement cycle time
```

---

## APPENDIX: QUICK REFERENCE

### Smart PO Number Decoder

```plaintext
PO Number: O1 10 0237 AB

Decode:
├─ O1 = Owner 1 (CAPEX Division)
├─ 10 = GL Code 10 → GL Account 5010 (Roofing Materials)
├─ 0237 = Work Order 0237
└─ AB = ABC Roofing Supply

Full Story:
"This is Owner 1's CAPEX PO for purchasing Roofing Materials 
 as part of work order 0237, ordered from ABC Roofing Supply."
```

### Division Leader Quick Reference

```plaintext
Owner 1 (CAPEX)
├─ Code: O1
├─ QB Class: CAPEX Division
├─ Cost Center: CAP
└─ Can Approve: All CAPEX POs

Owner 2 (Roofing)
├─ Code: O2
├─ QB Class: Roofing Division
├─ Cost Center: RFG
└─ Can Approve: All Roofing POs

Owner 3 (General Contracting)
├─ Code: O3
├─ QB Class: General Contracting Division
├─ Cost Center: GEN
└─ Can Approve: All Gen Contracting & Specialty POs

Owner 4 (Subcontractor Management)
├─ Code: O4
├─ QB Class: Subcontractor Management Division
├─ Cost Center: SUB
└─ Can Approve: All Subcontractor Mgmt & Specialty POs

Operations Manager (Repairs)
├─ Code: OM
├─ QB Class: Repairs Division
├─ Cost Center: REP
├─ Can Create: Repairs POs only
└─ Cannot Approve: Requires owner approval
```

### Common GL Account Codes

```plaintext
10 = 5010 (Roofing Materials)
17 = 6170 (Equipment Rental)
20 = 5020 (Wages Direct Labor)
25 = 6090 (Building Supplies)
30 = 6750 (Subcontractors)
35 = 6935 (Small Tools)
40 = 6100 (Safety Equipment)
50 = 6290 (Rent)
55 = 6550 (Office Expense)
60 = 6270 (Professional Fees)
70 = 6390 (Utilities)
75 = 61xx-619x (Insurance - various)
80 = 6530 (Advertising)
90 = 6090 (Building Supplies)
95 = 5111 (Tax Charged)

[Complete mapping in `gl_account_mappings` table]
```

---

## END OF SYSTEM ARCHITECTURE DOCUMENT

**Version:** 2.0  
**Last Updated:** January 7, 2026, 1:45 PM PST  
**Next Review:** January 31, 2026  
**Author:** Alex Chen (Systems Design)  
**Status:** APPROVED FOR IMPLEMENTATION

**Questions or clarifications?** Contact Alex Chen or review the corresponding podcast episode.

---
