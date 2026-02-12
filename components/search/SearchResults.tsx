'use client'

import Link from 'next/link'
import { formatDistanceToNow } from 'date-fns'
import { MessageSquare, User } from 'lucide-react'

type SearchResult = {
  id: string
  conversation_id: string
  sender_id: string
  sender_role: 'doctor' | 'patient'
  original_text: string | null
  translated_text: string | null
  audio_url: string | null
  created_at: string
  conversations: {
    id: string
    title: string | null
    doctor_language: string
    patient_language: string
  }
}

type SearchResultsProps = {
  results: SearchResult[]
  query: string
  onJump?: (messageId: string) => void
}

export default function SearchResults({ results, query, onJump }: SearchResultsProps) {
  if (results.length === 0 && query) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        <MessageSquare className="w-12 h-12 mx-auto mb-4 opacity-50" />
        <p>No messages found for &quot;{query}&quot;</p>
      </div>
    )
  }

  if (results.length === 0) {
    return null
  }

  const highlightText = (text: string, query: string) => {
    if (!query) return text

    const words = query.toLowerCase().split(/\s+/)
    let highlightedText = text

    words.forEach(word => {
      const regex = new RegExp(`(${word})`, 'gi')
      highlightedText = highlightedText.replace(regex, '<mark class="bg-yellow-200">$1</mark>')
    })

    return highlightedText
  }

  return (
    <div className="space-y-4">
      <div className="text-sm text-muted-foreground mb-4">
        Found {results.length} {results.length === 1 ? 'message' : 'messages'}
      </div>

      {results.map((result) => {
        const displayText = result.audio_url 
          ? '[Audio Message]' 
          : result.original_text || result.translated_text || ''
        
        const content = (
          <>
            <div className="flex items-start gap-3">
              <div className="mt-1">
                {result.sender_role === 'doctor' ? (
                  <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                    👨‍⚕️
                  </div>
                ) : (
                  <div className="w-8 h-8 rounded-full bg-secondary flex items-center justify-center">
                    <User className="w-4 h-4" />
                  </div>
                )}
              </div>

              <div className="flex-1 min-w-0">
                {/* Conversation title */}
                <div className="text-sm text-muted-foreground mb-1">
                  {result.conversations.title || 'Untitled Conversation'} 
                  <span className="mx-2">•</span>
                  {result.conversations.doctor_language} ↔ {result.conversations.patient_language}
                </div>

                {/* Message text with highlighting */}
                <div 
                  className="text-sm line-clamp-3"
                  dangerouslySetInnerHTML={{ 
                    __html: highlightText(displayText.substring(0, 200), query) 
                  }}
                />

                {/* Timestamp */}
                <div className="text-xs text-muted-foreground mt-2">
                  {formatDistanceToNow(new Date(result.created_at), { addSuffix: true })}
                </div>

                {/* Jump button for in-conversation search */}
                {onJump && (
                  <button
                    onClick={() => onJump(result.id)}
                    className="mt-2 text-xs text-primary hover:underline"
                  >
                    Jump to this message →
                  </button>
                )}
              </div>
            </div>
          </>
        )
        
        return onJump ? (
          <div
            key={result.id}
            className="p-4 border rounded-lg hover:bg-accent transition-colors"
          >
            {content}
          </div>
        ) : (
          <Link
            key={result.id}
            href={`/conversations/${result.conversation_id}#message-${result.id}`}
            className="block p-4 border rounded-lg hover:bg-accent transition-colors"
          >
            {content}
          </Link>
        )
      })}
    </div>
  )
}
