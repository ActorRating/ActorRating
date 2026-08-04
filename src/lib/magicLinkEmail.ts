import nodemailer from "nodemailer"

const defaultSender = "ActorRating <noreply@actorrating.com>"

/** Fail fast so the sign-in UI does not spin forever on bad SMTP. */
const SMTP_TIMEOUTS = {
  connectionTimeout: 12_000,
  greetingTimeout: 12_000,
  socketTimeout: 20_000,
} as const

type MagicLinkMailParams = {
  identifier: string
  url: string
  provider: {
    server?: string | object
    from?: string
  }
}

function resolveSender(): string {
  return process.env.AUTH_EMAIL_FROM || process.env.EMAIL_FROM || defaultSender
}

function createMailTransport(server: string | object) {
  if (typeof server === "string") {
    return nodemailer.createTransport({
      url: server,
      ...SMTP_TIMEOUTS,
    })
  }
  return nodemailer.createTransport({
    ...server,
    ...SMTP_TIMEOUTS,
  })
}

export async function sendMagicLinkEmail({
  identifier,
  url,
  provider,
}: MagicLinkMailParams) {
  if (!provider.server) {
    throw new Error("Email provider server is not configured for magic-link delivery.")
  }

  const transport = createMailTransport(provider.server)
  const host = new URL(url).host

  await transport.sendMail({
    to: identifier,
    from: provider.from || resolveSender(),
    subject: "Sign in to ActorRating",
    text: `Sign in to ActorRating\n${url}\n\nThis link expires in 15 minutes.\n`,
    html: `
      <div style="font-family:Arial,sans-serif;line-height:1.6;color:#111">
        <h2 style="margin:0 0 12px">Sign in to ActorRating</h2>
        <p style="margin:0 0 16px">
          Click the button below to securely sign in.
        </p>
        <p style="margin:0 0 18px">
          <a
            href="${url}"
            style="display:inline-block;padding:10px 16px;background:#FFD700;color:#000;text-decoration:none;border-radius:8px;font-weight:700"
          >
            Sign in with magic link
          </a>
        </p>
        <p style="margin:0 0 8px">
          Or paste this URL into your browser:
        </p>
        <p style="margin:0 0 16px;word-break:break-all">
          <a href="${url}">${url}</a>
        </p>
        <p style="margin:0;color:#666">
          This link expires in 15 minutes. If you did not request this, you can ignore this email.
        </p>
        <p style="margin:14px 0 0;color:#888;font-size:12px">
          Sent by ${host}
        </p>
      </div>
    `,
  })
}
