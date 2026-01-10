# Master Plan Update Command Patterns

## Overview

This document provides standardized patterns and commands for efficiently updating master_plan.md during project work. These patterns ensure consistent formatting and comprehensive documentation.

## MANDATORY: Plan Mode for New Tasks

### Plan Mode Requirement
**Every non-trivial new task MUST begin with `/plan mode` (EnterPlanMode tool) before implementation.**

#### When Plan Mode is REQUIRED:
- New feature implementation (any feature taking >30 minutes)
- Architecture changes or refactoring
- Multi-file modifications
- Tasks affecting multiple system components
- Any work requiring design decisions
- Tasks with unclear requirements or scope

#### Plan Mode Integration with Master Plan:
1. **Before Planning**: Read master_plan.md for context
2. **During Planning**: Reference current architecture (§2) and constraints
3. **After Planning**: Update master_plan.md with planned changes
4. **Implementation**: Follow plan and update progress

#### Example Usage:
```markdown
User: "Add user authentication to the app"
Claude: "I'll help add user authentication. First, let me use plan mode to design the implementation approach based on your current project architecture."

[Uses EnterPlanMode tool]
[Reads master_plan.md for current architecture context]
[Creates implementation plan]
[Updates master_plan.md with new planned features]
[Implements following the plan]
```

## Quick Update Commands

### 1. Activity Log Entry
**Purpose**: Record completed work session
**Section**: §5.1 Recent Sessions

#### Template
```markdown
| YYYY-MM-DD | [Work Summary] | [Files Changed] | [Key Decisions/Notes] |
```

#### Examples
```markdown
| 2024-01-15 | Implemented JWT authentication | auth.py, models.py, routes.py | Used bcrypt for password hashing, 24hr token expiry |
| 2024-01-15 | Fixed cart calculation bug | cart.js, utils.js | Issue was tax calculation order, added unit tests |
| 2024-01-15 | Added Redis caching layer | cache.py, config.py | Configured 1hr TTL, fallback to DB on cache miss |
```

#### Quick Command Pattern
```bash
# Find the activity log table in master_plan.md and add new row
grep -n "Recent Sessions" master_plan.md
# Add new entry with current date, work summary, files, and notes
```

### 2. Feature Status Updates
**Purpose**: Move features between Planned → In Progress → Implemented
**Sections**: §3.1, §3.2, §3.3

#### Moving from Planned to In Progress
```markdown
# BEFORE (§3.3 Planned)
- User Authentication: JWT-based login system - High Priority - No dependencies

# AFTER (§3.2 In Progress)
- User Authentication: JWT-based login system - 60% complete - Need password reset flow
```

#### Moving from In Progress to Implemented
```markdown
# BEFORE (§3.2 In Progress)
- User Authentication: JWT-based login system - 90% complete - Testing remaining

# AFTER (§3.1 Implemented)
- User Authentication: JWT-based login system - 2024-01-15
```

#### Moving to Implemented (Complete)
```markdown
# Remove from §3.2 In Progress, add to §3.1 Implemented with completion date
### 3.1 Implemented ✅
- Feature Name: Brief description - YYYY-MM-DD
```

### 3. Next Actions Queue Update
**Purpose**: Maintain prioritized task list
**Section**: §8 Next Actions Queue

#### Adding New Tasks
```markdown
# Add to appropriate priority section
### Immediate (This Session)
1. [New highest priority task] - [Why urgent]
2. [Previous #1 task] - [Context]
```

#### Removing Completed Tasks
```markdown
# Remove completed items, re-number remaining
### Immediate (This Session)
1. ~~Complete user authentication~~ ← REMOVE
2. Add rate limiting to API endpoints ← BECOMES #1
```

#### Reprioritization Pattern
```markdown
# Review and reorder based on:
# - Dependencies resolved by recent work
# - Blockers removed
# - New high-priority discoveries
# - Phase/milestone alignment
```

### 4. Architecture Updates
**Purpose**: Document system changes
**Section**: §2 Architecture & Systems

#### Technology Stack Update (§2.2)
```markdown
# Add new technologies, update versions
**Languages & Frameworks:**
- Primary: Python 3.11 with FastAPI
- Added: Redis 7.0 for caching ← NEW ENTRY
- Database: PostgreSQL 15 with SQLAlchemy ORM
```

#### System Architecture Update (§2.1)
```markdown
# Update architecture diagram and component descriptions when:
# - New services added
# - Data flow changes
# - Integration points modified

[Update ASCII/mermaid diagram]
[Update component descriptions]
```

### 5. Decision Documentation
**Purpose**: Record architectural and implementation decisions
**Section**: §5.2 Decisions Made

#### Template
```markdown
- **YYYY-MM-DD**: [Decision] - [Rationale and alternatives considered]
```

#### Examples
```markdown
- **2024-01-15**: Chose Redis over in-memory caching - Better scalability for multiple server instances
- **2024-01-15**: Used JWT over session cookies - Stateless design supports mobile app integration
- **2024-01-15**: Implemented rate limiting with sliding window - More accurate than fixed window, prevents burst attacks
```

