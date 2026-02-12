'use client'

import { useState, useTransition } from 'react'
import { Search, X } from 'lucide-react'
import { searchMessages } from '@/lib/conversations/actions'

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

type SearchBarProps = {
  conversationId?: string
  onResults: (results: SearchResult[], query: string) => void
}

export default function SearchBar({ conversationId, onResults }: SearchBarProps) {
  const [query, setQuery] = useState('')
  const [isPending, startTransition] = useTransition()

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!query.trim()) {
      onResults([], '')
      return
    }

    startTransition(async () => {
      const { results } = await searchMessages(query, conversationId)
      onResults(results as SearchResult[], query)
    })
  }

  const handleClear = () => {
    setQuery('')
    onResults([], '')
  }

  return (
    <form onSubmit={handleSearch} className="w-full">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={conversationId ? "Search in this conversation..." : "Search all conversations..."}
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
      {isPending && (
        <div className="mt-2 text-sm text-muted-foreground">
          Searching...
        </div>
      )}
    </form>
  )
}
