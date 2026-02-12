import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { getConversation, getMessages, deleteConversation } from '@/lib/conversations/actions'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { ShareLink } from '@/components/conversations/ShareLink'
import ChatInterface from '@/components/chat/ChatInterface'
import ParticipantsList from '@/components/conversations/ParticipantsList'
import SummaryModal from '@/components/summary/SummaryModal'
import { ArrowLeft, Trash2, Users } from 'lucide-react'

export default async function ConversationDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const supabase = await createClient()
  
  const { data: { user } } = await supabase.auth.getUser()
  
  if (!user) {
    redirect('/auth/login')
  }

  const { conversation, userRole, error } = await getConversation(id)

  if (error || !conversation) {
    redirect('/conversations')
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  const isDoctor = profile?.role === 'doctor'
  const isCreator = conversation.creator_id === user.id
  const participants = conversation.conversation_participants || []

  // Fetch messages
  const { messages } = await getMessages(id)

  // Create delete action bound to this conversation
  const deleteAction = deleteConversation.bind(null, id)

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-4">
              <Link href="/conversations" className="text-gray-600 hover:text-gray-900">
                <ArrowLeft className="h-5 w-5" />
              </Link>
              <div>
                <h1 className="text-xl font-bold text-gray-900">
                  {conversation.title || `Conversation ${conversation.id.slice(0, 8)}`}
                </h1>
                <p className="text-sm text-gray-500">
                  {conversation.doctor_language.toUpperCase()} ↔ {conversation.patient_language.toUpperCase()}
                </p>
              </div>
            </div>
            
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <Users className="h-4 w-4" />
                {participants.length} participant{participants.length !== 1 ? 's' : ''}
              </div>
              
              {isDoctor && (
                <SummaryModal conversationId={id} isDoctor={isDoctor} />
              )}
              
              {isCreator && (
                <form action={deleteAction}>
                  <Button type="submit" variant="destructive" size="sm">
                    <Trash2 className="mr-2 h-4 w-4" />
                    Delete
                  </Button>
                </form>
              )}
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Chat Area */}
          <div className="lg:col-span-2">
            <ChatInterface
              conversationId={id}
              initialMessages={messages}
              currentUserId={user.id}
              currentUserRole={userRole as 'doctor' | 'patient'}
            />
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Share Link (only for doctors/creators) */}
            {isDoctor && <ShareLink conversationId={id} />}

            {/* Participants */}
            <ParticipantsList
              conversationId={id}
              initialParticipants={participants}
              currentUserId={user.id}
              isDoctor={isDoctor}
            />

            {/* Conversation Info */}
            <Card>
              <CardContent className="p-6">
                <h3 className="font-semibold mb-4">Information</h3>
                <div className="space-y-2 text-sm">
                  <div>
                    <span className="text-gray-500">Created:</span>
                    <p className="font-medium">
                      {new Date(conversation.created_at).toLocaleDateString()} at{' '}
                      {new Date(conversation.created_at).toLocaleTimeString()}
                    </p>
                  </div>
                  <div>
                    <span className="text-gray-500">Creator:</span>
                    <p className="font-medium">
                      {conversation.profiles?.full_name || 'Unknown'}
                    </p>
                  </div>
                  <div>
                    <span className="text-gray-500">Your Role:</span>
                    <p className="font-medium capitalize">{userRole}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
    </div>
  )
}
