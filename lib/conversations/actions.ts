'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { nanoid } from 'nanoid'

export async function createConversation(formData: FormData) {
  const supabase = await createClient()
  
  const { data: { user } } = await supabase.auth.getUser()
  
  if (!user) {
    return { error: 'Not authenticated' }
  }

  // Check if user is a doctor
  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (profileError) {
    console.error('Profile fetch error:', profileError)
    return { error: `Profile error: ${profileError.message}` }
  }

  if (!profile) {
    return { error: 'Profile not found. Please log out and log in again.' }
  }

  if (profile.role !== 'doctor') {
    return { error: `Only doctors can create conversations. Your role: ${profile.role}` }
  }

  const title = formData.get('title') as string
  const doctorLanguage = formData.get('doctor_language') as string
  const patientLanguage = formData.get('patient_language') as string

  console.log('Creating conversation:', { title, doctorLanguage, patientLanguage, userId: user.id })

  // Create conversation
  const { data: conversation, error: convError } = await supabase
    .from('conversations')
    .insert({
      creator_id: user.id,
      title: title || null,
      doctor_language: doctorLanguage,
      patient_language: patientLanguage,
    })
    .select()
    .single()

  if (convError || !conversation) {
    console.error('Conversation creation error:', convError)
    return { error: `Database error: ${convError?.message || 'Unknown error'}` }
  }

  console.log('Conversation created:', conversation.id)

  // Add creator as participant
  const { error: participantError } = await supabase
    .from('conversation_participants')
    .insert({
      conversation_id: conversation.id,
      user_id: user.id,
      role: 'doctor',
    })

  if (participantError) {
    console.error('Participant error:', participantError)
    return { error: `Participant error: ${participantError.message}` }
  }

  revalidatePath('/conversations')
  return { success: true, conversationId: conversation.id }
}

export async function getConversations() {
  const supabase = await createClient()
  
  const { data: { user } } = await supabase.auth.getUser()
  
  if (!user) {
    return { conversations: [] }
  }

  // Get conversations where user is a participant
  const { data: participants } = await supabase
    .from('conversation_participants')
    .select('conversation_id')
    .eq('user_id', user.id)

  if (!participants || participants.length === 0) {
    return { conversations: [] }
  }

  const conversationIds = participants.map(p => p.conversation_id)

  const { data: conversations, error } = await supabase
    .from('conversations')
    .select(`
      *,
      profiles:creator_id (
        full_name,
        email
      ),
      conversation_participants (
        user_id,
        role,
        profiles:user_id (
          full_name,
          email,
          role
        )
      )
    `)
    .in('id', conversationIds)
    .order('created_at', { ascending: false })

  if (error) {
    console.error('Error fetching conversations:', error)
    return { conversations: [] }
  }

  return { conversations: conversations || [] }
}

export async function getConversation(conversationId: string) {
  const supabase = await createClient()
  
  const { data: { user } } = await supabase.auth.getUser()
  
  if (!user) {
    return { conversation: null, error: 'Not authenticated' }
  }

  // Check if user is a participant
  const { data: participant } = await supabase
    .from('conversation_participants')
    .select('role')
    .eq('conversation_id', conversationId)
    .eq('user_id', user.id)
    .single()

  if (!participant) {
    return { conversation: null, error: 'Not authorized' }
  }

  const { data: conversation, error } = await supabase
    .from('conversations')
    .select(`
      *,
      profiles:creator_id (
        full_name,
        email
      ),
      conversation_participants (
        user_id,
        role,
        profiles:user_id (
          full_name,
          email,
          role
        )
      )
    `)
    .eq('id', conversationId)
    .single()

  if (error) {
    console.error('Error fetching conversation:', error)
    return { conversation: null, error: 'Conversation not found' }
  }

  return { conversation, userRole: participant.role }
}

export async function joinConversation(conversationId: string) {
  const supabase = await createClient()
  
  const { data: { user } } = await supabase.auth.getUser()
  
  if (!user) {
    return { error: 'Not authenticated' }
  }

  // Check if conversation exists
  const { data: conversation, error: convError } = await supabase
    .from('conversations')
    .select('id')
    .eq('id', conversationId)
    .single()

  if (convError || !conversation) {
    return { error: 'Conversation not found' }
  }

  // Check if already a participant
  const { data: existing } = await supabase
    .from('conversation_participants')
    .select('id')
    .eq('conversation_id', conversationId)
    .eq('user_id', user.id)
    .single()

  if (existing) {
    return { success: true, message: 'Already joined' }
  }

  // Add as participant with patient role
  const { error: participantError } = await supabase
    .from('conversation_participants')
    .insert({
      conversation_id: conversationId,
      user_id: user.id,
      role: 'patient',
    })

  if (participantError) {
    console.error('Participant error:', participantError)
    return { error: 'Failed to join conversation' }
  }

  revalidatePath(`/conversations/${conversationId}`)
  return { success: true }
}

export async function deleteConversation(conversationId: string) {
  const supabase = await createClient()
  
  const { data: { user } } = await supabase.auth.getUser()
  
  if (!user) {
    return { error: 'Not authenticated' }
  }

  // Check if user is the creator
  const { data: conversation } = await supabase
    .from('conversations')
    .select('creator_id')
    .eq('id', conversationId)
    .single()

  if (!conversation || conversation.creator_id !== user.id) {
    return { error: 'Not authorized to delete this conversation' }
  }

  const { error } = await supabase
    .from('conversations')
    .delete()
    .eq('id', conversationId)

  if (error) {
    console.error('Delete error:', error)
    return { error: 'Failed to delete conversation' }
  }

  revalidatePath('/conversations')
  redirect('/conversations')
}
