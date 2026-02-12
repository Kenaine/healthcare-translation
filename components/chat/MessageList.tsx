'use client'

import { formatDistanceToNow } from 'date-fns'

type Message = {
  id: string
  sender_id: string
  sender_role: 'doctor' | 'patient'
  original_text: string | null
  translated_text: string | null
  created_at: string
}

type MessageListProps = {
  messages: Message[]
  currentUserId: string
  currentUserRole: 'doctor' | 'patient'
}

export default function MessageList({ messages, currentUserId, currentUserRole }: MessageListProps) {
  if (messages.length === 0) {
    return (
      <div className="flex items-center justify-center h-full text-muted-foreground">
        No messages yet. Start the conversation!
      </div>
    )
  }

  return (
    <div className="flex-1 overflow-y-auto p-4 space-y-4">
      {messages.map((message) => {
        const isOwnMessage = message.sender_id === currentUserId
        const displayText = message.original_text || ''
        const translatedText = message.translated_text

        return (
          <div
            key={message.id}
            className={`flex flex-col ${isOwnMessage ? 'items-end' : 'items-start'}`}
          >
            {/* Message bubble */}
            <div
              className={`max-w-[70%] rounded-lg px-4 py-2 ${
                isOwnMessage
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-muted'
              }`}
            >
              {/* Role badge */}
              <div className="text-xs opacity-70 mb-1">
                {message.sender_role === 'doctor' ? '👨‍⚕️ Doctor' : '🧑 Patient'}
              </div>

              {/* Original message */}
              <div className="text-sm">{displayText}</div>

              {/* Translation if available and different from original */}
              {translatedText && translatedText !== displayText && (
                <div className="mt-2 pt-2 border-t border-current/20">
                  <div className="text-xs opacity-70 mb-1">Translation:</div>
                  <div className="text-sm italic">{translatedText}</div>
                </div>
              )}
            </div>

            {/* Timestamp */}
            <div className="text-xs text-muted-foreground mt-1">
              {new Date(message.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </div>
          </div>
        )
      })}
    </div>
  )
}
