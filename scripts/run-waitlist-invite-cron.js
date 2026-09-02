/**
 * Legacy Coolify task hook — waitlist invite cron is disabled (open registration).
 * Exits 0 so existing schedules do not alert; remove the scheduled task when convenient.
 */
console.log("Waitlist invite cron disabled (open registration). No emails sent.")
process.exit(0)
