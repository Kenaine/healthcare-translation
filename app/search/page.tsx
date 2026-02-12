'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { getConversations } from '@/lib/conversations/actions'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { ArrowLeft, Search, X, MessageSquare, Users } from 'lucide-react'
import Link from 'next/link'

type Conversation = {
  id: string
  title: string | null
  doctor_language: string
  patient_language: string
  created_at: string
  conversation_participants: Array<{
    user_id: string
    profiles: {
      full_name: string | null
      role: 'doctor' | 'patient'
    }
  }>
}

export default function SearchPage() {
  const router = useRouter()
  const [query, setQuery] = useState('')
  const [conversations, setConversations] = useState<Conversation[]>([])
  const [isPending, startTransition] = useTransition()

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!query.trim()) {
      setConversations([])
      return
    }

    startTransition(async () => {
      const { conversations: allConversations } = await getConversations()
      
      // Filter conversations by title or participant name
      const filtered = allConversations.filter((conv: Conversation) => {
        const titleMatch = conv.title?.toLowerCase().includes(query.toLowerCase())
        const participantMatch = conv.conversation_participants?.some(p => 
          p.profiles?.full_name?.toLowerCase().includes(query.toLowerCase())
        )
        return titleMatch || participantMatch
      })
      
      setConversations(filtered)
    })
  }

  const handleClear = () => {
    setQuery('')
    setConversations([])
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto p-6">
        {/* Header */}
        <div className="mb-6">
          <Button
            variant="ghost"
            onClick={() => router.push('/conversations')}
            className="mb-4"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Conversations
          </Button>
          
          <h1 className="text-3xl font-bold mb-2">Search Conversations</h1>
          <p className="text-muted-foreground">
            Find conversations by title or participant name
          </p>
        </div>

        {/* Search Bar */}
        <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
          <form onSubmit={handleSearch} className="w-full">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search by title or participant name..."
                className="w-full pl-10 pr-10 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                disabled={isPending}
              />
              {query && (
                <button
                  type="button"
                  onClick={handleClear}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  aria-label="Clear search"
                >
                  <X className="w-5 h-5" />
                </button>
              )}
            </div>
          </form>
        </div>

        {/* Search Results */}
        {conversations.length > 0 && (
          <div className="bg-white rounded-lg shadow-sm p-6">
            <h2 className="font-semibold mb-4">
              Found {conversations.length} conversation{conversations.length !== 1 ? 's' : ''}
            </h2>
            <div className="space-y-3">
              {conversations.map((conversation) => (
                <Link
                  key={conversation.id}
                  href={`/conversations/${conversation.id}`}
                  className="block"
                >
                  <Card className="hover:shadow-md transition-shadow cursor-pointer">
                    <CardContent className="p-4">
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          <h3 className="font-semibold text-lg mb-2">
                            {conversation.title || `Conversation ${conversation.id.slice(0, 8)}`}
                          </h3>
                          <div className="flex items-center gap-4 text-sm text-muted-foreground">
                            <span className="flex items-center gap-1">
                              <Users className="w-4 h-4" />
                              {conversation.conversation_participants?.length || 0} participant{conversation.conversation_participants?.length !== 1 ? 's' : ''}
                            </span>
                            <span>
                              {conversation.doctor_language.toUpperCase()} ↔ {conversation.patient_language.toUpperCase()}
                            </span>
                          </div>
                          {conversation.conversation_participants && conversation.conversation_participants.length > 0 && (
                            <p className="text-sm text-muted-foreground mt-1">
                              Participants: {conversation.conversation_participants.map(p => p.profiles?.full_name || 'Unknown').join(', ')}
                            </p>
                          )}
                        </div>
                        <div className="text-sm text-muted-foreground">
                          {new Date(conversation.created_at).toLocaleDateString()}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              ))}
            </div>
          </div>
        )}

        {query && conversations.length === 0 && !isPending && (
          <div className="bg-white rounded-lg shadow-sm p-12 text-center">
            <MessageSquare className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground">No conversations found for &quot;{query}&quot;</p>
          </div>
        )}
      </div>
    </div>
  )
}
