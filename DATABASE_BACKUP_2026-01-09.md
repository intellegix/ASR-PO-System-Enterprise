# Database Backup Documentation
## ASR Purchase Order System - Pre-Reset Backup
**Date**: 2026-01-09
**Database**: asr_po_system (PostgreSQL localhost:5432)
**Purpose**: Complete data backup before database schema reset for demo data setup

---

## Summary
- **Users**: 8 accounts (1 majority owner, 5 division leaders, 1 ops manager, 1 accounting)
- **Vendors**: 10 active vendor records
- **Divisions**: 7 organizational divisions with cost center prefixes
- **Projects**: 5 active projects with budgets totaling $3.1M
- **Division Leaders**: 7 leaders with varying approval limits
- **Work Orders**: 1 active work order
- **Purchase Orders**: 0 (empty table)

---

## Users Table (8 records)
| Email | First Name | Last Name | Role | Active |
|-------|------------|-----------|------|--------|
| owner1@allsurfaceroofing.com | Owner | One | MAJORITY_OWNER | ✓ |
| owner2@allsurfaceroofing.com | Owner | Two | DIVISION_LEADER | ✓ |
| owner3@allsurfaceroofing.com | Owner | Three | DIVISION_LEADER | ✓ |
| owner4@allsurfaceroofing.com | Owner | Four | DIVISION_LEADER | ✓ |
| owner5@allsurfaceroofing.com | Owner | Five | DIVISION_LEADER | ✓ |
| owner6@allsurfaceroofing.com | Owner | Six | DIVISION_LEADER | ✓ |
| opsmgr@allsurfaceroofing.com | Operations | Manager | OPERATIONS_MANAGER | ✓ |
| accounting@allsurfaceroofing.com | Accounting | Staff | ACCOUNTING | ✓ |

---

## Divisions Table (7 records)
| Division Name | Code | Cost Center Prefix | Active |
|---------------|------|-------------------|--------|
| CAPEX | O1 | CP | ✓ |
| Repairs | O2 | RP | ✓ |
| Roofing | O3 | RF | ✓ |
| General Contracting | O4 | GC | ✓ |
| Subcontractor Management | O5 | SM | ✓ |
| Specialty Trades | O6 | ST | ✓ |
| Repairs | OM | RP | ✓ |

---

## Vendors Table (10 records)
| Vendor Name | Code | Type | Contact | Email | Terms | Active |
|-------------|------|------|---------|-------|-------|--------|
| ABC Roofing Supply | AB | Material | John Smith | invoices@abcroof.com | Net30 | ✓ |
| Beacon Building Products | BB | Material | Sales Team | orders@beacon.com | Net30 | ✓ |
| Casavida Management | CA | Other | Maria Garcia | pm@casavida.com | Net30 | ✓ |
| Equipment Rentals Co | ER | Equipment | Rental Desk | rentals@equipmentco.com | Net30 | ✓ |
| Home Depot Pro | HD | Material | Pro Desk | supplies@homedepot.com | Net30 | ✓ |
| Johnson Plumbing | JP | Subcontractor | Tom Johnson | orders@johnsonplumb.com | Net30 | ✓ |
| Local Sub LLC | LS | Subcontractor | Mike Johnson | contact@localsub.com | Net30 | ✓ |
| Phoenix Materials | PM | Material | Sarah Lee | sales@phoenixmaterials.com | Net30 | ✓ |
| SRS Distribution | SR | Material | Order Desk | orders@srsdistribution.com | Net30 | ✓ |
| Triangle Fastener | TF | Material | Parts Dept | orders@trianglefastener.com | Net30 | ✓ |

---

## Projects Table (5 records)
| Project Code | Project Name | Property Address | Status | Budget |
|--------------|--------------|------------------|--------|---------|
| A-001 | Admiral Hartman District | | Active | $500,000.00 |
| B-001 | Bayview Apartments | | Active | $250,000.00 |
| CA-001 | Casavida Major Complex | | Active | $1,200,000.00 |
| D-001 | Desert Winds | | Active | $350,000.00 |
| F-001 | Officer Housing - Base | | Active | $800,000.00 |

**Total Project Budget**: $3,100,000.00

---

## Division Leaders Table (7 records)
| Name | Email | Division | Approval Limit | Active |
|------|-------|----------|----------------|--------|
| Owner One | owner1@allsurfaceroofing.com | O1 | $100,000.00 | ✓ |
| Owner Two | owner2@allsurfaceroofing.com | O2 | $50,000.00 | ✓ |
| Owner Three | owner3@allsurfaceroofing.com | O3 | $50,000.00 | ✓ |
| Owner Four | owner4@allsurfaceroofing.com | O4 | $50,000.00 | ✓ |
| Owner Five | owner5@allsurfaceroofing.com | O5 | $50,000.00 | ✓ |
| Owner Six | owner6@allsurfaceroofing.com | O6 | $50,000.00 | ✓ |
| Operations Manager | opsmgr@allsurfaceroofing.com | OM | $2,500.00 | ✓ |

---

## Work Orders Table (1 record)
| Work Order Number | Title | Status | Budget Estimate |
|-------------------|-------|--------|-----------------|
| WO-0001 | Roof Membrane Installation Test | InProgress | (null) |

---

## Purchase Orders Table
**No records** - Table is empty

---

## Notes
- All data extracted on 2026-01-09 before database reset
- User passwords were hardcoded ("demo123") - will be replaced with secure bcrypt hashes
- This represents the working organizational structure and vendor relationships
- Projects represent active construction work with significant budgets
- Division leader approval limits follow proper authorization hierarchy
- Reset will preserve this structure but with proper security implementation

---

## Next Steps
1. Database will be reset to resolve schema conflicts
2. This same organizational structure will be recreated with proper security
3. Secure bcrypt-hashed passwords will replace demo passwords
4. Demo data will be added for UI/UX testing
5. Login credentials will be provided for testing access

**This backup ensures no important organizational data is lost during the security upgrade.**