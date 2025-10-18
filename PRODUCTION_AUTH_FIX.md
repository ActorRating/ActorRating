# 🔧 Production Authentication Fix for actorrating.com

## 🚨 **Root Cause: OAuth PKCE Configuration Issues**

The "Code exchange error: AuthApiError: invalid request: both auth code and code verifier should be non-empty" errors on **actorrating.com** are caused by **misconfigured OAuth redirect URLs** in your Supabase project.

## ✅ **Step-by-Step Fix**

### **1. Check Environment Variables on Vercel**

In your **Vercel Dashboard** → **Project Settings** → **Environment Variables**, ensure:

```bash
NEXT_PUBLIC_BASE_URL=https://actorrating.com
NEXT_PUBLIC_SUPABASE_URL=https://your-project-ref.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
```

### **2. Fix Supabase Authentication Settings**

Go to your **Supabase Dashboard** → **Authentication** → **Settings**:

#### **Site URL:**

```
https://actorrating.com
```

#### **Redirect URLs (ADD ALL OF THESE):**

```
https://actorrating.com/auth/callback
https://actorrating.com/auth/signin
https://actorrating.com/dashboard
https://www.actorrating.com/auth/callback
https://www.actorrating.com/auth/signin
https://www.actorrating.com/dashboard
```

### **3. Configure Google OAuth Provider**

In **Supabase Dashboard** → **Authentication** → **Providers** → **Google**:

#### **Authorized redirect URIs (in Google Cloud Console):**

```
https://your-project-ref.supabase.co/auth/v1/callback
```

⚠️ **CRITICAL:** This must be your **Supabase project URL**, not your domain!

### **4. Additional Supabase Settings**

In **Authentication** → **Settings**:

- ✅ **Enable email confirmations**: OFF (for immediate sign-in)
- ✅ **Enable phone confirmations**: OFF
- ✅ **Enable manual linking**: ON
- ✅ **Session timeout**: 604800 (1 week)

### **5. Test the Fix**

1. **Deploy the updated code** to Vercel
2. **Clear browser cookies** for actorrating.com
3. **Try Google sign-in** on actorrating.com
4. **Check browser console** for the new debug logs:
   - `🚀 Starting Google OAuth sign-in...`
   - `🔄 Starting auth callback...`
   - `✅ Successfully authenticated via OAuth`

## 🔍 **Debugging Production Issues**

### **Check Browser Console on actorrating.com:**

1. Open **Developer Tools** → **Console**
2. Try signing in with Google
3. Look for these logs:

**✅ Good signs:**

```
🚀 Starting Google OAuth sign-in...
Redirect URL: https://actorrating.com/auth/callback
🔄 Starting auth callback...
🔑 Exchanging code for session...
✅ Successfully authenticated via OAuth
```

**❌ Bad signs:**

```
Code exchange error: AuthApiError: invalid request: both auth code and code verifier should be non-empty
🔍 PKCE error detected, checking for existing session...
🧹 Cleared auth state, redirecting to sign-in
```

### **If PKCE Errors Persist:**

1. **Double-check Supabase redirect URLs** (most common issue)
2. **Verify Google OAuth redirect URI** in Google Cloud Console
3. **Clear all cookies** and try again
4. **Check if NEXT_PUBLIC_BASE_URL** is correctly set in Vercel

## 🎯 **Expected Behavior After Fix**

### **For Production (actorrating.com):**

- ✅ Google OAuth sign-in works without PKCE errors
- ✅ Users can access dashboard and submit ratings
- ✅ All API endpoints return valid data (not 401 errors)

### **For Development (localhost):**

- ✅ Development bypass works for testing
- ✅ Rating submission works without authentication

## 🚀 **Post-Fix Verification**

After implementing the fixes:

1. **Test rating submission** on actorrating.com (should work with proper auth)
2. **Check dashboard** loads user ratings
3. **Verify no 500 errors** in Network tab
4. **Confirm OAuth flow** completes successfully

---

**⚡ Quick Fix Checklist:**

- [ ] Vercel env vars set correctly
- [ ] Supabase Site URL = `https://actorrating.com`
- [ ] Supabase redirect URLs include all variants
- [ ] Google OAuth redirect = Supabase callback URL
- [ ] Code deployed to Vercel
- [ ] Browser cookies cleared
- [ ] Production test successful

---
*Last updated: Enhanced OAuth error handling and production debugging*
