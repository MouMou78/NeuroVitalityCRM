# Google OAuth Setup Guide

This guide walks you through setting up Google Calendar integration for your 1twenty CRM.

## Prerequisites

- A Google account with access to Google Cloud Console
- Admin access to your 1twenty CRM instance

## Step 1: Create Google Cloud Project

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Click **Select a project** → **New Project**
3. Enter project name: `1twenty-crm-calendar`
4. Click **Create**

## Step 2: Enable Google Calendar API

1. In your project, go to **APIs & Services** → **Library**
2. Search for "Google Calendar API"
3. Click **Google Calendar API**
4. Click **Enable**

## Step 3: Configure OAuth Consent Screen

1. Go to **APIs & Services** → **OAuth consent screen**
2. Select **External** user type
3. Click **Create**
4. Fill in the required fields:
   - **App name**: 1twenty CRM
   - **User support email**: Your email
   - **Developer contact email**: Your email
5. Click **Save and Continue**
6. On the Scopes page, click **Add or Remove Scopes**
7. Add these scopes:
   - `https://www.googleapis.com/auth/calendar.readonly`
   - `https://www.googleapis.com/auth/calendar.events.readonly`
8. Click **Update** → **Save and Continue**
9. Add test users (your email and any team members)
10. Click **Save and Continue** → **Back to Dashboard**

## Step 4: Create OAuth Credentials

1. Go to **APIs & Services** → **Credentials**
2. Click **Create Credentials** → **OAuth client ID**
3. Select **Application type**: Web application
4. Enter **Name**: 1twenty CRM Calendar Sync
5. Under **Authorized redirect URIs**, add:
   ```
   https://your-crm-domain.manus.space/api/calendar/oauth/callback
   ```
   Replace `your-crm-domain` with your actual domain
6. Click **Create**
7. **IMPORTANT**: Copy the **Client ID** and **Client Secret** - you'll need these next

## Step 5: Add Credentials to CRM

1. Log in to your 1twenty CRM
2. Go to **Settings** → **Integrations** → **Google Calendar**
3. Paste your **Client ID** and **Client Secret**
4. Click **Save Configuration**

## Step 6: Test the Integration

1. Go to **Settings** → **Integrations** → **Google Calendar**
2. Click **Connect Google Calendar**
3. Sign in with your Google account
4. Grant calendar access permissions
5. You should see "Connected" status with your email

## Troubleshooting

### "Redirect URI mismatch" error
- Ensure the redirect URI in Google Cloud Console exactly matches your CRM domain
- Check for trailing slashes - they must match exactly

### "Access blocked: This app's request is invalid"
- Make sure you've added your email as a test user in the OAuth consent screen
- Verify all required scopes are added

### Calendar events not syncing
- Check that Google Calendar API is enabled
- Verify the OAuth token hasn't expired (reconnect if needed)
- Check server logs for sync errors

## Security Notes

- Keep your Client Secret secure - never commit it to version control
- Use environment variables for production deployments
- Regularly review connected accounts in Google Account settings
- Consider using a service account for production deployments

## Next Steps

Once connected, your CRM will:
- Automatically sync calendar events every 15 minutes
- Link meeting attendees to CRM contacts
- Generate follow-up tasks from meetings
- Display upcoming meetings on contact timelines
