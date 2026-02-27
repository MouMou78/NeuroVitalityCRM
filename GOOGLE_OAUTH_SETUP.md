# Google OAuth Setup Guide — NeuroVitalityCRM

This guide walks you through connecting Google Calendar to your CRM at **crm.neurovitality.com**.

## Prerequisites

- A Google account with access to Google Cloud Console
- Admin access to your NeuroVitalityCRM deployment
- The CRM must be deployed and accessible at `https://crm.neurovitality.com`

## Step 1: Create Google Cloud Project

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Click **Select a project** → **New Project**
3. Enter a project name, e.g. `NeuroVitalityCRM`
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
   - **App name**: `NeuroVitalityCRM`
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

## Step 4: Create OAuth 2.0 Credentials

1. Go to **APIs & Services** → **Credentials**
2. Click **Create Credentials** → **OAuth client ID**
3. Select **Application type**: **Web application**
4. Enter **Name**: `NeuroVitalityCRM Calendar Sync`
5. Under **Authorized redirect URIs**, add **exactly**:
   ```
   https://crm.neurovitality.com/api/oauth/google/callback
   ```
6. Click **Create**
7. **Copy** the **Client ID** and **Client Secret** — you will need these in the next step

## Step 5: Set Environment Variables

In your Manus deployment (Settings → Secrets), set the following:

```
GOOGLE_OAUTH_CLIENT_ID=<your Client ID from Step 4>
GOOGLE_OAUTH_CLIENT_SECRET=<your Client Secret from Step 4>
GOOGLE_OAUTH_REDIRECT_URI=https://crm.neurovitality.com/api/oauth/google/callback
```

> The `GOOGLE_OAUTH_REDIRECT_URI` must **exactly** match the URI registered in Google Cloud Console.

## Step 6: Connect Google Calendar in the CRM

1. Log in to your CRM at `https://crm.neurovitality.com`
2. Navigate to **Integrations** in the sidebar
3. Under **Google Workspace**, click **Connect Google Workspace**
4. You will be redirected to Google's consent screen
5. Sign in with your Google account and grant calendar access
6. You will be redirected back to the Integrations page with a **"Connected"** status

## Troubleshooting

### "redirect_uri_mismatch" error from Google
- The redirect URI in Google Cloud Console must **exactly** match `GOOGLE_OAUTH_REDIRECT_URI`
- It must be: `https://crm.neurovitality.com/api/oauth/google/callback`
- Check for trailing slashes, `http` vs `https`, and typos

### "Access blocked: This app's request is invalid"
- Make sure you've added your email as a test user in the OAuth consent screen
- Verify all required scopes are added

### "Could not obtain a refresh token" error
- The user must go to [myaccount.google.com/permissions](https://myaccount.google.com/permissions), revoke access for the app, then reconnect

### "Google OAuth credentials are not configured"
- Ensure `GOOGLE_OAUTH_CLIENT_ID` and `GOOGLE_OAUTH_CLIENT_SECRET` are set in your environment variables

### Calendar events not appearing
- Check that the Google Calendar API is enabled in Google Cloud Console
- Verify the integration shows "Connected" on the Integrations page
- Check server logs for any token refresh errors

## Security Notes

- **Never** commit your Client ID or Client Secret to version control
- Always use environment variables for credentials
- The `JWT_SECRET` environment variable is used as the encryption key for stored tokens — keep it secret and consistent across deployments
- Regularly review connected accounts at [myaccount.google.com/permissions](https://myaccount.google.com/permissions)

## Next Steps

Once connected, the CRM will:
- Sync upcoming calendar events on demand
- Link meeting attendees to CRM contacts by email address
- Create activity records for meetings
- Allow follow-up task generation from meeting outcomes
- Display upcoming meetings on contact timelines
