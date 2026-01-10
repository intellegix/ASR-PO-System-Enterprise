# Master Plan Status Tracking System

## Overview

The Status Tracking System provides comprehensive monitoring of project health, progress, and quality using data from the master plan. This system enables proactive project management and early detection of issues.

## Status Categories

### 1. Project Health Status

#### Green Status (Healthy) ✅
**Criteria:**
- Activity log updated within last 7 days
- All "In Progress" features have recent updates (<14 days)
- Next actions queue has 3-8 prioritized, relevant items
- Technical debt section reflects current reality
- Architecture documentation matches implementation

**Indicators:**
- Consistent development velocity
- Clear project direction
- Well-maintained documentation
- Proactive technical debt management

**Response Pattern:**
```markdown
Project Status: ✅ **Healthy**
- Recent activity: [X] days ago
- Active development on [Y] features
- Clear roadmap with [Z] prioritized next steps
```

#### Yellow Status (Attention Needed) ⚠️
**Criteria:**
- Activity log missing recent entries (7-30 days)
- 1-2 stale "In Progress" features (>14 days)
- Next actions queue too long (>10 items) or too short (<3 items)
- Minor discrepancies in architecture documentation
- Some resolved technical debt not updated

**Indicators:**
- Inconsistent documentation updates
- Possible scope creep or priority confusion
- Minor maintenance needed

**Response Pattern:**
```markdown
Project Status: ⚠️ **Needs Attention**

Issues identified:
- [Specific issues found]
- [Impact assessment]

Would you like me to help update the master plan to address these issues?
```

#### Red Status (Critical Issues) 🔴
**Criteria:**
- Activity log missing entries >30 days
- Multiple stale "In Progress" features (>14 days)
- Next actions queue empty, irrelevant, or outdated
- Major architecture changes not documented
- Significant technical debt accumulation

**Indicators:**
- Development momentum lost
- Project direction unclear
- Documentation significantly outdated
- Risk of knowledge loss

**Response Pattern:**
```markdown
Project Status: 🔴 **Critical - Immediate Attention Required**

Critical issues:
- [List serious problems]
- [Potential risks]

I strongly recommend we spend time updating the master plan before proceeding with new work. This will ensure we have accurate project context and clear direction.
```

### 2. Feature Progress Tracking

#### Feature Status Indicators

**Planned 📋**
- Clear requirements defined
- Dependencies identified
- Priority assigned
- Estimated effort available

**In Progress 🔄**
- Active development ongoing
- Progress percentage tracked
- Blockers identified and addressed
- Regular status updates

**Implemented ✅**
- Feature complete and tested
- Documentation updated
- Completion date recorded
- Integration verified

#### Progress Quality Metrics

**Healthy Feature Progress:**
- Clear progression: Planned → In Progress → Implemented
- Regular updates (at least weekly)
- Blockers addressed promptly
- Completion criteria defined

**Warning Signs:**
- Features stuck "In Progress" >14 days
- No progress updates
- Undefined completion criteria
- Unresolved blockers

#### Tracking Patterns
```markdown
# Weekly Feature Review
Features in Progress: [Count]
- [Feature Name]: [Progress %] - [Last Update] - [Blockers]

Completed This Week: [Count]
- [Feature Name] - [Completion Date]

Planning Queue: [Count items]
- Next up: [Highest priority feature]
```

### 3. Milestone and Phase Tracking

#### Phase Status Indicators

**Phase Health Metrics:**
- Milestone completion rate
- Timeline adherence
- Dependency management
- Scope stability

**Phase Status Types:**
- **On Track**: Milestones completing as planned
- **Behind Schedule**: Some milestone delays
- **Blocked**: Cannot proceed due to dependencies
- **Ahead of Schedule**: Faster than planned progress

#### Milestone Tracking Pattern
```markdown
Phase [X]: [Phase Name] - [Status]

Milestones:
✅ [Milestone 1]: Complete ([Date])
🔄 [Milestone 2]: In Progress (75% complete)
📋 [Milestone 3]: Planned (blocked by Milestone 2)
📋 [Milestone 4]: Planned

Phase Progress: [X/Y] milestones complete ([%])
Estimated Completion: [Date based on current velocity]
```

### 4. Technical Debt Monitoring

#### Debt Health Indicators

**Healthy Debt Management:**
- New debt documented promptly
- Regular debt resolution
- Priority-based debt addressing
- Prevention strategies in place

**Warning Signs:**
- Accumulating high-priority debt
- No recent debt resolution
- Debt items without clear ownership
- Missing impact assessment

#### Debt Tracking Pattern
```markdown
Technical Debt Summary:
🔴 High Priority: [Count] items - [Total estimated effort]
🟡 Medium Priority: [Count] items - [Total estimated effort]
🟢 Low Priority: [Count] items - [Total estimated effort]

Recent Resolution:
- [Debt Item]: Resolved [Date] - [Impact]

Next to Address:
- [Highest priority debt item] - [Estimated effort]
```

## Status Assessment Protocol

### Automated Health Checks

#### Session Start Assessment
```markdown
# Run these checks at beginning of every session
1. Check activity log recency
2. Review "In Progress" feature staleness
3. Validate next actions queue relevance
4. Assess technical debt growth
5. Verify architecture documentation currency
```

#### Assessment Script Template
```bash
# Master Plan Health Check
LAST_ACTIVITY=$(grep -E "^\|" master_plan.md | tail -1 | cut -d'|' -f2)
IN_PROGRESS_COUNT=$(grep -c "In Progress" master_plan.md)
NEXT_ACTIONS_COUNT=$(grep -c -A20 "Next Actions Queue" master_plan.md | grep -c "^\d\.")

# Calculate days since last activity
# Count stale features
# Assess overall health
```

