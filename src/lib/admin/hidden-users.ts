import { Prisma } from "@prisma/client"

/**
 * Accounts to hide from the admin Users UI and user totals.
 * Rows stay in the DB — this is display/metrics filtering only.
 */
export const ADMIN_HIDDEN_USER_EMAILS = [
  "demirautomations@gmail.com",
  "seed.leo@actorrating.local",
  "seed.priya@actorrating.local",
  "seed.omar@actorrating.local",
  "seed.elena@actorrating.local",
  "seed.jordan@actorrating.local",
  "seed.maya@actorrating.local",
  "contact.actorrating@gmail.com",
  "adaguzel@proton.me",
  "lalaland@gmail.com",
  "demir.horzum2028@pierreloti.k12.tr",
  "sdgdg@gmail.com",
  "merumi@gmail.com",
] as const

const HIDDEN_EMAIL_SET = new Set(
  ADMIN_HIDDEN_USER_EMAILS.map((e) => e.trim().toLowerCase()),
)

export function isAdminHiddenUserEmail(email: string | null | undefined): boolean {
  if (!email) return false
  const normalized = email.trim().toLowerCase()
  if (HIDDEN_EMAIL_SET.has(normalized)) return true
  // Catch any other seed.*@actorrating.local accounts without listing each one.
  return normalized.endsWith("@actorrating.local")
}

/** Prisma `where` clause: exclude hidden users from admin user queries. */
export function adminVisibleUserWhere(): {
  NOT: {
    OR: Array<
      | { email: { endsWith: string } }
      | { email: { in: string[]; mode: "insensitive" } }
    >
  }
} {
  return {
    NOT: {
      OR: [
        { email: { endsWith: "@actorrating.local" } },
        {
          email: {
            in: [...ADMIN_HIDDEN_USER_EMAILS],
            mode: "insensitive",
          },
        },
      ],
    },
  }
}

/** Raw-SQL predicate for a User email column (default: u."email"). */
export function adminVisibleUserEmailSql(
  emailColumn: "u.email" | "email" = "u.email",
): Prisma.Sql {
  const emailExpr =
    emailColumn === "u.email" ? Prisma.raw(`u."email"`) : Prisma.raw(`"email"`)
  const listed = ADMIN_HIDDEN_USER_EMAILS.map((e) => Prisma.sql`${e}`)
  return Prisma.sql`
    LOWER(${emailExpr}) NOT LIKE '%@actorrating.local'
    AND LOWER(${emailExpr}) NOT IN (${Prisma.join(listed)})
  `
}
