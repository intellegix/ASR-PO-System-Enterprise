# ASR Purchase Order System - Claude Code Configuration

## CRITICAL: Browser Automation
- **ALWAYS use `mcp__browser-bridge__*` tools** for all browser automation
- **NEVER use `mcp__claude-in-chrome__*` tools** — extension is unreliable
- `browser_fill_form` doesn't trigger React state updates — use button clicks instead

## CRITICAL: Master Plan Integration Protocol

**ENFORCE**: Claude MUST ALWAYS suggest next steps based on recent project activity by referencing the master plan.

### Primary References
- **Master Plan**: `po-system-complete-arch.md` (87KB, 12 sections, 10-week timeline)
- **Status Tracker**: `MASTER-PLAN-STATUS.md` (implementation progress)
- **Current Phase**: Phase 1-2 of 4 (Foundation → Integration)
- **Latest Activity**: January 9, 2026 (Database backup, deployment prep, TypeScript issues)

---

## MANDATORY: Automatic Next Steps Protocol

**Before ANY task**, Claude MUST:

### 1. Recent Activity Analysis
```bash
# Check last 5 commits for context
git log --oneline -5

# Review modified files
git status --porcelain

# Check for TypeScript/build issues
cd web && npm run type-check
```

### 2. Master Plan Cross-Reference
- **Current Week**: Week 3-4 of 10 (Phase 2: Integration)
- **Expected Features**: QB API integration, approval workflow, vendor management
- **Actual Status**: Approval workflow ✅, Vendor management ✅, QB integration ❌, Mobile refinement ❌ (blocked by TypeScript errors)

### 3. Implementation Gap Analysis
Compare actual code state vs master plan expectations:
- **Ahead**: Approval workflow implemented early
- **Behind**: QuickBooks integration not started
- **Blocked**: Mobile refinement (TypeScript compilation errors)
- **Deviation**: Hybrid deployment (not in master plan)

### 4. Next Steps Determination
Based on analysis, always suggest the MOST LOGICAL next action considering:
- **Blockers**: TypeScript errors preventing build
- **Dependencies**: What must be completed first
- **Phase Alignment**: Stay on track with 10-week timeline
- **Business Priority**: Critical path items from master plan

---

## Context-Aware Workflow Intelligence

### Project Status Detection
Claude should automatically detect and factor in:

```javascript
// Project Status Indicators
const projectStatus = {
  buildStatus: "FAILING", // TypeScript errors blocking
  deploymentStatus: "PARTIAL", // Infrastructure configured, not deployed
  databaseStatus: "BACKED_UP", // Jan 9, 2026 backup completed
  currentPhase: "2_INTEGRATION", // Week 3-4 of implementation
  masterPlanAlignment: "75%", // Some features ahead, some behind
  criticalBlocker: "TypeScript compilation errors"
};
```

### Intelligent Prioritization
Always prioritize in this order:
1. **Unblock critical path** (fix TypeScript errors)
2. **Complete current phase requirements** (Phase 2: Integration)
3. **Align with master plan** (catch up on QB integration)
4. **Prepare for next phase** (Phase 3: Reporting & Polish)

### Master Plan Phase Mapping

#### Phase 1: Foundation (Weeks 1-2) ✅ COMPLETED
- Database schema and models ✅
- Basic authentication ✅
- Core API structure ✅
- Mobile app foundation ✅

#### Phase 2: Integration (Weeks 3-4) 🚧 IN PROGRESS
- QB API integration ❌ **NOT STARTED**
- Approval workflow ✅ **COMPLETED** (ahead of schedule)
- Vendor management ✅ **COMPLETED**
- Mobile app refinement ❌ **BLOCKED** (TypeScript errors)

#### Phase 3: Reporting & Polish (Weeks 5-6) ⏸️ PENDING
- Dashboard creation
- Reports module
- Email notifications
- Cross-divisional visibility

#### Phase 4: Training & Go-Live (Weeks 7-10) ⏸️ PENDING
- Internal training
- Data migration
- Production launch
- Optimization

---

## Required Decision Framework

### When Suggesting Next Steps, Claude MUST Consider:

#### 1. Current Blockers (Critical Path)
```
BLOCKING ISSUES:
- TypeScript compilation errors (multiple API routes)
- Zod schema conflicts
- Prisma relation naming mismatches
- Build failures preventing deployment

ACTION REQUIRED: Fix build issues BEFORE any new development
REFERENCE: Master Plan Phase 2, Week 4 (Mobile refinement blocked)
```

#### 2. Implementation Timeline Alignment
```
MASTER PLAN vs REALITY:
- Week 3-4 (Current): Should be completing QB integration
- Actually doing: Fixing deployment infrastructure & TypeScript errors
- Timeline impact: ~1 week behind on QB integration
- Recovery plan: Parallel development once build issues resolved
```

