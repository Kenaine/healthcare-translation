'use server'

import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { nanoid } from 'nanoid'
import { cookies } from 'next/headers'

export async function joinAsGuest(conversationId: string, guestName: string) {
  const supabase = await createClient()
  
  // Verify conversation exists
  const { data: conversation, error: convError } = await supabase
    .from('conversations')
    .select('id')
    .eq('id', conversationId)
    .single()
  
  if (convError || !conversation) {
    return { error: 'Conversation not found' }
  }
  
  // Create guest session
  const sessionId = nanoid()
  const expiresAt = new Date()
  expiresAt.setHours(expiresAt.getHours() + 24) // 24 hour session
  
  const { error: sessionError } = await supabase
    .from('guest_sessions')
    .insert({
      session_id: sessionId,
      guest_name: guestName,
      conversation_id: conversationId,
      expires_at: expiresAt.toISOString(),
    })
  
  if (sessionError) {
    console.error('Guest session error:', sessionError)
    return { error: 'Failed to create guest session' }
  }
  
  // Add guest as participant
  const { error: participantError } = await supabase
    .from('conversation_participants')
    .insert({
      conversation_id: conversationId,
      user_id: null,
      guest_session_id: sessionId,
      role: 'patient',
    })
  
  if (participantError) {
    console.error('Participant error:', participantError)
    return { error: 'Failed to join conversation' }
  }
  
  // Set guest session cookie
  const cookieStore = await cookies()
  cookieStore.set('guest_session', sessionId, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 60 * 60 * 24, // 24 hours
    path: '/',
  })
  
  return { success: true, sessionId }
}

export async function getGuestSession() {
  const cookieStore = await cookies()
  const sessionId = cookieStore.get('guest_session')?.value
  
  if (!sessionId) {
    return null
  }
  
  const supabase = await createClient()
  
  const { data: session, error } = await supabase
    .from('guest_sessions')
    .select('*')
    .eq('session_id', sessionId)
    .gt('expires_at', new Date().toISOString())
    .single()
  
  if (error || !session) {
    return null
  }
  
  return session
}

export async function clearGuestSession() {
  const cookieStore = await cookies()
  cookieStore.delete('guest_session')
}
