# Next Steps Template

Use this template at the end of EVERY response that involves project work, code changes, or task completion.

## Standard Format

```markdown
## Suggested Next Steps

### Immediate
- [ ] [Specific actionable task that should be done right now]
- [ ] [Critical follow-up or fix needed to build on this work]

### Short-term
- [ ] [Task that logically follows within current work session]
- [ ] [Item that aligns with master plan milestones]
- [ ] [Task from master plan queue that's now unblocked]

### Master Plan Reference
- This work advances: [Phase/Milestone name from master_plan.md]
- Next master plan item: [Specific item from master_plan.md §8]
- Update needed in: [Sections of master_plan.md that need updating]
```

## Guidelines for Effective Next Steps

### Immediate Actions (1-3 items)
**Purpose**: What should be done right now to build on completed work
- Must be **specific and actionable** (not vague suggestions)
- Should **directly relate** to the just-completed work
- Include **any critical follow-ups** needed to prevent issues
- Consider **testing, validation, or cleanup** tasks

**Examples**:
✅ "Add unit tests for the new authentication middleware"
✅ "Update the API documentation to reflect the new endpoints"
✅ "Test the payment integration with staging environment"

❌ "Improve the code" (too vague)
❌ "Add some tests" (not specific enough)
❌ "Make it better" (no actionable direction)

### Short-term Tasks (2-4 items)
**Purpose**: Tasks that logically follow within the current work trajectory
- Should **build on current momentum** and completed work
- **Reference master plan items** when available
- Include **dependencies that are now unblocked**
- Consider **related features or improvements**

**Examples**:
✅ "Implement refresh token logic (master_plan.md §3.2)"
✅ "Create the user dashboard now that auth is complete"
✅ "Add rate limiting to the new API endpoints"

### Master Plan Alignment (1-2 items)
**Purpose**: Connect current work to broader project goals
- **Reference specific sections** of master_plan.md using §X.X notation
- **Identify which milestone or phase** this work advances
- **Note any blockers removed** or dependencies satisfied
- **Suggest master plan updates** if scope changed

**Examples**:
✅ "This advances: Phase 2 - User Management System (§6.2)"
✅ "Next milestone: Session management (§6.2.3)"
✅ "Blocking: Dashboard features require auth completion"

## Context-Aware Suggestions

### After Bug Fixes
- Immediate: Add regression tests, verify fix works
- Short-term: Check for similar issues elsewhere, update documentation
- Master Plan: Update technical debt section, mark issue as resolved

### After Feature Implementation
- Immediate: Test feature thoroughly, update documentation
- Short-term: Implement related features, add monitoring/analytics
- Master Plan: Move from In Progress to Implemented, update milestones

### After Refactoring
- Immediate: Run full test suite, check performance impact
- Short-term: Update dependent code, refactor related areas
- Master Plan: Update architecture documentation, reduce technical debt

### After Infrastructure Changes
- Immediate: Deploy to staging, monitor for issues
- Short-term: Update deployment docs, train team on changes
- Master Plan: Update system architecture section, document decisions

## Integration with Master Plan

### When master_plan.md exists:
1. **Read current state** before suggesting next steps
2. **Reference specific sections** using §X.X notation
3. **Map completed work** to master plan phases/milestones
4. **Suggest updates** to relevant sections
5. **Pull next priorities** from §8 Next Actions Queue

### When master_plan.md is missing:
1. **Suggest creating one** before proceeding with complex work
2. **Provide immediate tactical steps** that don't require long-term planning
3. **Recommend using master plan template** for future work

## Quality Checklist

Before providing next steps, ensure:
- [ ] **Specificity**: Each item is actionable and clear
- [ ] **Relevance**: Steps build on or relate to just-completed work
- [ ] **Priority**: Items are ordered by importance/dependency
- [ ] **Context**: References to master plan when available
- [ ] **Completeness**: Covers immediate, short-term, and strategic items
- [ ] **Realism**: Tasks are appropriately sized and achievable

## Common Mistakes to Avoid

❌ **Generic suggestions**: "Add tests", "Improve performance"
❌ **Skipping next steps**: Ending responses without suggestions
❌ **Ignoring master plan**: Not referencing existing project documentation
❌ **Too many items**: Overwhelming with 10+ next steps
❌ **Wrong scope**: Suggesting multi-day tasks as "immediate"
❌ **No prioritization**: Listing items without clear ordering

## Example Implementation

```markdown
✅ **Completed**: Implemented user authentication middleware

## Suggested Next Steps

### Immediate
- [ ] Add unit tests for auth middleware (test authentication flow)
- [ ] Test middleware integration with existing API routes
- [ ] Update API documentation to include auth requirements

### Short-term
- [ ] Implement refresh token logic (master_plan.md §3.2)
- [ ] Add rate limiting to auth endpoints (prevent brute force)
- [ ] Create login/logout UI components for frontend
- [ ] Set up user session management in dashboard

### Master Plan Reference
- This work advances: Phase 2 - Authentication System (§6.2)
- Next milestone: Session management and user roles (§6.2.3)
- Update needed in: §3.2 (move auth to Implemented), §5 (add activity log entry)
```