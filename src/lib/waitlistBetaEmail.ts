import nodemailer from "nodemailer"

const INVITE_CODE = "CINEMA2026"
const REGISTER_URL = `https://actorrating.com/auth/register?code=${INVITE_CODE}`
const REPLY_TO = "contact@actorrating.com"
/** Preferred From; falls back to the same SMTP identity as magic links. */
const DEFAULT_FROM = "ActorRating <contact@actorrating.com>"

const SUBJECT = "Your ActorRating Beta Access Code 🎟️"

const TEXT_BODY = `Hi there,

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

/**
 * Welcome / beta-access email after a new waitlist signup.
 * Uses the same SMTP config as magic-link auth.
 * Reply-To is always contact@actorrating.com so recipients can reply.
 */
export async function sendWaitlistBetaAccessEmail(to: string) {
  const server = resolveSmtpServer()
  if (!server) {
    throw new Error("EMAIL_SERVER is not configured for waitlist email delivery.")
  }

  const from = resolveFrom()
  const transport = nodemailer.createTransport(server)

  await transport.sendMail({
    to,
    from,
    replyTo: REPLY_TO,
    subject: SUBJECT,
    text: TEXT_BODY,
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
