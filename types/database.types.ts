export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string
          email: string
          full_name: string | null
          role: 'doctor' | 'patient'
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          email: string
          full_name?: string | null
          role?: 'doctor' | 'patient'
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          email?: string
          full_name?: string | null
          role?: 'doctor' | 'patient'
          created_at?: string
          updated_at?: string
        }
      }
      conversations: {
        Row: {
          id: string
          creator_id: string
          title: string | null
          doctor_language: string
          patient_language: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          creator_id: string
          title?: string | null
          doctor_language: string
          patient_language: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          creator_id?: string
          title?: string | null
          doctor_language?: string
          patient_language?: string
          created_at?: string
          updated_at?: string
        }
      }
      conversation_participants: {
        Row: {
          id: string
          conversation_id: string
          user_id: string | null
          guest_session_id: string | null
          role: 'doctor' | 'patient'
          joined_at: string
        }
        Insert: {
          id?: string
          conversation_id: string
          user_id?: string | null
          guest_session_id?: string | null
          role: 'doctor' | 'patient'
          joined_at?: string
        }
        Update: {
          id?: string
          conversation_id?: string
          user_id?: string | null
          guest_session_id?: string | null
          role?: 'doctor' | 'patient'
          joined_at?: string
        }
      }
      messages: {
        Row: {
          id: string
          conversation_id: string
          sender_id: string
          sender_role: 'doctor' | 'patient'
          original_text: string | null
          translated_text: string | null
          audio_url: string | null
          created_at: string
        }
        Insert: {
          id?: string
          conversation_id: string
          sender_id: string
          sender_role: 'doctor' | 'patient'
          original_text?: string | null
          translated_text?: string | null
          audio_url?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          conversation_id?: string
          sender_id?: string
          sender_role?: 'doctor' | 'patient'
          original_text?: string | null
          translated_text?: string | null
          audio_url?: string | null
          created_at?: string
        }
      }
      summaries: {
        Row: {
          id: string
          conversation_id: string
          summary_text: string
          symptoms: string[] | null
          diagnoses: string[] | null
          medications: string[] | null
          follow_up_actions: string[] | null
          created_at: string
        }
        Insert: {
          id?: string
          conversation_id: string
          summary_text: string
          symptoms?: string[] | null
          diagnoses?: string[] | null
          medications?: string[] | null
          follow_up_actions?: string[] | null
          created_at?: string
        }
        Update: {
          id?: string
          conversation_id?: string
          summary_text?: string
          symptoms?: string[] | null
          diagnoses?: string[] | null
          medications?: string[] | null
          follow_up_actions?: string[] | null
          created_at?: string
        }
      }
      guest_sessions: {
        Row: {
          id: string
          session_token: string
          guest_name: string
          conversation_id: string
          expires_at: string
          created_at: string
        }
        Insert: {
          id?: string
          session_token: string
          guest_name: string
          conversation_id: string
          expires_at: string
          created_at?: string
        }
        Update: {
          id?: string
          session_token?: string
          guest_name?: string
          conversation_id?: string
          expires_at?: string
          created_at?: string
        }
      }
    }
  }
}
