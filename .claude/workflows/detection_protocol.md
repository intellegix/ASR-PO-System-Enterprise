# Master Plan Detection Protocol

## Overview

This protocol defines how Claude must check for, validate, and create master plans at the beginning of every project interaction. This is a **mandatory protocol** that must be followed without exception.

## Prime Directive Implementation

### Universal Session Start Sequence

**Every project interaction MUST begin with this sequence:**

1. **Master Plan Detection Check**
2. **Response Based on Detection Result**
3. **Context Loading (if plan exists)**
4. **Plan Creation Offer (if plan missing)**

## Detection Protocol Steps

### Step 1: Automatic Detection

#### File System Check
```bash
# Use Read tool to check for master_plan.md in project root
READ master_plan.md
```

#### Detection Results
- **SUCCESS**: File exists and is readable → Proceed to Step 2A
- **FILE NOT FOUND**: No master_plan.md in root → Proceed to Step 2B
- **ACCESS ERROR**: File exists but unreadable → Proceed to Step 2C

### Step 2A: Plan Exists - Context Loading

#### Validation Checklist
When master_plan.md is found, validate it contains:
- [ ] Project name and status headers
- [ ] At least 5 main sections (Overview, Architecture, Features, Activity Log, Next Actions)
- [ ] Recent activity log entries (within last 30 days for active projects)
- [ ] Non-empty Next Actions Queue (§8)

#### Context Internalization
Extract and retain for session:
- **Current Phase**: From status header
- **Active Features**: Items in §3.2 In Progress
- **Priorities**: Top 3 items from §8 Next Actions Queue
- **Known Blockers**: From §3.2 and §7 Technical Debt
- **Recent Decisions**: Last 3 entries from §5.2

#### Response Pattern
```markdown
I've reviewed your project's master plan. Current status:

**Phase**: [Current Phase from plan]
**In Progress**: [List 1-2 active features from §3.2]
**Next Priority**: [Top item from §8 Next Actions Queue]

[Proceed with user's request, referencing master plan context]
```

### Step 2B: Plan Missing - Creation Protocol

#### Immediate Response Pattern
```markdown
I notice this project doesn't have a master_plan.md file yet. For [task complexity assessment], I recommend creating one to track progress and architecture decisions.

**Options**:
1. **Create master plan first** (recommended for complex/multi-session work)
2. **Proceed with task now**, create plan after completion
3. **Skip master plan** (only for simple one-off tasks)

Which would you prefer?
```

#### Task Complexity Assessment
- **Simple Task** (≤1 hour, single file): Offer to skip
- **Medium Task** (1-4 hours, multiple files): Recommend creation
- **Complex Task** (>4 hours, architecture changes): Require creation

#### Creation Process
If user chooses to create master plan:

1. **Copy Template**:
   ```bash
   cp .claude/templates/master_plan_template.md master_plan.md
   ```

2. **Gather Project Information**:
   - Project name and purpose
   - Current technology stack
   - Key features planned/implemented
   - Current development phase

3. **Populate Initial Plan**:
   - Fill template placeholders
   - Add current session as first activity log entry
   - Set initial next actions based on user request

4. **Confirm Creation**:
   ```markdown
   ✅ Created master plan for [Project Name]

   I've set up the project structure with:
   - Current phase: [Phase Name]
   - Initial next actions based on your request
   - Framework for tracking future progress

   [Proceed with original user request]
   ```

### Step 2C: Plan Unreadable - Recovery Protocol

#### Error Response
```markdown
I found a master_plan.md file but can't read it. This could indicate:
- File permissions issue
- File corruption
- Binary file incorrectly named

Let me help you resolve this.
```

#### Recovery Actions
1. Check file permissions and suggest fixes
2. Attempt to create backup if possible
3. Offer to recreate from template
4. Document the issue for future reference

## Integration with Work Flow

### During Task Execution

#### Master Plan Aware Decision Making
- **Reference Context**: Use phase, priorities, and blockers from master plan
- **Architectural Alignment**: Ensure work aligns with documented architecture (§2)
- **Progress Tracking**: Track which features/milestones are being advanced
- **Dependency Awareness**: Consider blockers and dependencies from plan

#### Continuous Validation
- **Scope Creep Detection**: Flag when work diverges from master plan
- **Blocker Resolution**: Identify when work removes known blockers
- **New Discovery Documentation**: Note new dependencies or architectural insights

### Post-Task Master Plan Updates

