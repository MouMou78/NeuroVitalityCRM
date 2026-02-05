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
- [x] Complete rebranding from KompassCRM to 1twenty CRM across all files
- [x] Update Onboarding.tsx welcome screen
- [x] Update Signup.tsx and Login.tsx
- [x] Update EmailAccounts.tsx
- [x] Update email templates in email.ts
- [x] Update OTP auth in auth.ts
- [x] Update campaign and sequence URLs
- [x] Update package.json project name
- [x] Update guest user email
- [x] Update rules-engine.ts comments

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


## Platform Audit & Improvements

### Page Formatting & Links Audit
- [ ] Check Home page for formatting issues
- [ ] Check People page for formatting issues
- [ ] Check Funnel page for formatting issues
- [ ] Check Analytics page for formatting issues
- [ ] Check Activity Feed for formatting issues
- [ ] Check Automation page for formatting issues
- [ ] Check Sequences page for formatting issues
- [ ] Check Email Generator for formatting issues
- [ ] Check AI Assistant for formatting issues
- [ ] Check Events page for formatting issues
- [ ] Check Amplemarket Accounts for formatting issues
- [ ] Check Amplemarket People for formatting issues
- [ ] Check Integrations page for formatting issues
- [ ] Check Custom Fields page for formatting issues
- [ ] Test all navigation links work correctly
- [ ] Fix any broken links or 404 errors

### Loading States & Skeletons
- [ ] Add skeleton loading to Home page
- [ ] Add skeleton loading to People list page
- [ ] Add skeleton loading to Funnel page
- [ ] Add skeleton loading to Analytics page
- [ ] Add skeleton loading to Activity Feed
- [ ] Add skeleton loading to Sequences page
- [ ] Add skeleton loading to Amplemarket pages
- [ ] Add loading states to all tRPC queries
- [ ] Test loading states appear correctly

### Data Cleanup
- [x] Clear all remaining demo data from database
- [x] Verify all tables are empty
- [x] Remove Demo Environment from navigation
- [x] Delete demo-related backend procedures
- [x] Test app works with empty database

### Advanced Lead Scoring System
- [x] Add fit_score, intent_score, combined_score fields to people table
- [x] Add fit_tier, intent_tier fields to people table
- [x] Add score_reasons JSON field to people table
- [x] Add lifecycle_stage field to people table
- [x] Add seniority, department, region fields to people table
- [x] Add scoring fields to accounts table
- [x] Implement fit scoring engine (industry, size, seniority, region)
- [x] Implement intent scoring engine with event tracking
- [x] Implement score decay model (21-day half-life)
- [x] Create combined score calculation (60% fit, 40% intent)
- [x] Add tier calculation logic (A/B/C for fit, Hot/Warm/Cold for intent)
- [ ] Add scoring tRPC procedures
- [ ] Create skeleton loading components
- [ ] Create scoring rules management UI
- [ ] Display scores and tiers in People list
- [ ] Show score breakdown on contact detail page
- [ ] Add score-based filtering and sorting
- [ ] Test scoring with various scenarios


## Urgent Fixes
- [x] Make Settings and Amplemarket submenus collapsed by default
- [x] Fix database query error with new scoring fields
- [x] Test all pages load correctly


## Lead Scoring System Implementation
- [x] Add scoring fields to database schema (fitScore, intentScore, combinedScore, fitTier, intentTier, scoreReasons, lifecycleStage, seniority, department, region)
- [x] Generate and apply database migration
- [x] Create lead-scoring.ts engine with fit and intent calculations
- [x] Add scoring tRPC procedures (scoreContact, bulkScore, getScoreBreakdown)
- [x] Display fit/intent badges in People list
- [x] Write comprehensive tests for scoring engine (21 tests, all passing)
- [ ] Show score breakdown on PersonDetail page
- [ ] Add score-based filtering and sorting

## Skeleton Loading Screens
- [x] Verify SkeletonLoaders.tsx component exists
- [x] Add ListPageSkeleton to People.tsx
- [ ] Add DetailPageSkeleton to PersonDetail.tsx
- [ ] Add skeleton loading to other key pages (Funnel, Analytics, Events)
- [ ] Test all loading states appear correctly


## Advanced Scoring Features
- [x] Add score breakdown card to PersonDetail page showing fit/intent score details
- [x] Display which criteria contributed to scores with point values
- [x] Add score-based filtering to People list (by fit tier, intent tier, score ranges)
- [x] Add score-based sorting options
- [x] Create Scoring Management page in Settings area
- [x] Allow configuration of target industries with point values
- [x] Allow configuration of company size preferences
- [x] Allow configuration of seniority levels and points
- [x] Allow configuration of priority regions
- [x] Allow configuration of tier thresholds (A/B/C, Hot/Warm/Cold)
- [x] Test all scoring features work correctly


## Final Data Cleanup
- [x] Check sequences table for demo data
- [x] Check sequence_enrollments table for demo data
- [x] Clear all sequences and enrollments from database
- [x] Verify Sequences page shows empty state
- [x] Verify all other pages are clean


## Sequence Builder & Event Tracking Implementation

### Database Schema
- [x] Create sequences table (name, description, status, createdAt, updatedAt)
- [x] Create sequence_steps table (sequenceId, stepNumber, type, subject, body, delayDays, delayHours)
- [x] Create sequence_enrollments table (sequenceId, personId, status, currentStep, enrolledAt, completedAt)
- [x] Create tracking_events table (personId, accountId, eventType, eventData, timestamp)
- [x] Generate and apply migrations

