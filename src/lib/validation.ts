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
  
  if (password.length < 12) {
    return { isValid: false, error: "Password must be at least 12 characters" }
  }
  
  if (password.length > 128) {
    return { isValid: false, error: "Password is too long (max 128 characters)" }
  }
  
  if (!/[a-z]/.test(password)) {
    return { isValid: false, error: "Password must include lowercase letters" }
  }
  
  if (!/[A-Z]/.test(password)) {
    return { isValid: false, error: "Password must include uppercase letters" }
  }
  
  if (!/\d/.test(password)) {
    return { isValid: false, error: "Password must include at least one number" }
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