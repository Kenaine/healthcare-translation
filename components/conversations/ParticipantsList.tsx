'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Card, CardContent } from '@/components/ui/card'

type Participant = {
  user_id: string
  role: string
  profiles: {
    full_name: string | null
    email: string
    role: string
  } | null
}

type ParticipantsListProps = {
  conversationId: string
  initialParticipants: Participant[]
  currentUserId: string
  isDoctor: boolean
}

export default function ParticipantsList({
  conversationId,
  initialParticipants,
  currentUserId,
  isDoctor,
}: ParticipantsListProps) {
  const [participants, setParticipants] = useState<Participant[]>(initialParticipants)
  const supabase = createClient()

  useEffect(() => {
    // Subscribe to new participants joining
    const channel = supabase
      .channel(`participants:${conversationId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'conversation_participants',
          filter: `conversation_id=eq.${conversationId}`,
        },
        async (payload) => {
          // Fetch the full participant data with profile info
          // Note: conversation_participants uses (conversation_id, user_id) as composite key, not 'id'
          const { data: newParticipant } = await supabase
            .from('conversation_participants')
            .select(`
              user_id,
              role,
              profiles:user_id (
                full_name,
                email,
                role
              )
            `)
            .eq('conversation_id', payload.new.conversation_id)
            .eq('user_id', payload.new.user_id)
            .single()

          if (newParticipant) {
            setParticipants((prev) => {
              // Avoid duplicates
              if (prev.some(p => p.user_id === newParticipant.user_id)) {
                return prev
              }
              // Convert profiles array to single object (Supabase returns array for joins)
              const participant: Participant = {
                user_id: newParticipant.user_id,
                role: newParticipant.role,
                profiles: Array.isArray(newParticipant.profiles) && newParticipant.profiles.length > 0
                  ? newParticipant.profiles[0]
                  : null
              }
              return [...prev, participant]
            })
          }
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [conversationId, supabase])

  return (
    <Card>
      <CardContent className="p-6">
        <h3 className="font-semibold mb-4">Participants</h3>
        <div className="space-y-3">
          {participants.map((participant) => (
            <div key={participant.user_id} className="flex items-center justify-between">
              <div>
                <p className="font-medium text-sm">
                  {participant.profiles?.full_name || 'Unknown'}
                </p>
                <p className="text-xs text-gray-500 capitalize">
                  {participant.role}
                </p>
              </div>
              {participant.user_id === currentUserId && (
                <span className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded">
                  You
                </span>
              )}
            </div>
          ))}
          
          {participants.length === 1 && isDoctor && (
            <div className="text-sm text-gray-500 italic">
              Waiting for patient to join...
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
