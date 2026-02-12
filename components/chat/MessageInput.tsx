'use client'

import { useState, useTransition } from 'react'
import { Button } from '@/components/ui/button'
import { Send } from 'lucide-react'

type MessageInputProps = {
  conversationId: string
  onSendMessage: (text: string) => Promise<void>
}

export default function MessageInput({ conversationId, onSendMessage }: MessageInputProps) {
  const [message, setMessage] = useState('')
  const [isPending, startTransition] = useTransition()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!message.trim() || isPending) return

    const messageText = message.trim()
    setMessage('') // Clear input immediately for better UX

    startTransition(async () => {
      await onSendMessage(messageText)
    })
  }

  return (
    <form onSubmit={handleSubmit} className="border-t p-4">
      <div className="flex gap-2">
        <input
          type="text"
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder="Type your message..."
          className="flex-1 px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
          disabled={isPending}
        />
        <Button type="submit" disabled={!message.trim() || isPending}>
          <Send className="h-4 w-4" />
        </Button>
      </div>
    </form>
  )
}
