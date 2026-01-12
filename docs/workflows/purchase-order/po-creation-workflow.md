# Purchase Order Creation Workflow

## Overview
This workflow guides Division Leaders and Operations Managers through the complete process of creating a new Purchase Order in the ASR Purchase Order System.

**Duration**: 5-10 minutes
**SLA**: PO submission within 1 business day of need identification
**Frequency**: Daily (average 15-30 POs per day across all divisions)

## Prerequisites

### Required Access
- ✅ Active user account with role: `DIVISION_LEADER` or `OPERATIONS_MANAGER`
- ✅ Access to ASR Purchase Order System
- ✅ Permission to create POs for your division

### Required Information
- ✅ Vendor information (name, contact details)
- ✅ Project or work order association
- ✅ Detailed description of goods/services
- ✅ Accurate quantities and specifications
- ✅ Expected delivery date
- ✅ Business justification
- ✅ Budget approval confirmation

### Optional Preparations
- 📄 Vendor quotes or proposals
- 📄 Technical specifications
- 📄 Approval email chains
- 📄 Supporting documentation

## Step-by-Step Procedure

### Phase 1: Access and Navigation
◀ **Start Workflow**

**Step 1**: Access the ASR Purchase Order System
- Navigate to: `https://po.asr.com` (production) or configured URL
- Log in with your corporate credentials
- Wait for dashboard to load completely

**Step 2**: Navigate to PO Creation
- Click **"Create New PO"** button on dashboard
- OR use top navigation: **Purchase Orders** → **Create New**
- Verify you see the PO creation form

ℹ **Information**: Creation form adapts based on your role and division permissions

---

### Phase 2: Basic Information Entry

**Step 3**: Enter Basic PO Details
- **PO Number**: Auto-generated (starts with your division code)
- **Date Needed**: Select required delivery date (minimum 3 business days)
- **Priority**: Select from dropdown (Normal, High, Emergency)
- **Division**: Automatically set to your division

⚠ **Caution**: Emergency priority requires additional justification in notes

**Step 4**: Select or Create Vendor
- **Option A - Existing Vendor**:
  - Type vendor name in search box
  - Select from dropdown suggestions
  - Verify contact information is current
- **Option B - New Vendor**:
  - Click **"Add New Vendor"** link
  - Complete vendor information form
  - Save vendor before proceeding

📋 **Validation**: Vendor contact information must include valid email and phone

---

### Phase 3: Project and Classification

**Step 5**: Associate with Project/Work Order
- **Required**: Select project from dropdown
- **If no project**: Click **"Create Quick Project"**
  - Enter project name and description
  - Select project type (Internal, Client, Maintenance)
  - Save project

**Step 6**: Classify Purchase
- **Category**: Select from predefined categories
  - Materials (construction supplies, tools)
  - Services (labor, consulting, maintenance)
  - Equipment (machinery, vehicles, technology)
  - Other (specify in description)
- **GL Account**: Auto-populated based on category
- **Cost Center**: Auto-set to your division

ℹ **Information**: GL Account mapping can be overridden by Accounting if needed

---

### Phase 4: Line Items and Pricing

**Step 7**: Add Line Items
- Click **"Add Line Item"** button
- For each item, enter:
  - **Description**: Detailed description of item/service
  - **Quantity**: Numeric quantity needed
  - **Unit**: Unit of measurement (each, hours, feet, etc.)
  - **Unit Price**: Price per unit (estimate if quote not available)
  - **Total**: Calculated automatically

**Step 8**: Review Pricing
- **Subtotal**: Automatically calculated
- **Tax**: Enter if known, or check "Calculate Tax"
- **Shipping**: Enter shipping costs if applicable
- **Total Amount**: Final calculated total

📋 **Validation Checkpoint**:
- ✅ All line items have descriptions and quantities
- ✅ Pricing is reasonable and justified
- ✅ Total amount is within expected range

---

### Phase 5: Approval and Submission Preparation

**Step 9**: Add Justification and Notes
- **Business Justification**:
  - Explain why this purchase is necessary
  - Reference project requirements or operational needs
  - Include any supporting rationale
- **Special Instructions**:
  - Delivery instructions
  - Quality requirements
  - Vendor-specific notes
- **Internal Notes**: For approval chain (optional)

**Step 10**: Review Approval Requirements
The system displays approval requirements based on amount:
- **Under $500**: Auto-approved if within budget
- **$500-$5,000**: Division Operations Manager approval required
- **$5,000-$25,000**: Division Leader + Operations Manager approval
- **Over $25,000**: Executive approval required

◆ **Decision Point**:
- **Amount within your approval limit**: Proceed to Step 11
- **Amount exceeds your limit**: Ensure justification is comprehensive

---

### Phase 6: Final Review and Submission

**Step 11**: Complete Final Review
Use the **Preview** function to review:
- ✅ All vendor information is accurate
- ✅ Project association is correct
- ✅ Line items are complete and priced appropriately
- ✅ Delivery date is realistic
- ✅ Justification clearly explains necessity
- ✅ Total amount is correct

