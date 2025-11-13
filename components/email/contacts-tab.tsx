"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Card } from "@/components/ui/card"
import { Upload, Download, Trash2, RefreshCw, CheckCircle2, Info } from "lucide-react"
import Papa from "papaparse"

interface Contact {
  email: string
  name: string
  customFields?: Record<string, string>
}

const SAMPLE_CSV = `email,name,company
john@example.com,John Doe,Acme Corp
jane@example.com,Jane Smith,Tech Inc
bob@example.com,Bob Johnson,Design Co`

export default function ContactsTab() {
  const [contacts, setContacts] = useState<Contact[]>([])
  const [searchTerm, setSearchTerm] = useState("")
  const [syncing, setSyncing] = useState(false)
  const [syncStatus, setSyncStatus] = useState<{ type: "success" | "error"; message: string } | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  // Load contacts from localStorage or sample
  useEffect(() => {
    const loadContacts = async () => {
      try {
        // Try to fetch from DB first
        const response = await fetch("/api/contacts")
        if (response.ok) {
          const data = await response.json()
          setContacts(data)
        } else {
          // Fallback to localStorage or sample
          const saved = localStorage.getItem("email_contacts")
          if (saved) {
            setContacts(JSON.parse(saved))
          } else {
            setContacts(generateSampleContacts())
          }
        }
      } catch (error) {
        const saved = localStorage.getItem("email_contacts")
        if (saved) {
          setContacts(JSON.parse(saved))
        } else {
          setContacts(generateSampleContacts())
        }
      } finally {
        setIsLoading(false)
      }
    }

    loadContacts()
  }, [])

  const generateSampleContacts = () => {
    const contacts: Contact[] = []
    for (let i = 1; i <= 100; i++) {
      contacts.push({
        email: `user${i}@example.com`,
        name: `User ${i}`,
        customFields: { company: `Company ${Math.ceil(i / 10)}` },
      })
    }
    return contacts
  }

  const handleCsvUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        const parsed = results.data
          .filter((row: any) => row.email)
          .map((row: any) => ({
            email: row.email?.trim(),
            name: row.name?.trim() || row.email?.split("@")[0],
            customFields: Object.keys(row)
              .filter((k) => k !== "email" && k !== "name" && row[k])
              .reduce((acc: any, k) => ({ ...acc, [k]: row[k] }), {}),
          }))

        setContacts(parsed)
        localStorage.setItem("email_contacts", JSON.stringify(parsed))
        setSyncStatus({ type: "success", message: `Loaded ${parsed.length} contacts` })
        setTimeout(() => setSyncStatus(null), 3000)
      },
    })
  }

  const handleSyncToDb = async () => {
    setSyncing(true)
    try {
      const response = await fetch("/api/contacts/sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ contacts }),
      })

      if (response.ok) {
        setSyncStatus({ type: "success", message: `Synced ${contacts.length} contacts to database` })
      } else {
        throw new Error("Sync failed")
      }
    } catch (error) {
      setSyncStatus({ type: "error", message: "Failed to sync contacts" })
    } finally {
      setSyncing(false)
      setTimeout(() => setSyncStatus(null), 3000)
    }
  }

  const handleDownload = () => {
    const csv = Papa.unparse(contacts)
    const blob = new Blob([csv], { type: "text/csv" })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `contacts-${new Date().toISOString().split("T")[0]}.csv`
    a.click()
  }

  const handleClear = () => {
    if (confirm("Clear all contacts?")) {
      setContacts([])
      localStorage.removeItem("email_contacts")
    }
  }

  const filteredContacts = contacts.filter(
    (c) =>
      c.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.name.toLowerCase().includes(searchTerm.toLowerCase()),
  )

  if (isLoading) {
    return <div className="text-center py-8">Loading contacts...</div>
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold mb-4">Contact Management</h2>
        <p className="text-sm text-muted-foreground mb-4">
          {contacts.length} contacts loaded • {filteredContacts.length} shown
        </p>
      </div>

      {syncStatus && (
        <Alert
          className={
            syncStatus.type === "success"
              ? "border-green-200 bg-green-50 dark:bg-green-950"
              : "border-red-200 bg-red-50 dark:bg-red-950"
          }
        >
          <CheckCircle2 className="h-4 w-4" />
          <AlertDescription
            className={
              syncStatus.type === "success" ? "text-green-800 dark:text-green-200" : "text-red-800 dark:text-red-200"
            }
          >
            {syncStatus.message}
          </AlertDescription>
        </Alert>
      )}

      <Card className="p-4 bg-muted/50 border-muted-foreground/20">
        <div className="flex gap-2 mb-3">
          <Info className="w-5 h-5 flex-shrink-0 text-muted-foreground" />
          <div className="text-sm">
            <p className="font-medium mb-2">CSV Structure Guide</p>
            <p className="text-xs text-muted-foreground mb-2">Your CSV file must have at least these columns:</p>
            <code className="bg-background p-2 rounded text-xs block text-foreground font-mono">
              email,name,company{"\n"}
              john@example.com,John Doe,Acme Corp{"\n"}
              jane@example.com,Jane Smith,Tech Inc
            </code>
            <p className="text-xs text-muted-foreground mt-2">
              • <strong>email</strong> (required) - Recipient email address{"\n"}• <strong>name</strong> (optional) -
              Will use email prefix if missing{"\n"}• Additional columns become available as personalization variables
            </p>
          </div>
        </div>
      </Card>

      {/* Actions */}
      <div className="flex flex-wrap gap-2">
        <label className="cursor-pointer">
          <Button variant="outline" asChild>
            <div>
              <Upload className="w-4 h-4 mr-2" />
              Upload CSV
            </div>
          </Button>
          <input type="file" accept=".csv" onChange={handleCsvUpload} className="hidden" />
        </label>

        <Button variant="outline" onClick={handleDownload} disabled={contacts.length === 0}>
          <Download className="w-4 h-4 mr-2" />
          Download
        </Button>

        <Button variant="outline" onClick={handleSyncToDb} disabled={syncing || contacts.length === 0}>
          <RefreshCw className={`w-4 h-4 mr-2 ${syncing ? "animate-spin" : ""}`} />
          {syncing ? "Syncing..." : "Sync to DB"}
        </Button>

        <Button variant="destructive" size="sm" onClick={handleClear}>
          <Trash2 className="w-4 h-4 mr-2" />
          Clear
        </Button>
      </div>

      {/* Contact List */}
      <div>
        <Input
          placeholder="Search by email or name..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="mb-4"
        />
        <ScrollArea className="h-96 border rounded-lg p-4">
          <div className="space-y-2">
            {filteredContacts.map((contact, idx) => (
              <div key={idx} className="text-sm p-3 bg-muted rounded hover:bg-muted/80">
                <div className="font-medium">{contact.name}</div>
                <div className="text-xs text-muted-foreground">{contact.email}</div>
                {Object.keys(contact.customFields || {}).length > 0 && (
                  <div className="text-xs text-muted-foreground mt-1">
                    {Object.entries(contact.customFields || {})
                      .map(([k, v]) => `${k}: ${v}`)
                      .join(" • ")}
                  </div>
                )}
              </div>
            ))}
          </div>
        </ScrollArea>
      </div>
    </div>
  )
}
