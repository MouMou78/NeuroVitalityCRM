# Customization Guide

This guide details all customization points in the 1twenty CRM white-label template.

## Table of Contents

1. [Branding](#branding)
2. [Features](#features)
3. [Database Schema](#database-schema)
4. [UI Components](#ui-components)
5. [Email Templates](#email-templates)
6. [Permissions & Roles](#permissions--roles)

---

## Branding

### App Title

**Location:** Environment variable  
**Variable:** `VITE_APP_TITLE`  
**Default:** `"1twenty CRM"`  
**How to change:**

```bash
# In Manus: Settings → Secrets
VITE_APP_TITLE="Acme Corp CRM"
```

**Affects:**
- Browser tab title
- Dashboard header
- Email signatures
- Login page

### Logo

**Location:** Environment variable  
**Variable:** `VITE_APP_LOGO`  
**Default:** `"/logo.svg"`  
**How to change:**

1. Upload client logo to S3 or use public URL
2. Update environment variable:
   ```bash
   VITE_APP_LOGO="https://cdn.clientdomain.com/logo.png"
   ```

**Recommended specs:**
- Format: PNG or SVG
- Size: 200x50px (or similar aspect ratio)
- Transparent background

**Affects:**
- Dashboard header
- Login page
- Email templates

### Color Scheme

**Location:** `client/src/index.css`  
**Variables:** CSS custom properties in `:root`

```css
:root {
  /* Primary brand color */
  --primary: 142.1 76.2% 36.3%;
  --primary-foreground: 355.7 100% 97.3%;
  
  /* Secondary/accent color */
  --accent: 142.1 70% 45.3%;
  --accent-foreground: 355.7 100% 97.3%;
  
  /* Background colors */
  --background: 0 0% 100%;
  --foreground: 240 10% 3.9%;
  
  /* Card/surface colors */
  --card: 0 0% 100%;
  --card-foreground: 240 10% 3.9%;
  
  /* Muted colors (secondary text, disabled states) */
  --muted: 240 4.8% 95.9%;
  --muted-foreground: 240 3.8% 46.1%;
  
  /* Borders */
  --border: 240 5.9% 90%;
  
  /* Input fields */
  --input: 240 5.9% 90%;
  
  /* Destructive actions (delete, error) */
  --destructive: 0 84.2% 60.2%;
  --destructive-foreground: 0 0% 98%;
  
  /* Radius for rounded corners */
  --radius: 0.5rem;
}
```

**How to customize:**

1. **Find client's brand colors** (usually provided as hex codes)
2. **Convert to HSL:**
   - Use online tool: https://www.cssportal.com/css-color-converter/
   - Example: `#2E7D32` → `hsl(123, 46%, 34%)`
3. **Update CSS variables:**
   ```css
   --primary: 123 46% 34%;  /* Remove 'hsl()' wrapper */
   ```

**Color usage guide:**

- `--primary`: Main brand color (buttons, links, active states)
- `--accent`: Secondary actions, highlights
- `--destructive`: Delete buttons, error messages
- `--muted`: Secondary text, disabled states
- `--border`: Dividers, input borders

### Favicon

**Location:** `client/public/favicon.ico`  
**How to change:**

1. Generate favicon from client logo:
   - Use https://favicon.io/ or similar tool
   - Generate multiple sizes (16x16, 32x32, 48x48)
2. Replace `client/public/favicon.ico`
3. Or add custom link in `client/index.html`:
   ```html
   <link rel="icon" type="image/png" sizes="32x32" href="/favicon-32x32.png">
   ```

### Fonts

**Location:** `client/index.html` and `client/src/index.css`  
**Default:** System fonts (Inter, sans-serif)

**How to change:**

1. **Add Google Font** in `client/index.html`:
   ```html
   <link rel="preconnect" href="https://fonts.googleapis.com">
   <link href="https://fonts.googleapis.com/css2?family=Roboto:wght@300;400;500;700&display=swap" rel="stylesheet">
   ```

2. **Update CSS** in `client/src/index.css`:
   ```css
   :root {
     --font-sans: 'Roboto', ui-sans-serif, system-ui, sans-serif;
   }
   ```

---

## Features

### Core CRM Features (Included)

✅ **Contacts Management**
- Create, edit, delete contacts
- Custom fields support
- Import/export
- Notes and activity timeline

✅ **Deals Pipeline**
- Drag-and-drop pipeline
- Custom stages
- Deal value tracking
- Win/loss reasons

✅ **Calendar & Events**
- Event scheduling
- Reminders
- Google Calendar sync (optional)

✅ **Notes System**
- Universal notes across entities
- Timestamped and attributed
- Rich text support

✅ **Email Tracking**
- Email activity timeline
- AI email assistant
- Email templates

✅ **Notifications**
- In-app notifications
- Owner notifications

✅ **User Management**
- OAuth authentication
- Role-based access (admin/user)

### Optional Features (Require Configuration)

#### Amplemarket Integration

**Status:** Included in template (can be removed)  
**Configuration required:**
- Amplemarket API key
- User account selection
- List/sequence selection

**To remove:** See CLIENT-ONBOARDING.md Step 2

#### Hunter.io Integration

**Status:** Included in template (can be removed)  
**Configuration required:**
- Hunter.io API key

**To remove:** See CLIENT-ONBOARDING.md Step 2

#### Google Maps Integration

**Status:** Included (proxy-authenticated)  
**No configuration required** - uses Manus built-in proxy

**Features:**
- Location mapping
- Geocoding
- Directions

#### AI Features

**Status:** Included (uses Manus built-in LLM)  
**No configuration required**

**Features:**
- AI email assistant
- AI chat support
- Content generation

### Adding Custom Features

#### 1. Custom Fields

**Location:** `drizzle/schema.ts`

**Example: Add "Industry" field to contacts:**

```typescript
export const people = sqliteTable('people', {
  // ... existing fields ...
  industry: text('industry'),
});
```

**Apply changes:**
```bash
pnpm drizzle-kit generate
# Use webdev_execute_sql to apply migration
```

#### 2. Custom Pipeline Stages

**Location:** `drizzle/schema.ts` → `dealStageEnum`

```typescript
export const dealStageEnum = sqliteEnum('deal_stage', [
  'lead',
  'qualified',
  'proposal',
  'negotiation',
  'closed_won',
  'closed_lost',
  'custom_stage',  // Add your stage
]);
```

#### 3. Custom Reports

Create new report pages in `client/src/pages/Reports/`

**Example structure:**
```typescript
// client/src/pages/Reports/SalesReport.tsx
export function SalesReport() {
  const { data } = trpc.reports.getSalesData.useQuery();
  
  return (
    <div>
      {/* Your report UI */}
    </div>
  );
}
```

Add tRPC procedure in `server/routers.ts`:
```typescript
reports: {
  getSalesData: protectedProcedure
    .query(async ({ ctx }) => {
      // Your query logic
    }),
}
```

---

## Database Schema

### Core Tables

**`user`** - System users (OAuth accounts)
- `id`, `openId`, `name`, `email`, `avatar`, `role`

**`people`** - Contacts/leads
- `id`, `tenantId`, `firstName`, `lastName`, `email`, `phone`, `company`, `title`, `linkedinUrl`, `source`, `tags`, `customFields`

**`accounts`** - Companies/organizations
- `id`, `tenantId`, `name`, `domain`, `industry`, `size`, `revenue`

**`deals`** - Sales opportunities
- `id`, `tenantId`, `title`, `value`, `stage`, `probability`, `expectedCloseDate`, `ownerId`, `accountId`

**`events`** - Calendar events
- `id`, `tenantId`, `title`, `description`, `startTime`, `endTime`, `location`, `attendees`

**`notes`** - Universal notes
- `id`, `tenantId`, `content`, `entityType`, `entityId`, `authorId`, `createdAt`

**`integrations`** - Integration configurations
- `id`, `tenantId`, `provider`, `apiKey`, `config`, `status`

### Custom Fields

The `people`, `accounts`, and `deals` tables include a `customFields` JSON column for client-specific data.

**Example usage:**

```typescript
// Store custom fields
await db.insert(people).values({
  firstName: 'John',
  lastName: 'Doe',
  customFields: {
    industry: 'Technology',
    companySize: '50-100',
    leadSource: 'Website',
  },
});

// Query custom fields
const contacts = await db.select().from(people)
  .where(sql`json_extract(custom_fields, '$.industry') = 'Technology'`);
```

---

## UI Components

### Reusable Components

**Location:** `client/src/components/`

Key components you can customize:

#### DashboardLayout

**File:** `client/src/components/DashboardLayout.tsx`  
**Purpose:** Main layout with sidebar navigation

**Customization points:**
- Navigation menu items
- Sidebar logo
- User profile menu
- Collapsed sections

#### Notes Component

**File:** `client/src/components/Notes.tsx`  
**Purpose:** Universal notes widget

**Props:**
- `entityType`: 'person' | 'account' | 'deal'
- `entityId`: ID of the entity

#### AIChatBox

**File:** `client/src/components/AIChatBox.tsx`  
**Purpose:** AI assistant chat interface

**Customization:**
- System prompt
- Suggested questions
- Styling

### Adding Custom Components

1. Create component in `client/src/components/`
2. Export from `client/src/components/index.ts` (if exists)
3. Use in pages

**Example:**
```typescript
// client/src/components/CustomWidget.tsx
export function CustomWidget() {
  return <div>Custom Widget</div>;
}

// Use in page
import { CustomWidget } from '@/components/CustomWidget';
```

---

## Email Templates

**Location:** `server/_core/email.ts` (if exists) or inline in procedures

### Customizing Email Templates

**Example: Welcome email**

```typescript
const emailHtml = `
  <!DOCTYPE html>
  <html>
    <body style="font-family: sans-serif;">
      <img src="${process.env.VITE_APP_LOGO}" alt="Logo" style="width: 150px;">
      <h1>Welcome to ${process.env.VITE_APP_TITLE}!</h1>
      <p>Hi ${user.name},</p>
      <p>Your account has been created.</p>
    </body>
  </html>
`;
```

### Email Sending

Uses Manus built-in SMTP (configured via environment variables):
- `SMTP_HOST`
- `SMTP_PORT`
- `SMTP_USER`
- `SMTP_PASS`

---

## Permissions & Roles

### Role System

**Defined in:** `drizzle/schema.ts` → `userRoleEnum`

```typescript
export const userRoleEnum = sqliteEnum('user_role', ['admin', 'user']);
```

### Adding Custom Roles

1. **Update enum:**
   ```typescript
   export const userRoleEnum = sqliteEnum('user_role', [
     'admin',
     'user',
     'manager',
     'viewer',
   ]);
   ```

2. **Generate migration:**
   ```bash
   pnpm drizzle-kit generate
   ```

3. **Create role-based procedures:**
   ```typescript
   // server/routers.ts
   const managerProcedure = protectedProcedure.use(({ ctx, next }) => {
     if (ctx.user.role !== 'admin' && ctx.user.role !== 'manager') {
       throw new TRPCError({ code: 'FORBIDDEN' });
     }
     return next({ ctx });
   });
   ```

4. **Use in UI:**
   ```typescript
   const { user } = useAuth();
   
   {user?.role === 'admin' && (
     <Button>Admin Only Action</Button>
   )}
   ```

### Permission Patterns

**Data scoping by tenant:**
```typescript
// All queries should filter by tenantId
const contacts = await db.select()
  .from(people)
  .where(eq(people.tenantId, ctx.user.tenantId));
```

**Owner-only access:**
```typescript
// Check if user owns the resource
const deal = await db.select()
  .from(deals)
  .where(and(
    eq(deals.id, input.dealId),
    eq(deals.ownerId, ctx.user.id)
  ));
```

---

## Advanced Customization

### Custom Authentication

The template uses Manus OAuth. To add custom auth:

1. **Add auth provider** in `server/_core/auth.ts`
2. **Update OAuth callback** in `server/_core/oauth.ts`
3. **Add login buttons** in login page

### Custom Integrations

**Pattern for adding integrations:**

1. **Create client:** `server/integrations/[provider]Client.ts`
2. **Add sync logic:** `server/integrations/[provider]Sync.ts`
3. **Add router:** `server/routers.ts` → `integrations.[provider]`
4. **Add UI:** `client/src/pages/Integrations/[Provider].tsx`
5. **Add config:** `client/src/components/[Provider]ConfigDialog.tsx`

### Custom Workflows

**Example: Auto-assign deals**

```typescript
// server/routers.ts
deals: {
  create: protectedProcedure
    .input(z.object({ ... }))
    .mutation(async ({ ctx, input }) => {
      // Auto-assign to user with least deals
      const userWithLeastDeals = await findUserWithLeastDeals(ctx.db);
      
      const [deal] = await ctx.db.insert(deals).values({
        ...input,
        ownerId: userWithLeastDeals.id,
      }).returning();
      
      return deal;
    }),
}
```

---

## Testing Customizations

### Local Testing

```bash
# In Manus project
pnpm dev

# Test in browser
open http://localhost:3000
```

### Checklist

- [ ] Branding displays correctly
- [ ] Custom colors applied
- [ ] Custom fields save/load
- [ ] Custom features work
- [ ] No console errors
- [ ] Mobile responsive
- [ ] Email templates render correctly

---

## Support

For customization questions:
- GitHub Issues: https://github.com/MouMou78/1twenty-crm-white-label-template/issues
- Documentation: See CLIENT-ONBOARDING.md
