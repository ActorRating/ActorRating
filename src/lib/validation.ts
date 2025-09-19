export const validateEmail = (email: string): { isValid: boolean; error?: string } => {
  if (!email) {
    return { isValid: false, error: "Email is required" }
  }
  
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  if (!emailRegex.test(email)) {
    return { isValid: false, error: "Please enter a valid email address" }
  }
  
  return { isValid: true }
}

export const validatePassword = (password: string): { isValid: boolean; error?: string } => {
  if (!password) {
    return { isValid: false, error: "Password is required" }
  }
  
  if (password.length < 8) {
    return { isValid: false, error: "Password must be at least 8 characters long" }
  }
  
  return { isValid: true }
}

export const validateSignUpData = (data: { email: string; password: string }): { isValid: boolean; errors: Record<string, string> } => {
  const errors: Record<string, string> = {}

  const emailValidation = validateEmail(data.email)
  if (!emailValidation.isValid) {
    errors.email = emailValidation.error!
  }

  const passwordValidation = validatePassword(data.password)
  if (!passwordValidation.isValid) {
    errors.password = passwordValidation.error!
  }

  // TODO: Optionally add MX record check here for email

  return {
    isValid: Object.keys(errors).length === 0,
    errors,
  }
}