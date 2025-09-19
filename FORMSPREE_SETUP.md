# Formspree Setup Guide

## Quick Setup Instructions

1. **Go to [Formspree.io](https://formspree.io)** and create a free account

2. **Create a new form:**
   - Click "New Form"
   - Set the name to "ActorRating Feedback"
   - Set the email to `contact@actorrating.com`
   - Copy the form ID (looks like `xeqbzpko`)

3. **Add the form ID to your environment:**

   ```bash
   # Add this to your .env.local file
   NEXT_PUBLIC_FORMSPREE_FORM_ID=your_actual_form_id_here
   ```

4. **That's it!** The feedback form will now work and send emails to your specified address.

## Features

✅ **Free tier includes:**

- 50 submissions per month
- Email notifications
- Spam protection
- File uploads
- Basic analytics

✅ **No backend code required**
✅ **Instant setup**
✅ **Reliable delivery**

## Testing

1. Start your development server: `npm run dev`
2. Click the feedback button on any page
3. Submit a test message
4. Check your email inbox (and spam folder)
5. Check the Formspree dashboard for submission logs

## Production Notes

- Make sure to update your domain in Formspree settings
- Consider upgrading to a paid plan for higher limits
- Set up email forwarding if needed
- Configure custom thank you page (optional)

## Troubleshooting

- **Form not working?** Check that `NEXT_PUBLIC_FORMSPREE_FORM_ID` is set correctly
- **Not receiving emails?** Check spam folder and Formspree dashboard
- **CORS errors?** Make sure your domain is added to Formspree settings
