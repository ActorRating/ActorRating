# Bot Prevention and Data Authenticity Implementation

This document outlines the implementation of bot prevention measures and data authenticity features.

## Database Changes

### User Model Updates

- Added `emailVerifiedAt: DateTime?` - timestamp when email was verified
- Added `verificationToken: String? @unique` - token for email verification
- Added `verificationTokenExpires: DateTime?` - expiration time for verification token
- Added `isVerifiedRater: Boolean @default(false)` - indicates verified rater status
- Added `ratingCount: Int @default(0)` - tracks number of ratings submitted
- Added `signupAttempts: Int @default(0)` - tracks signup attempts for rate limiting
- Added `lastSignupAttempt: DateTime?` - timestamp of last signup attempt

### New RateLimit Model

- `id: String @id @default(cuid())`
- `ip: String` - client IP address
- `action: String` - type of action (signup, signin, rating)
- `count: Int @default(1)` - number of attempts in current window
- `windowStart: DateTime @default(now())` - start of rate limiting window
- `createdAt: DateTime @default(now())`
- `updatedAt: DateTime @updatedAt`

## Bot Prevention Features

### 1. reCAPTCHA Integration

- **reCAPTCHA v2**: Added to signup and signin forms
- **reCAPTCHA v3**: Available for invisible verification
- **Configuration**: Requires `RECAPTCHA_SITE_KEY` and `RECAPTCHA_SECRET_KEY`
- **Verification**: Server-side token verification with Google

### 2. Rate Limiting

- **IP-based rate limiting** for all critical actions
- **Configurable limits**:
  - Signup: 3 attempts per 15 minutes
  - Signin: 10 attempts per 5 minutes
  - Rating: 5 submissions per minute
  - Email verification: 3 requests per 5 minutes
- **Automatic cleanup** of old rate limit records (24 hours)

### 3. Email Verification

- **Required for full access**: Users can access limited features until verified
- **Token-based verification**: Secure, time-limited tokens (24 hours)
- **Automatic email sending**: Verification emails sent on signup
- **Success tracking**: `emailVerifiedAt` timestamp recorded

## Data Authenticity Features

### 1. Verified Rater System

- **Automatic promotion**: Users become verified raters after:
  - Email verification completed
  - At least 3 ratings submitted
- **Weighted scoring**: Verified raters' ratings get 5% bonus weight
- **Internal tracking**: `isVerifiedRater` flag for analytics

### 2. Rating Submission Controls

- **One rating per performance**: Unique constraint on user+actor+movie
- **Rate limiting**: Prevents spam submissions
- **Rating count tracking**: Monitors user activity

### 3. Session Management

- **Enhanced session data**: Includes verification status and rater status
- **Real-time updates**: Session reflects current verification status

## API Endpoints

### New Endpoints

- `POST /api/auth/verify-recaptcha` - Verifies reCAPTCHA tokens
- `POST /api/auth/signin` - Custom signin with rate limiting and reCAPTCHA
- `GET /api/auth/verify-email?token=...` - Email verification endpoint
- `POST /api/auth/verify-email` - Email verification API

### Updated Endpoints

- `POST /api/auth/signup` - Now includes rate limiting, reCAPTCHA, and email verification
- `POST /api/ratings` - Now includes rate limiting and verified rater logic

## Frontend Components

### New Components

- `ReCaptcha` - reCAPTCHA v2 component
- `ReCaptchaV3` - reCAPTCHA v3 utility

### Updated Pages

- **Signup Page**: Added reCAPTCHA, rate limiting feedback
- **Signin Page**: Added reCAPTCHA, rate limiting feedback
- **Verification Success Page**: Shows email verification success

## Rate Limiting Configuration

```typescript
const RATE_LIMITS = {
  signup: { windowMs: 15 * 60 * 1000, maxRequests: 3 },
  signin: { windowMs: 5 * 60 * 1000, maxRequests: 10 },
  rating: { windowMs: 60 * 1000, maxRequests: 5 },
  emailVerification: { windowMs: 5 * 60 * 1000, maxRequests: 3 },
};
```

## Email Verification Flow

1. **User signs up** → Verification token generated
2. **Email sent** → Contains verification link
3. **User clicks link** → Token verified, email marked as verified
4. **User becomes verified rater** → After 3+ ratings and email verification

## Environment Variables Required

```env
# reCAPTCHA
RECAPTCHA_SITE_KEY=your_site_key_here
RECAPTCHA_SECRET_KEY=your_secret_key_here

# Email (for production)
EMAIL_SERVICE_API_KEY=your_email_service_key
EMAIL_FROM_ADDRESS=noreply@actorrating.com
```

## Security Considerations

- **Rate limiting**: Prevents brute force attacks
- **reCAPTCHA**: Prevents automated form submissions
- **Email verification**: Ensures real email addresses
- **Token expiration**: Prevents replay attacks
- **IP tracking**: Monitors suspicious activity patterns

## User Experience

### Limited Access for Unverified Users

- Can browse and view ratings
- Can create account and sign in
- Cannot submit ratings until email verified
- Clear messaging about verification requirements

### Verified User Benefits

- Full access to all features
- Verified rater status (after 3 ratings)
- Slightly higher weight for their ratings
- Enhanced credibility in the community

## Monitoring and Analytics

### Metrics to Track

- Rate limiting hits per IP/action
- Email verification success rates
- Verified rater conversion rates
- Rating submission patterns

### Alerts to Set Up

- High rate limiting activity
- Failed reCAPTCHA attempts
- Suspicious IP patterns
- Email verification failures

## Future Enhancements

- **Advanced bot detection**: Machine learning-based detection
- **Phone verification**: Additional verification method
- **Social login verification**: Verify social media accounts
- **Reputation system**: Community-based verification
- **Moderation tools**: Admin tools for managing users