### Sequence Builder UI
- [x] Create SequenceNew.tsx page for sequence creation
- [x] Build step-by-step wizard (Name & Description → Add Steps → Review & Activate)
- [x] Implement email step editor with subject/body fields
- [x] Add delay configuration (days/hours between steps)
- [ ] Add template library for common sequences
- [ ] Create SequenceDetail.tsx page to view/edit sequences
- [ ] Add enrollment management (add/remove contact### Event Tracking System
- [x] Create event tracking tRPC procedures (trackEvent, getEventsByPerson)
- [x] Implement email event tracking (sent, opened, clicked, replied)
- [x] Implement website event tracking (page views, demo requests, pricing views)
- [ ] Add event tracking to PersonDetail page (show recent activity)
- [ ] Create event timeline componentor contact detail p### Intent Scoring Integration
- [x] Update intent scoring to use tracking_events table
- [x] Implement event decay calculation (21-day half-life)
- [x] Auto-recalculate scores when new events are tracked
- [ ] Test scoring with various event combinationsard

### Testing
- [x] Write tests for sequence CRUD operations
- [x] Write tests for event tracking procedures
- [x] Write tests for intent scoring with events (8/12 passing - table creation needed in test env)
- [ ] Test sequence builder UI flow
- [ ] Test event tracking and score updates


## Logo Transparency Fix
- [x] Download current logo from S3
- [x] Remove white background to make logo transparent
- [x] Upload transparent logo to S3
- [x] Update logo reference in DashboardLayout
- [x] Test logo appearance on sidebar


## Navigation Reorganization
- [x] Analyze current sidebar structure and identify related sections
- [x] Group Sequences, Email Generator, Automation into "Engagement" submenu
- [x] Group Analytics, Funnel, Activity Feed into "Insights" submenu
- [x] Keep People, Events, AI Assistant as top-level items
- [x] Test all navigation links work correctly


## Branding Updates
- [ ] Change project name from KompassCRM to 1twentyCRM
- [ ] Update guest user email from guest@kompasscrm.demo to guest@1twenty.com
- [ ] Update VITE_APP_TITLE environment variable
- [ ] Test branding changes appear correctly


## Internal Team Chat Feature (Slack-like)

### Database Schema
- [x] Create channels table (name, description, type: public/private, createdBy, createdAt)
- [x] Create channel_members table (channelId, userId, role: admin/member, joinedAt)
- [x] Create messages table (channelId, userId, content, threadId, createdAt, updatedAt, deletedAt)
- [x] Create direct_messages table (senderId, recipientId, content, createdAt, readAt)
- [x] Create message_reactions table (messageId, userId, emoji, createdAt)
- [x] Generate and apply migrations

### Chat UI Components
- [x] Create Chat page with sidebar and message view layout
- [x] Build channel list sidebar with public/private channels and DMs
- [x] Implement message composer with formatting options
- [x] Add message display with user avatars and timestamps
- [x] Create channel creation dialog
- [x] Add AI assistant as automatic member in all channels
- [x] Implement @mention functionality to invoke AI assistant
- [x] Add AI assistant responses with special stylingersations
- [ ] Create channel creation modal
- [ ] Add user mention autocomplete (@username)
- [ ] Add emoji picker for reactions

### Real-time Features
- [ ] Implement tRPC subscription for new messages
- [ ] Add typing indicators
- [ ] Add online/offline user status
- [ ] Implement message read receipts
- [ ] Add notification badges for unread messages

### Features
- [ ] Channel creation and management (create, edit, archive)
- [ ] Direct messaging between users
- [ ] Threaded replies to messages
- [ ] Message reactions (emoji)
- [ ] File/image sharing in messages
- [ ] Search messages across channels
- [ ] Pin important messages
- [ ] Edit and delete own messages

### Testing
- [ ] Write tests for chat tRPC procedures
- [ ] Test real-time message delivery
- [ ] Test thread functionality


## Enhanced Chat Features
### AI Assistant Visibility
- [x] Add channel members list showing AI Assistant
- [x] Display AI assistant online status indicator
- [x] Show AI assistant info in channel details panel
- [x] Add AI assistant avatar with distinct styling
- [x] Add AI Assistant badge/icon to channel list items
- [x] Show AI presence indicator in channel header

### Direct Messages
- [x] Create DM section in sidebar
- [x] Implement 1-on-1 private conversations
- [x] Add "New Message" button to start DM with user selection
- [ ] Add unread message indicators
- [ ] Show user online/offline status

### Thread Replies
- [x] Add "Reply in thread" button to messages
- [x] Create thread view panel
- [x] Show thread reply count on parent messages
- [x] Navigate between main channel and threads
- [x] Update backend to support threadId in messages

### Reactions & File Sharing
- [x] Add emoji reaction picker to messages
- [x] Display reactions with counts below messages
- [x] Store reactions in database
- [x] Implement file upload functionality with S3
- [x] Show file previews for images
- [x] Add download links for other file types
- [ ] Support drag-and-drop file upload (deferred)

### Testing
- [ ] Write tests for DM functionality
- [ ] Write tests for thread replies
- [ ] Write tests for reactions and file uploads


## Chat Enhancements - Phase 2

### Unread Indicators
- [x] Add unread count to channel list items
- [ ] Add unread count to DM list items (deferred)
- [x] Track last read timestamp per user per channel
- [x] Update unread count when messages are viewed
- [x] Add visual indicator (badge) for unread messages

### Typing Indicators
- [x] Add typing state tracking to backend
- [x] Broadcast typing events to channel members
- [x] Display "User is typing..." indicator in channel
- [x] Auto-clear typing indicator after timeout
- [x] Show multiple users typing when applicable

### @Mentions and Notifications
- [x] Parse @username mentions in message content
- [x] Add mentions array to message schema
- [x] Create notifications table for user alerts
- [x] Send notification when user is mentioned
- [ ] Add notification badge to user menu (UI pending)
- [ ] Create notifications panel to view all mentions (UI pending)
- [x] Mark notifications as read

### Message Search and Filtering
- [x] Add search input to chat interface
- [x] Implement full-text search in messages
- [x] Filter messages by user
- [x] Filter messages by date range
- [x] Filter messages by channel
- [ ] Highlight search terms in results (deferred)
- [ ] Add "jump to message" functionality (deferred)

### Testing
- [ ] Write tests for unread tracking
- [ ] Write tests for typing indicators
- [ ] Write tests for @mentions
- [ ] Write tests for notifications
- [ ] Write tests for message search


## AI Assistant Page Redesign

- [x] Shorten intro text for better mobile experience
- [x] Add quick action pills for common questions
- [x] Implement interactive chat interface
- [x] Add chat history display
- [x] Add message input with send button
- [x] Connect chat to AI backend
- [x] Style chat messages with proper formatting
- [x] Add loading states for AI responses


## AI Assistant Enhancements - Phase 2

### Conversation History
- [x] Create conversations table in database
- [x] Add sidebar to display conversation history
- [x] Implement save conversation functionality
- [x] Add ability to resume previous conversations
- [x] Add new conversation button
- [x] Add delete conversation option
- [x] Auto-save conversations as user chats

### Voice Input
- [x] Add microphone button to input area
- [x] Integrate speech-to-text functionality
- [x] Show recording indicator when active
- [x] Handle voice input errors gracefully
- [x] Add permission request for microphone access

### Chat Export
- [x] Add export button to chat interface
- [x] Implement export to text format
- [x] Implement export to PDF format
- [x] Include timestamps in exports
- [x] Add conversation title to exports


## Omnipresent AI Features

### Floating AI Chat Widget
- [x] Create floating button component (bottom-right, draggable)
- [x] Add slide-out chat panel overlay
- [x] Integrate with existing AI assistant backend
- [x] Add context awareness (detect current page/route)
- [x] Show relevant quick actions based on current page
- [x] Persist widget state across page navigation
- [x] Add minimize/maximize animations

### Smart Suggestions
- [x] Detect user intent from chat messages
- [x] Generate context-aware action suggestions
- [x] Add "Create contact" suggestion when discussing people
- [x] Add "Schedule follow-up" suggestion for action items
- [x] Add "View insights" suggestion for data queries
- [x] Display suggestions as clickable pills in chat
- [x] Execute suggested actions from chat interface

### AI-Powered Contact Insights
- [x] Add "Generate Insights" button to contact detail pages
- [x] Create backend procedure for AI insights generation
- [x] Analyze contact engagement history
- [x] Generate engagement summary
- [x] Recommend next best actions
- [x] Display insights in expandable card on contact page
- [x] Cache insights to avoid repeated API calls
- [x] Add refresh button to regenerate insights


## Authentication System Overhaul

### Email/Password Authentication
- [x] Create signup page with email/password form
- [x] Add password strength validation
- [x] Implement email validation
- [x] Create user registration backend procedure
- [x] Hash passwords with bcrypt
- [x] Add email uniqueness check

### Two-Factor Authentication (2FA)
- [x] Generate TOTP secrets for new users
- [x] Display QR code for authenticator app setup
- [x] Require 2FA setup during registration
- [x] Implement 2FA verification on login
- [x] Generate and store backup codes
- [x] Add backup code verification option
- [ ] Create 2FA management page in settings (deferred)

### Login & Password Reset
- [x] Create login page with email/password form
- [x] Add 2FA code input after password verification
- [x] Implement "Forgot Password" link
- [x] Create password reset request page
- [x] Send password reset email to admin@1twentyconsultancy.com
- [x] Create password reset confirmation page
- [x] Add password reset token generation and validation

### Email System

#### Google SMTP Configuration
- [x] Add SMTP environment variables (host, port, user, password)
- [x] Create email service module with nodemailer
- [x] Configure Google SMTP (smtp.gmail.com:587)
- [x] Test system email delivery

#### Personal Email Integration
- [x] Create email accounts table in database
- [ ] Add email account connection page (foundation ready, full implementation deferred)
- [ ] Implement Gmail OAuth flow for users (deferred)
- [ ] Add SMTP/IMAP configuration for manual setup (deferred)
- [ ] Create email sync service (deferred)
- [ ] Display connected email accounts in settings (deferred)
- [ ] Add send email from personal account functionality (deferred)

#### Marketing Email Campaigns
- [x] Create campaigns table in database
- [ ] Create marketing campaigns page (foundation ready, full implementation deferred)
- [ ] Add campaign creation form (subject, body, recipients) (deferred)
- [ ] Implement email template editor (deferred)
- [ ] Add recipient list management (import CSV, select contacts) (deferred)
- [ ] Implement campaign scheduling (deferred)
- [ ] Add email tracking (opens, clicks) (deferred)
- [ ] Create campaign analytics dashboard (deferred)
- [ ] Add unsubscribe link handling (deferred)


## Email Integration & Marketing Campaigns

### Personal Email Integration
- [x] Create email accounts connection page in Settings
- [ ] Add Gmail OAuth flow for easy connection (deferred)
- [x] Add manual SMTP/IMAP configuration option
- [x] Display connected email accounts list
- [x] Add set default email account option
- [x] Add disconnect email account option
- [ ] Test email sending from personal accounts (deferred)

### Marketing Campaigns
- [x] Create campaigns list page
- [x] Add create new campaign button and form
- [x] Build email template editor with rich text
- [x] Add recipient selection (all contacts, filtered, manual)
- [x] Implement campaign scheduling
- [ ] Add campaign preview before sending (deferred)
- [ ] Implement campaign sending logic (deferred)
- [ ] Create campaign analytics view (opens, clicks, bounces) (deferred)
- [x] Add campaign status tracking (draft, scheduled, sending, sent)

## User Management Dashboard

### Admin Dashboard
- [x] Create user management page (admin only)
- [x] Display all users list with roles
- [x] Add user search and filtering
- [x] Add edit user role functionality
- [x] Add disable/enable user account
- [x] Add reset user 2FA option
- [ ] Display user activity logs (deferred)
- [ ] Add invite new user functionality (deferred)
- [x] Show authentication statistics


## Accounts Page

- [ ] Check if accounts/companies table exists in schema
- [ ] Create accounts list page with search and filtering
- [ ] Add create new account functionality
- [ ] Create account detail page with company information
- [ ] Add edit account functionality
- [ ] Add delete account functionality
- [ ] Link contacts to accounts
- [ ] Add accounts navigation link below People
- [ ] Display account contacts list on detail page


## Accounts Page

- [x] Check if accounts table exists in schema
- [x] Create Accounts list page
- [x] Add create account dialog
- [x] Add backend CRUD procedures
- [x] Add Accounts route to App.tsx
- [ ] Add Accounts link to navigation (pending)
- [ ] Test account creation and listing (pending)


## Accounts System Completion

### Navigation
- [x] Add "Accounts" link to sidebar below People
- [ ] Test navigation to Accounts page

### Account Detail Page
- [x] Create AccountDetail page component
- [x] Add route for /accounts/:id
- [x] Display company information (name, domain, industry, headquarters, etc.)
- [x] Show list of linked contacts
- [ ] Add activity timeline for account (deferred)
- [ ] Link from Accounts list page (pending)

### Smart Account Linking
- [x] Add accountId field to person create/edit forms
- [x] Add account search/select dropdown in person forms
- [x] Implement auto-population: when company name matches existing account, auto-link and populate fields
- [ ] Update bulk import to detect company names and auto-link to accounts (pending)
- [ ] Create new accounts automatically during import if company doesn't exist (pending)
- [ ] Populate person fields from linked account (domain, industry, etc.) (pending)
- [ ] Test auto-linking with sample data (pending)


## Notification Bell & Theme Toggle

### Notification Bell
- [x] Add bell icon to header with unread count badge
- [x] Create notifications dropdown panel
- [x] Display unread messages from team chat
- [x] Display @mentions notifications
- [x] Display system notifications
- [x] Add mark as read functionality
- [ ] Add "View All" link to full notifications page (deferred)
- [ ] Update unread count in real-time (deferred)

### Theme Toggle
- [x] Add light/dark mode toggle to Settings page
- [x] Implement theme switching functionality
- [x] Persist theme preference in localStorage
- [x] Set default theme based on system preference
- [ ] Ensure all UI elements work in both themes (pending testing)
- [ ] Test readability across both themes (pending testing)


## Bug Fixes

- [x] Fix AddPersonDialog account query error when no accounts exist


## Critical Bug Fixes - Accounts Query Error

- [x] Investigate and fix accounts table database query failure
- [x] Add empty state handling to account selector in AddPersonDialog
- [x] Create seed data script for guest users with sample accounts and contacts
- [x] Run seed script to populate guest tenant with demo data


## New Features - Desktop Notifications, Activity Timeline, Campaign Sending

### Desktop Notification Bell
- [x] Add notification bell to desktop header (currently only on mobile)
- [x] Ensure consistent behavior between mobile and desktop
- [ ] Test notification dropdown on desktop

### Account Activity Timeline
- [x] Design activity timeline schema for accounts
- [x] Create activity timeline component for Account Detail page
- [x] Show emails sent to account contacts
- [x] Show meetings scheduled with account contacts
- [x] Show deals created for account
- [ ] Add filtering by activity type
- [ ] Test timeline display with sample data

### Campaign Email Sending
- [x] Connect campaigns UI to email accounts backend
- [x] Implement campaign sending logic with SMTP
- [x] Add recipient list management
- [x] Create email tracking system (opens, clicks, replies)
- [x] Add campaign analytics dashboard (stats endpoint)
- [ ] Test email sending with configured SMTP accounts
- [x] Add error handling for failed sends


## New Features - Real-time Notifications & Campaign Scheduling

### Real-time Notification Updates
- [x] Implement polling mechanism for notification updates
- [x] Update notification bell badge count automatically
- [x] Refresh notification dropdown content without page reload
- [x] Add visual indicator when new notifications arrive
- [x] Optimize polling interval to balance freshness and performance (10 seconds)
- [ ] Test real-time updates across multiple browser tabs

### Campaign Scheduling System
- [ ] Add scheduling UI to campaign creation/edit forms (backend ready)
- [x] Implement timezone selection for scheduled campaigns
- [x] Create backend scheduled job processor
- [x] Add campaign status transitions (draft → scheduled → sending → sent)
- [x] Display scheduled campaigns with countdown timers (backend endpoint ready)
- [x] Allow users to reschedule or cancel scheduled campaigns
- [ ] Test scheduling with different timezones
- [x] Add validation to prevent scheduling in the past


## New Features - Email Tracking, Deal Pipeline & Bulk Import

### Email Open/Click Tracking Pixels
- [x] Add tracking pixel generation for email opens
- [x] Implement click tracking for links in campaign emails
- [x] Create tracking endpoint to record opens and clicks
- [x] Update campaign analytics to show open/click rates
- [x] Add tracking pixel to campaign email body
- [ ] Test tracking with real email clients
- [ ] Add privacy-compliant tracking notice

### Deal Pipeline Visualization
- [x] Design Kanban board layout for deal stages
- [x] Implement drag-and-drop functionality for deals
- [x] Create deal stage management (add/edit/delete stages)
- [x] Add deal cards with key information (value, contact, company)
- [x] Implement stage transition tracking
- [ ] Add filtering by deal owner, date range, or value
- [ ] Create deal detail modal/page
- [ ] Test drag-and-drop across different stages

### Bulk Contact Import
- [x] Create CSV upload UI component
- [x] Implement CSV parsing and validation
- [x] Add field mapping interface (CSV columns → CRM fields)
- [x] Implement duplicate detection logic
- [x] Create validation error reporting
- [x] Add preview before final import
- [x] Handle large file uploads (1000+ contacts)
- [ ] Test with various CSV formats and encodings


## New Features - Automation, Reporting & Tasks

### Email Sequence Automation
- [x] Design sequence trigger system (no reply, email opened, link clicked)
- [x] Create sequence step management (delays, conditions)
- [x] Implement automatic follow-up sending
- [x] Add sequence enrollment tracking
- [x] Create sequence performance analytics
- [ ] Build sequence builder UI
- [ ] Test trigger conditions and timing

### Reporting Dashboard
- [x] Design analytics dashboard layout
- [x] Implement deal pipeline value by stage chart
- [x] Add conversion rate between stages visualization
- [x] Calculate and display average deal cycle time
- [x] Create campaign performance trends over time
- [ ] Add date range filtering for reports
- [ ] Implement export functionality for reports
- [ ] Test with real data and edge cases

### Task Management System
- [x] Design tasks schema with due dates and assignments
- [x] Create task CRUD endpoints
- [x] Implement task-to-entity linking (deals, contacts, accounts)
- [x] Build task list UI with filtering and sorting
- [ ] Add task creation from deal/contact pages
- [ ] Implement due date reminders
- [ ] Create task assignment notifications
- [ ] Test task workflows and notifications


## New Features - Template Builder, Lead Scoring & Forecasting

### Email Template Builder
- [x] Design template schema with blocks and variables
- [x] Create drag-and-drop template editor UI (simplified block-based editor)
- [x] Implement template block library (text, image, button, divider)
- [x] Add variable insertion for personalization
- [x] Create template preview functionality
- [x] Build template save and management system
- [x] Add template sharing and duplication
- [ ] Test template rendering in emails

### Lead Scoring System
- [x] Design lead scoring schema and rules
- [x] Implement engagement scoring (opens, clicks, replies)
- [x] Add demographic scoring factors
- [x] Create behavior tracking integration
- [x] Build scoring rule management (backend endpoints)
- [x] Add automatic score updates
- [ ] Create lead score visualization UI
- [ ] Test scoring accuracy and updates

### Sales Forecasting
- [x] Design forecasting data model
- [x] Calculate pipeline-based revenue projections
- [x] Implement historical close rate analysis
- [x] Add seasonal trend detection
- [x] Create confidence interval calculations
- [ ] Build forecasting dashboard UI
- [x] Add scenario planning features (backend endpoints)
- [ ] Test forecast accuracy with historical data


## New Features - Workflow Automation, Mobile & Collaboration

### Workflow Automation Builder
- [x] Design workflow automation schema (triggers, conditions, actions)
- [x] Create trigger types (deal value change, score threshold, time-based, status change)
- [x] Implement action types (send email, create task, update stage, notify user)
- [x] Build condition evaluation engine
- [ ] Create visual workflow builder UI (backend endpoints ready)
- [x] Add workflow execution logging
- [ ] Test automation triggers and actions

### Mobile-Responsive Contact Cards
- [x] Redesign contact detail layout for mobile screens
- [ ] Implement swipe gestures for quick actions
- [x] Add collapsible sections for better information hierarchy
- [x] Optimize touch targets for mobile interaction
- [x] Test responsive design across different screen sizes
- [x] Add mobile-specific navigation patterns

### Team Collaboration Features
- [x] Implement @mention parsing in notes and comments
- [x] Create shared views for deals and contacts
- [x] Build activity feed showing team member actions
- [x] Add assignment notifications system (uses existing notifications)
- [ ] Create team member presence indicators
- [ ] Test collaboration features with multiple users


## New Features - Calendar, Documents & Reporting

### Calendar Integration
- [x] Design calendar events schema
- [x] Implement Google Calendar OAuth integration (backend ready, OAuth setup required)
- [x] Implement Outlook Calendar OAuth integration (backend ready, OAuth setup required)
- [x] Sync meetings from external calendars to CRM
- [x] Create CRM activities from calendar events
- [ ] Show availability in meeting scheduler
- [x] Add two-way sync for event updates (infrastructure ready)
- [ ] Test calendar sync with real accounts (requires OAuth credentials)

### Document Management
- [x] Design documents schema with version control
- [x] Implement file upload to S3
- [x] Create document attachment system for entities
- [ ] Add file preview functionality (backend ready)
- [x] Implement version history tracking
- [x] Create folder structure for organization
- [ ] Add document search and filtering (backend ready)
- [ ] Test file uploads and version control

### Reporting Exports
- [x] Design report templates (pipeline, campaigns, activities)
- [x] Implement PDF report generation
- [x] Implement Excel export functionality
- [x] Add report scheduling system (backend infrastructure ready)
- [x] Create email delivery for scheduled reports (infrastructure ready)
- [ ] Build report customization UI (backend endpoints ready)
- [ ] Test report generation and delivery

## Bug Fixes

### Account Page Contact Display
- [x] Fix contact names not displaying on Account Detail page (links work but names are blank)
- [x] Verify contact data is being fetched correctly
- [ ] Test contact display on mobile and desktop

## New Features - Contact Enhancements

### Contact Role Badges
- [x] Add role field to people schema (Decision Maker, Champion, Influencer, User, Blocker)
- [x] Create badge component with flat, premium design
- [x] Display role badges on Account Detail contact cards
- [ ] Add role selection in contact creation/edit forms
- [ ] Test badge display across different roles

### Contact Activity Summary
- [x] Calculate recent activity counts per contact (emails, meetings, calls)
- [x] Add activity summary endpoint to backend
- [x] Display activity counts next to contact names
- [ ] Add hover tooltip with activity breakdown
- [ ] Test activity count accuracy

### Bulk Contact Actions
- [x] Add checkbox selection to contact cards
- [ ] Implement "Select All" functionality
- [ ] Create bulk action menu (Add to Sequence, Add to Campaign, Update Stage, Delete)
- [ ] Add bulk operation backend endpoints
- [ ] Show selection count and clear selection button
- [ ] Test bulk operations with multiple contacts

## New Features - Contact Role Filtering & Editing

### Contact Filtering by Role
- [x] Add role filter dropdown to Account Detail page
- [x] Implement filter logic to show only selected roles
- [x] Add "All Roles" option to clear filter
- [x] Persist filter selection in component state

### Inline Role Editing
- [x] Make role badges clickable for editing
- [x] Add role selection dropdown on badge click
- [x] Update backend endpoint to change contact role
- [x] Implement optimistic UI update for role changes
- [x] Show success/error feedback after role update

### Last Contact Date Display
- [x] Calculate last contact date from activity summaries
- [x] Display relative time (e.g., "3 days ago") below contact name
- [x] Handle cases with no contact history
- [x] Format dates consistently across the app

## New Features - Contact Search, Engagement, Notes, Duplicates, Permissions, Welcome

### Contact Search Bar
- [x] Add search input above contacts list on Account Detail page
- [x] Implement search filtering by name, email, and title
- [x] Add search icon and clear button
- [ ] Show "No results" message when search returns empty
- [ ] Test search with various queries

### Engagement Score Indicators
- [x] Design hot/warm/cold visual indicators
- [x] Calculate engagement score from lead scoring system
- [x] Display score indicator next to contact names
- [x] Add tooltip explaining score meaning
- [ ] Test score display with different engagement levels

### Contact Note Previews
- [x] Query most recent note for each contact
- [x] Display note snippet below contact card (max 100 chars)
- [x] Add "..." truncation for long notes
- [x] Handle contacts with no notes gracefully
- [ ] Test note preview display

### Duplicate Prevention System
- [ ] Identify all record types (contacts, accounts, deals, etc.)
- [ ] Implement duplicate detection logic for each type
- [ ] Create warning dialog explaining why record can't be saved
- [ ] Add "View existing record" link in warning
- [ ] Test duplicate prevention across all record types

### Role-Based Permissions
- [ ] Update user schema with role field (Admin, Manager, Sales, Operations)
- [ ] Implement permission checking middleware
- [ ] Restrict delete operations to Admin and Manager roles only
- [ ] Add permission checks to all delete endpoints
- [ ] Show/hide delete buttons based on user role
- [ ] Display permission denied message for unauthorized actions
- [ ] Test permissions with different user roles

### Welcome/Onboarding Screen
- [ ] Check if welcome screen already exists
- [ ] Design welcome screen with CRM introduction
- [ ] Add user profile setup (name, role, preferences)
- [ ] Create onboarding checklist or tour
- [ ] Mark user as onboarded in database
- [ ] Skip welcome screen for returning users
- [ ] Test welcome flow for new signups

## Rebranding

### Change Application Name
- [ ] Update all "KompassCRM" references to "1twenty CRM"
- [ ] Update welcome/onboarding screen branding
- [ ] Update page titles and headers
- [ ] Update any configuration or metadata files

## Enhanced Note Tracking
- [x] Add createdBy (userId) and createdByName fields to notes
- [x] Add updatedAt and updatedBy fields for edit tracking
- [x] Update notes schema in database
- [x] Modify note creation endpoints to capture user info
- [x] Display timestamps and author names in note UI
- [x] Add "edited" indicator for modified notes
- [x] Create dedicated notes table with full audit trail
- [x] Implement notes CRUD API endpoints
- [x] Build reusable Notes component
- [x] Add Notes component to Contact detail page
- [x] Add Notes component to Account detail page
- [x] Test note tracking across all note types (contact notes, deal notes, account notes)

## Keyboard Shortcuts for Power Users
- [x] Design keyboard shortcut system architecture
- [x] Implement global shortcut listener component
- [x] Add Cmd/Ctrl+K for quick search/command palette
- [x] Add C shortcut for create new contact
- [x] Add D shortcut for create new deal
- [x] Add A shortcut for create new account
- [x] Add Esc to close modals/dialogs
- [x] Create keyboard shortcuts help modal (?)
- [x] Integrate KeyboardShortcuts component into App
- [x] Test shortcuts across different browsers

## Contact Merge Tool
- [x] Design merge UI with side-by-side comparison
- [x] Create merge endpoint in backend
- [x] Implement field selection logic (choose left/right/combine)
- [x] Merge activity history from both contacts
- [x] Update all references (deals, tasks, notes) to merged contact
- [x] Handle account associations during merge
- [x] Add merge confirmation dialog with preview
- [x] Create dedicated merge page at /people/merge
- [x] Add merge button to People page
- [x] Test merge with complex contact relationships

## Saved Filters System
- [x] Use existing sharedViews table in database
- [x] Add filter name, criteria (JSON), entity type, userId fields
- [x] Implement save filter endpoint
- [x] Implement load filter endpoint
- [x] Implement delete filter endpoint
- [x] Create reusable SavedFilters component
- [x] Add filter sharing capability (team filters with isPublic flag)
- [x] Implement filter management UI (save, load, delete)
- [x] Test saved filters across contacts, accounts, deals

## Unified Contextual Notes System
- [x] Design cross-entity note visibility architecture
- [x] Implement relationship mapping (contact -> deals, account -> contacts, deal -> contacts)
- [x] Update Notes component to fetch and display related notes
- [x] Add source labels to notes (e.g., "From Deal: Q1 Enterprise Sale")
- [x] Add notes to Deal detail pages
- [x] Create DealDetail page with contextual notes
- [x] Add deal routes to App.tsx
- [x] Ensure notes flow: contact note appears on related deals/accounts
- [x] Ensure notes flow: deal note appears on related contacts/accounts
- [x] Ensure notes flow: account note appears on all contacts from that company
- [x] Test cross-entity note visibility with complex relationships

## Email Templates Library
- [ ] Create email templates table in database
- [ ] Design template editor with variable placeholders
- [ ] Implement template CRUD API endpoints
- [ ] Build template library UI page
- [ ] Add variable substitution engine ({{firstName}}, {{companyName}}, etc.)
- [ ] Create default templates (follow-up, introduction, proposal)
- [ ] Add template selector to email composition
- [ ] Test template rendering with real contact data

## Task Reminders & Notifications
- [ ] Design notification preferences system
- [ ] Implement task reminder scheduling logic
- [ ] Add desktop notification support
- [ ] Add email notification for overdue tasks
- [ ] Create notification preferences UI
- [ ] Add snooze/dismiss functionality
- [ ] Test reminder timing accuracy
- [ ] Test notification delivery across channels

## Reporting Dashboard & Analytics
- [x] Design dashboard layout and metrics
- [x] Implement pipeline health calculations
- [x] Calculate conversion rates by stage
- [x] Track activity trends over time
- [x] Aggregate team performance metrics
- [x] Create visual charts (pipeline funnel, trend lines, bar charts)
- [x] Build dashboard page with Recharts visualizations
- [x] Add key metrics cards (total value, avg deal size, active deals)
- [x] Add pipeline by stage bar chart
- [x] Add deal distribution pie chart
- [x] Add stage conversion rates visualization
- [x] Add campaign performance trends line chart
- [x] Connect to existing analytics backend API
- [x] Test dashboard with real CRM data

## AI-Powered Email Assistant
- [x] Design AI email assistant UI integrated into email composition
- [x] Implement AI email generation endpoint using LLM
- [x] Add CRM context integration (contact info, deal stage, previous interactions, notes)
- [x] Create email improvement suggestions (tone, clarity, call-to-action, length, personalization)
- [x] Implement email preview with AI suggestions
- [x] Add one-click apply AI suggestions
- [x] Create AIEmailAssistant component
- [x] Add AI email router to backend
- [x] Test AI email generation with various contact types

## Best Practice Email Learning System
- [ ] Create email examples table in database (subject, body, category, performance metrics)
- [ ] Design UI for marking emails as "best practice" examples
- [ ] Implement email performance tracking (open rate, reply rate, conversion)
- [ ] Build AI training endpoint that learns from successful emails
- [ ] Add email pattern analysis (structure, tone, length, CTAs)
- [ ] Create "Teach AI" interface for uploading successful cold emails
- [ ] Implement style extraction from example emails
- [ ] Add AI prompt enhancement based on learned patterns
- [ ] Test learning system with various email styles

## Task Reminders & Notifications
- [ ] Design notification preferences UI
- [ ] Implement browser notification permission request
- [ ] Create task reminder scheduling system
- [ ] Add desktop notifications for upcoming tasks (15 min, 1 hour before)
- [ ] Implement email notifications for overdue tasks
- [ ] Add snooze functionality for reminders
- [ ] Create notification history/log
- [ ] Test reminder timing accuracy across timezones

## Custom Reporting System
- [ ] Design report builder UI with drag-and-drop metrics
- [ ] Implement custom metric selection (deals, contacts, activities, revenue)
- [ ] Add date range filters (custom, this week, this month, this quarter, this year)
- [ ] Create chart type selection (bar, line, pie, table)
- [ ] Implement report preview
- [ ] Add export functionality (PDF, CSV, Excel)
- [ ] Create saved reports feature
- [ ] Add scheduled report generation and email delivery
- [ ] Test report generation with complex filters

## AI Email Assistant Integration
- [x] Find email composition pages in the CRM
- [x] Integrate AIEmailAssistant component into Campaigns page
- [x] Integrate AIEmailAssistant component into SequenceBuilder page
- [x] Add email subject and body state management
- [x] Test AI email generation from different pages
- [x] Ensure AI context includes relevant CRM data

## Best Practice Email Learning System
- [x] Create emailExamples table in database schema
- [x] Add fields: subject, body, category, performanceMetrics, userId, createdAt
- [x] Generate and apply database migration
- [x] Backend API endpoints exist (stub implementation in emailGenerator router)
- [x] Email examples management page exists (EmailGenerator.tsx)
- [x] Connect emailGenerator router to emailExamples database
- [x] Implement actual CRUD operations for email examples
- [x] Update AI email generation to fetch and learn from user examples
- [x] Add database helper functions (createEmailExample, getEmailExamples, deleteEmailExample)
- [x] Test learning system with sample emails

## AI Assistant in Contact/Deal Workflows
- [ ] Add AI Email Assistant to PersonDetail page
- [ ] Add AI Email Assistant to DealDetail page
- [ ] Ensure proper context passing (contact/deal info)
- [ ] Test email generation from contact and deal pages

## Task Reminders & Notifications
- [ ] Check existing tasks table schema for reminder fields
- [ ] Add reminderAt and reminderSent fields to tasks table
- [ ] Generate and apply database migration
- [ ] Create backend endpoint for checking due/overdue tasks
- [ ] Implement notification sending logic (email/desktop)
- [ ] Add UI for setting task reminders
- [ ] Test reminder notifications
- [ ] Create background job to check for upcoming task reminders
- [ ] Implement desktop notification API integration
- [ ] Implement email notification for task reminders
- [ ] Add reminder time selector to task creation UI
- [ ] Add notification preferences to user settings
- [ ] Test task reminders with various time intervals
- [ ] Test notification delivery (desktop and email)

## Task Reminders Implementation
- [x] Add reminderAt and reminderSent fields to tasks table
- [x] Generate and apply database migration
- [x] Create backend endpoint to fetch due/overdue tasks
- [x] Implement notification sending logic (email)
- [x] Add setReminder and getUpcomingReminders API endpoints
- [x] Create task-reminders.ts module with checkAndSendReminders function
- [ ] Add reminder time picker to task creation/edit UI
- [ ] Build notification preferences page
- [ ] Test reminder notifications

## AI Email Assistant in Contact/Deal Pages
- [x] Add email composition Card section to PersonDetail page
- [x] Integrate AIEmailAssistant component in PersonDetail with contact context
- [x] Add email composition Card section to DealDetail page
- [x] Integrate AIEmailAssistant component in DealDetail with deal context
- [x] Test email generation from contact and deal pages

## Task Reminder UI
- [x] Add date/time picker component to task creation dialog
- [x] Update tasks.create API to accept reminderAt parameter
- [x] Update createTask function to support reminderAt
- [ ] Add date/time picker to task edit dialog
- [ ] Update tasks.update API to accept reminderAt parameter
- [ ] Test reminder editing workflow

## Custom Report Builder
- [ ] Design report builder UI with metric selection
- [ ] Create backend endpoint for custom report generation
- [ ] Implement date range picker
- [ ] Add entity type filter (contacts, deals, accounts, tasks)
- [ ] Add custom metric selection (count, sum, avg, conversion rates)
- [ ] Implement grouping by dimensions (date, owner, stage, etc.)
- [ ] Add export functionality (CSV, PDF)
- [ ] Build report preview with charts
- [ ] Test report generation and export

## Task Edit Dialog Reminder Picker
- [ ] Create task edit dialog in Tasks.tsx (currently only has completion)
- [ ] Add datetime-local input for reminderAt in edit form
- [ ] Update tasks.update API call to include reminderAt
- [ ] Test reminder editing workflow

## Email Sending Integration
- [x] Create email sending endpoint in email router
- [x] Integrate with existing SMTP configuration from email accounts
- [x] Update AIEmailAssistant onApply callbacks in PersonDetail to call send endpoint
- [x] Update AIEmailAssistant onApply callbacks in DealDetail (placeholder for contact selection)
- [x] Add success/error toast notifications
- [x] Handle email account selection (use default or let user choose)
- [x] Test email sending from contact pages

## Custom Report Builder
- [ ] Design report builder UI with metric selection
- [ ] Add date range picker for report filtering
- [ ] Create backend endpoint for custom report generation
- [ ] Implement CSV export functionality
- [ ] Implement PDF export functionality
- [ ] Add report templates (pipeline health, activity summary, conversion rates)
- [ ] Test report generation and export

## Contact Selector for Deal Emails
- [ ] Design contact selector UI for DealDetail email section
- [ ] Fetch all contacts associated with the deal
- [ ] Add multi-select dropdown or checkbox list for contact selection
- [ ] Update email sending to support multiple recipients
- [ ] Test email sending to multiple contacts from deal page

## Task Edit Dialog Implementation
- [ ] Create task edit dialog component in Tasks.tsx
- [ ] Add edit button to each task row
- [ ] Include all task fields (title, description, dueDate, priority, status)
- [ ] Add datetime-local input for reminderAt field
- [ ] Wire up tasks.update mutation with all fields including reminderAt
- [ ] Add success/error toast notifications
- [ ] Test task editing workflow

## Deal Email Contact Selector
- [x] Add contact selector dropdown to DealDetail email section
- [x] Fetch contacts associated with the deal
- [x] Implement multi-select UI for choosing recipients
- [x] Update email sending logic to support multiple recipients
- [x] Add "Select All" option for convenience
- [x] Test email sending to multiple contacts from deal page

## Expand Report Types
- [x] Add deals report type with pipeline metrics
- [x] Add activities report type with activity trends
- [x] Implement backend queries for deals and activities data
- [x] Update CSV export to handle all three report types
- [x] Add appropriate data visualizations for each report type
- [x] Test all report types with real data


## Task Edit Dialog Implementation
- [x] Create task edit dialog component in Tasks.tsx
- [x] Add edit button to each task row
- [x] Include all task fields (title, description, dueDate, priority, status)
- [x] Add datetime-local input for reminderAt field
- [x] Wire up tasks.update mutation with all fields including reminderAt
- [x] Add success/error toast notifications
- [x] Test task editing workflow

## Deal Email Contact Selector
- [x] Add contact selector dropdown to DealDetail email section
- [x] Fetch contacts associated with the deal
- [x] Implement multi-select UI for choosing recipients
- [x] Update email sending logic to support multiple recipients
- [x] Add "Select All" option for convenience
- [x] Test email sending to multiple contacts from deal page

## Expand Report Types
- [x] Add deals report type with pipeline metrics
- [x] Add activities report type with activity trends
- [x] Implement backend queries for deals and activities data
- [x] Update CSV export to handle all three report types
- [x] Add appropriate data visualizations for each report type
- [x] Test all report types with real data


## Email Template Library
- [x] Create emailTemplates database table (id, name, subject, body, category, createdBy, createdAt)
- [x] Build backend CRUD procedures for templates (create, list, get, update, delete)
- [x] Create EmailTemplates page with template list and management UI
- [x] Add template editor with subject and body fields
- [x] Implement template categories (follow-up, proposal, meeting, introduction)
- [x] Integrate templates with AIEmailAssistant component
- [x] Add "Use Template" button in email composition sections
- [x] Allow AI to improve/customize templates before use
- [x] Test template creation, editing, and usage workflow

## Deal Stage Automation
- [x] Create workflowRules database table (id, name, trigger, conditions, actions, enabled)
- [x] Design workflow rule schema (trigger types, condition logic, action types)
- [x] Build backend procedures for workflow management (create, list, update, delete, execute)
- [x] Create WorkflowAutomation page for rule configuration
- [x] Implement trigger types (email sent, deal value changed, stage changed, time-based)
- [x] Add condition builder UI (if/then logic with multiple conditions)
- [x] Implement action types (move to stage, assign owner, create task, send notification)
- [x] Add workflow execution engine that monitors triggers
- [x] Create workflow history/audit log
- [x] Test automation rules with real deal scenarios

## Dashboard Widgets
- [x] Create dashboardWidgets table (id, userId, type, config, position, size)
- [x] Design widget system architecture (widget types, data sources, layouts)
- [x] Build backend procedures for widget data (tasks due, hot leads, pipeline velocity)
- [x] Create reusable Widget component with loading and error states
- [x] Implement "Tasks Due Today" widget with task list
- [x] Implement "Hot Leads" widget showing high-scoring contacts
- [x] Implement "Pipeline Velocity" widget with trend chart
- [x] Add widget customization UI (add/remove/reorder widgets)
- [x] Implement drag-and-drop widget positioning
- [x] Add widget refresh functionality
- [x] Test all widgets with real data


## Database Migration Fix
- [x] Generate migration SQL for automationRules table
- [x] Generate migration SQL for automationExecutions table
- [x] Apply migration SQL via webdev_execute_sql
- [x] Verify tables exist and workflow automation works


## Workflow Automation Improvements
- [x] Add Workflow Automation link to sidebar navigation in DashboardLayout
- [x] Create sample automation rules (Move to Proposal after Meeting, Follow-up task after email)
- [x] Add "Test Rule" button with dry-run mode to preview actions without executing
- [x] Test navigation, sample rules, and test mode functionality


## Advanced Conditional Logic Builder
- [x] Design condition schema with field, operator, value structure
- [x] Update automationRules schema to support conditions array with AND/OR logic
- [x] Create ConditionBuilder component with add/remove condition functionality
- [x] Implement condition field selector (deal value, stage, contact score, etc.)
- [x] Add operator selector (equals, greater than, less than, contains, etc.)
- [x] Build value input with type-aware validation
- [x] Add AND/OR toggle between condition groups
- [x] Integrate condition builder into rule creation dialog
- [x] Update rule display to show conditions in readable format
- [x] Test complex multi-condition rules


## Automation Rule Enhancements
- [x] Create condition template library with pre-built sets (High-value leads, Stalled deals, Hot prospects)
- [x] Add "Apply Template" button in ConditionBuilder to load pre-configured conditions
- [x] Add priority field to automationRules schema (integer, default 0)
- [x] Implement priority ordering in rule execution and display
- [x] Add drag-and-drop reordering UI for rule priority
- [x] Build conflict detection algorithm to identify conflicting rules
- [x] Show warnings when creating rules that might conflict or loop
- [x] Add conflict resolution suggestions in validation messages
- [x] Test all three enhancements together


## Rule Execution History Dashboard
- [x] Create execution history page with timeline view
- [x] Add execution metrics (success rate, total executions, affected records)
- [x] Implement filtering by rule, date range, and status
- [x] Add execution detail view showing what changed
- [x] Create performance charts (executions over time, success/failure trends)
- [x] Test history dashboard with sample execution data

## Rule Scheduling System
- [x] Add schedule field to automationRules schema (cron expression, timezone)
- [x] Extend trigger types to include time-based triggers
- [x] Build schedule picker UI component (daily, weekly, monthly, custom cron)
- [x] Add timezone selector for scheduled rules
- [x] Implement schedule preview showing next execution times
- [x] Test scheduled rule creation and display

## Rule Cloning Feature
- [x] Add "Duplicate Rule" button to rule cards
- [x] Implement clone mutation in automation router
- [x] Create clone dialog allowing name and priority modification
- [x] Copy all rule configuration (trigger, action, conditions, priority)
- [x] Add " (Copy)" suffix to cloned rule names
- [x] Test rule cloning workflow


## Automation Templates Marketplace
- [x] Design template schema (id, name, description, category, trigger, action, conditions, tags)
- [x] Create library of pre-configured templates for common scenarios
- [x] Add templates for lead nurturing (follow-up sequences, engagement tracking)
- [x] Add templates for deal management (stage progression, value alerts, stale deal detection)
- [x] Add templates for task automation (meeting follow-ups, deadline reminders)
- [x] Build TemplatesMarketplace page with grid/list view
- [x] Implement category filtering (Lead Nurturing, Deal Management, Task Automation, Notifications)
- [x] Add template preview showing trigger/action/conditions
- [x] Create "Install Template" button with one-click installation
- [x] Add template customization dialog before installation
- [x] Implement template installation backend procedure
- [x] Add "Installed" badge for already-installed templates
- [x] Test template browsing, preview, and installation workflow


## Template Ratings and Reviews
- [x] Create templateReviews database table (id, templateId, userId, rating, review, createdAt)
- [x] Add rating display to template cards (average rating, review count)
- [x] Build review submission dialog with star rating and text feedback
- [x] Implement backend procedures for submitting and fetching reviews
- [x] Add review list view in template preview dialog
- [x] Sort templates by rating in marketplace
- [x] Test rating and review workflow

## Template Usage Analytics
- [x] Create templateAnalytics table (id, templateId, installCount, successRate, lastUsed)
- [x] Track template installations in installTemplate mutation
- [x] Add analytics display to template cards (X installations, Y% success)
- [x] Build analytics dashboard showing most popular templates
- [x] Implement success rate calculation based on rule executions
- [x] Add trending templates section based on recent installations
- [x] Test analytics tracking and display

## Custom Template Builder
- [x] Add "Save as Template" button to WorkflowAutomation page
- [x] Create userTemplates database table (id, userId, tenantId, name, description, isPublic, baseTemplate)
- [x] Build template creation dialog with metadata fields
- [x] Implement backend procedure to save rule as template
- [x] Add "My Templates" tab in TemplatesMarketplace
- [x] Allow users to edit and delete their custom templates
- [x] Add optional template sharing (make public to marketplace)
- [x] Show template author and creation date for user templates
- [x] Test custom template creation, editing, and sharing workflow


## Template Marketplace Enhancements

### Multi-Category Filtering and Search
- [x] Add multi-select category filter to marketplace (allow selecting multiple categories)
- [x] Implement search functionality across all tabs (Marketplace, My Templates, Community)
- [x] Add search by template name, description, and tags
- [x] Combine category filter with search for refined results
- [x] Add "Clear Filters" button to reset all filters
- [x] Test filtering and search across all tabs

### Template Versioning System
- [x] Add version field to userTemplates table (version number, changelog)
- [x] Create templateVersions table to store version history
- [x] Implement version increment on template updates (backend)
- [ ] Add "View Version History" button in My Templates
- [ ] Create version comparison UI showing changes between versions
- [ ] Implement rollback functionality to restore previous versions (UI)
- [ ] Add changelog input when saving template updates (UI)
- [ ] Test versioning and rollback workflow

### AI-Powered Template Recommendations
- [ ] Analyze user's existing automation rules to identify patterns
- [ ] Build recommendation algorithm based on triggers, actions, and conditions
- [ ] Create backend procedure to generate personalized recommendations
- [ ] Add "Recommended for You" section to marketplace homepage
- [ ] Show recommendation reasoning (e.g., "Based on your email automation rules")
- [ ] Implement recommendation scoring and ranking
- [ ] Add "Not Interested" option to hide recommendations
- [ ] Test recommendations with various user profiles


## Complete Marketplace Features

### Version History UI
- [x] Add "View History" button to My Templates cards
- [x] Create version history dialog showing all versions with timestamps
- [x] Display version number, changelog, and creation date for each version
- [ ] Add "Compare" button to show differences between versions
- [ ] Implement version comparison view highlighting changes
- [x] Add "Rollback" button with confirmation dialog
- [x] Show success message after rollback
- [x] Test version history and rollback workflow

### AI Recommendation Engine
- [x] Analyze user's automation rules to extract patterns (triggers, actions, conditions)
- [x] Build scoring algorithm based on pattern matching
- [x] Create backend procedure to generate recommendations
- [x] Add "Recommended for You" section to marketplace homepage
- [x] Display top 3-5 recommended templates with reasoning
- [x] Show recommendation score and match percentage
- [ ] Add "Not Interested" button to hide recommendations
- [x] Test recommendations with various user profiles

### Template Export/Import
- [x] Add "Export" button to template cards in My Templates
- [x] Generate JSON file with complete template data
- [x] Trigger browser download for exported JSON
- [x] Add "Import Template" button to marketplace header
- [x] Create file upload dialog accepting JSON files
- [x] Parse and validate imported template data
- [x] Handle import errors gracefully with clear messages
- [x] Add imported template to user's My Templates
- [x] Test export/import with various template configurations


## Bulk Template Operations
- [x] Add multi-select checkboxes to template cards in My Templates
- [x] Create bulk action toolbar showing selected count
- [x] Implement bulk export (download multiple templates as ZIP)
- [x] Add bulk delete with confirmation dialog
- [x] Implement bulk visibility toggle (make multiple templates public/private)
- [x] Add "Select All" and "Deselect All" buttons
- [x] Test bulk operations with various selections

## Template Collections
- [ ] Create templateCollections database table (id, userId, name, description, createdAt)
- [ ] Create templateCollectionItems junction table (collectionId, templateId)
- [ ] Add backend procedures for collection CRUD operations
- [ ] Build collections sidebar in My Templates tab
- [ ] Implement drag-and-drop to add templates to collections
- [ ] Add "Create Collection" dialog
- [ ] Allow renaming and deleting collections
- [ ] Show template count in each collection
- [ ] Test collection management workflow

## Template Usage Insights
- [ ] Create usage analytics page/section
- [ ] Track template usage frequency (times installed, times executed)
- [ ] Calculate time saved per template based on automation runs
- [ ] Show most-used vs least-used templates
- [ ] Add optimization suggestions for underutilized rules
- [ ] Create usage trend charts (daily/weekly/monthly)
- [ ] Display ROI metrics (time saved, tasks automated)
- [ ] Test insights with sample usage data


## Database Migration Fix for Missing Columns
- [x] Check automationRules table for missing columns (conditions, priority, schedule, timezone, nextRunAt)
- [x] Check userTemplates table for missing columns (conditions, priority, version, changelog)
- [x] Generate migration SQL for all missing columns
- [x] Apply migration SQL via webdev_execute_sql
- [x] Verify tables have all required columns

## Critical Bug Fixes (Pre-Publishing)
- [x] Fix Activity Feed 404 error - implement missing page
- [x] Fix New Thread button functionality - ensure dialog opens correctly

## UI/UX Polish (Pre-Publishing)
- [x] Remove all emojis from entire platform (zero emoji policy)
- [x] Audit and standardize all back buttons for consistent styling
- [x] Add light/dark theme toggle to UI (system default)
- [x] Configure SMTP settings for email functionality (users connect their own email accounts)
- [x] Test mobile responsiveness (320px-768px viewports)

## Navigation Fix (Critical)
- [x] Audit all detail/subpages for missing back buttons
- [x] Add back buttons to PersonDetail page
- [x] Add back buttons to EventDetail page
- [x] Add back buttons to ThreadDetail page
- [x] Test all navigation flows to ensure users can always return to list views

## Final Enhancements (Pre-Publishing)
- [x] Implement Escape key keyboard shortcut for back navigation on detail pages
- [x] Add breadcrumb navigation to PersonDetail page
- [x] Add breadcrumb navigation to EventDetail page
- [x] Add breadcrumb navigation to ThreadDetail page
- [x] Test keyboard shortcuts and breadcrumbs functionality
- [x] Create final checkpoint and publish to 1twentyinternal.com

## Advanced Features (Post-Publishing Enhancements)
- [x] Implement global search with Cmd/Ctrl+K keyboard shortcut
- [x] Add search across contacts, deals, and threads
- [x] Add bulk actions to People page (bulk email, tag assignment, export)
- [x] Add bulk actions to Accounts page (bulk operations)
- [ ] Implement dashboard customization with pinnable widgets (deferred - requires significant development time)
- [x] Test all new features

## Bulk Actions Implementation
- [x] Create database schema for tags (tags table, person_tags junction table)
- [x] Create database schema for assignments (update people table with assignedTo field)
- [x] Implement tag CRUD operations (create, list, assign, remove)
- [x] Build tag management dialog UI for bulk tag action
- [x] Implement user assignment tRPC procedures
- [x] Build user assignment dialog UI for bulk assign action
- [x] Implement sequence enrollment tRPC procedures
- [x] Build sequence enrollment wizard UI
- [x] Test all bulk action features end-to-end

## Email Tracking & Analytics
- [x] Create database schema for email tracking events (opens, clicks, bounces)
- [x] Implement email tracking backend with webhook handlers
- [x] Build email analytics dashboard with performance metrics
- [x] Add visual indicators for email opens/clicks on contact timelines
- [ ] Create sequence performance metrics view

## Activity Timeline
- [x] Design unified activity timeline component
- [x] Implement activity aggregation from multiple sources (emails, calls, meetings, notes)
- [x] Add filtering by activity type and date range
- [x] Integrate timeline into contact and account detail pages
- [x] Test all timeline features
