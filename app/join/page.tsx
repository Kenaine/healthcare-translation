'use client'

import { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { joinConversation } from '@/lib/conversations/actions'
import { createClient } from '@/lib/supabase/client'

export default function JoinPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const conversationId = searchParams.get('c')
  
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [user, setUser] = useState<any>(null)
  const [checkingAuth, setCheckingAuth] = useState(true)

  useEffect(() => {
    async function checkUser() {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      setUser(user)
      setCheckingAuth(false)
    }
    checkUser()
  }, [])

  async function handleJoin() {
    if (!conversationId) {
      setError('Invalid conversation link')
      return
    }
    
    setError(null)
    setLoading(true)

    const result = await joinConversation(conversationId)
    
    setLoading(false)

    if (result?.error) {
      setError(result.error)
    } else if (result?.success) {
      router.push(`/conversations/${conversationId}`)
    }
  }

  if (checkingAuth) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
        <Card className="w-full max-w-md">
          <CardContent className="p-6">
            <div className="text-center">Loading...</div>
          </CardContent>
        </Card>
      </div>
    )
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
          <CardContent>
            <Link href="/">
              <Button className="w-full">Go to Home</Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="space-y-1">
            <CardTitle className="text-2xl font-bold">Join Conversation</CardTitle>
            <CardDescription>
              You need to be logged in to join this consultation
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-gray-600">
              Please log in or create an account to join this conversation with your doctor.
            </p>
            
            <div className="space-y-2">
              <Link href={`/auth/login?redirect=/join?c=${conversationId}`}>
                <Button className="w-full">Log In</Button>
              </Link>
              <Link href={`/auth/signup?redirect=/join?c=${conversationId}`}>
                <Button variant="outline" className="w-full">Sign Up</Button>
              </Link>
            </div>
          </CardContent>
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
            You've been invited to join a consultation
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
              {error}
            </div>
          )}
          
          <div className="bg-blue-50 border border-blue-200 text-blue-700 px-4 py-3 rounded">
            <p className="text-sm">
              You're joining as: <span className="font-semibold">{user.user_metadata.full_name || user.email}</span>
            </p>
          </div>

          <Button onClick={handleJoin} className="w-full" disabled={loading}>
            {loading ? 'Joining...' : 'Join Conversation'}
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}
