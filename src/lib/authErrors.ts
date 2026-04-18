import { CredentialsSignin } from "next-auth"

/** Thrown when email/password sign-in is attempted for an OAuth-only account. */
export class GoogleOnlyCredentialsSignin extends CredentialsSignin {
  code = "google_only"
}
