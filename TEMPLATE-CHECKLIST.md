# Template Configuration Checklist

Use this checklist when setting up a new client instance from the white-label template.

## Pre-Deployment Checklist

### 1. Project Setup

- [ ] Created new Manus project from template
- [ ] Project named: `[client-name]-crm`
- [ ] Repository cloned/imported successfully

### 2. Integration Removal (if needed)

- [ ] Reviewed client requirements for integrations
- [ ] Removed Amplemarket (if not needed)
  - [ ] Deleted server files
  - [ ] Updated database schema
  - [ ] Removed from routers
  - [ ] Removed from navigation
  - [ ] Removed from routes
- [ ] Removed Hunter.io (if not needed)
  - [ ] Deleted server files
  - [ ] Removed from routers
  - [ ] Removed from UI
- [ ] Removed Google Maps (if not needed)
- [ ] Removed AI features (if not needed)
- [ ] Verified no TypeScript errors
- [ ] Tested application runs

### 3. Branding Configuration

- [ ] **App Title**
  - [ ] Updated `VITE_APP_TITLE` environment variable
  - [ ] Value: `[Client Company Name] CRM`
  - [ ] Verified in browser tab title
  - [ ] Verified in dashboard header

- [ ] **Logo**
  - [ ] Received client logo file
  - [ ] Logo uploaded to S3 or public URL
  - [ ] Updated `VITE_APP_LOGO` environment variable
  - [ ] Logo URL: `___________________________`
  - [ ] Verified logo displays in header
  - [ ] Verified logo displays on login page

- [ ] **Favicon**
  - [ ] Generated favicon from client logo
  - [ ] Replaced `client/public/favicon.ico`
  - [ ] Verified favicon in browser tab

- [ ] **Color Scheme**
  - [ ] Received client brand colors
  - [ ] Primary color (hex): `_______________`
  - [ ] Accent color (hex): `_______________`
  - [ ] Converted colors to HSL
  - [ ] Updated `client/src/index.css` CSS variables
  - [ ] Verified colors in UI (buttons, links, etc.)

- [ ] **Fonts (optional)**
  - [ ] Client requested custom font: Yes / No
  - [ ] Font name: `_______________`
  - [ ] Added Google Font link in `client/index.html`
  - [ ] Updated CSS variables in `client/src/index.css`
  - [ ] Verified font displays correctly

### 4. Domain Configuration

- [ ] **Custom Domain**
  - [ ] Client provided domain: `___________________________`
  - [ ] Added domain in Manus Settings → Domains
  - [ ] Received DNS configuration instructions
  - [ ] Sent DNS instructions to client
  - [ ] Client configured DNS (CNAME record)
  - [ ] SSL certificate provisioned
  - [ ] Domain accessible and secure (HTTPS)

- [ ] **Subdomain (if using Manus subdomain)**
  - [ ] Configured subdomain prefix: `_______________`
  - [ ] Subdomain URL: `_______________.manus.space`
  - [ ] Verified subdomain accessible

### 5. Database Configuration

- [ ] **Schema Review**
  - [ ] Reviewed default schema
  - [ ] Client requires custom fields: Yes / No
  - [ ] Custom fields added to schema (if needed)
  - [ ] Generated migrations
  - [ ] Applied migrations via `webdev_execute_sql`

- [ ] **Initial Data**
  - [ ] Client has existing data to import: Yes / No
  - [ ] Data import method: Manual / CSV / API / Migration Script
  - [ ] Data imported successfully (if applicable)
  - [ ] Data verified in UI

### 6. Feature Configuration

- [ ] **Core Features**
  - [ ] Contacts management enabled
  - [ ] Deals pipeline enabled
  - [ ] Calendar/events enabled
  - [ ] Notes system enabled
  - [ ] Email tracking enabled (if needed)

- [ ] **Optional Features**
  - [ ] Amplemarket integration configured (if kept)
    - [ ] API key added
    - [ ] User account selected
    - [ ] Lists/sequences configured
  - [ ] Hunter.io integration configured (if kept)
    - [ ] API key added
  - [ ] Google Maps enabled (if kept)
  - [ ] AI features enabled (if kept)

- [ ] **Custom Features**
  - [ ] Custom fields added: `_______________`
  - [ ] Custom pipeline stages added: `_______________`
  - [ ] Custom reports added: `_______________`
  - [ ] Other customizations: `_______________`

### 7. User Management

- [ ] **Owner Setup**
  - [ ] Client owner email: `___________________________`
  - [ ] Owner signed in and verified as admin
  - [ ] Owner profile complete

- [ ] **Additional Users**
  - [ ] Additional users to add: `_______________`
  - [ ] User invitations sent (if applicable)
  - [ ] User roles assigned

- [ ] **Permissions**
  - [ ] Reviewed role-based access requirements
  - [ ] Custom roles added (if needed)
  - [ ] Permissions tested

### 8. Email Configuration

- [ ] **SMTP Settings**
  - [ ] SMTP configured (uses Manus built-in by default)
  - [ ] Test email sent successfully
  - [ ] Email templates reviewed
  - [ ] Client branding in email templates

- [ ] **Email Tracking**
  - [ ] Email tracking enabled (if needed)
  - [ ] Email sync configured (if applicable)

### 9. Integrations & APIs

