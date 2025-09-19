# Terms Acceptance Implementation

This document outlines the implementation of terms acceptance tracking for user registration.

## Database Changes

### User Model Updates

- Added `acceptedTerms: Boolean @default(false)` - tracks if user has accepted terms
- Added `acceptedAt: DateTime?` - timestamp when terms were accepted
- Added `termsVersion: String? @default("1.0")` - version of terms accepted
- Renamed `termsAccepted` to `acceptedTerms` for consistency

## Authentication Flow Updates

### Email/Password Registration

1. User fills out signup form with email, username, password
2. User must check terms acceptance checkbox
3. Form validation ensures terms are accepted
4. User is created with `acceptedTerms: true`, `acceptedAt: current timestamp`, `termsVersion: "1.0"`

### Google OAuth Registration

1. User clicks "Sign up with Google"
2. User must check terms acceptance checkbox before OAuth flow
3. After successful Google authentication:
   - If new user: generates unique username and sets terms acceptance
   - If existing user: just updates login time
4. Username generation uses base name from Google profile or falls back to "user_abc123" format

## Username Generation

### Algorithm

1. Clean base name (lowercase, alphanumeric only, max 10 chars)
2. Check if clean name is available
3. If not, add random suffix (6 chars)
4. If still not available after 10 attempts, use timestamp suffix
5. Ensures uniqueness across all users

### Example Usernames

- "John Doe" → "johndoe"
- "John Doe" (taken) → "johndoe_abc123"
- "John Doe" (taken) → "johndoe_xyz789"

## Frontend Changes

### Signup Page

- Added terms acceptance checkbox (required)
- Links to Terms of Service, Privacy Policy, and KVKK
- Checkbox must be checked before "Sign Up" or "Continue with Google" buttons are enabled
- Terms acceptance is only required during signup, not signin

### Profile Page

- Added username field for editing
- Username validation ensures uniqueness
- Users can change their username after registration

## API Endpoints

### Updated Endpoints

- `POST /api/auth/signup` - now accepts and validates terms acceptance
- `GET /api/user/profile` - includes username in response
- `PUT /api/user/profile` - allows username updates with uniqueness validation

### Validation

- Terms acceptance is required for signup
- Username must be unique across all users
- Username format: 3-20 characters, alphanumeric and underscores only

## Session Updates

### Session Data

- Added `acceptedTerms` to session user object
- Available in client-side session for conditional rendering

## Migration

### Database Migration

- Migration `20250805070859_add_terms_acceptance_fields` adds new fields
- Existing users will have `acceptedTerms: false` by default
- New users will have proper terms acceptance tracking

## Testing

### Username Generation Test

- Script: `scripts/test-username-generation.ts`
- Tests uniqueness across multiple generations
- Creates and cleans up test users
- Verifies database constraints

## Security Considerations

- Terms acceptance is recorded only once at signup
- Terms version tracking allows for future terms updates
- Username uniqueness is enforced at database level
- All validation happens server-side

## Future Enhancements

- Terms version management for updates
- Bulk terms acceptance for existing users
- Terms acceptance audit trail
- Multiple terms types (ToS, Privacy, KVKK) tracking
