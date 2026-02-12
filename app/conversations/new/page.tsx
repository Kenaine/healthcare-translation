'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { createConversation } from '@/lib/conversations/actions'
import { ArrowLeft } from 'lucide-react'

const LANGUAGES = [
  { code: 'en', name: 'English' },
  { code: 'es', name: 'Spanish' },
  { code: 'fr', name: 'French' },
  { code: 'de', name: 'German' },
  { code: 'it', name: 'Italian' },
  { code: 'pt', name: 'Portuguese' },
  { code: 'ru', name: 'Russian' },
  { code: 'zh', name: 'Chinese' },
  { code: 'ja', name: 'Japanese' },
  { code: 'ko', name: 'Korean' },
  { code: 'ar', name: 'Arabic' },
  { code: 'hi', name: 'Hindi' },
  { code: 'tl', name: 'Tagalog' },
  { code: 'vi', name: 'Vietnamese' },
  { code: 'th', name: 'Thai' },
]

export default function NewConversationPage() {
  const router = useRouter()
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [doctorLanguage, setDoctorLanguage] = useState<string>('')
  const [patientLanguage, setPatientLanguage] = useState<string>('')

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError(null)
    setLoading(true)

    if (!doctorLanguage || !patientLanguage) {
      setError('Please select both languages')
      setLoading(false)
      return
    }

    if (doctorLanguage === patientLanguage) {
      setError('Please select different languages')
      setLoading(false)
      return
    }

    const formData = new FormData(event.currentTarget)
    formData.append('doctor_language', doctorLanguage)
    formData.append('patient_language', patientLanguage)
    
    const result = await createConversation(formData)
    
    setLoading(false)

    if (result?.error) {
      setError(result.error)
    } else if (result?.success && result.conversationId) {
      router.push(`/conversations/${result.conversationId}`)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <Link href="/dashboard" className="flex items-center text-gray-600 hover:text-gray-900">
            <ArrowLeft className="mr-2 h-5 w-5" />
            Back to Dashboard
          </Link>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Card>
          <CardHeader>
            <CardTitle className="text-2xl">Create New Conversation</CardTitle>
            <CardDescription>
              Set up a new consultation with language translation
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              {error && (
                <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
                  {error}
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="title">Conversation Title (Optional)</Label>
                <Input
                  id="title"
                  name="title"
                  type="text"
                  placeholder="e.g., Patient Consultation - John Doe"
                />
                <p className="text-xs text-gray-500">
                  Add a title to help you identify this conversation later
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="doctor_language">Your Language (Doctor)</Label>
                <Select value={doctorLanguage} onValueChange={setDoctorLanguage}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select your language" />
                  </SelectTrigger>
                  <SelectContent>
                    {LANGUAGES.map((lang) => (
                      <SelectItem key={lang.code} value={lang.code}>
                        {lang.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="patient_language">Patient's Language</Label>
                <Select value={patientLanguage} onValueChange={setPatientLanguage}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select patient's language" />
                  </SelectTrigger>
                  <SelectContent>
                    {LANGUAGES.map((lang) => (
                      <SelectItem key={lang.code} value={lang.code}>
                        {lang.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {doctorLanguage && patientLanguage && doctorLanguage !== patientLanguage && (
                <div className="bg-blue-50 border border-blue-200 text-blue-700 px-4 py-3 rounded">
                  <p className="text-sm font-medium">Translation Setup</p>
                  <p className="text-sm mt-1">
                    Messages will be translated between {LANGUAGES.find(l => l.code === doctorLanguage)?.name} and{' '}
                    {LANGUAGES.find(l => l.code === patientLanguage)?.name}
                  </p>
                </div>
              )}

              <div className="flex gap-4">
                <Button type="submit" className="flex-1" disabled={loading}>
                  {loading ? 'Creating...' : 'Create Conversation'}
                </Button>
                <Link href="/dashboard" className="flex-1">
                  <Button type="button" variant="outline" className="w-full">
                    Cancel
                  </Button>
                </Link>
              </div>
            </form>
          </CardContent>
        </Card>
      </main>
    </div>
  )
}
