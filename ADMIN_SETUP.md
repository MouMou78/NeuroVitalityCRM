# Admin Setup Instructions

## Setting up ian@neurovitalityltd.com as Admin

### Step 1: User Signup
1. Have Ian sign up at the NeuroVitality CRM signup page
2. Complete the email/password signup flow
3. Complete the 2FA setup (scan QR code with authenticator app)
4. Save the backup codes in a secure location

### Step 2: Promote to Admin
After Ian has completed signup, run this SQL command to promote the account to admin:

```sql
UPDATE users 
SET role = 'admin'
WHERE email = 'ian@neurovitalityltd.com';
```

You can run this via:
- Manus Management UI > Database panel
- Or using the provided `add-admin.sql` script

### Step 3: Verify Admin Access
1. Log out and log back in
2. Verify that admin-only features are now accessible
3. Check that the role shows as "admin" in the user profile

## Admin Privileges

Admins have access to:
- User management
- Role management  
- System settings
- All data across the organization
- Advanced configuration options

## Security Notes

- ✅ All passwords are hashed with bcrypt
- ✅ 2FA is enforced for all users (including admins)
- ✅ Sessions are JWT-based with secure cookies
- ✅ Database connections are encrypted
- ✅ All traffic uses HTTPS

## Backup Codes

Make sure to save the 8 backup codes provided during 2FA setup. These can be used if:
- The authenticator app is lost
- The phone is unavailable
- 2FA needs to be reset

Store backup codes in a secure password manager or encrypted vault.
