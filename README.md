# 1twenty CRM White Label Template

A production-ready, white-label CRM template built with React 19, tRPC, and Tailwind CSS. Deploy customized CRM instances for multiple clients with ease.

## Overview

This template provides a complete CRM system with:

- **Contacts & Accounts Management** - Full CRUD operations with custom fields
- **Deals Pipeline** - Drag-and-drop sales pipeline with customizable stages
- **Calendar & Events** - Event scheduling with reminders
- **Notes System** - Universal notes across all entities
- **Email Tracking** - Activity timeline and AI-powered email assistant
- **User Management** - OAuth authentication with role-based access
- **Integrations** - Amplemarket, Hunter.io, Google Maps (optional, can be removed)
- **AI Features** - Built-in LLM integration for chat and content generation

## Quick Start

### For New Client Deployments

1. **Clone or import this repository** into a new Manus project
2. **Follow the [Client Onboarding Guide](CLIENT-ONBOARDING.md)** for step-by-step setup
3. **Customize branding** using the [Customization Guide](CUSTOMIZATION-GUIDE.md)
4. **Remove unwanted integrations** using the [Integration Removal Guide](INTEGRATION-REMOVAL.md)
5. **Use the [Template Checklist](TEMPLATE-CHECKLIST.md)** to ensure nothing is missed

### Prerequisites

- Manus account with web development access
- Node.js 22+ (provided in Manus sandbox)
- pnpm (provided in Manus sandbox)

## Documentation

| Document | Purpose |
|----------|---------|
| [CLIENT-ONBOARDING.md](CLIENT-ONBOARDING.md) | Complete guide for setting up new client instances |
| [CUSTOMIZATION-GUIDE.md](CUSTOMIZATION-GUIDE.md) | Detailed customization options (branding, features, schema) |
| [INTEGRATION-REMOVAL.md](INTEGRATION-REMOVAL.md) | Step-by-step integration removal instructions |
| [TEMPLATE-CHECKLIST.md](TEMPLATE-CHECKLIST.md) | Comprehensive checklist for client deployments |

## Features

### Core CRM Features

**Contacts Management**
- Create, edit, delete contacts
- Custom fields support
- Import/export capabilities
- Activity timeline
- Notes and attachments

**Deals Pipeline**
- Visual drag-and-drop pipeline
- Customizable stages
- Deal value tracking
- Win/loss analysis
- Probability scoring

**Calendar & Events**
- Event scheduling
- Reminders and notifications
- Google Calendar sync (optional)
- Recurring events

**Notes System**
- Universal notes across contacts, accounts, and deals
- Automatic timestamping
- Author attribution
- Rich text support

**Email Tracking**
- Email activity timeline
- AI-powered email assistant
- Email templates
- Send tracking

**User Management**
- OAuth authentication (Manus built-in)
- Role-based access control (admin/user)
- User profiles
- Activity tracking

### Optional Integrations

**Amplemarket** (can be removed)
- Lead sync from lists
- Mailbox-based filtering
- Sequence tracking
- Activity sync

**Hunter.io** (can be removed)
- Email enrichment
- Email finder
- Domain search

**Google Maps** (can be removed)
- Location mapping
- Geocoding
- Directions

**AI Features** (can be removed)
- AI chat assistant
- Email generation
- Content suggestions

## Technology Stack

**Frontend:**
- React 19
- Tailwind CSS 4
- Wouter (routing)
- shadcn/ui components
- tRPC client

**Backend:**
- Express 4
- tRPC 11
- Drizzle ORM
- SQLite/TiDB database

**Infrastructure:**
- Manus hosting platform
- Built-in OAuth
- Built-in LLM integration
- Built-in S3 storage
- Built-in SMTP

## Customization

### Branding

**App Title & Logo:**
```bash
# Environment variables
VITE_APP_TITLE="Client Company CRM"
VITE_APP_LOGO="https://cdn.client.com/logo.png"
```

**Color Scheme:**
Edit `client/src/index.css`:
```css
:root {
  --primary: 142.1 76.2% 36.3%;  /* Brand color in HSL */
  --accent: 142.1 70% 45.3%;     /* Accent color */
}
```

**Favicon:**
Replace `client/public/favicon.ico`

See [CUSTOMIZATION-GUIDE.md](CUSTOMIZATION-GUIDE.md) for complete details.

### Database Schema

Add custom fields to `drizzle/schema.ts`:

```typescript
export const people = sqliteTable('people', {
  // ... existing fields ...
  industry: text('industry'),
  companySize: text('company_size'),
});
```

Generate and apply migrations:
```bash
pnpm drizzle-kit generate
# Apply via webdev_execute_sql in Manus
```

### Custom Features

Add custom reports, workflows, or integrations by:

1. Creating new tRPC procedures in `server/routers.ts`
2. Adding UI pages in `client/src/pages/`
3. Registering routes in `client/src/App.tsx`

See [CUSTOMIZATION-GUIDE.md](CUSTOMIZATION-GUIDE.md) for examples.

## Deployment

### Via Manus Platform

1. **Import project** from this GitHub repository
2. **Customize** branding and features
3. **Configure domain** in Manus Settings → Domains
4. **Save checkpoint** to create deployment snapshot
5. **Click Publish** to deploy to production

### Custom Domain Setup

1. Add domain in Manus dashboard
2. Configure DNS CNAME record:
   ```
   Type: CNAME
   Name: crm
   Value: [provided by Manus]
   ```
3. Wait for SSL provisioning (automatic)

## Maintenance

### Updating Client Instances

When you update the template:

```bash
# In client project
git remote add template https://github.com/MouMou78/1twenty-crm-white-label-template.git
git fetch template
git merge template/main
```

### Client-Specific Customizations

- Use feature branches: `client/[name]/[feature]`
- Document in `CLIENT-CUSTOMIZATIONS.md`
- Keep separate from template updates

## Project Structure

```
.
├── client/                  # Frontend React application
│   ├── public/             # Static assets
│   ├── src/
│   │   ├── components/     # Reusable UI components
│   │   ├── pages/          # Page components
│   │   ├── lib/            # Utilities and tRPC client
│   │   ├── App.tsx         # Routes and layout
│   │   └── index.css       # Global styles
├── server/                  # Backend Express + tRPC
│   ├── _core/              # Framework core (OAuth, LLM, etc.)
│   ├── routers.ts          # tRPC procedures
│   ├── db.ts               # Database helpers
│   └── *.ts                # Integration clients
├── drizzle/                 # Database schema and migrations
│   └── schema.ts           # Table definitions
├── CLIENT-ONBOARDING.md     # Setup guide
├── CUSTOMIZATION-GUIDE.md   # Customization reference
├── INTEGRATION-REMOVAL.md   # Integration removal steps
└── TEMPLATE-CHECKLIST.md    # Deployment checklist
```

## Support

### Documentation

- [Client Onboarding Guide](CLIENT-ONBOARDING.md)
- [Customization Guide](CUSTOMIZATION-GUIDE.md)
- [Integration Removal Guide](INTEGRATION-REMOVAL.md)
- [Template Checklist](TEMPLATE-CHECKLIST.md)

### Issues & Questions

- GitHub Issues: https://github.com/MouMou78/1twenty-crm-white-label-template/issues
- Email: [your support email]

## License

[Your License]

## Credits

Built on the Manus platform with:
- React
- tRPC
- Tailwind CSS
- Drizzle ORM
- shadcn/ui

---

**Template Version:** 1.0  
**Last Updated:** 2026-02-08
