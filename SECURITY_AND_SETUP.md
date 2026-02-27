# NeuroVitality CRM - Security & Setup Guide

## 🔒 Security Features

### Authentication & Authorization
✅ **Email/Password Authentication**
- Passwords hashed with bcrypt (10 rounds)
- Minimum 8 characters required
- Password strength validation

✅ **Two-Factor Authentication (2FA)**
- **Enforced for all users** - cannot be bypassed
- TOTP-based (Time-based One-Time Password)
- Compatible with Google Authenticator, Authy, 1Password, etc.
- 8 backup codes generated for account recovery
- QR code setup during signup

✅ **Role-Based Access Control**
- Admin role: Full system access
- User role: Standard access
- Owner role: Tenant-level ownership
- Collaborator/Restricted roles: Limited access

### Data Security
✅ **Database Security**
- MySQL/TiDB with encrypted connections
- Parameterized queries (SQL injection protection)
- Multi-tenant isolation
- Drizzle ORM for type-safe queries

✅ **Session Management**
- JWT-based authentication
- Secure HTTP-only cookies
- Session expiration
- CSRF protection

✅ **Transport Security**
- HTTPS enforced for all traffic
- TLS 1.2+ encryption
- Secure cookie flags (httpOnly, secure, sameSite)

### Compliance Ready
✅ **Data Protection**
- Password reset tokens with expiration
- Account disable functionality
- Audit trail capabilities
- Secure backup code storage

---

## 👤 Admin Setup for ian@neurovitalityltd.com

### Step 1: Initial Signup
1. Navigate to: `https://your-domain.com/signup`
2. Enter details:
   - Email: `ian@neurovitalityltd.com`
   - Password: (minimum 8 characters)
   - Name: Ian
3. Click "Create Account"

### Step 2: 2FA Setup (Required)
1. Scan the QR code with an authenticator app:
   - Google Authenticator
   - Authy
   - 1Password
   - Microsoft Authenticator
2. **IMPORTANT**: Save the 8 backup codes in a secure location
3. Enter the 6-digit code from your authenticator app
4. Click "Verify and Complete Setup"

### Step 3: Welcome Splash
- After 2FA setup, you'll see a 3-screen welcome flow
- This introduces the CRM's key concepts
- Can be skipped or completed (takes ~30 seconds)

### Step 4: Promote to Admin
After signup is complete, run this SQL command via Manus Management UI > Database:

```sql
UPDATE users 
SET role = 'admin'
WHERE email = 'ian@neurovitalityltd.com';
```

Or use the provided script:
```bash
# Via Management UI, upload and run add-admin.sql
```

### Step 5: Verify Admin Access
1. Log out and log back in
2. Verify admin-only features are accessible
3. Check user profile shows "admin" role

---

## 🚀 User Onboarding Flow

### New User Journey
1. **Signup** (`/signup`)
   - Email & password
   - Name (optional)

2. **2FA Setup** (automatic)
   - QR code scan
   - Backup codes download
   - Code verification

3. **Welcome Splash** (`/welcome`)
   - 3-screen introduction
   - Personal relevance messaging
   - Gentle commitment building

4. **Dashboard** (`/`)
   - Full CRM access
   - Guided by role permissions

### Returning User Journey
1. **Login** (`/login`)
   - Email & password
   - 2FA code entry

2. **Dashboard** (`/`)
   - No onboarding shown
   - Automatic cloud restore (if applicable)

---

## 🔐 2FA Management

### For Users
- **Setup**: Automatic during signup
- **Backup Codes**: 8 codes, use once each
- **Lost Device**: Use backup code to log in, then reset 2FA
- **Disable**: Requires password + current 2FA code (admin can override)

### For Admins
- Can reset user 2FA via admin panel
- Cannot bypass 2FA requirement
- Should maintain own backup codes securely

---

## 📋 Security Best Practices

### For Administrators
1. **Store backup codes securely**
   - Use password manager (1Password, LastPass, Bitwarden)
   - Or encrypted vault
   - Never in plain text

2. **Regular security reviews**
   - Audit user access quarterly
   - Review disabled accounts
   - Check for suspicious activity

3. **Password policy**
   - Minimum 8 characters (enforced)
   - Recommend 12+ characters
   - Use password manager

### For All Users
1. **Use authenticator app** (not SMS-based 2FA)
2. **Keep backup codes safe**
3. **Use unique passwords**
4. **Log out on shared devices**
5. **Report suspicious activity**

---

## 🛠️ Technical Details

### Authentication Flow
```
Signup → Password Hash → 2FA Secret Generation → QR Code Display
→ User Scans QR → Backup Codes Generated → User Verifies Code
→ 2FA Enabled → Welcome Splash → Dashboard
```

### Login Flow
```
Login → Password Verification → 2FA Check → Code Entry
→ Code Verification → Session Created → Dashboard
```

### Password Reset Flow
```
Forgot Password → Email Sent → Reset Link → New Password
→ Password Updated → 2FA Required → Login
```

---

## 📞 Support

For security concerns or issues:
1. Check ADMIN_SETUP.md for admin-specific instructions
2. Review this document for security features
3. Contact NeuroVitality support for assistance

---

## ✅ Security Checklist

Before going live:
- [ ] Ian has completed signup with ian@neurovitalityltd.com
- [ ] Ian's account promoted to admin role
- [ ] Ian has saved 2FA backup codes securely
- [ ] Test login flow with 2FA
- [ ] Test password reset flow
- [ ] Verify HTTPS is enforced
- [ ] Review user roles and permissions
- [ ] Set up monitoring/alerting (optional)

---

## 🔄 Updates

This CRM is secure by default. All security features are:
- ✅ Already implemented
- ✅ Already enforced
- ✅ Production-ready

No additional security configuration needed!
