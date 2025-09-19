# reCAPTCHA v3 Implementation for Rating Submissions

## Overview

This implementation adds Google reCAPTCHA v3 protection to rating submissions in the Actor Rating application. reCAPTCHA v3 runs in the background and provides a score based on user behavior, making it less intrusive than v2 while still providing bot protection.

## Implementation Details

### 1. Frontend Integration

#### reCAPTCHA v3 Hook (`src/components/auth/ReCaptcha.tsx`)

- **`useRecaptchaV3()`**: Custom React hook that loads the reCAPTCHA v3 script and provides an `executeRecaptcha` function
- **Script Loading**: Automatically loads the reCAPTCHA v3 script with the site key
- **Duplicate Prevention**: Checks if the script is already loaded to prevent duplicates

#### Rating Form Integration (`src/components/rating/PerformanceRatingForm.tsx`)

- **Token Generation**: Executes reCAPTCHA v3 with action "submit_rating" when form is submitted
- **Loading States**: Shows "Verifying..." during reCAPTCHA execution
- **Error Handling**: Provides user feedback if reCAPTCHA fails
- **Token Inclusion**: Includes the reCAPTCHA token in the form submission payload

### 2. Backend Verification

#### Verification Utility (`src/lib/recaptcha.ts`)

- **`verifyRecaptchaV3()`**: Utility function that verifies tokens with Google's API
- **Score Validation**: Ensures the score is above the minimum threshold (0.5)
- **Action Validation**: Verifies the action matches the expected action ("submit_rating")
- **Error Handling**: Comprehensive error handling with detailed error messages

#### API Protection

- **Performance API** (`src/app/api/performances/route.ts`): Protected with reCAPTCHA v3
- **Rating API** (`src/app/api/ratings/route.ts`): Protected with reCAPTCHA v3
- **Token Validation**: Both endpoints validate the reCAPTCHA token before processing submissions
- **Error Responses**: Return appropriate HTTP status codes (400 for missing token, 403 for verification failure)

### 3. Type Safety

#### Updated Types (`src/types/index.ts`)

- **`PerformanceRating`**: Extended to include optional `recaptchaToken` field
- **API Client** (`src/lib/api.ts`): Updated to require `recaptchaToken` in create methods

## Configuration

### Environment Variables

Add these to your `.env.local` file:

```bash
# reCAPTCHA v3 Configuration
NEXT_PUBLIC_RECAPTCHA_SITE_KEY=your_site_key_here
RECAPTCHA_SECRET_KEY=your_secret_key_here
```

### Getting reCAPTCHA Keys

1. Go to [Google reCAPTCHA Admin Console](https://www.google.com/recaptcha/admin)
2. Create a new site
3. Choose **reCAPTCHA v3**
4. Add your domain(s)
5. Copy the Site Key and Secret Key

## Usage Flow

### 1. User Submits Rating

```typescript
// Frontend automatically executes reCAPTCHA v3
const token = await executeRecaptcha("submit_rating");

// Token is included in the API request
const response = await performancesApi.create({
  actorId,
  movieId,
  emotionalRangeDepth,
  characterBelievability,
  technicalSkill,
  screenPresence,
  chemistryInteraction,
  comment,
  recaptchaToken: token,
});
```

### 2. Backend Verification

```typescript
// Backend verifies the token
const recaptchaResult = await verifyRecaptchaV3(
  recaptchaToken,
  "submit_rating",
  0.5
);

if (!recaptchaResult.success) {
  return NextResponse.json({ error: recaptchaResult.error }, { status: 403 });
}
```

## Security Features

### 1. Score-Based Protection

- **Minimum Score**: 0.5 (configurable)
- **Score Range**: 0.0 (bot) to 1.0 (human)
- **Action Validation**: Ensures tokens are used for the correct action

### 2. Error Handling

- **Missing Token**: 400 Bad Request
- **Verification Failure**: 403 Forbidden
- **Low Score**: 403 Forbidden with detailed error message
- **Wrong Action**: 403 Forbidden

### 3. User Experience

- **Invisible**: No user interaction required
- **Loading Feedback**: Shows "Verifying..." during token generation
- **Error Feedback**: Clear error messages for users
- **Graceful Degradation**: Proper error handling if reCAPTCHA fails

## Testing

### Test Script

Run the test script to verify the implementation:

```bash
npx tsx scripts/test-recaptcha.ts
```

### Manual Testing

1. Set up environment variables
2. Navigate to the rating page
3. Submit a rating
4. Check browser console for reCAPTCHA execution
5. Verify the rating is saved successfully

## Troubleshooting

### Common Issues

1. **"reCAPTCHA not configured"**

   - Check that environment variables are set correctly
   - Ensure the script is loading in the browser

2. **"reCAPTCHA verification failed"**

   - Verify the secret key is correct
   - Check that the site key matches the secret key
   - Ensure the domain is registered in reCAPTCHA admin

3. **"reCAPTCHA score too low"**
   - User behavior triggered low score
   - Consider adjusting the minimum score threshold
   - Check for automated behavior (bots, scripts)

### Debug Mode

Enable debug logging by checking browser console for reCAPTCHA-related messages.

## Performance Considerations

- **Script Loading**: reCAPTCHA script is loaded asynchronously
- **Token Caching**: Tokens are generated on-demand
- **API Calls**: Verification happens server-side to protect the secret key
- **Error Recovery**: Failed verifications don't block the UI

## Future Enhancements

1. **Score Analytics**: Track reCAPTCHA scores for analytics
2. **Adaptive Thresholds**: Adjust score thresholds based on user behavior
3. **Fallback Protection**: Additional bot protection methods
4. **Rate Limiting**: Combine with existing rate limiting for enhanced protection
