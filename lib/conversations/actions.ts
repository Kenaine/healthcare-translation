'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { nanoid } from 'nanoid'
import { translateTextWithRetry } from '@/lib/gemini/translate'

export async function createConversation(formData: FormData) {
  const supabase = await createClient()
  
  const { data: { user } } = await supabase.auth.getUser()
  
  if (!user) {
    return { error: 'Not authenticated' }
  }

  // Check if user is a doctor and get their language preference
  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('role, language')
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
  const doctorLanguage = profile.language // Use doctor's profile language
  const patientLanguage = profile.language // Default to same language, will be updated when patient joins

  console.log('Creating conversation:', { title, doctorLanguage, patientLanguage, userId: user.id })

  // Create conversation
  const { data: conversation, error: convError } = await supabase
    .from('conversations')
    .insert({
      creator_id: user.id,
      title: title || null,
      doctor_language: doctorLanguage,
      patient_language: patientLanguage, // Will be updated when patient joins
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
  const { data: participant, error: participantError } = await supabase
    .from('conversation_participants')
    .select('role')
    .eq('conversation_id', conversationId)
    .eq('user_id', user.id)
    .single()

  if (participantError) {
    console.error('Participant check error:', participantError)
  }

  if (!participant) {
    return { conversation: null, error: 'Not authorized to view this conversation' }
  }

  console.log('User role in conversation:', participant.role)

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
    console.error('Error fetching conversation details:', {
      message: error.message,
      details: error.details,
      hint: error.hint,
      code: error.code
    })
    return { conversation: null, error: `Failed to load conversation: ${error.message || 'Unknown error'}` }
  }

  if (!conversation) {
    return { conversation: null, error: 'Conversation not found - might be an RLS policy issue' }
  }

  return { conversation, userRole: participant.role }
}

export async function joinConversation(conversationId: string) {
  const supabase = await createClient()
  
  const { data: { user } } = await supabase.auth.getUser()
  
  if (!user) {
    return { error: 'Not authenticated' }
  }

  // Use SECURITY DEFINER function to bypass RLS and join conversation
  const { data, error } = await supabase
    .rpc('join_conversation_as_patient', {
      conv_id: conversationId,
      joining_user_id: user.id
    })

  if (error) {
    console.error('Join conversation error:', error)
    return { error: 'Failed to join conversation' }
  }

  // The function returns a jsonb object with success/error
  if (data?.error) {
    return { error: data.error }
  }

  revalidatePath(`/conversations/${conversationId}`)
  return { success: true, message: data?.message }
}

export async function getMessages(conversationId: string) {
  const supabase = await createClient()
  
  const { data: { user } } = await supabase.auth.getUser()
  
  if (!user) {
    return { messages: [], error: 'Not authenticated' }
  }

  // Check if user is a participant
  const { data: participant } = await supabase
    .from('conversation_participants')
    .select('id')
    .eq('conversation_id', conversationId)
    .eq('user_id', user.id)
    .single()

  if (!participant) {
    return { messages: [], error: 'Not authorized' }
  }

  const { data: messages, error } = await supabase
    .from('messages')
    .select('*')
    .eq('conversation_id', conversationId)
    .order('created_at', { ascending: true })

  if (error) {
    console.error('Error fetching messages:', error)
    return { messages: [], error: 'Failed to load messages' }
  }

  return { messages: messages || [] }
}

export async function sendMessage(conversationId: string, text: string) {
  const supabase = await createClient()
  
  const { data: { user } } = await supabase.auth.getUser()
  
  if (!user) {
    return { error: 'Not authenticated' }
  }

  // Get user's role in this conversation
  const { data: participant } = await supabase
    .from('conversation_participants')
    .select('role')
    .eq('conversation_id', conversationId)
    .eq('user_id', user.id)
    .single()

  if (!participant) {
    return { error: 'Not authorized' }
  }

  // Get conversation details to determine language pair
  const { data: conversation } = await supabase
    .from('conversations')
    .select('doctor_language, patient_language')
    .eq('id', conversationId)
    .single()

  if (!conversation) {
    return { error: 'Conversation not found' }
  }

  // Determine source and target languages based on sender role
  const sourceLanguage = participant.role === 'doctor' 
    ? conversation.doctor_language 
    : conversation.patient_language
  
  const targetLanguage = participant.role === 'doctor'
    ? conversation.patient_language
    : conversation.doctor_language

  // Translate the message
  console.log(`Translating from ${sourceLanguage} to ${targetLanguage}:`, text)
  const { translation, error: translationError } = await translateTextWithRetry(
    text,
    sourceLanguage,
    targetLanguage
  )

  if (translationError) {
    console.warn('Translation warning:', translationError)
  }

  console.log('Translation result:', translation)

  // Insert message with translation
  const { data: message, error } = await supabase
    .from('messages')
    .insert({
      conversation_id: conversationId,
      sender_id: user.id,
      sender_role: participant.role,
      original_text: text,
      translated_text: translation,
    })
    .select()
    .single()

  if (error) {
    console.error('Error sending message:', error)
    return { error: 'Failed to send message' }
  }

  revalidatePath(`/conversations/${conversationId}`)
  return { success: true, message }
}

export async function sendAudioMessage(conversationId: string, audioBlob: Blob) {
  const supabase = await createClient()
  
  const { data: { user } } = await supabase.auth.getUser()
  
  if (!user) {
    return { error: 'Not authenticated' }
  }

  // Check if user is participant
  const { data: participant } = await supabase
    .from('conversation_participants')
    .select('role')
    .eq('conversation_id', conversationId)
    .eq('user_id', user.id)
    .single()

  if (!participant) {
    return { error: 'Not authorized' }
  }

  // Generate unique filename
  const fileName = `${conversationId}/${nanoid()}.webm`
  
  // Upload audio to Supabase Storage
  const { data: uploadData, error: uploadError } = await supabase.storage
    .from('audio-messages')
    .upload(fileName, audioBlob, {
      contentType: 'audio/webm',
      upsert: false
    })

  if (uploadError) {
    console.error('Error uploading audio:', uploadError)
    return { error: 'Failed to upload audio' }
  }

  // Get public URL
  const { data: { publicUrl } } = supabase.storage
    .from('audio-messages')
    .getPublicUrl(fileName)

  // Insert message with audio URL
  const { data: message, error } = await supabase
    .from('messages')
    .insert({
      conversation_id: conversationId,
      sender_id: user.id,
      sender_role: participant.role,
      original_text: '[Audio Message]',
      translated_text: '[Audio Message]',
      audio_url: publicUrl,
    })
    .select()
    .single()

  if (error) {
    console.error('Error sending audio message:', error)
    return { error: 'Failed to send audio message' }
  }

  revalidatePath(`/conversations/${conversationId}`)
  return { success: true, message }
}

export async function deleteConversation(conversationId: string) {
  const supabase = await createClient()
  
  const { data: { user } } = await supabase.auth.getUser()
  
  if (!user) {
    redirect('/auth/login')
  }

  // Check if user is the creator
  const { data: conversation } = await supabase
    .from('conversations')
    .select('creator_id')
    .eq('id', conversationId)
    .single()

  if (!conversation || conversation.creator_id !== user.id) {
    redirect('/conversations')
  }

  const { error } = await supabase
    .from('conversations')
    .delete()
    .eq('id', conversationId)

  if (error) {
    console.error('Delete error:', error)
    // Redirect anyway on error
    redirect('/conversations')
  }

  revalidatePath('/conversations')
  redirect('/conversations')
}

export async function searchMessages(query: string, conversationId?: string) {
  const supabase = await createClient()
  
  const { data: { user } } = await supabase.auth.getUser()
  
  if (!user) {
    return { results: [], error: 'Not authenticated' }
  }

  if (!query || query.trim().length === 0) {
    return { results: [] }
  }

  // Get user's conversations for filtering
  const { data: participants } = await supabase
    .from('conversation_participants')
    .select('conversation_id')
    .eq('user_id', user.id)

  if (!participants || participants.length === 0) {
    return { results: [] }
  }

  const conversationIds = participants.map(p => p.conversation_id)

  // Prepare search query (convert to tsquery format)
  const searchQuery = query
    .trim()
    .split(/\s+/)
    .filter(word => word.length > 0)
    .join(' & ')

  // Build the query
  let searchQueryBuilder = supabase
    .from('messages')
    .select(`
      id,
      conversation_id,
      sender_id,
      sender_role,
      original_text,
      translated_text,
      audio_url,
      created_at,
      conversations!inner (
        id,
        title,
        doctor_language,
        patient_language
      )
    `)
    .in('conversation_id', conversationIds)
    .textSearch('search_vector', searchQuery, {
      type: 'websearch',
      config: 'english'
    })
    .order('created_at', { ascending: false })
    .limit(50)

  // Filter by conversation if specified
  if (conversationId) {
    searchQueryBuilder = searchQueryBuilder.eq('conversation_id', conversationId)
  }

  const { data: results, error } = await searchQueryBuilder

  if (error) {
    console.error('Search error:', error)
    return { results: [], error: 'Search failed' }
  }

  return { results: results || [] }
}
