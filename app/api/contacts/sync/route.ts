import { neon } from "@neondatabase/serverless"

const sql = neon(process.env.DATABASE_URL!)

export async function POST(request: Request) {
  try {
    const { contacts } = await request.json()

    for (const contact of contacts) {
      await sql(
        `INSERT INTO contacts (email, name, custom_fields) 
         VALUES ($1, $2, $3) 
         ON CONFLICT (email) DO UPDATE SET name=$2, custom_fields=$3`,
        [contact.email, contact.name, JSON.stringify(contact.customFields || {})],
      )
    }

    return Response.json({ success: true, count: contacts.length })
  } catch (error) {
    console.error("Error syncing contacts:", error)
    return Response.json({ error: "Failed to sync contacts" }, { status: 500 })
  }
}
