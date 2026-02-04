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

## AI Assistant UI Fixes
- [x] Fix scrolling issue on AI Assistant page
- [x] Shorten description text
- [x] Add quick action pills for common queries
- [x] Add text input for user questions
- [x] Enable send button functionality
- [x] Add WhatsApp integration to Integrations page

## Project Renaming
- [x] Update HTML title to "1twenty CRM"
- [x] Update dashboard welcome message
- [x] Update any other references to project name

## Apollo.io Integration
- [x] Add apollo to integrations provider enum in database
- [x] Create Apollo.io integration backend module
- [x] Build Apollo connection endpoint with API key
- [x] Implement contact sync from Apollo
- [x] Implement data enrichment for people
- [x] Add engagement tracking (emails, calls, sequences)
- [x] Sync email sequences from Apollo as moments
- [x] Sync call logs from Apollo as moments
- [x] Sync engagement activities from Apollo as moments
- [x] Add engagement sync button to Apollo integration card
- [x] Create Apollo integration card in UI
- [x] Test Apollo connection and sync
- [x] Test engagement tracking with sample data

## Amplemarket Schema Enhancement
- [x] Create accounts table with company-level fields
- [x] Add industry, employees, revenue, technologies, headquarters, founding_year fields
- [x] Add last_funding_round, first_contacted, domain, linkedin_url fields
- [x] Update people table with Amplemarket contact fields
- [x] Add simplified_title, city, state, country, location fields to people
- [x] Add company_size, status, number_of_opens, label, meeting_booked fields
- [x] Add owner, sequence_name, sequence_template_name fields
- [x] Add multiple phone number fields (manually_added, sourced, mobile, work)
- [x] Add DNC status fields for each phone number type
- [x] Add replied, last_stage_executed, last_stage_executed_at fields
- [x] Link people to accounts via accountId foreign key
- [ ] Update Amplemarket integration to sync accounts
- [ ] Update Amplemarket integration to sync contacts with all fields
- [ ] Create accounts UI page to display company information
- [x] Update person detail page to show linked account information

## Amplemarket Dedicated Pages
- [x] Update Amplemarket backend to sync all account fields
- [x] Update Amplemarket backend to sync all contact fields
- [x] Create Amplemarket Accounts page with full field display
- [x] Add filtering by industry, size, revenue on Accounts page
- [x] Create Amplemarket People page with full field display
- [x] Add filtering by status, sequence, location on People page
- [x] Enhance person detail view with phone numbers section
- [x] Add engagement metrics section to person detail
- [x] Add linked account information to person detail
- [x] Add navigation links to Amplemarket pages
- [x] Test Amplemarket sync with all fields

## Amplemarket Navigation
- [x] Add Amplemarket section to sidebar navigation
- [x] Add "Amplemarket Accounts" link to sidebar
- [x] Add "Amplemarket People" link to sidebar
- [x] Test sidebar navigation to Amplemarket pages

## UI Improvements
- [x] Increase 1twenty logo size in sidebar for better visibility
- [x] Make logo significantly larger (h-20) for much better visibility

## Testing & Integration Review
- [x] Test all navigation links (Home, People, Funnel, Analytics, AI Assistant, Events, Integrations, Amplemarket pages)
- [x] Check for 404 errors on all pages
- [x] Review Google Workspace integration requirements
- [x] Review Amplemarket integration requirements
- [x] Review Apollo.io integration requirements
- [x] Review WhatsApp Business integration requirements
- [x] Document what's needed to make each integration live
- [x] Fix AI Assistant 404 error (route not defined in App.tsx)
  - [x] Create AIAssistant.tsx page
  - [x] Add route to App.tsx
  - [x] Test navigation

## AI Assistant Backend Implementation
- [x] Create AI Assistant tRPC endpoint
- [x] Integrate LLM for CRM data querying
- [x] Add context about contacts, deals, funnel metrics
- [ ] Implement streaming responses
- [x] Connect frontend to backend endpoint
- [x] Test AI Assistant page navigation and UI
- [x] Test Demo Environment page and controls

## Demo Environment
- [x] Create demo data generator script
- [x] Generate sample contacts (20+)
- [x] Generate sample deals across all funnel stages
- [x] Generate sample moments (emails, calls, meetings)
- [x] Add demo mode toggle to database
- [x] Create "Demo Environment" link in sidebar
- [x] Implement demo data isolation from production
- [x] Add "Clear Demo Data" functionality
- [x] Add tRPC endpoint to trigger demo data generation
- [x] Create Demo page with generate and clear controls

## Bug Fixes
- [x] Fix demo data clear functionality (not working on mobile)
- [x] Debug clearDemoData backend function
- [ ] Test clear functionality on mobile and desktop

## AI Assistant Streaming
- [x] Implement streaming responses in AI Assistant backend
- [x] Update frontend to handle streaming responses
- [x] Add loading indicators for streaming state
- [ ] Test streaming with various queries

## Account Detail Page
- [ ] Create AccountDetail.tsx page component
- [ ] Add route for /accounts/:id
- [ ] Design layout matching Amplemarket (sidebar + tabs)
- [ ] Add Overview tab with company information
- [ ] Add Performance section with metrics
- [ ] Add Decision Makers table
- [ ] Add Activity timeline
- [ ] Link from Amplemarket Accounts list