### Manual Review Protocols

#### Weekly Status Review
```markdown
# Conduct every 7 days
1. Review all feature statuses for accuracy
2. Update completion percentages
3. Check milestone progress
4. Assess technical debt priorities
5. Validate next actions relevance
6. Update project health status
```

#### Monthly Deep Assessment
```markdown
# Comprehensive review every 30 days
1. Phase progress evaluation
2. Architecture documentation audit
3. Technical debt trend analysis
4. Decision tracking completeness
5. Project goal alignment check
6. Resource allocation assessment
```

## Integration with Workflows

### Status-Aware Task Planning

#### Plan Mode Integration
When using plan mode for new tasks:
```markdown
# Include current status in planning context
1. Review current phase and milestone status
2. Consider existing technical debt
3. Assess feature dependencies
4. Evaluate resource allocation
5. Plan with status constraints in mind
```

#### Status-Based Prioritization
```markdown
# Adjust priorities based on status
High Priority Tasks (Red/Yellow status):
- Master plan maintenance
- Critical blocker resolution
- Architecture documentation updates

Normal Priority Tasks (Green status):
- New feature development
- Enhancement work
- Optimization tasks
```

### Next Steps Generation

#### Status-Aware Suggestions
```markdown
# Tailor next steps based on project health

Green Status - Focus on Progress:
### Immediate
- Continue with planned feature development
- Address minor technical debt items

Yellow Status - Focus on Maintenance:
### Immediate
- Update stale documentation
- Resolve identified inconsistencies

Red Status - Focus on Recovery:
### Immediate
- Comprehensive master plan update
- Project status assessment and realignment
```

## Status Reporting

### Dashboard Pattern

#### Project Status Summary
```markdown
# Project Health Dashboard

## Overall Status: [Green/Yellow/Red]

### Current Phase
**Phase**: [Name] - [Status]
**Progress**: [X/Y] milestones complete
**Timeline**: [On track/Behind/Ahead]

### Active Development
**Features in Progress**: [Count]
- [Feature 1]: [Progress] - [Status]
- [Feature 2]: [Progress] - [Status]

**Next Priorities**: [Top 3 from queue]
1. [Priority 1] - [Reason]
2. [Priority 2] - [Reason]
3. [Priority 3] - [Reason]

### Quality Metrics
**Technical Debt**: [High: X, Medium: Y, Low: Z]
**Documentation**: [Current/Outdated]
**Test Coverage**: [If tracked]

### Recent Activity
**Last Update**: [Date]
**Recent Accomplishments**: [Summary]
**Blockers**: [Current blockers if any]
```

### Trend Analysis

#### Progress Velocity Tracking
```markdown
# Track completion rates over time
Weekly Feature Completion: [Average over last 4 weeks]
Milestone Achievement Rate: [On time vs. delayed]
Technical Debt Resolution: [Items resolved per week]
```

#### Predictive Indicators
```markdown
# Early warning signs
Risk Indicators:
- Velocity declining trend
- Increasing technical debt
- Documentation lag growing
- Blocker resolution slowing

Success Indicators:
- Consistent milestone achievement
- Proactive debt management
- Current documentation
- Clear project direction
```

## Alert and Notification System

### Automatic Alerts

#### Status Degradation Alerts
```markdown
# Trigger when status changes from Green → Yellow → Red
Alert: Project status has changed to [Yellow/Red]
Reason: [Specific triggers]
Recommended Actions: [Specific steps to address]
```

#### Staleness Alerts
```markdown
# Trigger based on time thresholds
Warning: [Component] hasn't been updated in [X] days
Impact: [Potential consequences]
Action Needed: [Specific update required]
```

### Proactive Recommendations

#### Maintenance Reminders
```markdown
# Based on project patterns and best practices
Suggestion: Weekly master plan review due
Reason: Maintain project health and momentum
Estimated Time: 15 minutes
Benefits: Prevent issues before they become critical
```

## Status Integration Examples

### Example 1: Healthy Project Status
```markdown
I've reviewed your project's master plan. Status: ✅ **Healthy**

Current state:
- Phase 2 progressing well (3/5 milestones complete)
- 2 features actively in development
- Clear priorities in next actions queue
- Recent activity within last 3 days

Ready to proceed with your request. The authentication system you mentioned aligns well with your current Phase 2 milestone.
```

### Example 2: Warning Status Response
```markdown
I notice your project status needs attention: ⚠️ **Requires Update**

Issues identified:
- Activity log missing entries from last 2 weeks
- Shopping cart feature marked "In Progress" for 18 days
- Next actions queue has 12 items (recommend 3-8)

Would you like me to help update the master plan before proceeding with new work? This will ensure we have current context and clear priorities.
```

### Example 3: Critical Status Response
```markdown
Project Status: 🔴 **Critical - Master Plan Update Required**

Your master plan shows several concerning issues:
- No activity log entries in 6 weeks
- 4 features stuck "In Progress" without updates
- Next actions queue appears outdated
- Recent architecture changes not documented

I strongly recommend we spend 20-30 minutes updating the master plan before starting new development. This will:
- Restore accurate project context
- Identify current priorities
- Document recent decisions
- Establish clear next steps

Shall we begin with a guided master plan update?
```

This status tracking system ensures that projects maintain healthy development patterns and that issues are identified and addressed proactively rather than reactively.