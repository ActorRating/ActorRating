import { NextRequest, NextResponse } from "next/server"
import { Resend } from "resend"

export async function POST(request: NextRequest) {
  try {
    const { email } = await request.json()
    
    if (!email) {
      return NextResponse.json({ error: "Email is required" }, { status: 400 })
    }

    const resend = new Resend(process.env.RESEND_API_KEY)
    
    if (!process.env.RESEND_API_KEY) {
      return NextResponse.json({ error: "RESEND_API_KEY not configured" }, { status: 500 })
    }

    const result = await resend.emails.send({
      from: "onboarding@resend.dev",
      to: email,
      subject: "Test Email from ActorRating",
      html: `
        <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #111">
          <h2>Test Email</h2>
          <p>This is a test email to verify that Resend is working correctly.</p>
          <p>If you received this, your email setup is working!</p>
          <p>Sent at: ${new Date().toISOString()}</p>
        </div>
      `,
    })

    return NextResponse.json({ 
      success: true, 
      messageId: result.data?.id,
      message: "Test email sent successfully" 
    })

  } catch (error) {
    console.error("Test email error:", error)
    return NextResponse.json({ 
      error: "Failed to send test email",
      details: error instanceof Error ? error.message : "Unknown error"
    }, { status: 500 })
  }
}

export async function GET() {
  return NextResponse.json({ 
    message: "Use POST with { email: 'your@email.com' } to test email sending" 
  })
}
