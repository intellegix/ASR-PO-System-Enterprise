# Phase 7 Decision Memo: Mobile Strategy

**Date**: February 13, 2026
**Author**: Austin Kidwell, CEO / Systems Architect
**Status**: Decision required before proceeding

---

## 1. Current Mobile Usage

The ASR PO System has **8 active users** across 6 divisions. Current access patterns:

- **Desktop (office)**: ~70% of usage — PO completion, reports, admin, invoice management
- **Phone (field)**: ~25% of usage — Quick PO generation (Phase 1 of two-phase flow), PO lookup
- **Tablet**: ~5% — occasional PO review during meetings

The two-phase PO workflow was specifically designed for field use: Phase 1 (quick PO number generation) requires only 5 taps. Phase 2 (vendor/line items) is typically done back at the office.

## 2. Offline Requirements

| Scenario | Frequency | Offline needed? |
|----------|-----------|-----------------|
| Generate PO number on rooftop | Daily | Would help, but cell signal usually available |
| Look up PO details at warehouse | Weekly | Rare — warehouse has WiFi |
| Create PO at remote job site | Monthly | Possible — rural sites have weak signal |
| Approve PO while traveling | Weekly | No — can wait for signal |

**Assessment**: Offline is a nice-to-have, not a hard requirement. The 5-tap quick PO flow works well on mobile browsers over cellular. True offline scenarios occur <5% of the time.

## 3. PWA vs React Native Comparison

| Factor | PWA | React Native |
|--------|-----|--------------|
| **Development cost** | $0 additional (already responsive) | $50-80K (new codebase) |
| **Maintenance** | Single codebase | Separate mobile codebase |
| **Install experience** | "Add to Home Screen" prompt | App Store submission |
| **Offline capability** | Service worker caching | Full offline-first with SQLite |
| **Push notifications** | Supported (Web Push API) | Native push |
| **Camera access** | Supported (receipt scanning works) | Native camera APIs |
| **Performance** | Good for our use case | Better for complex UIs |
| **Time to ship** | 1-2 weeks (add SW + manifest) | 8-12 weeks (Turborepo + RN) |
| **Updates** | Instant (no app store review) | 1-3 day app store review |

## 4. Recommendation

**Proceed with PWA-first.** Do NOT start Phase 7 (Turborepo + React Native).

**Rationale**:
- 8 users do not justify a separate mobile codebase
- The two-phase PO flow already works well on mobile browsers
- Receipt scanning (camera) already works via PWA
- Offline is <5% of usage — service worker caching handles the common case
- PWA can be shipped in 1-2 weeks vs 8-12 weeks for RN
- If the team grows to 20+ users with proven mobile-heavy workflows, revisit RN

**PWA Enhancements (1-2 weeks)**:
1. Add service worker for offline caching of recently viewed POs
2. Add web app manifest for "Add to Home Screen" experience
3. Add Web Push API for approval notifications
4. Test install flow on iOS Safari and Android Chrome

## 5. Success Criteria

Revisit Phase 7 (React Native) only if ALL of these are true:
- [ ] Team grows to 15+ active users
- [ ] >50% of POs are created on mobile devices
- [ ] Users report PWA limitations blocking their workflow
- [ ] Offline PO creation becomes a documented weekly need (not occasional)
- [ ] Budget for $50-80K mobile development + ongoing maintenance

**Decision gate**: Reassess in Q3 2026 based on actual usage data.
