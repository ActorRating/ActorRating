import nodemailer from "nodemailer"

const INVITE_CODE = "CINEMA2026"
const REGISTER_URL = `https://actorrating.com/auth/register?code=${INVITE_CODE}`
const REPLY_TO = "contact@actorrating.com"
const DEFAULT_FROM = "ActorRating <contact@actorrating.com>"

/** Hours after waitlist join before the beta invite email is sent. */
export const WAITLIST_INVITE_DELAY_HOURS = Math.max(
  1,
  Number(process.env.WAITLIST_INVITE_DELAY_HOURS || 3) || 3,
)

const SMTP_TIMEOUTS = {
  connectionTimeout: 12_000,
  greetingTimeout: 12_000,
  socketTimeout: 20_000,
} as const

function resolveSmtpServer(): string {
  return (
    process.env.AUTH_EMAIL_SERVER ||
    process.env.EMAIL_SERVER ||
    ""
  ).trim()
}

function resolveFrom(): string {
  return (
    process.env.WAITLIST_EMAIL_FROM ||
    process.env.AUTH_EMAIL_FROM ||
    process.env.EMAIL_FROM ||
    DEFAULT_FROM
  ).trim()
}

function createTransport() {
  const server = resolveSmtpServer()
  if (!server) {
    throw new Error("EMAIL_SERVER is not configured for waitlist email delivery.")
  }
  return nodemailer.createTransport({
    url: server,
    ...SMTP_TIMEOUTS,
  })
}

/**
 * Immediate acknowledgment after joining the waitlist.
 */
export async function sendWaitlistReceivedEmail(to: string) {
  const transport = createTransport()
  const subject = "Waitlist Received"
  const text = `Thanks for requesting access! We review and release private beta access codes in small daily batches to keep system performance smooth. Keep an eye on your inbox today!`

  await transport.sendMail({
    to,
    from: resolveFrom(),
    replyTo: REPLY_TO,
    subject,
    text,
    html: `
      <div style="font-family:Arial,sans-serif;line-height:1.6;color:#111;max-width:560px">
        <p>${text}</p>
      </div>
    `,
  })
}

const BETA_SUBJECT = "Your ActorRating Beta Access Code 🎟️"

const BETA_TEXT = `Hi there,

Thank you for joining the early waitlist for ActorRating! 🍿

Because you signed up early, you've been granted instant access to our Private Beta.

We're building ActorRating to bring objective performance analytics to cinema—scoring actors on real craft metrics like Screen Presence, Emotional Impact, Character Depth, and Technical Skill.

🎟️ Your VIP Access Link:
🔗 Register Here: ${REGISTER_URL}

🔑 Invite Code: ${INVITE_CODE}

What you can do inside right now:

Score and rank your favorite acting performances across key craft metrics.

Explore performance analytics across Screen Presence and Emotional Impact.

Submit early feedback to help shape upcoming features!

Since you are one of our very first beta testers, your feedback is huge for us. After you try it out, just reply directly to this email and let us know what you think!

See you inside,

The ActorRating Team
📲 Follow us on X: @ActorRating
`

/**
 * Delayed beta-access email (invite code). Reply-To contact@actorrating.com.
 */
export async function sendWaitlistBetaAccessEmail(to: string) {
  const transport = createTransport()

  await transport.sendMail({
    to,
    from: resolveFrom(),
    replyTo: REPLY_TO,
    subject: BETA_SUBJECT,
    text: BETA_TEXT,
    html: `
      <div style="font-family:Arial,sans-serif;line-height:1.6;color:#111;max-width:560px">
        <p>Hi there,</p>
        <p>Thank you for joining the early waitlist for ActorRating! 🍿</p>
        <p>Because you signed up early, you've been granted instant access to our Private Beta.</p>
        <p>
          We're building ActorRating to bring objective performance analytics to cinema—scoring
          actors on real craft metrics like Screen Presence, Emotional Impact, Character Depth,
          and Technical Skill.
        </p>
        <p><strong>🎟️ Your VIP Access Link:</strong><br/>
          🔗 Register Here:
          <a href="${REGISTER_URL}">${REGISTER_URL}</a>
        </p>
        <p><strong>🔑 Invite Code:</strong> ${INVITE_CODE}</p>
        <p><strong>What you can do inside right now:</strong></p>
        <ul>
          <li>Score and rank your favorite acting performances across key craft metrics.</li>
          <li>Explore performance analytics across Screen Presence and Emotional Impact.</li>
          <li>Submit early feedback to help shape upcoming features!</li>
        </ul>
        <p>
          Since you are one of our very first beta testers, your feedback is huge for us.
          After you try it out, just reply directly to this email and let us know what you think!
        </p>
        <p>
          See you inside,<br/><br/>
          The ActorRating Team<br/>
          📲 Follow us on X:
          <a href="https://x.com/ActorRating">@ActorRating</a>
        </p>
      </div>
    `,
  })
}

export function scheduleInviteEmailAt(from = new Date()): Date {
  return new Date(from.getTime() + WAITLIST_INVITE_DELAY_HOURS * 60 * 60 * 1000)
}