#### 3. Business Priority Matrix
```
HIGH PRIORITY (Critical Path):
1. Fix TypeScript errors (unblocks everything)
2. Complete deployment setup (enables testing)
3. QB integration (core business requirement)

MEDIUM PRIORITY:
4. Mobile refinement (user experience)
5. Email notifications (nice-to-have)

LOW PRIORITY:
6. Advanced reporting (Phase 3 item)
7. Performance optimization (Phase 3 item)
```

### 4. Resource Optimization for Austin
Consider Austin's expertise and available time:
- **Strengths**: Full-stack development, enterprise systems, construction industry knowledge
- **Focus Area**: Prioritize backend API completion over frontend polish
- **Time Constraints**: Suggest batched related tasks for efficiency
- **Knowledge**: Leverage existing comprehensive architecture documentation

---

## Automatic Status Updates

### Git Activity Monitoring
When reviewing commits, look for:
```
IMPLEMENTATION MARKERS:
- "feat:" = New feature (check vs master plan features)
- "fix:" = Bug resolution (may unblock dependencies)
- "refactor:" = Code improvement (may enable new features)
- "deploy:" = Infrastructure (enables testing/production)

PROGRESS INDICATORS:
- API route changes = Feature development
- Schema updates = Data model evolution
- Test additions = Quality assurance
- Documentation = System maturity
```

### Master Plan Synchronization
Automatically update understanding when:
- New API endpoints are implemented
- Database schema changes
- Authentication/authorization updates
- Integration points are completed

---

## ENFORCE: Always Suggest Specific Next Steps

### Template for Next Steps Response:
```
## Current Project Status Analysis
**Phase**: Phase 2 (Integration) - Week 3-4 of 10
**Master Plan Alignment**: [X]% complete
**Critical Blockers**: [List specific issues]
**Recent Activity**: [Summary of last 5 commits]

## Immediate Next Steps (Priority Order)
1. **[CRITICAL]** [Specific action]
   - **Why**: [Blocker/dependency reason]
   - **Master Plan Ref**: [Section/phase reference]
   - **Estimated Impact**: [What this unblocks]

2. **[HIGH]** [Next logical action]
   - **Prerequisites**: [What must be completed first]
   - **Master Plan Ref**: [Section reference]

3. **[MEDIUM]** [Future planning item]
   - **Timeline**: [When this should be tackled]
   - **Master Plan Ref**: [Phase reference]

## Success Criteria
- [ ] [Specific measurable outcome]
- [ ] [Verification method]
- [ ] [Progress indicator]

## Master Plan Progress Update
**Completed This Session**: [Features/tasks finished]
**Next Phase Readiness**: [What % ready for Phase 3]
```

---

## Integration with Existing Tools

### Claude Code Hooks
```json
{
  "preTaskAnalysis": [
    "git log --oneline -5",
    "git status --porcelain",
    "cd web && npm run type-check --silent"
  ],
  "masterPlanCheck": [
    "grep -n 'Status:' MASTER-PLAN-STATUS.md",
    "wc -l po-system-complete-arch.md"
  ]
}
```

### Status File References
- **`MASTER-PLAN-STATUS.md`**: Implementation progress tracker
- **`po-system-complete-arch.md`**: Authoritative master plan (87KB)
- **`DATABASE_BACKUP_2026-01-09.md`**: Data preservation record
- **`RENDER_DEPLOYMENT_GUIDE.md`**: Infrastructure setup guide

---

## Quality Assurance Checklist

Before suggesting any next steps, verify:
- [ ] Checked recent git activity (last 5 commits)
- [ ] Identified current phase in 10-week timeline
- [ ] Cross-referenced master plan for phase requirements
- [ ] Identified critical blockers or dependencies
- [ ] Prioritized based on business value and feasibility
- [ ] Referenced specific master plan sections
- [ ] Suggested measurable outcomes
- [ ] Considered Austin's time and expertise

---

## Emergency Protocols

### If Build/TypeScript Errors Detected:
1. **IMMEDIATELY** suggest fixing compilation issues
2. **DO NOT** suggest new features until build works
3. **REFERENCE**: Master Plan Phase 2, Week 4 requirements
4. **ESCALATE**: If errors persist, suggest architectural review

### If Master Plan Misalignment Detected:
1. **ANALYZE** gap between planned vs actual features
2. **SUGGEST** catch-up plan or timeline adjustment
3. **REFERENCE** specific master plan sections
4. **UPDATE** MASTER-PLAN-STATUS.md with reality

### If Critical Dependencies Missing:
1. **IDENTIFY** prerequisite tasks blocking progress
2. **PRIORITIZE** dependency resolution over new work
3. **REFERENCE** master plan dependency chains
4. **SUGGEST** parallel work where possible

---

**REMEMBER**: This system exists to ensure Claude always provides intelligent, context-aware next steps that keep the ASR Purchase Order System implementation on track with the comprehensive master plan while adapting to real-world development challenges.