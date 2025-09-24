// Template: migrate existing users into Supabase Auth using the service role key
// DO NOT RUN until you have added the required secrets and confirmed logic.
//
// Requirements (env):
//   - NEXT_PUBLIC_SUPABASE_URL
//   - SUPABASE_SERVICE_ROLE_KEY
//
// Usage:
//   node scripts/migrate-users-to-supabase.js
//
// Notes:
// - This script demonstrates creating users in Supabase with email/password.
// - Adjust mapping to your existing user table/fields.
// - Service role key has elevated privileges; handle carefully.

// const { createClient } = require('@supabase/supabase-js')
// const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY)

// async function migrate() {
//   // TODO: load users from your DB (e.g., via Prisma or raw SQL)
//   const users = [
//     // { email: 'user@example.com', password: 'TEMP_PASSWORD' }
//   ]
//
//   for (const u of users) {
//     // Create user in Supabase Auth
//     const { data, error } = await supabase.auth.admin.createUser({
//       email: u.email,
//       password: u.password,
//       email_confirm: true,
//     })
//     if (error) {
//       console.error('Failed to create user', u.email, error)
//     } else {
//       console.log('Created user', u.email, data.user?.id)
//     }
//   }
// }
//
// migrate().catch((e) => {
//   console.error(e)
//   process.exit(1)
// })