- [ ] **Third-Party Integrations**
  - [ ] Amplemarket: Configured / Not Needed
  - [ ] Hunter.io: Configured / Not Needed
  - [ ] Google Calendar: Configured / Not Needed
  - [ ] Other: `_______________`

- [ ] **API Keys**
  - [ ] All required API keys added to Secrets
  - [ ] API keys tested and working
  - [ ] API keys documented for client

### 10. Testing

- [ ] **Functionality Testing**
  - [ ] Create contact
  - [ ] Edit contact
  - [ ] Delete contact
  - [ ] Create deal
  - [ ] Move deal through pipeline
  - [ ] Add note to contact
  - [ ] Create calendar event
  - [ ] Send email (if enabled)
  - [ ] Test integrations (if configured)

- [ ] **UI/UX Testing**
  - [ ] Branding displays correctly
  - [ ] Colors applied throughout
  - [ ] Logo visible in all locations
  - [ ] Navigation works
  - [ ] All pages load without errors
  - [ ] Mobile responsive
  - [ ] No console errors

- [ ] **Performance Testing**
  - [ ] Page load times acceptable
  - [ ] Database queries performant
  - [ ] No memory leaks

### 11. Security & Compliance

- [ ] **Authentication**
  - [ ] OAuth working correctly
  - [ ] User roles enforced
  - [ ] Unauthorized access blocked

- [ ] **Data Security**
  - [ ] Tenant isolation verified
  - [ ] Data scoping by tenantId working
  - [ ] No data leakage between tenants

- [ ] **Compliance (if applicable)**
  - [ ] GDPR compliance reviewed
  - [ ] Data retention policies configured
  - [ ] Privacy policy added (if needed)

### 12. Documentation

- [ ] **Client Documentation**
  - [ ] User guide prepared
  - [ ] Admin guide prepared
  - [ ] FAQ document created
  - [ ] Support contact information provided

- [ ] **Internal Documentation**
  - [ ] Client-specific customizations documented
  - [ ] Configuration details recorded
  - [ ] Deployment notes saved

### 13. Deployment

- [ ] **Pre-Deployment**
  - [ ] All tests passed
  - [ ] Client approval received
  - [ ] Backup plan in place

- [ ] **Deployment**
  - [ ] Saved checkpoint in Manus
  - [ ] Checkpoint description: `_______________`
  - [ ] Published to production
  - [ ] Production URL verified: `___________________________`

- [ ] **Post-Deployment**
  - [ ] Production smoke test completed
  - [ ] Client notified of deployment
  - [ ] Client login verified
  - [ ] Monitoring enabled

### 14. Client Handoff

- [ ] **Deliverables**
  - [ ] CRM URL provided
  - [ ] Admin credentials provided
  - [ ] User guide provided
  - [ ] Support contact provided
  - [ ] Training scheduled (if applicable)

- [ ] **Training**
  - [ ] Admin training completed
  - [ ] User training completed
  - [ ] Q&A session held

- [ ] **Support**
  - [ ] Support channel established
  - [ ] SLA defined (if applicable)
  - [ ] Escalation process documented

### 15. Post-Launch

- [ ] **Monitoring**
  - [ ] Usage metrics reviewed
  - [ ] Error logs checked
  - [ ] Performance monitored

- [ ] **Feedback**
  - [ ] Client feedback collected
  - [ ] Issues logged and prioritized
  - [ ] Feature requests documented

- [ ] **Maintenance**
  - [ ] Update schedule established
  - [ ] Backup schedule configured
  - [ ] Security patches planned

---

## Quick Reference

### Environment Variables Checklist

```bash
# Required
VITE_APP_TITLE="[Client Company Name] CRM"
VITE_APP_LOGO="https://cdn.client.com/logo.png"

# Optional (if using custom SMTP)
SMTP_HOST="smtp.client.com"
SMTP_PORT="587"
SMTP_USER="crm@client.com"
SMTP_PASS="***"

# Integration API Keys (if needed)
AMPLEMARKET_API_KEY="***"
HUNTER_API_KEY="***"
```

### File Modification Checklist

```bash
# Branding
✓ client/src/index.css (colors)
✓ client/public/favicon.ico (favicon)
✓ client/index.html (fonts, if custom)

# Schema (if custom fields)
✓ drizzle/schema.ts

# Integrations (if removing)
✓ server/routers.ts
✓ client/src/components/DashboardLayout.tsx
✓ client/src/App.tsx
```

### Testing URLs

```bash
# Local development
http://localhost:3000

# Manus staging
https://3000-[project-id].us1.manus.computer

# Production
https://crm.clientdomain.com
```

---

## Notes

**Client Name:** `___________________________`  
**Project ID:** `___________________________`  
**Deployment Date:** `___________________________`  
**Deployed By:** `___________________________`  
**Client Contact:** `___________________________`  
**Client Email:** `___________________________`  

**Special Requirements:**
```
___________________________________________________________________________
___________________________________________________________________________
___________________________________________________________________________
```

**Known Issues:**
```
___________________________________________________________________________
___________________________________________________________________________
___________________________________________________________________________
```

**Next Steps:**
```
___________________________________________________________________________
___________________________________________________________________________
___________________________________________________________________________
```

---

## Sign-Off

- [ ] Technical lead approval: `_______________` Date: `_______________`
- [ ] Client approval: `_______________` Date: `_______________`
- [ ] Deployment completed: `_______________` Date: `_______________`

---

**Template Version:** 1.0  
**Last Updated:** 2026-02-08
