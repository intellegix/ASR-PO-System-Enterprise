# Screenshots Directory

This directory contains annotated screenshots for the ASR Purchase Order System documentation. Screenshots are organized by documentation section and functionality.

## Directory Structure

```
screenshots/
├── README.md (this file)
├── dashboard/
│   ├── dashboard-overview.png
│   ├── role-based-views/
│   │   ├── division-leader-dashboard.png
│   │   ├── executive-dashboard.png
│   │   ├── operations-manager-dashboard.png
│   │   └── accounting-dashboard.png
│   └── mobile-dashboard.png
├── purchase-orders/
│   ├── po-creation-form.png
│   ├── po-approval-workflow.png
│   ├── po-status-tracking.png
│   └── po-quickbooks-sync.png
├── reports/
│   ├── gl-analysis-report.png
│   ├── vendor-analysis-report.png
│   ├── budget-vs-actual-report.png
│   ├── approval-bottleneck-report.png
│   ├── po-summary-report.png
│   ├── project-details-report.png
│   └── export-options.png
├── administration/
│   ├── user-management.png
│   ├── division-setup.png
│   ├── vendor-management.png
│   ├── gl-account-mapping.png
│   └── role-permissions.png
├── mobile/
│   ├── pwa-installation.png
│   ├── mobile-navigation.png
│   ├── mobile-po-creation.png
│   └── offline-capabilities.png
├── quickbooks/
│   ├── oauth-setup.png
│   ├── sync-status.png
│   ├── error-handling.png
│   └── data-mapping.png
└── troubleshooting/
    ├── error-messages/
    ├── diagnostic-screens/
    └── recovery-procedures/
```

## Screenshot Standards

### Annotation Guidelines
- Use red arrows to highlight important UI elements
- Include callout boxes with numbered steps for complex procedures
- Highlight form fields with colored borders
- Use consistent color scheme: Red for actions, Blue for information, Green for success states

### Image Specifications
- **Format**: PNG for UI screenshots, JPG for photos
- **Resolution**: Minimum 1920x1080 for desktop, 375x812 for mobile
- **Compression**: Balance quality vs file size (target <500KB per image)
- **Naming**: Use kebab-case with descriptive names

### Capture Best Practices
- Capture complete browser window including URL bar for context
- Include realistic data (not Lorem Ipsum)
- Show different states: empty, filled, error, success
- Capture both light and dark mode where applicable

## Taking Screenshots

### Desktop Browser
1. Use full-screen browser window (F11)
2. Set zoom to 100%
3. Clear browser cache for consistent rendering
4. Use incognito/private mode to avoid extensions

### Mobile Views
1. Use browser developer tools mobile emulation
2. Standard test devices: iPhone 12/13, Galaxy S21, iPad
3. Test both portrait and landscape orientations

### Tools Recommended
- **Windows**: Snipping Tool, ShareX, Greenshot
- **Mac**: Screenshot Utility (Cmd+Shift+4), CleanShot X
- **Browser**: DevTools screenshot feature
- **Annotation**: draw.io, Snagit, Canva

## Integration with Documentation

Screenshots are referenced in documentation using relative paths:

```markdown
![Dashboard Overview](../screenshots/dashboard/dashboard-overview.png)
*Figure 1: Executive Dashboard showing cross-divisional PO summary*
```

### Documentation Cross-References
- **USER-GUIDE.md**: References all user interface screenshots
- **ADMIN-GUIDE.md**: Uses administration and setup screenshots
- **TROUBLESHOOTING-GUIDE.md**: Includes error state and diagnostic screenshots
- **OPERATIONS.md**: Contains monitoring and system health screenshots

## Security Considerations

### Data Privacy
- **Remove/redact** all sensitive information before capturing
- Use dummy data for demonstrations
- Avoid showing real vendor names, amounts, or employee information
- Blur or mask any PII (Personally Identifiable Information)

### Screenshot Sanitization Checklist
- [ ] No real employee names
- [ ] No actual vendor information
- [ ] No real financial amounts
- [ ] No sensitive GL account details
- [ ] No production URLs or IP addresses
- [ ] No authentication tokens or session IDs

## Maintenance Schedule

- **Monthly**: Review screenshots for UI changes after deployments
- **Quarterly**: Update mobile screenshots for new device standards
- **Annually**: Refresh all screenshots with current branding/UI

## Contributing Screenshots

### For ASR Staff
1. Contact system administrator for screenshot requests
2. Provide clear description of needed screenshots
3. Specify annotation requirements
4. Include target documentation section

### For Developers
1. Use development/staging environment only
2. Follow naming conventions in this README
3. Include alt-text descriptions for accessibility
4. Update relevant documentation references

---

*This screenshot library supports enterprise-grade documentation for the ASR Purchase Order System. All images should maintain professional quality and consistent branding.*