### 6. Technical Debt Management
**Purpose**: Track and resolve code quality issues
**Section**: §7 Technical Debt & Known Issues

#### Adding New Technical Debt
```markdown
### Medium Priority 🟡
- [ ] **[Issue Name]**: [Description] - [Impact] - [Estimated effort]
```

#### Resolving Technical Debt
```markdown
# Move to completed section or remove entirely
### Resolved ✅
- [x] **Missing input validation**: Added Pydantic models - Security improvement - 4 hours (completed 2024-01-15)
```

### 7. Milestone Progress Update
**Purpose**: Track phase and milestone completion
**Section**: §6 Project Phases & Milestones

#### Completing Milestones
```markdown
# BEFORE
- [ ] Milestone 1.2: User authentication system

# AFTER
- [x] Milestone 1.2: User authentication system (completed 2024-01-15)
```

#### Phase Status Update
```markdown
# Update phase header when all milestones complete
### Phase 1: Foundation - Complete ✅
### Phase 2: Core Features - In Progress 🔄
```

## Advanced Update Patterns

### 8. Bulk Session Update
**Purpose**: Update multiple sections after significant work session

#### End-of-Session Checklist
```markdown
# Update in this order:
1. Activity log entry (§5.1) - session summary
2. Feature status changes (§3) - what moved between sections
3. Architecture updates (§2) - if systems changed
4. Decisions documentation (§5.2) - if major choices made
5. Technical debt (§7) - items added/resolved
6. Milestone progress (§6) - if phases advanced
7. Next actions refresh (§8) - reprioritize based on new state
8. Last updated timestamp - header metadata
```

#### Batch Update Template
```bash
# 1. Session Summary
"Completed authentication system implementation with JWT tokens, password hashing, and login/logout endpoints"

# 2. Files Modified
"auth.py, models.py, routes.py, config.py, requirements.txt"

# 3. Key Outcomes
"- Authentication system fully functional
 - Security best practices implemented
 - Ready for frontend integration
 - Phase 1 milestone completed"
```

### 9. Plan Mode Integration Update
**Purpose**: Document work done through plan mode
**Sections**: Multiple sections based on planned work

#### Plan Execution Tracking
```markdown
# When implementing work designed in plan mode:

1. Reference original plan in activity log
2. Note any deviations from plan
3. Update multiple sections based on plan scope
4. Document lessons learned from planning process

# Example activity log entry:
| 2024-01-15 | Implemented user auth per plan-mode design | auth.py, models.py | Plan worked well, JWT approach successful |
```

### 10. Health Check and Maintenance
**Purpose**: Periodic master plan quality assurance

#### Weekly Health Check Pattern
```markdown
# Review these sections for accuracy:
- §3 Feature statuses match reality
- §5.1 Activity log is current (within 7 days)
- §8 Next actions are relevant and prioritized
- §7 Technical debt reflects current issues

# Fix any inconsistencies found
```

#### Monthly Deep Review Pattern
```markdown
# Comprehensive review:
- §1 Project overview still accurate
- §2 Architecture matches current implementation
- §4 Business logic documentation current
- §6 Phase progress and timelines realistic
- All placeholder text removed from template
```

## Automation Helpers

### Quick Edit Commands
```bash
# Find specific sections quickly
grep -n "## 3\." master_plan.md    # Find Features section
grep -n "## 5\." master_plan.md    # Find Activity Log section
grep -n "## 8\." master_plan.md    # Find Next Actions section

# Add activity log entry
echo "| $(date +%Y-%m-%d) | [SUMMARY] | [FILES] | [NOTES] |" >> master_plan.md

# Update last modified timestamp
sed -i "s/> Last Updated: .*/> Last Updated: $(date '+%Y-%m-%d %H:%M:%S')/" master_plan.md
```

### Template Shortcuts
```bash
# Activity log entry template
TODAY=$(date +%Y-%m-%d)
echo "| $TODAY | [Work summary] | [Files changed] | [Key decisions] |"

# Decision documentation template
echo "- **$TODAY**: [Decision] - [Rationale]"

# Feature completion template
echo "- Feature Name: Description - $TODAY"
```

## Integration with Plan Mode Workflow

### Plan Mode → Master Plan Update Flow
1. **Pre-Planning**: Use plan mode for complex tasks
2. **Planning Phase**: Reference master plan architecture and constraints
3. **Plan Documentation**: Add planned work to relevant master plan sections
4. **Implementation**: Follow plan and track progress
5. **Post-Implementation**: Update master plan with results and lessons learned

### Example Integration
```markdown
User: "Add real-time notifications to the app"

Claude: "I'll add real-time notifications. This is a complex feature that will affect multiple components, so let me use plan mode to design the approach."

[Uses /plan mode]
[Reads master_plan.md for current architecture]
[Designs WebSocket/push notification system]
[Updates master_plan.md §3.3 to move notifications from planned to in-progress]
[Implements according to plan]
[Updates master_plan.md with completed work and lessons learned]
```

These update patterns ensure that the master plan remains current, accurate, and valuable throughout the project lifecycle while integrating seamlessly with the plan mode requirement for complex tasks.