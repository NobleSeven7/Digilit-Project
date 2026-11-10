// One-time passwords (OTPs). In this prototype they are random 4-digit codes
// shown on screen. A production version would send them by SMS instead.

export function generateOtp() {
  // Random whole number from 1000 to 9999, as text.
  return String(Math.floor(1000 + Math.random() * 9000))
}

// Make sure the delivery code is never the same as the pickup code.
export function generateDifferentOtp(otherOtp) {
  let otp = generateOtp()
  while (otp === otherOtp) otp = generateOtp()
  return otp
}
