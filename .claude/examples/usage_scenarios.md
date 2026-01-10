# CLAUDE Master Plan System - Usage Scenarios

This document demonstrates how the Master Plan Management System works in practice with real-world scenarios.

## Scenario 1: Starting a New Project

### User Request
"I need to create a new e-commerce website with user authentication and payment processing."

### Claude Response Flow

#### Step 1: Check for Master Plan
```markdown
I'll help you create an e-commerce website. Let me first check if you have a master plan for this project.

*[Uses Read tool to check for master_plan.md]*

I don't see a master_plan.md file in your project directory. For a complex project like an e-commerce site, I recommend we create one to track our progress and architecture decisions.

Let me create a master plan for your e-commerce project.
```

#### Step 2: Create Initial Master Plan
```markdown
*[Uses template to create master_plan.md]*

✅ Created master plan for E-commerce Website project

I've established the project structure with phases:
- Phase 1: Foundation (authentication, basic setup)
- Phase 2: Core E-commerce (products, cart, checkout)
- Phase 3: Payments (Stripe integration)
- Phase 4: Advanced Features (reviews, recommendations)

## Suggested Next Steps

### Immediate
- [ ] Set up development environment (Node.js, database)
- [ ] Create basic project structure with authentication scaffolding

### Short-term
- [ ] Implement user registration and login (master_plan.md §6.1)
- [ ] Set up database models for users and products
- [ ] Create basic UI layout and navigation

### Master Plan Reference
- This establishes: Phase 1 - Foundation (§6.1)
- Next milestone: Complete user authentication system (§6.1.1)
- Update needed in: §5.1 (activity log entry for plan creation)
```

## Scenario 2: Bug Fix During Development

### User Request
"The login form is not validating email addresses properly."

### Claude Response Flow

#### Step 1: Read Master Plan Context
```markdown
Let me fix the email validation issue. First, let me check the current project status.

*[Reads master_plan.md]*

I see from the master plan that user authentication is currently in Phase 1 (§6.1), with the login system marked as "In Progress" (§3.2). This bug fix will complete that milestone.
```

#### Step 2: Implement Fix
```markdown
*[Reads auth code, identifies issue, implements fix]*

✅ Fixed email validation in login form

The issue was in `src/utils/validation.js` - the email regex was missing domain validation. I've updated it to use a more robust email validation pattern and added unit tests.

*[Updates master_plan.md]*
- Added activity log entry for bug fix
- Updated technical debt section (resolved validation issue)
- Advanced Phase 1 milestone progress
```

#### Step 3: Next Steps with Master Plan Context
```markdown
## Suggested Next Steps

### Immediate
- [ ] Test the fixed email validation across all browsers
- [ ] Run the full authentication test suite
- [ ] Deploy the fix to staging environment

### Short-term
- [ ] Complete password reset functionality (master_plan.md §3.2)
- [ ] Add email verification for new registrations
- [ ] Implement session management (next Phase 1 milestone)

### Master Plan Reference
- This work advances: Phase 1 - Foundation, Authentication System (§6.1)
- Next master plan item: Session management and password reset (§6.1.2)
- Update needed in: §3.2 (move login validation from "In Progress" to "Implemented")
```

## Scenario 3: Feature Implementation

### User Request
"Add a shopping cart feature where users can add products and see the total."

### Claude Response Flow

#### Step 1: Master Plan Alignment
```markdown
I'll implement the shopping cart feature. Let me check how this fits into our project plan.

*[Reads master_plan.md]*

Perfect! Shopping cart implementation is listed in §3.3 Planned Features as part of Phase 2 - Core E-commerce. I see that user authentication (Phase 1) is complete, so we can proceed with this feature.

*[Updates master_plan.md to move shopping cart from Planned to In Progress]*
```

#### Step 2: Implementation with Progress Tracking
```markdown
*[Implements cart functionality step by step]*

I'll break this into smaller tasks:
1. Create cart data model and state management ✅
2. Add "Add to Cart" buttons on product pages ✅
3. Create cart component with quantity controls ✅
4. Implement total calculation with tax ✅
5. Add cart persistence to local storage ✅

*[Updates master_plan.md activity log for each major step]*
```

#### Step 3: Completion and Master Plan Update
```markdown
✅ Shopping cart feature implemented successfully

## Suggested Next Steps

### Immediate
- [ ] Add unit tests for cart calculations and state management
- [ ] Test cart functionality across different browsers
- [ ] Add cart item count indicator in navigation

### Short-term
- [ ] Implement checkout process (master_plan.md §3.3, next Phase 2 milestone)
- [ ] Add product inventory tracking to prevent overselling
- [ ] Create cart abandonment email system

### Master Plan Reference
- This work advances: Phase 2 - Core E-commerce (§6.2)
- Completed milestone: Shopping cart functionality (§6.2.1)
- Next master plan item: Checkout process and order management (§6.2.2)
- Update needed in: §3.1 (move cart to Implemented), §5.1 (activity log), §6.2 (milestone completion)
```

## Scenario 4: Architecture Decision

### User Request
"Should we use Redux or Context API for state management? The app is getting complex."

### Claude Response Flow

