# Master Plan - [Project Name]

> Last Updated: [Date/Time]
> Current Phase: [Phase Name]
> Status: [Active/Paused/Blocked]

## 1. Project Overview
- **Purpose**: [What this project does and why it exists]
- **Goals**: [Primary objectives and outcomes]
- **Target Users**: [Who will use this and how]
- **Success Criteria**: [How we know when this is complete/successful]

## 2. Architecture & Systems

### 2.1 System Architecture
```
[High-level architecture diagram using mermaid or ASCII]
┌─────────────┐    ┌─────────────┐    ┌─────────────┐
│  Frontend   │────│   Backend   │────│  Database   │
│  Component  │    │   Services  │    │   Layer     │
└─────────────┘    └─────────────┘    └─────────────┘
```

**Core Components:**
- [Component Name]: [Responsibility and purpose]
- [Component Name]: [Responsibility and purpose]

**Data Flow:**
- [Describe how data moves through the system]

### 2.2 Technology Stack
**Languages & Frameworks:**
- Primary: [Language] with [Framework]
- Secondary: [Language] for [Purpose]

**External Services & APIs:**
- [Service Name]: [Purpose and integration method]
- [API Name]: [Usage and endpoints]

**Development Tools:**
- [Tool Name]: [Purpose]
- [Tool Name]: [Purpose]

### 2.3 Directory Structure
```
project_root/
├── src/                    # [Source code]
│   ├── components/         # [UI components]
│   ├── services/           # [Business logic]
│   └── utils/              # [Helper functions]
├── tests/                  # [Test files]
├── docs/                   # [Documentation]
└── config/                 # [Configuration files]
```

**Key Conventions:**
- File naming: [Convention description]
- Module organization: [How modules are structured]

## 3. Features & Functionality

### 3.1 Implemented ✅
- [Feature Name]: [Brief description] - [Date completed]

### 3.2 In Progress 🔄
- [Feature Name]: [Description] - [% complete] - [Current blockers]

### 3.3 Planned 📋
- [Feature Name]: [Description] - [Priority: High/Medium/Low] - [Dependencies]

## 4. Systems & Logic

### 4.1 Core Business Logic
- **[System Name]**: [How it works and what it manages]
- **[System Name]**: [How it works and what it manages]

### 4.2 Data Models
```
[Model Name]:
  - field1: [type] - [description]
  - field2: [type] - [description]

[Model Name]:
  - field1: [type] - [description]
  - relationships: [related models]
```

### 4.3 Integration Points
- **[Integration Name]**: [Purpose and current status]
- **[API Integration]**: [Endpoints used and data flow]

## 5. Activity Log

### Recent Sessions
| Date | Work Completed | Files Changed | Notes |
|------|----------------|---------------|-------|
| YYYY-MM-DD | [Summary of work done] | [List of files] | [Important notes/decisions] |

### Decisions Made
- **[YYYY-MM-DD]**: [What was decided] - [Rationale and alternatives considered]

## 6. Project Phases & Milestones

### Phase 1: [Name] - [Status: Not Started/In Progress/Complete]
**Goal**: [What this phase accomplishes]
- [ ] Milestone 1.1: [Specific deliverable]
- [ ] Milestone 1.2: [Specific deliverable]
- [x] Milestone 1.3: [Completed item] - [Date completed]

### Phase 2: [Name] - [Status]
**Goal**: [What this phase accomplishes]
- [ ] Milestone 2.1: [Specific deliverable]
- [ ] Milestone 2.2: [Specific deliverable]

### Phase 3: [Name] - [Status]
**Goal**: [What this phase accomplishes]
- [ ] Milestone 3.1: [Specific deliverable]

## 7. Technical Debt & Known Issues

### High Priority 🔴
- [ ] **[Issue Name]**: [Description] - [Impact on users/system] - [Estimated effort]

### Medium Priority 🟡
- [ ] **[Issue Name]**: [Description] - [Impact] - [Estimated effort]

### Low Priority 🟢
- [ ] **[Issue Name]**: [Description] - [Impact] - [Estimated effort]

## 8. Next Actions Queue

**Priority-ordered list of next steps:**

### Immediate (This Session)
1. **[Highest priority action]** - [Why this is urgent]
2. **[Next critical item]** - [Dependencies or context]

### Short-term (Next 1-3 sessions)
3. **[Important task]** - [Related to current phase]
4. **[Follow-up item]** - [Builds on recent work]

### Medium-term (Future phases)
5. **[Planned enhancement]** - [Future milestone]
6. **[Technical improvement]** - [Technical debt resolution]

---

## Template Notes

**How to use this template:**
1. Replace all [bracketed placeholders] with actual content
2. Delete sections that don't apply to your project
3. Update the "Last Updated" timestamp whenever changes are made
4. Keep the Activity Log current - add entries after every work session
5. Move features between Planned → In Progress → Implemented as work progresses
6. Reference sections using §X.X notation (e.g., "See §4.1 for business logic")

**Maintenance reminders:**
- Update after every significant work session
- Review and reprioritize Next Actions Queue regularly
- Document all architectural decisions in §5 Activity Log
- Track technical debt in §7 and plan resolution