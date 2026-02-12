'use client'

import { useEffect, useState, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import { sendMessage } from '@/lib/conversations/actions'
import MessageList from '@/components/chat/MessageList'
import MessageInput from '@/components/chat/MessageInput'
import { Card, CardContent } from '@/components/ui/card'

type Message = {
  id: string
  sender_id: string
  sender_role: 'doctor' | 'patient'
  original_text: string | null
  translated_text: string | null
  created_at: string
}

type ChatInterfaceProps = {
  conversationId: string
  initialMessages: Message[]
  currentUserId: string
  currentUserRole: 'doctor' | 'patient'
}

export default function ChatInterface({
  conversationId,
  initialMessages,
  currentUserId,
  currentUserRole,
}: ChatInterfaceProps) {
  const [messages, setMessages] = useState<Message[]>(initialMessages)
  const [isSubscribed, setIsSubscribed] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const supabase = createClient()
  const lastMessageIdRef = useRef<string | null>(
    initialMessages.length > 0 ? initialMessages[initialMessages.length - 1].id : null
  )

  // Scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  // Polling fallback - check for new messages periodically
  useEffect(() => {
    if (isSubscribed) return // Skip polling if Realtime is active

    const pollInterval = setInterval(async () => {
      const { data: newMessages } = await supabase
        .from('messages')
        .select('*')
        .eq('conversation_id', conversationId)
        .order('created_at', { ascending: true })

      if (newMessages && newMessages.length > 0) {
        const lastMessage = newMessages[newMessages.length - 1]
        
        // Only update if there are new messages
        if (lastMessageIdRef.current !== lastMessage.id) {
          console.log('Polling: Found new messages')
          setMessages(newMessages as Message[])
          lastMessageIdRef.current = lastMessage.id
        }
      }
    }, 2000) // Poll every 2 seconds

    return () => clearInterval(pollInterval)
  }, [conversationId, supabase, isSubscribed])

  // Subscribe to realtime updates
  useEffect(() => {
    console.log('Setting up Realtime subscription for conversation:', conversationId)
    
    const channel = supabase
      .channel(`conversation:${conversationId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `conversation_id=eq.${conversationId}`,
        },
        (payload) => {
          console.log('Received new message via Realtime:', payload.new)
          const newMessage = payload.new as Message
          setMessages((prev) => {
            // Avoid duplicates
            if (prev.some(m => m.id === newMessage.id)) {
              console.log('Duplicate message, skipping')
              return prev
            }
            console.log('Adding new message to list')
            lastMessageIdRef.current = newMessage.id
            return [...prev, newMessage]
          })
        }
      )
      .subscribe((status, err) => {
        if (status === 'SUBSCRIBED') {
          setIsSubscribed(true)
          console.log('✓ Realtime subscription active - switching from polling to realtime')
        }
        // Silently fall back to polling if Realtime doesn't connect
      })

    return () => {
      console.log('Cleaning up Realtime subscription')
      supabase.removeChannel(channel)
      setIsSubscribed(false)
    }
  }, [conversationId, supabase])

  const handleSendMessage = async (text: string) => {
    // Optimistically add message to UI
    const optimisticMessage: Message = {
      id: `temp-${Date.now()}`,
      sender_id: currentUserId,
      sender_role: currentUserRole,
      original_text: text,
      translated_text: null,
      created_at: new Date().toISOString(),
    }

    setMessages((prev) => [...prev, optimisticMessage])

    const result = await sendMessage(conversationId, text)
    
    if (result.error) {
      console.error('Failed to send message:', result.error)
      // Remove optimistic message on error
      setMessages((prev) => prev.filter(m => m.id !== optimisticMessage.id))
    } else if (result.message) {
      // Remove optimistic message and let Realtime subscription add the real one
      // or if it already arrived, just remove the optimistic version
      setMessages((prev) => {
        const realMessageAlreadyExists = prev.some(m => m.id === result.message!.id)
        // Remove optimistic message
        const withoutOptimistic = prev.filter(m => m.id !== optimisticMessage.id)
        // If real message hasn't arrived yet, add it now
        if (!realMessageAlreadyExists) {
          lastMessageIdRef.current = result.message!.id
          return [...withoutOptimistic, result.message as Message]
        }
        return withoutOptimistic
      })
    }
  }

  return (
    <Card className="h-[600px] flex flex-col">
      <CardContent className="flex-1 flex flex-col p-0 overflow-hidden">
        <MessageList
          messages={messages}
          currentUserId={currentUserId}
          currentUserRole={currentUserRole}
        />
        <div ref={messagesEndRef} />
        <MessageInput
          conversationId={conversationId}
          onSendMessage={handleSendMessage}
        />
      </CardContent>
    </Card>
  )
}