#### Step 1: Context from Master Plan
```markdown
That's a great question about state management. Let me review our current architecture and complexity.

*[Reads master_plan.md architecture section]*

Based on our master plan (§2.1), we currently have:
- User authentication state
- Shopping cart state
- Product catalog state
- Order management (planned)

With Phase 3 (payments) and Phase 4 (advanced features) coming up, we'll also need:
- Payment processing state
- User preferences
- Admin features
```

#### Step 2: Analysis and Recommendation
```markdown
Given our project scope from the master plan, I recommend **Redux Toolkit** for these reasons:

1. **Scale**: Phases 3-4 will add significant state complexity
2. **Team Development**: Better for multiple developers (noted in §1 success criteria)
3. **DevTools**: Better debugging for complex e-commerce flows
4. **Persistence**: Easy integration with cart/user preference persistence

*[Implements Redux setup]*

✅ Migrated to Redux Toolkit for state management

*[Documents decision in master plan]*
```

#### Step 3: Master Plan Update and Next Steps
```markdown
## Suggested Next Steps

### Immediate
- [ ] Test all existing functionality with new Redux state
- [ ] Update component unit tests to work with Redux
- [ ] Create Redux dev tools setup for development

### Short-term
- [ ] Migrate remaining Context API usage to Redux
- [ ] Add Redux persistence for cart and user preferences
- [ ] Set up Redux middleware for API calls

### Master Plan Reference
- This work advances: Technical foundation for Phases 2-4
- Decision documented: Redux chosen over Context API (§5.2)
- Update needed in: §2.2 (technology stack), §4.1 (state management system), §7 (remove state management technical debt)
```

## Scenario 5: Mid-Development Check-in

### User Request
"What should I work on next? I want to make sure I'm staying on track."

### Claude Response Flow

#### Step 1: Master Plan Status Review
```markdown
Let me review your current progress and priorities.

*[Reads master_plan.md thoroughly]*

## Current Project Status

**Phase 1 - Foundation**: ✅ Complete
- ✅ User authentication
- ✅ Database setup
- ✅ Basic project structure

**Phase 2 - Core E-commerce**: 🔄 In Progress (75% complete)
- ✅ Product catalog
- ✅ Shopping cart
- ✅ State management (Redux)
- 🔄 Checkout process (in progress)
- 📋 Order management (planned)

**Blockers Identified**: None currently
**Technical Debt**: 3 items in §7 (medium priority)
```

#### Step 2: Prioritized Recommendations
```markdown
## Suggested Next Steps

### Immediate (Based on §8 Next Actions Queue)
- [ ] Complete checkout process implementation (highest priority)
- [ ] Add order confirmation emails
- [ ] Implement basic order history

### Short-term (Preparing for Phase 3)
- [ ] Set up Stripe payment integration testing environment
- [ ] Add inventory management to prevent overselling
- [ ] Create admin panel authentication

### Master Plan Reference
- Current focus: Completing Phase 2 - Core E-commerce (§6.2)
- Next major milestone: Phase 3 - Payment Integration (§6.3)
- Behind schedule: No, tracking well against planned milestones
- Update needed in: §3.2 (update checkout progress percentage)
```

## Scenario 6: Technical Debt Management

### User Request
"The code is getting messy and tests are taking too long to run."

### Claude Response Flow

#### Step 1: Technical Debt Assessment
```markdown
Let me review the technical debt and performance issues.

*[Reads master_plan.md §7 Technical Debt section]*

I see we have several items in technical debt:
- **High Priority**: Missing integration tests
- **Medium Priority**: Database query optimization
- **Low Priority**: Code organization in services layer

The slow tests are likely related to database queries running in tests. Let me address the highest impact items first.
```

#### Step 2: Systematic Cleanup
```markdown
*[Implements test performance fixes and refactoring]*

✅ Resolved technical debt items:
- Added test database mocking (tests now 80% faster)
- Optimized product query performance
- Refactored service layer organization

*[Updates master_plan.md technical debt section]*
```

#### Step 3: Prevention and Next Steps
```markdown
## Suggested Next Steps

### Immediate
- [ ] Add pre-commit hooks to prevent future technical debt
- [ ] Set up performance monitoring for database queries
- [ ] Document coding standards in project documentation

### Short-term
- [ ] Complete remaining §7 technical debt items
- [ ] Add automated code quality checks to CI pipeline
- [ ] Schedule regular technical debt review sessions

### Master Plan Reference
- This work improves: Overall project quality and development velocity
- Resolved items: 3 high/medium priority technical debt items (§7)
- Next maintenance: Regular technical debt review in §8 queue
- Update needed in: §7 (mark resolved items), §5.2 (document performance decisions)
```

## Key Patterns Demonstrated

### 1. Context Awareness
- Always reads master plan before starting work
- References specific sections (§X.X notation)
- Understands project phase and priorities

### 2. Progress Tracking
- Updates feature status (Planned → In Progress → Implemented)
- Maintains activity log with meaningful entries
- Documents architectural decisions

### 3. Strategic Alignment
- Connects current work to broader project goals
- Identifies dependencies and blockers
- Prioritizes next steps based on master plan

### 4. Systematic Maintenance
- Updates multiple master plan sections as appropriate
- Keeps next actions queue current and relevant
- Maintains project documentation accuracy

This systematic approach ensures that every interaction with Claude contributes to clear project progress and maintains comprehensive project documentation.