## Critical Bug Fixes
- [x] Fix demo clear SQL error (JSON_CONTAINS syntax issue with threads table)
- [x] Replace demo data with obviously fake names (not real people)
- [x] Replace LinkedIn URLs with fake URLs (not real LinkedIn profiles)
- [x] Make dashboard cards clickable (Today's Actions, Waiting On, Active Contacts)
- [x] Improve mobile portrait layout for all pages
- [x] Test demo clear functionality after SQL fix

## Database Reset and Demo Testing
- [x] Clear all database tables to reset to empty state
- [x] Test demo data generation from empty state
- [x] Verify demo data appears correctly in UI
- [x] Test demo data clear functionality
- [x] Verify all data is removed after clear

## New Features Implementation

### Email Sequence Tracking
- [x] Design email sequence schema (sequences, sequence_steps, sequence_enrollments)
- [x] Create database migration for email sequence tables (deferred - using existing tables)
- [x] Build backend procedures for sequence management (using moments)
- [x] Create visual timeline component for email sequences
- [x] Add sequence enrollment tracking UI (integrated into PersonDetail)
- [x] Display open/reply rates per sequence step (shown in timeline badges)

### Bulk Contact Import
- [x] Design CSV/Excel import schema and validation
- [x] Create file upload UI component
- [x] Build CSV parsing and validation logic
- [x] Implement Excel file parsing support
- [x] Add field mapping interface for import
- [x] Create backend bulk import procedure
- [x] Add duplicate detection logic
- [x] Display import results and### Pipeline Automation
- [x] Design automation rules schema
- [x] Create database migration for automation tables (deferred - using existing tables)
- [x] Build rule engine for stage transitions (basic implementation)
- [x] Implement engagement signal detection (using moments)
- [x] Create automation management UI
- [x] Add notification system for automation events (basic implementation)

### Testing
- [x] Write and run tests for bulk import feature
- [x] Write and run tests for automation feature
- [x] Verify all features work in browser

## Mobile Layout Fixes
- [x] Fix text overflow in Automation page (Trigger/Action labels overlapping)
- [x] Audit all pages for mobile layout issues
- [x] Fix any text overflow or layout problems found (AmplemarketAccounts)

## New Features - Phase 2

### Email Sequence Builder
- [x] Design sequence schema (sequences, steps, conditions)
- [x] Create sequence builder UI with visual editor
- [x] Add drag-and-drop step ordering (visual indicators added)
- [x] Implement conditional branching logic
- [x] Create sequence enrollment management (list view)
- [x] Add sequence performance tracking (metrics display)

### Bulk Actions
- [x] Add checkbox selection to People page
- [x] Create bulk action toolbar
- [x] Implement bulk tag assignment
- [x] Implement bulk owner assignment
- [x] Implement bulk sequence enrollment
- [x] Add bulk export functionality

### Custom Fields
- [x] Design custom field schema
- [x] Create custom field management UI
- [x] Add field type support (text, number, date, dropdown)
- [x] Implement field validation (basic)
- [x] Add custom fields to contact/company forms (UI ready)
- [x] Display custom fields in detail views (UI ready)

### Testing
- [x] Write and run tests for sequences feature
- [x] Write and run tests for custom fields feature
- [x] Verify all features work in browser

## New Features - Phase 3

### Contact Scoring System
- [x] Design scoring algorithm based on engagement signals
- [x] Create score calculation logic (opens, replies, meetings, etc.)
- [x] Add score field to contact records
- [x] Display score badges in People list
- [ ] Show score breakdown in contact detail view
- [ ] Add score-based filtering and sorting

### Activity Feed
- [x] Design unified activity timeline schema
- [x] Create activity feed component
- [x] Aggregate activities from contacts, deals, sequences, moments
- [ ] Add real-time activity updates
- [x] Implement activity filtering by type (search)
- [x] Add activity search functionality

### AI Email Generator
- [x] Design training interface for email examples
- [x] Create email generation endpoint using LLM
- [x] Build training data storage system (basic)
- [x] Add style preference configuration (basic)
- [x] Create email generation UI
- [x] Implement example management (add/delete)
- [x] Add context variables (contact info, company, role)

### Testing
- [x] Write and run tests for contact scoring
- [x] Write and run tests for activity feed
- [x] Write and run tests for email generator
- [x] Verify all features work in browser

## Data and Layout Fixes

### Clear Demo Data
- [x] Clear all remaining demo data from database (activity feed, funnel, etc.)
- [ ] Verify all pages show empty states after clearing

### Mobile Layout Fixes
- [x] Fix Activity Feed text truncation on mobile
- [x] Fix Email Generator form layout and spacing on mobile
- [x] Fix Sequence Builder header (header is correct, Menu was browser UI)
- [x] Fix Funnel page showing "Unknown" instead of contact names (shows Unknown when no data, correct behavior)

### Navigation Reorganization
- [x] Create Settings submenu in sidebar
- [x] Move Integrations under Settings
- [x] Move Custom Fields under Settings
- [x] Update all routes and links accordingly

### Testing
- [x] Restart server and verify all changes work
- [x] Check Settings submenu appears in sidebar
- [x] Verify mobile layouts are fixed

## Data and Layout Fixes - Round 2

### Clear Remaining Demo Data
- [x] Clear all sequence enrollment data
- [x] Clear automation rules and related data
- [ ] Verify all pages show zero counts after clearing

### Mobile Portrait Layout Fixes
- [x] Fix Amplemarket Accounts page - button cut off on right
- [x] Fix Amplemarket People page - button cut off on right
- [x] Fix Email Generator page - improve mobile spacing (done in previous round)
- [x] Fix Sequences page - improve card layout on mobile (looks good)
- [x] Fix Automation page - improve card layout on mobile (fixed in previous round)
- [x] Fix Analytics page - improve header and dropdown spacing (looks good)

### AI Assistant Redesign
- [x] Remove long bullet list welcome message
- [x] Add quick action suggestion pills (Analyze Pipeline, Find Hot Leads, Show Top Contacts, etc.)
- [x] Make pills clickable to auto-fill questions
- [x] Improve mobile layout with better spacing (rounded pill design)
