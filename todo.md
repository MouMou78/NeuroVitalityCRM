# KompassCRM TODO

## Database Schema
- [x] Design and implement tenants table
- [x] Design and implement users table with multi-tenant support
- [x] Design and implement people table with enrichment fields
- [x] Design and implement threads table for conversation tracking
- [x] Design and implement moments table for unified timeline
- [x] Design and implement next_actions table with constraints
- [x] Design and implement events table with form schema
- [x] Design and implement integrations table
- [x] Generate and apply database migrations

## Authentication & User Management
- [ ] Extend authentication to support multi-tenant architecture
- [ ] Implement role-based access control (owner, collaborator, restricted)
- [ ] Add tenant context to all protected procedures
- [ ] Create user signup with tenant creation
- [ ] Update user management for multi-tenant support

## Core Backend API
- [x] Implement home dashboard endpoint (today_actions, waiting_on, recently_touched)
- [x] Implement people CRUD endpoints
- [x] Implement people search and filtering
- [x] Implement thread creation and management
- [x] Implement thread timeline with moments
- [x] Implement moment creation (manual notes)
- [x] Implement next-action creation and completion
- [x] Add automatic next-action closure logic

## Rules Engine
- [x] Design rules engine architecture
- [x] Implement outbound silence follow-up rule
- [x] Implement reply received handling rule
- [x] Implement meeting held follow-up rule
- [x] Implement dormancy detection scheduled job
- [x] Create trigger system for moment-based rules
- [x] Add business days calculation utility

## Event Management & Lead Capture
- [x] Implement event CRUD endpoints
- [ ] Generate QR codes for event lead capture
- [x] Create public event form endpoint (no auth)
- [x] Implement dynamic form rendering from schema
- [x] Add lead submission handler with deduplication
- [ ] Implement anti-spam protection (rate limiting, honeypot)
- [x] Auto-create person/thread/moment/action on lead capture

## Integrations
- [ ] Implement Google OAuth connection flow
- [ ] Implement Google OAuth callback handler
- [ ] Create Gmail polling service
- [ ] Create Calendar polling service
- [ ] Map Gmail events to moments
- [ ] Map Calendar events to moments
- [ ] Implement Amplemarket API key storage
- [ ] Implement Amplemarket webhook endpoint
- [ ] Map Amplemarket events to moments

## Frontend UI
- [x] Design color palette and theme for CRM
- [x] Implement dashboard layout with navigation
- [x] Create home page with action lists
- [x] Create people list page with search
- [x] Create person detail page with threads
- [x] Create thread detail page with timeline
- [x] Create moment timeline component
- [x] Create next-action widget
- [x] Create events list page
- [x] Create event detail page with QR code
- [x] Create public event lead capture form
- [x] Create integrations management page
- [x] Implement loading and error states

## Testing & Deployment
- [ ] Write unit tests for critical procedures
- [ ] Test multi-tenant isolation
- [ ] Test rules engine automation
- [ ] Test public lead capture flow
- [ ] Test integration webhooks
- [ ] Create final checkpoint

## Bug Fixes
- [ ] Fix OAuth callback authentication error
- [ ] Ensure tenant creation works properly on first login
- [ ] Test complete authentication flow

## Guest Access Implementation
- [x] Remove OAuth authentication requirement
- [x] Create default guest tenant and user
- [x] Update frontend to bypass authentication
- [x] Allow direct access to all CRM features

## Rebranding to 1twenty CRM
- [x] Fetch logo and color scheme from 1twentyconsultancy.com
- [x] Update application name to "1twenty CRM"
- [x] Apply color scheme to CSS variables
- [x] Add logo to dashboard and branding
- [x] Update page titles and metadata

## Bug Fixes
- [x] Fix "Add Person" button on People page
- [x] Fix "Create Event" button on Events page

## Google Workspace Integration
- [ ] Implement Google OAuth flow
- [ ] Create Google integration connection endpoint
- [ ] Add Gmail sync functionality
- [ ] Add Calendar sync functionality
- [ ] Store integration credentials securely
- [ ] Test complete Google Workspace connection

## Multi-User Funnel Analytics Patch
- [x] Add owner_user_id, collaborator_user_ids, visibility, deal_signal columns to threads table
- [x] Add assigned_user_id, due_at columns to next_actions table
- [x] Create indexes for multi-user queries
- [x] Extend enum values for threads.intent and moments.type
- [x] Implement funnel stage computation logic (7 stages)
- [x] Build GET /api/funnel endpoint with thread grouping
- [x] Build POST /api/threads/:id/assign endpoint
- [x] Build POST /api/threads/:id/status endpoint
- [x] Build GET /api/analytics endpoint with all metrics
- [x] Implement activity throughput analytics
- [x] Implement engagement rate analytics
- [x] Implement funnel health analytics
- [x] Implement follow-up discipline analytics
- [x] Implement velocity analytics
- [x] Update rules engine with owner assignment on thread creation
- [x] Update rules engine with due_at auto-set for date triggers
- [x] Update rules engine to assign actions to thread owner
- [x] Create Funnel page with Kanban view
- [x] Create Analytics page with charts and metrics
- [ ] Add user scope toggle to Home page (me/team)
- [ ] Implement thread access control based on visibility

## Logo Update
- [x] Replace logo with new 1twenty Consultancy logo
- [x] Remove app name text from sidebar
- [x] Update DashboardLayout to show only logo image

## WhatsApp Business Integration
- [ ] Research WhatsApp Business API requirements
- [ ] Add WhatsApp integration to integrations table
- [ ] Create WhatsApp connection endpoint with webhook
- [ ] Implement message sync (incoming/outgoing)
- [ ] Store WhatsApp messages as moments in threads
- [ ] Add send message functionality from CRM
- [ ] Create WhatsApp settings page
- [ ] Test message sync and webhook handling

## AI Assistant Feature
- [x] Design AI Assistant backend architecture
- [x] Create assistant API endpoint with LLM integration
- [x] Implement context retrieval (threads, people, actions, funnel data)
- [x] Build intelligent query parsing for deal health questions
- [x] Generate responses with clickable links to CRM entities
- [x] Create AI Assistant UI component with chat interface
- [x] Add AI Assistant to navigation menu
- [ ] Implement chat history and session management
- [ ] Test AI queries for accuracy and link generation
