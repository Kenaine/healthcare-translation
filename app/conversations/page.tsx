import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { getConversations } from '@/lib/conversations/actions'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { logout } from '@/lib/auth/actions'
import { MessageSquare, Plus, Users } from 'lucide-react'

export default async function ConversationsPage() {
  const supabase = await createClient()
  
  const { data: { user } } = await supabase.auth.getUser()
  
  if (!user) {
    redirect('/auth/login')
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  const isDoctor = profile?.role === 'doctor'
  const { conversations } = await getConversations()

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex justify-between items-center">
          <h1 className="text-2xl font-bold text-gray-900">
            My Conversations
          </h1>
          <div className="flex gap-4 items-center">
            <Link href="/dashboard">
              <Button variant="ghost">Dashboard</Button>
            </Link>
            <Link href="/profile">
              <Button variant="ghost">Profile</Button>
            </Link>
            <form action={logout}>
              <Button type="submit" variant="outline">
                Logout
              </Button>
            </form>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h2 className="text-3xl font-bold text-gray-900">Conversations</h2>
            <p className="text-gray-600 mt-2">
              {isDoctor 
                ? 'Manage your consultations with patients' 
                : 'View your consultations with doctors'}
            </p>
          </div>
          {isDoctor && (
            <Link href="/conversations/new">
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                New Conversation
              </Button>
            </Link>
          )}
        </div>

        {conversations.length === 0 ? (
          <Card>
            <CardContent className="p-12">
              <div className="text-center">
                <MessageSquare className="mx-auto h-12 w-12 text-gray-400" />
                <h3 className="mt-4 text-lg font-medium text-gray-900">
                  No conversations yet
                </h3>
                <p className="mt-2 text-sm text-gray-500">
                  {isDoctor 
                    ? 'Create your first consultation to get started' 
                    : 'Wait for a doctor to invite you to a consultation'}
                </p>
                {isDoctor && (
                  <Link href="/conversations/new">
                    <Button className="mt-4">
                      <Plus className="mr-2 h-4 w-4" />
                      Create Conversation
                    </Button>
                  </Link>
                )}
              </div>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 gap-4">
            {conversations.map((conversation: any) => {
              const participants = conversation.conversation_participants || []
              const otherParticipants = participants.filter((p: any) => p.user_id !== user.id)
              
              return (
                <Link key={conversation.id} href={`/conversations/${conversation.id}`}>
                  <Card className="hover:shadow-lg transition-shadow cursor-pointer">
                    <CardHeader>
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          <CardTitle className="text-xl">
                            {conversation.title || `Conversation ${conversation.id.slice(0, 8)}`}
                          </CardTitle>
                          <CardDescription className="mt-2">
                            <div className="flex items-center gap-4 text-sm">
                              <span className="flex items-center gap-1">
                                <Users className="h-4 w-4" />
                                {participants.length} participant{participants.length !== 1 ? 's' : ''}
                              </span>
                              <span>
                                {conversation.doctor_language.toUpperCase()} ↔ {conversation.patient_language.toUpperCase()}
                              </span>
                            </div>
                          </CardDescription>
                        </div>
                        <div className="text-sm text-gray-500">
                          {new Date(conversation.created_at).toLocaleDateString()}
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="flex items-center justify-between">
                        <div className="text-sm text-gray-600">
                          {otherParticipants.length > 0 ? (
                            <span>
                              With: {otherParticipants.map((p: any) => p.profiles?.full_name || 'Unknown').join(', ')}
                            </span>
                          ) : (
                            <span className="text-gray-400">No other participants yet</span>
                          )}
                        </div>
                        <Button variant="ghost" size="sm">
                          Open →
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              )
            })}
          </div>
        )}
      </main>
    </div>
  )
}
