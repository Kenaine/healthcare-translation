import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { getConversation, deleteConversation } from '@/lib/conversations/actions'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { ShareLink } from '@/components/conversations/ShareLink'
import { ArrowLeft, Trash2, Users } from 'lucide-react'

export default async function ConversationDetailPage({
  params,
}: {
  params: { id: string }
}) {
  const supabase = await createClient()
  
  const { data: { user } } = await supabase.auth.getUser()
  
  if (!user) {
    redirect('/auth/login')
  }

  const { conversation, userRole, error } = await getConversation(params.id)

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
              
              {isCreator && (
                <form action={deleteConversation.bind(null, params.id)}>
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
            <Card className="h-[600px] flex flex-col">
              <CardContent className="flex-1 p-6 flex items-center justify-center">
                <div className="text-center text-gray-500">
                  <p className="text-lg font-medium">Chat Interface</p>
                  <p className="text-sm mt-2">Real-time messaging will be implemented in Phase 4</p>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Share Link (only for doctors/creators) */}
            {isDoctor && <ShareLink conversationId={params.id} />}

            {/* Participants */}
            <Card>
              <CardContent className="p-6">
                <h3 className="font-semibold mb-4">Participants</h3>
                <div className="space-y-3">
                  {participants.map((participant: any) => (
                    <div key={participant.user_id} className="flex items-center justify-between">
                      <div>
                        <p className="font-medium text-sm">
                          {participant.profiles?.full_name || 'Unknown'}
                        </p>
                        <p className="text-xs text-gray-500 capitalize">
                          {participant.role}
                        </p>
                      </div>
                      {participant.user_id === user.id && (
                        <span className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded">
                          You
                        </span>
                      )}
                    </div>
                  ))}
                  
                  {participants.length < 2 && (
                    <div className="text-sm text-gray-500 italic">
                      Waiting for patient to join...
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

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
