# ASR Purchase Order System - User Guide

**Version:** 1.0.0
**Last Updated:** 2026-01-12
**Target Audience:** ASR Staff (All Divisions)

---

## Table of Contents

1. [Quick Start Guide](#quick-start-guide)
2. [System Overview](#system-overview)
3. [Getting Started](#getting-started)
4. [Creating Purchase Orders](#creating-purchase-orders)
5. [Approval Workflow](#approval-workflow)
6. [Reports and Analytics](#reports-and-analytics)
7. [Mobile App Usage](#mobile-app-usage)
8. [Role-Specific Features](#role-specific-features)
9. [Advanced Features](#advanced-features)
10. [Frequently Asked Questions](#frequently-asked-questions)

---

## Quick Start Guide

### 🚀 Get Started in 5 Minutes

**New to the ASR PO System? Follow these steps:**

1. **Access the System**
   - Go to: `https://asr-po.yourdomain.com`
   - Use your ASR email and password to log in
   - The system recognizes your role automatically

2. **Understand Your Dashboard**
   - View key metrics for your division
   - See pending approvals (if you're a manager)
   - Access quick actions for common tasks

3. **Create Your First PO**
   - Click "Create New PO" button
   - Select your project and work order
   - Choose vendor and add line items
   - Submit for approval

4. **Track Progress**
   - Monitor PO status in real-time
   - Receive email notifications for updates
   - Use the audit trail to see history

**🎯 Most Common Tasks:**
- Create Purchase Order: `Dashboard → Create New PO`
- Check PO Status: `Dashboard → My Purchase Orders`
- View Reports: `Reports → Select Report Type`
- Approve POs: `Dashboard → Pending Approvals`

---

## System Overview

### What is the ASR Purchase Order System?

The ASR Purchase Order System is a comprehensive business intelligence platform that streamlines the entire purchase order workflow from creation to QuickBooks integration. Built specifically for ASR's multi-division operations.

### Key Benefits

✅ **Streamlined Workflow**: Create POs in under 2 minutes
✅ **Real-time Visibility**: Track every PO across all divisions
✅ **Automatic Integration**: Seamless QuickBooks synchronization
✅ **Mobile Access**: Full functionality on phones and tablets
✅ **Complete Audit Trail**: Every action is tracked and documented
✅ **Smart Reporting**: 6 comprehensive business intelligence reports

### System Capabilities

| Feature | Description | Your Benefit |
|---------|-------------|--------------|
| **Smart PO Numbering** | Automatic PO number generation | No duplicate numbers, easy tracking |
| **Multi-level Approval** | Role-based approval workflow | Proper authorization at every level |
| **Real-time Notifications** | Email alerts for status changes | Stay informed automatically |
| **Mobile PWA** | Progressive Web App functionality | Work from anywhere, even offline |
| **QuickBooks Sync** | Automatic GL account integration | No double-entry, reduced errors |
| **Advanced Reporting** | 6 business intelligence reports | Data-driven decision making |

---

## Getting Started

### System Access

#### First-Time Login
1. Navigate to `https://asr-po.yourdomain.com`
2. Click "Sign In with ASR Credentials"
3. Enter your ASR email address and password
4. The system automatically assigns your role based on your division

#### Your User Role
The system recognizes four user types:

| Role | Who You Are | What You Can Do |
|------|-------------|-----------------|
| **Division Leader** | CH, PW, WS, LS Division Leaders | Create POs, approve within limits, view division reports |
| **Operations Manager** | Cross-division oversight | Approve high-value POs, manage vendors, view all reports |
| **Accounting** | Financial oversight team | View all financial data, manage QuickBooks integration |
| **Majority Owner** | Executive leadership | Full system access, cross-division visibility |

### Understanding Your Dashboard

#### Dashboard Layout
Your dashboard adapts based on your role and shows relevant information:

**Top Section - Key Metrics:**
- Total POs this month
- Pending approvals (if applicable)
- Budget utilization
- Recent activity

**Center Section - Quick Actions:**
- Create New PO (primary action)
- View Pending Approvals
- Access Reports
- Vendor Quick Add

**Bottom Section - Recent Activity:**
- Your recent POs
- Team activity (for managers)
- System notifications
- Upcoming deadlines

#### Dashboard Navigation
- **Home Icon** 🏠: Return to main dashboard
- **PO Icon** 📝: Purchase order functions
- **Reports Icon** 📊: Business intelligence reports
- **Profile Icon** 👤: User settings and logout

### Browser Requirements

**Supported Browsers:**
- Chrome 90+ (Recommended)
- Firefox 85+
- Safari 14+
- Edge 90+

**Mobile Browsers:**
- iOS Safari 14+
- Android Chrome 90+
- Mobile Edge 90+

---

## Creating Purchase Orders

### Before You Start

**Required Information:**
- Project code and work order number
- Vendor information (name, contact details)
- Line item details (description, quantity, unit price)
- GL account code
- Delivery date and location

**Helpful Tips:**
- Have your project folder ready with work order details
- Confirm vendor is in our system (or have their details ready)
- Know the GL account code for your expense type
- Check with your division leader if unsure about approval limits

### Step-by-Step PO Creation

#### Step 1: Access PO Creation
1. From your dashboard, click "Create New PO"
2. Or use the navigation menu: `Purchase Orders → Create New`

#### Step 2: Project and Work Order Selection
1. **Project Selection:**
   - Type project code or search by name
   - Select from dropdown of active projects
   - System shows project details for verification

2. **Work Order Selection:**
   - Choose from work orders associated with your project
   - System displays work order title and budget information
   - Select the appropriate work order sequence

#### Step 3: Vendor Information
1. **Existing Vendor:**
   - Start typing vendor name
   - Select from dropdown of approved vendors
   - System auto-fills contact and payment terms

2. **New Vendor:**
   - Click "Add New Vendor"
   - Enter vendor name, contact information
   - Add payment terms (Net 30, Net 15, etc.)
   - System creates vendor record for future use

#### Step 4: Purchase Order Details
1. **PO Header Information:**
   - Delivery location (auto-filled from project)
   - Expected delivery date
   - Special instructions (optional)
   - Tax applicable (yes/no)

2. **Line Items:**
   - Item description (detailed)
   - Quantity required
   - Unit of measure (each, sq ft, linear ft, etc.)
   - Unit price
   - GL account code (auto-suggested based on description)

#### Step 5: Review and Submit
1. **Review Summary:**
   - Verify all information is correct
   - Check calculated totals
   - Confirm GL account assignments

2. **Submit for Approval:**
   - Click "Submit for Approval"
   - System generates unique PO number
   - Approval notification sent automatically
   - You receive confirmation email

### PO Number Format

Understanding your PO number helps with tracking:
```
Format: [GL]-[DIV]-[WO]-[VENDOR]-[001]
Example: 65-CH-1234-ACME-001

Where:
- GL: GL account code (65 = Equipment)
- DIV: Division code (CH = Corporate Housing)
- WO: Work order number (1234)
- VENDOR: Vendor code (ACME)
- 001: Sequence number
```

### Common PO Scenarios

#### Scenario 1: Equipment Purchase
```
Project: Sunrise Apartments
Work Order: WO-2024-1205
Vendor: Home Depot
Items:
- Power drill: $120
- Drill bits set: $45
- Extension cord: $35
Total: $200
GL Code: 65 (Equipment)
```

#### Scenario 2: Material Purchase
```
Project: Downtown Renovation
Work Order: WO-2024-1180
Vendor: ABC Lumber
Items:
- 2x4 lumber: 50 pcs @ $8.50 = $425
- Plywood sheets: 10 pcs @ $45 = $450
Total: $875
GL Code: 55 (Materials)
```

#### Scenario 3: Service Purchase
```
Project: Maintenance Program
Work Order: WO-2024-1190
Vendor: Elite Cleaning
Items:
- Monthly cleaning service: $1,200
- Special carpet cleaning: $300
Total: $1,500
GL Code: 75 (Services)
```

### Error Prevention Tips

**Double-Check These Fields:**
- ✅ Project code matches your actual project
- ✅ Work order is active and has budget remaining
- ✅ Vendor information is complete and accurate
- ✅ Item descriptions are detailed enough for receiving
- ✅ Quantities and prices are correct
- ✅ GL account codes match expense types
- ✅ Delivery date is realistic

**Common Mistakes to Avoid:**
- ❌ Using outdated project codes
- ❌ Selecting wrong work order sequence
- ❌ Incomplete vendor contact information
- ❌ Vague item descriptions ("misc supplies")
- ❌ Wrong GL account codes
- ❌ Unrealistic delivery dates

---

## Approval Workflow

### Understanding the Approval Process

#### Approval Hierarchy
```
Your PO → Division Leader → Operations Manager → Accounting → QuickBooks
```

#### Approval Limits
| Role | Approval Limit | What Happens |
|------|----------------|--------------|
| **Division Leader** | Up to $25,000 | Can approve within division budget |
| **Operations Manager** | Up to $50,000 | Handles cross-division and high-value POs |
| **Accounting** | No limit | Final approval before QuickBooks sync |

#### Automatic Routing Rules
- **Under $1,000**: Division Leader only
- **$1,000-$25,000**: Division Leader + Operations Manager
- **Over $25,000**: All approval levels required
- **Emergency POs**: Special expedited routing

### For PO Creators

#### After You Submit
1. **Immediate Confirmation:**
   - Email confirmation sent to you
   - PO appears in "Pending Approval" status
   - Approver receives notification

2. **Tracking Progress:**
   - Check dashboard for status updates
   - Click PO number to view detailed status
   - System shows who needs to approve next

3. **Status Meanings:**
   ```
   DRAFT → Still being created
   PENDING → Waiting for approval
   APPROVED → Approved but not yet sent to QB
   ISSUED → Active PO, sent to QuickBooks
   COMPLETED → PO fulfilled and closed
   REJECTED → Returned for revision
   ```

#### What to Expect
- **Approval Timeline**: Most POs approved within 4-8 hours
- **Email Notifications**: You'll receive updates at each step
- **Questions**: Approvers may contact you directly for clarification
- **Revisions**: If rejected, you'll receive specific feedback

### For Approvers (Division Leaders & Managers)

#### Your Approval Dashboard
1. **Pending Approvals Widget:**
   - Shows POs awaiting your approval
   - Sorted by submission date (oldest first)
   - Red indicators for urgent/overdue items

2. **Approval Actions:**
   - **Approve**: Move to next approval level
   - **Reject**: Return to creator with comments
   - **Request Changes**: Ask for modifications
   - **Add Comments**: Provide guidance or questions

#### Approval Best Practices

**Before Approving, Verify:**
- ✅ Project and work order are valid and active
- ✅ Budget is available for this purchase
- ✅ Vendor is appropriate for the work type
- ✅ Quantities and prices are reasonable
- ✅ Items align with project requirements
- ✅ GL account codes are correct

**When to Reject:**
- ❌ Budget insufficient or unavailable
- ❌ Vendor not approved for this work type
- ❌ Prices significantly above market rate
- ❌ Items don't match project needs
- ❌ Missing required documentation
- ❌ GL account codes incorrect

#### Quick Approval Process
1. **Open Pending Approvals:**
   - Click on pending approvals widget
   - Select PO to review

2. **Review PO Details:**
   - Check project and work order alignment
   - Verify vendor and pricing
   - Review line items carefully

3. **Make Decision:**
   - Click "Approve" with optional comments
   - Or "Reject" with required feedback
   - Add any notes for the next approver

4. **Confirmation:**
   - System sends notifications automatically
   - PO moves to next approval level
   - You receive confirmation email

### Handling Special Situations

#### Emergency Purchases
For urgent purchases requiring immediate approval:

1. **Contact Process:**
   - Call or text the approver directly
   - Mention "Emergency PO" in subject line
   - Provide brief justification

2. **System Process:**
   - Create PO normally
   - Add "URGENT" in special instructions
   - Include justification for emergency

3. **Approval Expectations:**
   - Emergency POs reviewed within 2 hours
   - May require additional documentation later
   - Follow-up approval workflow still required

#### Budget Overruns
When PO exceeds work order budget:

1. **System Warning:**
   - Red warning appears during PO creation
   - Shows budget remaining vs. PO amount
   - Requires additional justification

2. **Approval Process:**
   - Automatically escalates to Operations Manager
   - Requires detailed budget justification
   - May need project budget modification

3. **Resolution Options:**
   - Reduce PO amount to fit budget
   - Request budget increase from project manager
   - Split PO across multiple work orders
   - Escalate to management for approval

---

## Reports and Analytics

### Report Overview

The ASR PO System provides six comprehensive business intelligence reports designed for different stakeholder needs:

| Report | Purpose | Best For | Update Frequency |
|--------|---------|----------|------------------|
| **GL Analysis** | Financial categorization analysis | Accounting, budgeting | Real-time |
| **Vendor Analysis** | Vendor performance and spending | Procurement, management | Daily |
| **Budget vs Actual** | Project budget tracking | Project managers, executives | Real-time |
| **Approval Bottleneck** | Workflow efficiency analysis | Operations, management | Real-time |
| **PO Summary** | High-level PO statistics | All stakeholders | Real-time |
| **Project Details** | Project-specific spending | Project managers | Real-time |

### Accessing Reports

#### Navigation
1. **From Dashboard:** Click "Reports" tile
2. **From Menu:** Navigate to `Reports → Select Report Type`
3. **Quick Access:** Use report bookmarks for frequently used reports

#### Report Permissions
- **Division Leaders:** See own division reports + summary data
- **Operations Manager:** See all division reports
- **Accounting:** Full access to all financial reports
- **Majority Owner:** Complete access to all reports

### Report Details

#### 1. GL Analysis Report
**Purpose:** Understand spending patterns across GL account categories

**Key Metrics:**
- Total spending by GL account code
- OpEx vs CapEx breakdown
- Taxable vs non-taxable purchases
- Monthly trending analysis

**Use Cases:**
- Quarterly financial planning
- Tax preparation
- Budget category analysis
- Compliance reporting

**How to Read:**
- Top section shows summary totals
- Chart displays spending by category
- Table provides detailed breakdown
- Trend lines show monthly patterns

#### 2. Vendor Analysis Report
**Purpose:** Analyze vendor relationships and spending patterns

**Key Metrics:**
- Top vendors by spend amount
- Vendor performance ratings
- Payment terms analysis
- Geographic distribution

**Use Cases:**
- Vendor relationship management
- Negotiating better terms
- Identifying consolidation opportunities
- Performance evaluation

**How to Read:**
- Pie chart shows vendor spend distribution
- Table lists vendors with performance data
- Trend analysis shows spending patterns
- Payment terms summary

#### 3. Budget vs Actual Report
**Purpose:** Track project budget performance and variances

**Key Metrics:**
- Budget vs actual spending by project
- Variance analysis (over/under budget)
- Commitment tracking
- Forecast projections

**Use Cases:**
- Project cost control
- Budget variance analysis
- Forecasting future spend
- Project profitability analysis

**How to Read:**
- Green indicates under budget
- Red indicates over budget
- Yellow indicates approaching limit
- Percentage shows variance from budget

#### 4. Approval Bottleneck Analysis
**Purpose:** Identify delays and inefficiencies in approval workflow

**Key Metrics:**
- Average approval time by approver
- Approval success rates
- Bottleneck identification
- Workflow efficiency metrics

**Use Cases:**
- Process improvement
- Approver workload balancing
- Training needs identification
- Workflow optimization

**How to Read:**
- Bar charts show approval times
- Red highlights indicate bottlenecks
- Trend lines show improvement/degradation
- Tables provide detailed breakdown

#### 5. PO Summary Report
**Purpose:** High-level overview of purchase order activity

**Key Metrics:**
- Total POs created this period
- Average PO value
- Status distribution
- Division comparison

**Use Cases:**
- Executive dashboards
- Monthly reporting
- Activity monitoring
- Performance benchmarking

**How to Read:**
- Summary cards show key totals
- Status pie chart shows PO distribution
- Division comparison shows relative activity
- Timeline shows volume trends

#### 6. Project Details Report
**Purpose:** Deep dive into specific project spending

**Key Metrics:**
- Project spend by work order
- Vendor breakdown per project
- GL account usage
- Timeline analysis

**Use Cases:**
- Project cost analysis
- Work order tracking
- Vendor allocation
- Progress monitoring

**How to Read:**
- Project selector at top
- Spend breakdown by work order
- Vendor pie chart
- Timeline shows spending pattern

### Using Report Filters

#### Date Range Selection
- **Preset Ranges:** Last 30 days, Quarter, Year-to-date
- **Custom Range:** Select specific start and end dates
- **Rolling Periods:** Last 12 months, Last 6 months

#### Division Filtering
- **All Divisions:** Complete organizational view
- **Single Division:** Focus on specific division
- **Division Comparison:** Side-by-side analysis

#### Status Filtering
- **All Status:** Complete picture
- **Active Only:** Exclude completed/cancelled
- **Pending:** Focus on workflow items

#### Advanced Filters
- **GL Account:** Filter by expense category
- **Vendor:** Focus on specific vendors
- **Project:** Project-specific analysis
- **Amount Range:** Filter by PO value

### Exporting Reports

#### Export Options
- **PDF:** Professional format for sharing
- **Excel:** Data manipulation and analysis
- **CSV:** Raw data for custom analysis

#### Export Process
1. Configure report with desired filters
2. Click "Export" button
3. Select format (PDF/Excel/CSV)
4. Choose email delivery or direct download
5. Large reports sent via email link

#### Export Tips
- **PDF:** Best for presentations and sharing
- **Excel:** Includes charts and formatting
- **CSV:** Raw data only, fastest download
- **Email Delivery:** Automatic for reports >5MB

### Report Automation

#### Scheduled Reports
Set up automatic report delivery:

1. **Access Report Scheduling:**
   - Click "Schedule" on any report
   - Configure frequency and recipients

2. **Schedule Options:**
   - Daily, Weekly, Monthly, Quarterly
   - Custom day/time selection
   - Multiple recipient support

3. **Delivery Options:**
   - Email PDF attachment
   - Email with download link
   - Dashboard notification

#### Report Subscriptions
Subscribe to regular updates:
- Weekly vendor spending summary
- Monthly budget variance alerts
- Quarterly GL analysis
- Custom threshold alerts

---

## Mobile App Usage

### Progressive Web App (PWA)

The ASR PO System is built as a Progressive Web App, providing native app-like functionality through your mobile browser.

#### Installation on iOS (iPhone/iPad)
1. Open Safari and navigate to `https://asr-po.yourdomain.com`
2. Tap the Share button (square with arrow)
3. Select "Add to Home Screen"
4. Customize the name if desired
5. Tap "Add" to install

#### Installation on Android
1. Open Chrome and navigate to `https://asr-po.yourdomain.com`
2. Tap the three-dot menu
3. Select "Add to Home Screen" or "Install App"
4. Confirm installation
5. App appears on home screen

### Mobile Features

#### Full Functionality
The mobile app provides complete functionality:
- ✅ Create and submit purchase orders
- ✅ Approve pending POs
- ✅ View all reports and analytics
- ✅ Access audit trail and history
- ✅ Receive push notifications
- ✅ Work offline (limited functionality)

#### Optimized Mobile Interface
- **Touch-friendly:** Large buttons and touch targets
- **Responsive:** Adapts to all screen sizes
- **Fast Loading:** Optimized for mobile networks
- **Offline Capable:** Basic functionality without internet

### Mobile Workflows

#### Creating POs on Mobile
1. **Quick Create:**
   - Large "+" button on home screen
   - Streamlined form layout
   - Auto-complete for common entries

2. **Voice Input:**
   - Use voice-to-text for descriptions
   - Speak quantities and prices
   - Voice commands for navigation

3. **Camera Integration:**
   - Scan vendor business cards
   - Photograph quotes or estimates
   - Attach reference images

#### Mobile Approvals
1. **Push Notifications:**
   - Instant alerts for new POs
   - Tap notification to open approval
   - Biometric authentication support

2. **Quick Actions:**
   - Swipe gestures for approve/reject
   - Bulk approval mode
   - Voice comments support

3. **Offline Approvals:**
   - Review POs without connection
   - Queue decisions for sync
   - Automatic sync when connected

### Mobile Tips

#### Best Practices
- **Use landscape mode** for complex forms
- **Enable notifications** for timely alerts
- **Download for offline** access frequently used data
- **Use voice input** for longer descriptions
- **Bookmark reports** you check regularly

#### Troubleshooting Mobile Issues
- **Slow loading:** Clear browser cache
- **Login issues:** Update browser to latest version
- **Missing features:** Ensure JavaScript enabled
- **Sync problems:** Check internet connection
- **Display issues:** Try landscape/portrait toggle

---

## Role-Specific Features

### Division Leaders (CH, PW, WS, LS)

#### Your Primary Functions
- **PO Creation:** Submit purchase orders for your division
- **Team Oversight:** Monitor your team's PO activity
- **Budget Management:** Track spending against division budgets
- **Approval Authority:** Approve POs within your limits ($25,000)

#### Division Leader Dashboard
Your dashboard shows:
- **Division KPIs:** Spending, budget utilization, PO volume
- **Pending Team POs:** POs from your team awaiting approval
- **Budget Alerts:** Warnings for approaching limits
- **Recent Activity:** Your division's latest transactions

#### Division-Specific Reports
- **Division Budget Report:** Your division's spending vs budget
- **Team Activity Report:** PO activity by team member
- **Vendor Usage Report:** Which vendors your division uses most
- **Project Progress Report:** Spending by active projects

#### Advanced Division Leader Features
1. **Budget Override:** Request budget increases for projects
2. **Vendor Approval:** Recommend new vendors for approval
3. **Team Training:** Access training materials for your staff
4. **Custom Alerts:** Set up budget and spending notifications

### Operations Manager

#### Your Primary Functions
- **Cross-Division Oversight:** Monitor all division activity
- **High-Value Approvals:** Approve POs over division leader limits
- **Vendor Management:** Manage vendor relationships and performance
- **Process Optimization:** Identify and resolve workflow bottlenecks

#### Operations Manager Dashboard
Your dashboard shows:
- **Cross-Division KPIs:** Company-wide metrics
- **High-Value POs:** POs requiring your approval
- **Workflow Bottlenecks:** Delays in approval process
- **Vendor Performance:** Key vendor metrics and issues

#### Cross-Division Reports
- **Company Performance Report:** All divisions consolidated
- **Vendor Comparison Report:** Performance across divisions
- **Approval Efficiency Report:** Workflow optimization insights
- **Budget Variance Report:** Company-wide budget performance

#### Advanced Operations Features
1. **Vendor Negotiations:** Track pricing and terms
2. **Workflow Customization:** Adjust approval rules
3. **Performance Analytics:** Deep-dive analysis tools
4. **Integration Management:** QuickBooks sync oversight

### Accounting Team

#### Your Primary Functions
- **Financial Oversight:** Final approval before QuickBooks sync
- **GL Account Management:** Maintain chart of accounts
- **Compliance Monitoring:** Ensure proper categorization
- **Financial Reporting:** Generate reports for management

#### Accounting Dashboard
Your dashboard shows:
- **Financial KPIs:** Total spend, tax implications, GL distribution
- **Sync Status:** QuickBooks integration health
- **Compliance Alerts:** Items requiring attention
- **Monthly Closings:** Period-end processing status

#### Financial Reports
- **GL Account Analysis:** Spending by account code
- **Tax Summary Report:** Taxable vs non-taxable purchases
- **Vendor Payment Report:** Outstanding obligations
- **Audit Trail Report:** Complete transaction history

#### Advanced Accounting Features
1. **GL Mapping:** Configure account codes and rules
2. **Tax Management:** Set up tax rates and rules
3. **QuickBooks Sync:** Manual sync triggers and monitoring
4. **Compliance Tools:** Audit trail and documentation

### Majority Owner (Executive)

#### Your Primary Functions
- **Strategic Oversight:** Company-wide purchase order visibility
- **Performance Monitoring:** Division and overall performance
- **Executive Reporting:** High-level analytics and trends
- **Policy Setting:** Approval limits and business rules

#### Executive Dashboard
Your dashboard shows:
- **Executive KPIs:** Highest-level business metrics
- **Division Comparison:** Performance across all divisions
- **Trend Analysis:** Month-over-month and year-over-year trends
- **Strategic Insights:** Business intelligence summary

#### Executive Reports
- **Executive Summary:** Monthly business overview
- **Division Performance:** Comparative analysis
- **Strategic Vendor Report:** Key supplier relationships
- **Budget Performance:** Company-wide financial performance

#### Advanced Executive Features
1. **Policy Configuration:** Set approval limits and rules
2. **User Management:** Add/remove users and assign roles
3. **Strategic Analytics:** Long-term trend analysis
4. **System Administration:** High-level system settings

---

## Advanced Features

### Audit Trail and History

#### Understanding the Audit Trail
Every action in the system is tracked:
- **Who:** User identification and role
- **What:** Specific action taken
- **When:** Exact timestamp
- **Where:** IP address and location
- **Why:** Comments and justification

#### Accessing Audit Information
1. **PO Level:** Click "View History" on any PO
2. **User Level:** View "My Activity" in profile
3. **System Level:** Audit reports for managers
4. **Search:** Find specific actions or timeframes

#### Audit Trail Details
```
Example Audit Entry:
Date: 2024-01-12 14:30:25 PST
User: john.smith@asr.com (Division Leader - CH)
Action: PO_APPROVED
PO Number: 65-CH-1234-ACME-001
Amount: $1,250.00
IP Address: 192.168.1.100
Comments: "Approved - within budget and project scope"
```

### QuickBooks Integration

#### How Integration Works
1. **PO Creation:** System captures all financial data
2. **Approval Process:** Ensures proper authorization
3. **GL Assignment:** Maps to correct QuickBooks accounts
4. **Automatic Sync:** Transfers data to QuickBooks
5. **Verification:** Confirms successful transfer

#### What Syncs to QuickBooks
- **Purchase Orders:** Complete PO information
- **Vendor Data:** New vendors and updated information
- **GL Accounts:** Expense categorization
- **Project Tracking:** Job costing information

#### User Benefits
- **No Double Entry:** Data entered once, used everywhere
- **Accurate Books:** Reduces manual entry errors
- **Real-time Updates:** QuickBooks stays current
- **Compliance:** Proper audit trail maintained

#### Monitoring Integration Status
- **Sync Status Widget:** Dashboard shows last sync time
- **Error Notifications:** Alerts for sync issues
- **Manual Sync:** Force immediate sync if needed
- **Integration Health:** Monitor connection status

### Search and Filtering

#### Advanced Search Features
The system provides powerful search capabilities:

1. **Global Search:** Search across all POs, vendors, projects
2. **Smart Filters:** Combine multiple criteria
3. **Saved Searches:** Store frequently used searches
4. **Recent Items:** Quick access to recently viewed items

#### Search Syntax
```
Basic Search: "office supplies"
Vendor Search: vendor:ACME
Amount Range: amount:>1000
Date Range: date:2024-01-01..2024-01-31
Status Filter: status:PENDING
Division: division:CH
Combined: vendor:HOME DEPOT amount:>500 status:APPROVED
```

#### Common Search Examples
- Find all POs over $1,000: `amount:>1000`
- Find ACME vendor POs: `vendor:ACME`
- Find pending POs for Corporate Housing: `division:CH status:PENDING`
- Find POs from last month: `date:2024-12-01..2024-12-31`

### Notifications and Alerts

#### Email Notifications
Automatic email notifications for:
- **PO Submitted:** Confirmation when you submit a PO
- **PO Approved:** Updates when your PO is approved
- **PO Rejected:** Notification with feedback if rejected
- **Approval Needed:** When POs require your approval
- **Budget Alerts:** When approaching spending limits

#### Notification Preferences
Customize your notification settings:
1. **Access Settings:** Profile menu → Notification Preferences
2. **Choose Frequency:** Immediate, Daily Digest, Weekly Summary
3. **Select Types:** Choose which notifications you want
4. **Set Thresholds:** Budget alert levels and spending limits

#### Push Notifications (Mobile)
Enable push notifications on mobile for:
- Instant approval requests
- Status updates
- Budget alerts
- System maintenance notifications

### Data Export and Integration

#### Export Capabilities
- **Individual POs:** Export single PO as PDF
- **Bulk Export:** Export multiple POs to Excel/CSV
- **Report Export:** Download reports in multiple formats
- **Audit Trail Export:** Complete history downloads

#### Integration Options
- **QuickBooks:** Automatic financial integration
- **Excel:** Direct export for analysis
- **PDF:** Professional document sharing
- **CSV:** Raw data for custom systems

#### API Access (Advanced Users)
For custom integrations:
- **REST API:** Programmatic access to PO data
- **Webhooks:** Real-time notifications
- **Authentication:** Secure token-based access
- **Documentation:** Complete API reference available

---

## Frequently Asked Questions

### Getting Started

**Q: How do I get access to the system?**
A: Contact your IT administrator or email admin@yourdomain.com. You'll need an active ASR email address and your role will be assigned based on your position.

**Q: I forgot my password. How do I reset it?**
A: Click "Forgot Password" on the login page and enter your ASR email. You'll receive a reset link. If issues persist, contact IT support.

**Q: Why can't I see certain features?**
A: Features are role-based. Division leaders see division-specific features, while operations managers have broader access. Check with your supervisor if you need additional permissions.

### Creating Purchase Orders

**Q: How do I add a new vendor?**
A: During PO creation, click "Add New Vendor" and fill in the required information. The vendor will be available for future POs once approved.

**Q: What if I can't find my project code?**
A: Contact your project manager to confirm the project is set up in the system. Only active projects appear in the dropdown.

**Q: Can I modify a PO after submission?**
A: Once submitted, POs cannot be modified. If changes are needed, contact the current approver or create a new PO for additional items.

**Q: What's the difference between GL account codes?**
A: GL codes categorize expenses for QuickBooks. Use 55 for materials, 65 for equipment, 75 for services. When in doubt, ask accounting.

### Approval Process

**Q: How long do approvals typically take?**
A: Most POs are approved within 4-8 hours during business days. Emergency POs can be expedited by contacting approvers directly.

**Q: Who needs to approve my PO?**
A: Depends on the amount: Under $1,000 (Division Leader only), $1,000-$25,000 (Division Leader + Operations Manager), Over $25,000 (all levels).

**Q: What happens if my PO is rejected?**
A: You'll receive an email with feedback. Review the comments, make necessary changes, and resubmit as a new PO.

### Reports and Data

**Q: Why don't I see all divisions in reports?**
A: Report access is role-based. Division leaders see their division, while operations managers see all divisions. This ensures proper data security.

**Q: How current is the data in reports?**
A: Most reports are real-time. Some cached data may be up to 15 minutes old during high-usage periods.

**Q: Can I schedule reports to be emailed automatically?**
A: Yes! Click "Schedule" on any report to set up automatic delivery daily, weekly, or monthly.

### Mobile Usage

**Q: Do I need to download an app?**
A: No separate app needed. The system works as a Progressive Web App. Just add the website to your home screen.

**Q: Can I approve POs while offline?**
A: You can review POs offline, but approvals require an internet connection to process.

**Q: Why are notifications not working on my phone?**
A: Ensure you've allowed notifications in your browser settings and that the website is added to your home screen.

### Technical Issues

**Q: The system is running slowly. What should I do?**
A: Try clearing your browser cache or switching to Chrome. If issues persist, contact IT support with details about your browser and connection.

**Q: I'm getting an error when submitting a PO. What's wrong?**
A: Check for required fields (marked with red asterisks) and ensure all amounts are valid numbers. Contact support if the error persists.

**Q: How do I report a system bug?**
A: Email dev-team@yourdomain.com with details about what you were doing when the issue occurred, including screenshots if possible.

### QuickBooks Integration

**Q: When do my POs appear in QuickBooks?**
A: Approved POs sync to QuickBooks automatically, typically within 1-2 hours. You can check sync status on the dashboard.

**Q: What if QuickBooks sync fails?**
A: The accounting team is automatically notified of sync issues. Your PO is safe and will be retried automatically.

### Security and Access

**Q: Is my data secure in the system?**
A: Yes, the system uses enterprise-grade security with encryption, audit trails, and role-based access controls. All actions are logged.

**Q: Can I see who viewed or modified my POs?**
A: Yes, click "View History" on any PO to see the complete audit trail of all actions and views.

### Getting Help

**Q: Who do I contact for training?**
A: Your division leader can provide initial training. For advanced features, contact training@yourdomain.com.

**Q: Where can I find video tutorials?**
A: Video tutorials are available in the Help section of the system. Additional training materials are on the ASR intranet.

**Q: How do I suggest new features?**
A: Submit feature requests to dev-team@yourdomain.com. Include details about your use case and how it would benefit your work.

---

**Need More Help?**

📧 **Email Support:** support@yourdomain.com
📞 **Phone Support:** +1-XXX-XXX-XXXX
💬 **Slack Channel:** #asr-po-support
🌐 **Documentation:** https://asr-po.yourdomain.com/help

---

**End of User Guide**

*This guide covers the essential functions of the ASR Purchase Order System. For advanced features or custom requirements, consult with your system administrator or the development team.*