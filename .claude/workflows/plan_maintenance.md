# Master Plan Maintenance Workflow

## Prime Directive

**Every Claude interaction with a project MUST include master plan awareness and maintenance.**

This is non-negotiable and applies to ALL project work, from simple bug fixes to major feature development.

## Core Workflow Protocol

### 1. Session Start Protocol

#### Step 1: Check for Master Plan
```bash
# Check if master_plan.md exists in project root
ls -la | grep master_plan.md
# OR for Windows
dir | findstr master_plan.md
```

#### Step 2: Response Based on Status

**If master_plan.md EXISTS:**
1. Read it completely using Read tool
2. Internalize current project state:
   - Current phase and status
   - Features in progress
   - Next actions queue priorities
   - Known blockers and technical debt
3. Reference relevant sections during work

**If master_plan.md is MISSING:**
1. **IMMEDIATELY** flag this as first priority
2. Offer to create it using the template
3. Do NOT proceed with complex work until plan exists
4. For simple tasks, suggest creating plan after completion

### 2. During Work Protocol

#### Context Tracking
Maintain mental notes of:
- **Files being modified**: Track all changes for activity log
- **Features being touched**: Note status changes needed
- **Architectural decisions**: Document for decisions section
- **New discoveries**: Dependencies, blockers, or scope changes
- **Technical debt**: Items created or resolved

#### Master Plan Mapping
For each task, identify:
- Which master plan section it affects (§X.X)
- Which milestones it advances
- What status changes are needed (Planned → In Progress → Implemented)
- Which next actions are being addressed

### 3. Task Completion Protocol

#### MANDATORY Updates (After EVERY task)

**Activity Log Entry**:
```markdown
| YYYY-MM-DD | [Work summary] | [Files changed] | [Key decisions/notes] |
```

**Feature Status Updates**:
```markdown
# Move between sections as appropriate:

### 3.3 Planned 📋
- ~~Feature name~~ (move to In Progress)

### 3.2 In Progress 🔄
- Feature name: [description] - [% complete] - [blockers]

### 3.1 Implemented ✅
- Feature name: [description] - [today's date]
```

**Architecture Updates** (if applicable):
- Update §2.1 System Architecture for structural changes
- Update §4.1 Core Business Logic for new systems
- Update §4.2 Data Models for schema changes

**Next Actions Queue Refresh**:
- Remove completed items
- Add newly discovered tasks
- Reprioritize based on current state

#### Decision Documentation
For any architectural or significant implementation decisions:
```markdown
### Decisions Made
- **YYYY-MM-DD**: [Decision made] - [Rationale and alternatives considered]
```

### 4. Next Steps Generation

#### Required Components
Every response with substantive work MUST end with:

```markdown
## Suggested Next Steps

### Immediate
- [ ] [Specific task building on just-completed work]

### Short-term
- [ ] [Task from master plan queue that's now unblocked]

### Master Plan Reference
- This work advances: [Phase/Milestone from §6]
- Next master plan item: [Item from §8 Next Actions Queue]
- Update needed in: [Sections requiring updates]
```

## Master Plan Maintenance Commands

### Quick Update Patterns

#### Activity Log Entry
```markdown
# Add to master_plan.md §5.1
| 2024-01-15 | Implemented user auth middleware | auth.py, routes.py | Used JWT tokens, added rate limiting |
```

#### Feature Status Change
```markdown
# Move from §3.3 Planned to §3.1 Implemented
### 3.1 Implemented ✅
- User Authentication: JWT-based auth system - 2024-01-15 ← ADD
```

#### Decision Documentation
```markdown
# Add to master_plan.md §5.2
- **2024-01-15**: Chose JWT over sessions - Better for API scalability, stateless design
```

#### Next Actions Update
```markdown
# Update master_plan.md §8
1. Add rate limiting to auth endpoints (now priority after auth completion)
2. Create user dashboard UI
3. Implement user roles and permissions
```

### Batch Update Protocol

For larger updates or end-of-session maintenance:

1. **Read current master_plan.md**
2. **Identify all sections needing updates**:
   - §3: Feature status changes
   - §4: System/logic updates
   - §5: Activity log and decisions
   - §6: Milestone progress
   - §8: Next actions reprioritization
3. **Make updates in logical order** (overview → details → next steps)
4. **Update Last Modified timestamp**

## Integration with Work Types

### Bug Fixes
- **Activity Log**: Document bug, cause, and solution
- **Technical Debt**: Remove resolved items or add new ones discovered
- **Next Steps**: Include regression testing and similar bug checks

### Feature Implementation
- **Feature Status**: Move through Planned → In Progress → Implemented
- **Architecture**: Update relevant system descriptions
- **Next Steps**: Include testing, documentation, and related features

### Refactoring
- **Architecture**: Update system descriptions and patterns
- **Technical Debt**: Mark resolved items, document improvements
- **Decisions**: Document refactoring approach and rationale

### Infrastructure/DevOps
- **Architecture**: Update deployment and system sections
- **Decisions**: Document infrastructure choices
- **Next Steps**: Include monitoring, documentation, and team training

## Quality Assurance

### Master Plan Health Checks

#### Weekly Review
- [ ] All recent work reflected in activity log
- [ ] Feature statuses are current and accurate
- [ ] Next actions queue is prioritized and relevant
- [ ] Technical debt section is up to date
- [ ] Architecture section reflects current reality

#### Monthly Review
- [ ] Phase progress and milestones are accurate
- [ ] Project overview still reflects current goals
- [ ] Technology stack section is current
- [ ] All major decisions are documented

### Common Maintenance Issues

**🚨 Red Flags - Fix Immediately:**
- Activity log missing entries from recent sessions
- Features marked "In Progress" for >2 weeks without updates
- Next actions queue with completed items
- Architecture section doesn't match current implementation

**⚠️ Yellow Flags - Address Soon:**
- Technical debt section hasn't been updated in >1 month
- Milestones without clear completion criteria
- Decisions section missing rationale for recent choices
- Directory structure doesn't match actual layout

## Automation Helpers

### Quick Commands

#### Create New Master Plan
```bash
# Copy template and customize
cp .claude/templates/master_plan_template.md master_plan.md
# Edit placeholders: [Project Name], [Phase Name], etc.
```

#### Activity Log Entry Template
```markdown
| $(date +%Y-%m-%d) | [SUMMARY] | [FILES] | [NOTES] |
```

#### Feature Status Change Helper
```bash
# Search for feature to move
grep -n "Feature Name" master_plan.md
# Edit master_plan.md to move between sections
```

## Troubleshooting

### Missing Master Plan
**Symptom**: No master_plan.md in project root
**Solution**:
1. Use template: `cp .claude/templates/master_plan_template.md master_plan.md`
2. Fill in project-specific information
3. Document current state and immediate next steps

### Stale Activity Log
**Symptom**: No recent entries in §5.1 Recent Sessions
**Solution**:
1. Review recent git commits for context
2. Add missing activity log entries
3. Update feature statuses based on recent work

### Disconnected Next Steps
**Symptom**: Next steps don't reference master plan priorities
**Solution**:
1. Review §8 Next Actions Queue
2. Align current next steps with master plan priorities
3. Update queue based on recent progress

### Inconsistent Architecture Documentation
**Symptom**: §2 Architecture doesn't match current implementation
**Solution**:
1. Review current codebase structure
2. Update architecture diagrams and descriptions
3. Document any architectural decisions made since last update