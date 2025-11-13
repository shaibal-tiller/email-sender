import { neon } from "@neondatabase/serverless"

const sql = neon(process.env.DATABASE_URL!)

export async function GET() {
  try {
    if (process.env.MAILGUN_API_KEY) {
      return Response.json({
        mailgunDomain: process.env.MAILGUN_DOMAIN || "",
        mailgunApiKey: process.env.MAILGUN_API_KEY,
        fromEmail: process.env.MAILGUN_FROM_EMAIL || "",
        fromName: process.env.MAILGUN_FROM_NAME || "",
        isFromEnv: true,
      })
    }

    // Fallback to database config
    const result =
      await sql`SELECT mailgun_domain, from_email, from_name FROM mailgun_config ORDER BY updated_at DESC LIMIT 1`

    if (result.length > 0) {
      const config = result[0]
      return Response.json({
        mailgunDomain: config.mailgun_domain,
        fromEmail: config.from_email,
        fromName: config.from_name,
        isFromEnv: false,
      })
    }

    return Response.json(null)
  } catch (error) {
    console.error("Error fetching config:", error)
    return Response.json(null, { status: 200 })
  }
}

export async function POST(request: Request) {
  try {
    const { mailgunDomain, fromEmail, fromName } = await request.json()

    if (!mailgunDomain || !fromEmail) {
      return Response.json({ error: "Missing required fields" }, { status: 400 })
    }

    await sql`INSERT INTO mailgun_config (mailgun_domain, from_email, from_name) VALUES (${mailgunDomain}, ${fromEmail}, ${fromName}) ON CONFLICT DO NOTHING`

    return Response.json({ success: true })
  } catch (error) {
    console.error("Error saving config:", error)
    return Response.json({ error: "Failed to save config" }, { status: 500 })
  }
}
