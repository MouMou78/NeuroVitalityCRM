# Integration Removal Guide

This guide provides step-by-step instructions for removing specific integrations from the white-label template.

## Table of Contents

1. [Remove Amplemarket Integration](#remove-amplemarket-integration)
2. [Remove Hunter.io Integration](#remove-hunterio-integration)
3. [Remove Google Maps Integration](#remove-google-maps-integration)
4. [Remove AI Features](#remove-ai-features)
5. [Verification](#verification)

---

## Remove Amplemarket Integration

### Step 1: Delete Files

```bash
cd /path/to/project

# Server files
rm server/amplemarket.ts
rm server/amplemarketClient.ts
rm server/amplemarketSyncFromLeads.ts

# Client components
rm client/src/components/AmplemarketConfigDialog.tsx

# Client pages
rm client/src/pages/AmplemarketSync.tsx
rm client/src/pages/AmplemarketLeads.tsx
```

### Step 2: Update Database Schema

**File:** `drizzle/schema.ts`

**Remove these tables:**

```typescript
// DELETE THIS:
export const amplemarketSyncLogs = sqliteTable('amplemarket_sync_logs', {
  id: text('id').primaryKey(),
  tenantId: text('tenant_id').notNull(),
  // ... rest of table definition
});

// DELETE THIS:
export const leads = sqliteTable('leads', {
  id: text('id').primaryKey(),
  tenantId: text('tenant_id').notNull(),
  source: text('source').notNull(),
  sourceType: text('source_type').notNull(),
  amplemarketLeadId: text('amplemarket_lead_id'),
  // ... rest of table definition
});
```

**Remove from integrations table:**

```typescript
export const integrations = sqliteTable('integrations', {
  // ... other fields ...
  
  // DELETE THESE:
  amplemarketUserId: text('amplemarket_user_id'),
  amplemarketUserEmail: text('amplemarket_user_email'),
  syncSchedule: text('sync_schedule'),
  syncScope: text('sync_scope'),
  selectedLists: text('selected_lists', { mode: 'json' }),
  selectedSequences: text('selected_sequences', { mode: 'json'}),
  conflictStrategy: text('conflict_strategy'),
});
```

**Generate migration:**

```bash
pnpm drizzle-kit generate
```

**Apply migration:**

Use `webdev_execute_sql` in Manus or manually run the generated SQL.

### Step 3: Update Server Routers

**File:** `server/routers.ts`

**Remove the entire amplemarket router section:**

```typescript
// DELETE THIS ENTIRE SECTION:
amplemarket: {
  syncFromLeads: protectedProcedure
    .input(z.object({ ... }))
    .mutation(async ({ ctx, input }) => { ... }),
  
  listLeads: protectedProcedure
    .input(z.object({ ... }))
    .query(async ({ ctx, input }) => { ... }),
  
  // ... all other amplemarket procedures
},
```

### Step 4: Update Database Helpers

**File:** `server/db.ts`

**Remove Lead-related functions:**

```typescript
// DELETE THESE:
export async function getLeads(db: any, filters: { ... }) { ... }
export async function getLeadById(db: any, leadId: string) { ... }
export async function searchLeads(db: any, query: string) { ... }
export async function getLeadCountByOwner(db: any, ownerEmail: string) { ... }
export async function deleteLead(db: any, leadId: string) { ... }
```

### Step 5: Update Navigation

**File:** `client/src/components/DashboardLayout.tsx`

**Remove Amplemarket navigation section:**

```typescript
// DELETE THIS:
<Collapsible defaultOpen={false}>
  <CollapsibleTrigger className="...">
    <div className="flex items-center gap-2">
      <Building2 className="h-4 w-4" />
      <span>Amplemarket</span>
    </div>
    <ChevronDown className="..." />
  </CollapsibleTrigger>
  <CollapsibleContent className="...">
    <Link href="/amplemarket/sync" className="...">
      Sync
    </Link>
    <Link href="/amplemarket/leads" className="...">
      Leads
    </Link>
  </CollapsibleContent>
</Collapsible>
```

### Step 6: Update Routes

**File:** `client/src/App.tsx`

**Remove Amplemarket routes:**

```typescript
// DELETE THESE:
<Route path="/amplemarket/sync" component={AmplemarketSync} />
<Route path="/amplemarket/leads" component={AmplemarketLeads} />
```

**Remove imports:**

```typescript
// DELETE THESE:
import { AmplemarketSync } from './pages/AmplemarketSync';
import { AmplemarketLeads } from './pages/AmplemarketLeads';
```

### Step 7: Update Integrations Page

**File:** `client/src/pages/Integrations.tsx`

**Remove Amplemarket card:**

```typescript
// DELETE THIS:
<Card>
  <CardHeader>
    <CardTitle>Amplemarket</CardTitle>
    <CardDescription>...</CardDescription>
  </CardHeader>
  <CardContent>...</CardContent>
  <CardFooter>...</CardFooter>
</Card>
```

---

## Remove Hunter.io Integration

### Step 1: Delete Files

```bash
# Server files
rm server/hunter.ts
```

### Step 2: Update Server Routers

**File:** `server/routers.ts`

**Remove Hunter.io procedures:**

```typescript
// DELETE THESE:
contacts: {
  enrichEmail: protectedProcedure
    .input(z.object({ email: z.string().email() }))
    .mutation(async ({ ctx, input }) => {
      // Hunter.io enrichment logic
    }),
  
  findEmail: protectedProcedure
    .input(z.object({ domain: z.string(), firstName: z.string(), lastName: z.string() }))
    .mutation(async ({ ctx, input }) => {
      // Hunter.io email finder logic
    }),
}
```

### Step 3: Update UI Components

**Search for Hunter references:**

```bash
grep -r "hunter" client/src/ --ignore-case
```

**Remove any UI elements that call Hunter.io procedures:**

```typescript
// DELETE THESE:
const enrichEmail = trpc.contacts.enrichEmail.useMutation();
const findEmail = trpc.contacts.findEmail.useMutation();
```

### Step 4: Update Integrations Page

**File:** `client/src/pages/Integrations.tsx`

**Remove Hunter.io card:**

```typescript
// DELETE THIS:
<Card>
  <CardHeader>
    <CardTitle>Hunter.io</CardTitle>
    <CardDescription>...</CardDescription>
  </CardHeader>
  <CardContent>...</CardContent>
  <CardFooter>...</CardFooter>
</Card>
```

---

## Remove Google Maps Integration

### Step 1: Delete Files

```bash
# Client components
rm client/src/components/Map.tsx
```

### Step 2: Update Server Core

**File:** `server/_core/map.ts`

**Delete the entire file:**

```bash
rm server/_core/map.ts
```

### Step 3: Remove from UI

**Search for Map component usage:**

```bash
grep -r "Map" client/src/ --include="*.tsx"
```

**Remove imports and usage:**

```typescript
// DELETE THESE:
import { MapView } from '@/components/Map';

// DELETE MAP COMPONENTS:
<MapView onMapReady={handleMapReady} />
```

### Step 4: Update Dependencies (Optional)

**File:** `package.json`

**Remove Google Maps dependencies if added:**

```json
// DELETE THESE (if present):
"@googlemaps/js-api-loader": "...",
"@types/google.maps": "..."
```

---

## Remove AI Features

### Step 1: Delete Files

```bash
# Client components
rm client/src/components/AIChatBox.tsx
rm client/src/components/AIEmailAssistant.tsx
rm client/src/components/FloatingAIChat.tsx
```

### Step 2: Update Server Core

**File:** `server/_core/llm.ts`

**Delete the entire file:**

```bash
rm server/_core/llm.ts
```

### Step 3: Remove AI Procedures

**File:** `server/routers.ts`

**Remove AI-related procedures:**

```typescript
// DELETE THESE:
ai: {
  chat: protectedProcedure
    .input(z.object({ messages: z.array(...) }))
    .mutation(async ({ ctx, input }) => { ... }),
  
  generateEmail: protectedProcedure
    .input(z.object({ prompt: z.string() }))
    .mutation(async ({ ctx, input }) => { ... }),
}
```

### Step 4: Remove from UI

**Search for AI component usage:**

```bash
grep -r "AIChatBox\|AIEmailAssistant\|FloatingAIChat" client/src/ --include="*.tsx"
```

**Remove imports and usage:**

```typescript
// DELETE THESE:
import { AIChatBox } from '@/components/AIChatBox';
import { AIEmailAssistant } from '@/components/AIEmailAssistant';
import { FloatingAIChat } from '@/components/FloatingAIChat';

// DELETE COMPONENTS:
<AIChatBox />
<AIEmailAssistant />
<FloatingAIChat />
```

### Step 5: Remove AI Buttons/Triggers

**Common locations:**
- Email compose dialogs
- Contact detail pages
- Dashboard floating buttons

**Example removal:**

```typescript
// DELETE THIS:
<Button onClick={() => setShowAIChat(true)}>
  <Sparkles className="h-4 w-4 mr-2" />
  AI Assistant
</Button>
```

---

## Verification

### After Removing Integrations

**1. Check for TypeScript errors:**

```bash
pnpm tsc --noEmit
```

**2. Check for unused imports:**

```bash
# Search for deleted components
grep -r "Amplemarket\|Hunter\|Map\|AIChatBox" client/src/ --include="*.tsx"
```

**3. Test the application:**

```bash
pnpm dev
```

**4. Verify in browser:**

- [ ] No console errors
- [ ] Navigation doesn't show removed integrations
- [ ] Integrations page doesn't show removed cards
- [ ] No broken routes (404 errors)
- [ ] Database queries work (no missing table errors)

### Common Issues

**"Table not found" errors:**

- Regenerate migrations: `pnpm drizzle-kit generate`
- Apply migrations via `webdev_execute_sql`

**"Module not found" errors:**

- Check for remaining imports of deleted files
- Search codebase: `grep -r "filename" .`

**TypeScript errors:**

- Check `server/routers.ts` for removed procedure references
- Check UI components for removed tRPC hooks

### Clean Up Checklist

- [ ] All deleted files confirmed removed
- [ ] Database schema updated and migrated
- [ ] Server routers updated
- [ ] Navigation updated
- [ ] Routes updated
- [ ] UI components updated
- [ ] No TypeScript errors
- [ ] No console errors in browser
- [ ] Application runs successfully

---

## Partial Removal

### Keep Integration but Disable

If you want to keep the code but disable the integration:

**1. Hide from navigation:**

```typescript
// In DashboardLayout.tsx
{false && (  // Add conditional
  <Link href="/amplemarket/sync">Amplemarket</Link>
)}
```

**2. Disable in integrations page:**

```typescript
// In Integrations.tsx
<Card className="opacity-50">
  <CardHeader>
    <CardTitle>Amplemarket (Disabled)</CardTitle>
  </CardHeader>
  <CardFooter>
    <Button disabled>Configure</Button>
  </CardFooter>
</Card>
```

**3. Add feature flag:**

```typescript
// server/_core/env.ts
export const ENABLE_AMPLEMARKET = process.env.ENABLE_AMPLEMARKET === 'true';

// Use in routers
amplemarket: ENABLE_AMPLEMARKET ? {
  // ... procedures
} : {},
```

---

## Support

For integration removal issues:
- GitHub Issues: https://github.com/MouMou78/1twenty-crm-white-label-template/issues
- Documentation: See CLIENT-ONBOARDING.md