**Step 12**: Submit Purchase Order
- Click **"Submit for Approval"** button
- Confirm submission in popup dialog
- Note the PO number assigned (format: DIV-YYYY-####)

**Step 13**: Confirm Submission Success
- Look for green confirmation message
- Verify PO appears in your **"Pending Approval"** list
- Check that automated email notification was sent

▶ **End of Creation Workflow**

---

## Post-Submission Activities

### Immediate Actions (Within 1 hour)
- **Email Notification**: Sent to approvers automatically
- **Dashboard Update**: PO visible in "Pending Approval" status
- **Vendor Notification**: Optional, can be enabled in settings

### Tracking and Follow-up
- **Check Status**: Monitor approval progress in dashboard
- **Respond to Questions**: Approvers may request clarification
- **Modify if Needed**: Use "Edit Pending PO" if changes required

### Expected Timeline
- **Under $500**: Immediate processing
- **$500-$5,000**: 1-2 business days
- **$5,000-$25,000**: 2-3 business days
- **Over $25,000**: 3-5 business days

---

## Validation Checklist

Before submitting any Purchase Order:

### Required Information ✅
- [ ] Vendor selected and contact information verified
- [ ] Project/work order association completed
- [ ] All line items include description, quantity, and pricing
- [ ] Business justification clearly explains necessity
- [ ] Delivery date is realistic (minimum 3 business days)
- [ ] Total amount is accurate and reasonable

### Optional but Recommended ✅
- [ ] Supporting documentation attached
- [ ] Vendor quotes or proposals referenced
- [ ] Special delivery instructions included
- [ ] Internal notes for approvers added
- [ ] Quality or specification requirements noted

### System Validations ✅
- [ ] No validation errors displayed on form
- [ ] All required fields completed (marked with *)
- [ ] GL Account mapping appropriate for expense type
- [ ] Approval chain correctly identified by system

---

## Common Issues and Resolutions

### Issue: Vendor Not in System
**Symptoms**: Cannot find vendor in search results
**Resolution**:
1. Click "Add New Vendor" link
2. Complete all required vendor fields
3. Save vendor before returning to PO creation
4. Contact vendor to verify information accuracy

### Issue: Project Not Available
**Symptoms**: Required project not in dropdown list
**Resolution**:
1. Use "Create Quick Project" option
2. Provide sufficient project details
3. If complex project, contact Project Manager for proper setup
4. Use "General Operations" project as temporary solution

### Issue: GL Account Error
**Symptoms**: GL Account validation fails
**Resolution**:
1. Verify expense category selection is appropriate
2. Contact Accounting team for GL account clarification
3. Use "Other" category with detailed description
4. Include note for Accounting to review account assignment

### Issue: Amount Exceeds Budget
**Symptoms**: Budget validation warning appears
**Resolution**:
1. Verify project budget availability
2. Consider splitting PO across multiple budget periods
3. Contact Division Leader for budget reallocation
4. Include detailed justification for budget variance

### Issue: Form Won't Submit
**Symptoms**: Submit button disabled or error messages
**Resolution**:
1. Review all fields for validation errors (red highlights)
2. Ensure all required fields are completed
3. Check internet connection stability
4. Try refreshing browser and re-entering data
5. Contact IT support if problem persists

---

## Related Workflows

- **[PO Approval Workflow](po-approval-workflow.md)**: Next step after submission
- **[PO Modification Workflow](po-modification-workflow.md)**: Making changes to pending POs
- **[Emergency PO Workflow](emergency-po-workflow.md)**: Expedited processing procedures
- **[Vendor Management Workflow](../administration/vendor-management-workflow.md)**: Adding and updating vendors

---

## Training and Certification

### Required Training
- **New User Orientation**: 2-hour session covering basic PO creation
- **System Navigation**: 1-hour hands-on practice session
- **Role-Specific Training**: Additional training based on approval limits

### Certification Requirements
- Complete practice PO creation (3 successful submissions)
- Pass knowledge assessment (85% minimum score)
- Demonstrate vendor creation and project association
- Complete emergency procedures training

### Ongoing Education
- **Monthly**: Review new system features
- **Quarterly**: Participate in process improvement sessions
- **Annually**: Complete compliance and security training

---

## Support and Contact

### Immediate Assistance
- **System Help**: Click "?" icon in PO creation form
- **Process Questions**: Contact your Division Operations Manager
- **Technical Issues**: IT Support at {{IT_SUPPORT_EMAIL}} or {{IT_SUPPORT_PHONE}}

### Training and Development
- **Process Training**: {{TRAINING_COORDINATOR_EMAIL}}
- **System Training**: {{SYSTEM_TRAINING_EMAIL}}

### Process Improvement
- **Suggestions**: {{PROCESS_IMPROVEMENT_EMAIL}}
- **Feedback**: Monthly workflow review sessions

---

## Change History

| Version | Date | Changes | Author |
|---------|------|---------|---------|
| 1.0 | 2024-01-12 | Initial workflow documentation | System Documentation Team |

---

*This workflow is part of the ASR Purchase Order System documentation suite. For additional procedures and troubleshooting, reference the complete documentation at `/docs/`.*