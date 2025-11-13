"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Card } from "@/components/ui/card"
import { AlertCircle, Send } from "lucide-react"

const getVariables = (template: string) => {
  const regex = /\{\{(\w+)\}\}/g
  const variables = new Set<string>()
  let match
  while ((match = regex.exec(template)) !== null) {
    variables.add(match[1])
  }
  return Array.from(variables)
}

export default function ComposeTab() {
  const [subject, setSubject] = useState("Hello {{name}}!")
  const [body, setBody] = useState(
    "Hi {{name}},\n\nWe have a special offer from {{company}}.\n\nBest regards,\nThe Team",
  )
  const [sending, setSending] = useState(false)
  const [preview, setPreview] = useState<{ name: string; company: string }>({
    name: "John Doe",
    company: "Acme Corp",
  })
  const [status, setStatus] = useState<{ type: "success" | "error" | "info"; message: string } | null>(null)
  const [sent, setSent] = useState(0)
  const [imageUrl, setImageUrl] = useState("")
  const [showMarkdownGuide, setShowMarkdownGuide] = useState(false)

  const handleSendCampaign = async () => {
    const configStr = localStorage.getItem("mailgun_config")
    const contactsStr = localStorage.getItem("email_contacts")

    if (!configStr || !contactsStr) {
      setStatus({ type: "error", message: "Missing configuration or contacts" })
      return
    }

    setSending(true)
    let count = 0

    try {
      const config = JSON.parse(configStr)
      const contactsList = JSON.parse(contactsStr)

      for (const contact of contactsList) {
        const personalizedSubject = replaceVariables(subject, {
          name: contact.name,
          ...contact.customFields,
        })
        const personalizedBody = replaceVariables(body, {
          name: contact.name,
          ...contact.customFields,
        })

        const response = await fetch("/api/send-email", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            recipient: contact.email,
            recipientName: contact.name,
            subject: personalizedSubject,
            body: personalizedBody,
            imageUrl: imageUrl,
            mailgunDomain: config.mailgunDomain,
            mailgunApiKey: config.mailgunApiKey,
            fromEmail: config.fromEmail,
            fromName: config.fromName,
          }),
        })

        if (response.ok) {
          count++
        }
      }

      setSent(count)
      setStatus({ type: "success", message: `Campaign sent to ${count} recipients` })
    } catch (error) {
      console.error("Error:", error)
      setStatus({ type: "error", message: "Failed to send campaign" })
    } finally {
      setSending(false)
    }
  }

  const applyMarkdown = (markdown: string): string => {
    return markdown
      .replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>") // Bold
      .replace(/\*(.*?)\*/g, "<em>$1</em>") // Italic
      .replace(/\[(.+?)\]$$(.+?)$$/g, '<a href="$2" style="color: #0066cc;">$1</a>') // Links
      .replace(/^### (.*?)$/gm, "<h3>$1</h3>") // H3
      .replace(/^## (.*?)$/gm, "<h2>$1</h2>") // H2
      .replace(/^# (.*?)$/gm, "<h1>$1</h1>") // H1
      .replace(/\n/g, "<br/>") // Line breaks
  }

  const variables = [...new Set([...getVariables(subject), ...getVariables(body)])]

  const replaceVariables = (template: string, values: Record<string, string>) => {
    return template.replace(/\{\{(\w+)\}\}/g, (_, key) => values[key] || `{{${key}}}`)
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold mb-2">Email Composer</h2>
        <p className="text-sm text-muted-foreground">
          Use variables like &#123;&#123;name&#125;&#125;, &#123;&#123;company&#125;&#125; for personalization
        </p>
      </div>

      {status && (
        <Alert
          className={
            status.type === "success"
              ? "border-green-200 bg-green-50 dark:bg-green-950"
              : status.type === "error"
                ? "border-red-200 bg-red-50 dark:bg-red-950"
                : "border-blue-200 bg-blue-50 dark:bg-blue-950"
          }
        >
          <AlertCircle className="h-4 w-4" />
          <AlertDescription
            className={
              status.type === "success"
                ? "text-green-800 dark:text-green-200"
                : status.type === "error"
                  ? "text-red-800 dark:text-red-200"
                  : "text-blue-800 dark:text-blue-200"
            }
          >
            {status.message}
          </AlertDescription>
        </Alert>
      )}

      <div className="grid md:grid-cols-2 gap-6">
        {/* Editor */}
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-2">Subject</label>
            <Input value={subject} onChange={(e) => setSubject(e.target.value)} placeholder="Email subject..." />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Image URL (optional)</label>
            <Input
              placeholder="https://example.com/image.jpg"
              value={imageUrl}
              onChange={(e) => setImageUrl(e.target.value)}
            />
            {imageUrl && (
              <div className="mt-2 text-xs text-muted-foreground">
                Preview:{" "}
                <img
                  src={imageUrl || "/placeholder.svg"}
                  alt="Preview"
                  className="h-16 mt-1 rounded"
                  onError={(e) => (e.currentTarget.src = "/placeholder.svg")}
                />
              </div>
            )}
          </div>

          <div>
            <div className="flex justify-between items-center mb-2">
              <label className="block text-sm font-medium">Body</label>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowMarkdownGuide(!showMarkdownGuide)}
                className="text-xs h-6"
              >
                {showMarkdownGuide ? "Hide" : "Show"} Markdown Guide
              </Button>
            </div>
            <textarea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              placeholder="Email body... Use markdown formatting"
              className="w-full h-64 p-3 border border-input rounded-lg bg-background font-mono text-sm resize-none"
            />
          </div>

          {showMarkdownGuide && (
            <Card className="p-3 bg-muted/50 border-muted-foreground/20">
              <p className="text-xs font-medium mb-2">Markdown Formatting Guide:</p>
              <div className="text-xs space-y-1 text-muted-foreground font-mono">
                <div>
                  **bold text** → <strong>bold text</strong>
                </div>
                <div>
                  *italic text* → <em>italic text</em>
                </div>
                <div>{"[Link](https://example.com) → Link with URL"}</div>
                <div># Heading 1 → Large heading</div>
                <div>## Heading 2 → Medium heading</div>
                <div>### Heading 3 → Small heading</div>
              </div>
            </Card>
          )}

          {variables.length > 0 && (
            <div className="bg-muted p-3 rounded text-sm">
              <div className="font-medium mb-2">Variables used: {variables.join(", ")}</div>
              <div className="text-xs text-muted-foreground">These will be replaced for each recipient</div>
            </div>
          )}

          <Button onClick={handleSendCampaign} disabled={sending} className="w-full">
            <Send className="w-4 h-4 mr-2" />
            {sending ? `Sending to ${sent}...` : "Send Campaign"}
          </Button>
        </div>

        {/* Preview */}
        <div className="space-y-4">
          <div>
            <h3 className="font-medium mb-2">Live Preview</h3>
            <Card className="p-4 space-y-3 bg-white dark:bg-slate-950">
              <div>
                <div className="text-xs text-muted-foreground">Subject:</div>
                <div className="font-semibold">{replaceVariables(subject, preview)}</div>
              </div>
              {imageUrl && (
                <div>
                  <img
                    src={imageUrl || "/placeholder.svg"}
                    alt="Email preview"
                    className="w-full rounded max-h-48 object-cover"
                    onError={(e) => (e.currentTarget.src = "/placeholder.svg")}
                  />
                </div>
              )}
              <div className="border-t pt-3">
                <div className="text-xs text-muted-foreground mb-2">Body:</div>
                <div
                  className="text-sm whitespace-pre-wrap"
                  dangerouslySetInnerHTML={{
                    __html: applyMarkdown(replaceVariables(body, preview)),
                  }}
                />
              </div>
            </Card>
          </div>

          <div>
            <h3 className="font-medium mb-3">Preview Variables</h3>
            <div className="space-y-2">
              {variables.map((v) => (
                <div key={v}>
                  <label className="block text-xs text-muted-foreground mb-1">{v}</label>
                  <Input
                    value={preview[v as keyof typeof preview] || ""}
                    onChange={(e) => setPreview({ ...preview, [v]: e.target.value })}
                    placeholder={`Enter ${v}...`}
                  />
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
