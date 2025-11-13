import { neon } from "@neondatabase/serverless"

const sql = neon(process.env.DATABASE_URL!)

export async function GET() {
  try {
    const contacts = await sql("SELECT email, name, custom_fields FROM contacts ORDER BY created_at DESC LIMIT 3000")
    return Response.json(contacts)
  } catch (error) {
    return Response.json([], { status: 200 })
  }
}