#### Required Updates (MANDATORY)
1. **Activity Log Entry** (§5.1):
   ```markdown
   | YYYY-MM-DD | [Work summary] | [Files changed] | [Key decisions] |
   ```

2. **Feature Status Changes** (§3):
   - Move items between Planned → In Progress → Implemented
   - Update completion percentages
   - Add/remove blockers

3. **Next Actions Update** (§8):
   - Remove completed items
   - Add newly discovered tasks
   - Reprioritize based on current state

#### Conditional Updates (As Applicable)
1. **Architecture Changes** (§2): If system design modified
2. **Technology Stack** (§2.2): If new tools/libraries added
3. **Decision Documentation** (§5.2): If significant choices made
4. **Technical Debt** (§7): If debt added or resolved
5. **Milestone Progress** (§6): If phase/milestone advancement

## Quality Assurance

### Master Plan Health Indicators

#### Green (Healthy)
- Activity log updated within last 7 days
- Feature statuses match actual implementation
- Next actions queue has 3-8 prioritized items
- No stale "In Progress" items (>14 days without update)

#### Yellow (Attention Needed)
- Activity log missing recent entries (7-30 days)
- 1-2 stale "In Progress" items
- Next actions queue too long (>10 items) or too short (<3 items)
- Architecture section doesn't reflect recent changes

#### Red (Critical - Must Fix)
- Activity log missing entries >30 days
- Multiple stale "In Progress" items (>14 days)
- Next actions queue empty or irrelevant
- Major architecture changes not documented

### Intervention Protocols

#### Yellow Status Response
```markdown
I notice your master plan needs some attention:
- [Specific issues identified]

Would you like me to help update it before we continue? This will ensure we stay aligned with project goals.
```

#### Red Status Response
```markdown
Your master plan appears significantly out of date:
- [Critical issues listed]

I strongly recommend we spend a few minutes updating it to accurately reflect the current project state before proceeding with new work.
```

## Automated Checks

### Session Start Checklist
- [ ] Master plan detection attempted
- [ ] Context loaded (if plan exists) or creation offered (if missing)
- [ ] Current phase and priorities identified
- [ ] Health status assessed (Green/Yellow/Red)

### Session End Checklist
- [ ] Activity log entry created
- [ ] Feature status updated (if applicable)
- [ ] Next actions queue refreshed
- [ ] Architecture/decisions documented (if applicable)
- [ ] Next steps provided with master plan context

## Error Handling

### Common Issues and Solutions

#### "Can't find master_plan.md"
- **Cause**: Working in subdirectory or file moved
- **Solution**: Check project root, offer to create new plan
- **Prevention**: Always check from project root

#### "Master plan is corrupted"
- **Cause**: Merge conflicts, encoding issues, partial saves
- **Solution**: Offer to restore from template, backup if possible
- **Prevention**: Regular git commits of master plan

#### "Master plan is too outdated"
- **Cause**: Long periods without updates, multiple contributors
- **Solution**: Guided update session to bring current
- **Prevention**: End-of-session update reminders

#### "Multiple master plans found"
- **Cause**: Team created multiple versions, backups not cleaned
- **Solution**: Help consolidate into single authoritative version
- **Prevention**: Clear naming conventions and git ignore for backups

## Implementation Examples

### Scenario 1: New Project, Complex Task
```markdown
User: "Build a REST API for a social media app with authentication"

Claude Response:
I'll help you build a REST API for a social media app. First, let me check if you have a master plan for this project.

[Reads master_plan.md - NOT FOUND]

I don't see a master_plan.md file in your project directory. For a complex project like a social media API with authentication, I highly recommend creating one to track our architecture decisions and progress through multiple development phases.

Would you like me to:
1. Create a master plan first (recommended) - helps organize the full project
2. Start building the API now and create the plan afterward
3. Skip the master plan (not recommended for complex projects)
```

### Scenario 2: Existing Project, Simple Task
```markdown
User: "Fix the typo in the README"

Claude Response:
I'll fix the typo in the README. Let me first check your project status.

[Reads master_plan.md - FOUND and HEALTHY]

I see from your master plan that you're currently in Phase 2 - Core Development, with the authentication system in progress. This typo fix won't affect your current milestones.

[Fixes typo]

✅ Fixed typo in README.md

## Suggested Next Steps

### Immediate
- [Continue with authentication system work from master plan §8]

### Master Plan Reference
- This minor fix doesn't advance major milestones
- Next priority: Complete OAuth integration (§8.1)
- Update needed in: §5.1 (activity log entry)
```

This detection protocol ensures that every Claude interaction maintains proper project context and documentation standards.