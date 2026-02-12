'use client'

import { useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { joinAsGuest } from '@/lib/auth/guest-actions'

export default function JoinPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const conversationId = searchParams.get('c')
  
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    
    if (!conversationId) {
      setError('Invalid conversation link')
      return
    }
    
    setError(null)
    setLoading(true)

    const formData = new FormData(event.currentTarget)
    const guestName = formData.get('guest_name') as string
    
    const result = await joinAsGuest(conversationId, guestName)
    
    setLoading(false)

    if (result?.error) {
      setError(result.error)
    } else if (result?.success) {
      router.push(`/conversations/${conversationId}`)
    }
  }

  if (!conversationId) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle>Invalid Link</CardTitle>
            <CardDescription>
              This conversation link is not valid
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1">
          <CardTitle className="text-2xl font-bold">Join Conversation</CardTitle>
          <CardDescription>
            Enter your name to join this consultation
          </CardDescription>
        </CardHeader>
        <form onSubmit={handleSubmit}>
          <CardContent className="space-y-4">
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
                {error}
              </div>
            )}
            
            <div className="space-y-2">
              <Label htmlFor="guest_name">Your Name</Label>
              <Input
                id="guest_name"
                name="guest_name"
                type="text"
                placeholder="John Doe"
                required
                autoFocus
              />
              <p className="text-xs text-gray-500">
                Your name will be visible to your doctor
              </p>
            </div>

            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? 'Joining...' : 'Join Conversation'}
            </Button>
          </CardContent>
        </form>
      </Card>
    </div>
  )
}
