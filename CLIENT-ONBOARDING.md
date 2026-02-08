# Client Onboarding Guide

This guide walks you through setting up a new client instance of the 1twenty CRM white-label template.

## Prerequisites

- Manus account with web development access
- Client's branding assets (logo, colors, company name)
- Client's custom domain (optional, can be configured later)

## Step 1: Create New Manus Project from Template

### Option A: Import from GitHub (Recommended)

1. Go to your Manus dashboard
2. Click "New Project" → "Import from GitHub"
3. Select this repository: `MouMou78/1twenty-crm-white-label-template`
4. Name the project: `[client-name]-crm` (e.g., `acme-corp-crm`)
5. Click "Import"

### Option B: Clone Locally and Upload

```bash
# Clone the template
git clone https://github.com/MouMou78/1twenty-crm-white-label-template.git [client-name]-crm
cd [client-name]-crm

# Remove git history to start fresh
rm -rf .git
git init
git add .
git commit -m "Initial commit from white-label template"

# Create new Manus project and follow upload instructions
```

## Step 2: Remove Integration-Specific Code

The template includes Amplemarket and Hunter.io integrations from the original kompass-crm. Remove these if not needed:

### Remove Amplemarket Integration

1. **Delete files:**
   ```bash
   rm server/amplemarket.ts
   rm server/amplemarketClient.ts
   rm server/amplemarketSyncFromLeads.ts
   rm client/src/components/AmplemarketConfigDialog.tsx
   rm client/src/pages/AmplemarketSync.tsx
   rm client/src/pages/AmplemarketLeads.tsx
   ```

2. **Remove from schema:**
   - Edit `drizzle/schema.ts`
   - Remove `amplemarketSyncLogs` table
   - Remove Amplemarket-related fields from `integrations` table

3. **Remove from routers:**
   - Edit `server/routers.ts`
   - Remove `amplemarket` router section

4. **Remove from navigation:**
   - Edit `client/src/components/DashboardLayout.tsx`
   - Remove "Amplemarket" navigation section

5. **Remove from routes:**
   - Edit `client/src/App.tsx`
   - Remove Amplemarket routes

### Remove Hunter.io Integration

1. **Delete files:**
   ```bash
   rm server/hunter.ts
   ```

2. **Remove from routers:**
   - Edit `server/routers.ts`
   - Remove Hunter.io procedures

3. **Remove from UI:**
   - Search for "Hunter" references in `client/src/` and remove

## Step 3: Customize Branding

### 3.1 Update App Title and Logo

Use the Manus `webdev_request_secrets` tool or manually update:

```typescript
// These are set via environment variables
VITE_APP_TITLE="[Client Company Name] CRM"
VITE_APP_LOGO="https://client-domain.com/logo.png"
```

**In Manus:**
1. Go to Settings → Secrets
2. Update `VITE_APP_TITLE` to client's company name
3. Upload client logo and update `VITE_APP_LOGO` URL

### 3.2 Update Color Scheme

Edit `client/src/index.css` and update CSS variables:

```css
:root {
  /* Update these colors to match client branding */
  --primary: 142.1 76.2% 36.3%;        /* Main brand color */
  --primary-foreground: 355.7 100% 97.3%;
  
  --accent: 142.1 70% 45.3%;           /* Accent color */
  --accent-foreground: 355.7 100% 97.3%;
  
  /* Keep other variables or customize as needed */
}
```

**Finding the right HSL values:**
- Use a color picker tool
- Convert client's brand colors (hex/rgb) to HSL
- Update the CSS variables

### 3.3 Update Favicon

1. Replace `client/public/favicon.ico` with client's favicon
2. Or add custom favicon link in `client/index.html`:
   ```html
   <link rel="icon" type="image/png" href="/client-favicon.png" />
   ```

## Step 4: Configure Database

The template uses the same schema as kompass-crm. No changes needed unless you want to:

- Add custom fields (see `drizzle/schema.ts`)
- Remove unused tables
- Add client-specific data models

**To apply schema changes:**
```bash
pnpm drizzle-kit generate
# Then use webdev_execute_sql to apply the migration
```

## Step 5: Set Up Custom Domain

### In Manus Dashboard:

1. Go to Settings → Domains
2. Click "Add Custom Domain"
3. Enter client's domain (e.g., `crm.clientdomain.com`)
4. Follow DNS configuration instructions
5. Wait for SSL certificate provisioning

### DNS Configuration (Client's DNS Provider):

Add a CNAME record:
```
Type: CNAME
Name: crm (or subdomain of choice)
Value: [provided by Manus]
TTL: 3600
```

## Step 6: Initial Data Setup

### 6.1 Create Admin User

The first user to sign in becomes the owner. Have the client:
1. Visit the CRM URL
2. Click "Sign in"
3. Complete OAuth flow
4. They'll be set as the admin/owner

### 6.2 Import Initial Data (Optional)

If client has existing data:
1. Use the built-in import tools (Contacts, Deals, etc.)
2. Or create a custom migration script in `server/migrations/`

## Step 7: Test and Publish

### Testing Checklist:

- [ ] App title and logo display correctly
- [ ] Color scheme matches client branding
- [ ] Custom domain works (if configured)
- [ ] User can sign in
- [ ] Core CRM features work:
  - [ ] Create/edit contacts
  - [ ] Create/edit deals
  - [ ] Add notes
  - [ ] Email tracking (if enabled)
  - [ ] Calendar events
- [ ] Removed integrations don't show in UI
- [ ] No console errors

### Publish:

1. Save a checkpoint in Manus
2. Click "Publish" in the Manus dashboard
3. Share the URL with the client

## Step 8: Client Handoff

Provide the client with:

1. **CRM URL** (custom domain or Manus subdomain)
2. **Admin credentials** (their OAuth account)
3. **User guide** (link to CRM documentation)
4. **Support contact** (your email/support channel)

## Ongoing Maintenance

### Updating Client Instances

When you update the template:

1. Commit changes to the template repository
2. For each client project:
   ```bash
   git remote add template https://github.com/MouMou78/1twenty-crm-white-label-template.git
   git fetch template
   git merge template/main
   # Resolve conflicts if any
   git push
   ```

3. Test in Manus staging environment
4. Publish to production

### Client-Specific Customizations

Track client-specific changes separately:
- Use feature branches: `client/acme-corp/custom-reports`
- Document customizations in `CLIENT-CUSTOMIZATIONS.md`
- Keep template updates separate from client customizations

## Troubleshooting

### "Integration not found" errors

If you see errors about Amplemarket or Hunter.io after removal:
1. Check `server/routers.ts` for any remaining references
2. Search codebase for `amplemarket` or `hunter` (case-insensitive)
3. Clear browser cache and restart dev server

### Branding not updating

1. Check environment variables in Manus Settings → Secrets
2. Restart the dev server
3. Hard refresh browser (Ctrl+Shift+R)

### Database schema errors

1. Check `drizzle/schema.ts` for syntax errors
2. Regenerate migrations: `pnpm drizzle-kit generate`
3. Apply via `webdev_execute_sql`

## Support

For template issues or questions:
- GitHub Issues: https://github.com/MouMou78/1twenty-crm-white-label-template/issues
- Email: [your support email]
