'use client'

import { useState, useRef, useCallback } from 'react'
import { Mic, Square, Loader2 } from 'lucide-react'

type AudioRecorderProps = {
  onRecordingComplete: (audioBlob: Blob) => void
  disabled?: boolean
}

export default function AudioRecorder({ onRecordingComplete, disabled }: AudioRecorderProps) {
  const [isRecording, setIsRecording] = useState(false)
  const [recordingTime, setRecordingTime] = useState(0)
  const [isProcessing, setIsProcessing] = useState(false)
  
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const chunksRef = useRef<Blob[]>([])
  const timerRef = useRef<NodeJS.Timeout | null>(null)

  const startRecording = useCallback(async () => {
    try {
      // Request microphone permission
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      
      // Create MediaRecorder instance
      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: 'audio/webm;codecs=opus'
      })
      
      mediaRecorderRef.current = mediaRecorder
      chunksRef.current = []

      // Collect audio data
      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunksRef.current.push(event.data)
        }
      }

      // Handle recording stop
      mediaRecorder.onstop = async () => {
        setIsProcessing(true)
        
        // Create blob from chunks
        const audioBlob = new Blob(chunksRef.current, { type: 'audio/webm' })
        
        // Stop all tracks
        stream.getTracks().forEach(track => track.stop())
        
        // Call callback with audio blob
        onRecordingComplete(audioBlob)
        
        // Reset state
        setRecordingTime(0)
        setIsProcessing(false)
      }

      // Start recording
      mediaRecorder.start()
      setIsRecording(true)

      // Start timer
      timerRef.current = setInterval(() => {
        setRecordingTime(prev => prev + 1)
      }, 1000)

    } catch (error) {
      console.error('Error starting recording:', error)
      alert('Could not access microphone. Please check permissions.')
    }
  }, [onRecordingComplete])

  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop()
      setIsRecording(false)
      
      if (timerRef.current) {
        clearInterval(timerRef.current)
        timerRef.current = null
      }
    }
  }, [isRecording])

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  return (
    <div className="flex items-center gap-2">
      {isRecording ? (
        <div className="flex items-center gap-2">
          <button
            onClick={stopRecording}
            disabled={isProcessing}
            className="p-2 rounded-full bg-red-500 text-white hover:bg-red-600 transition-colors disabled:opacity-50"
            aria-label="Stop recording"
          >
            <Square className="w-5 h-5" />
          </button>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
            <span>{formatTime(recordingTime)}</span>
          </div>
        </div>
      ) : (
        <button
          onClick={startRecording}
          disabled={disabled || isProcessing}
          className="p-2 rounded-full hover:bg-accent transition-colors disabled:opacity-50"
          aria-label="Record audio message"
          title="Record audio message"
        >
          {isProcessing ? (
            <Loader2 className="w-5 h-5 animate-spin" />
          ) : (
            <Mic className="w-5 h-5" />
          )}
        </button>
      )}
    </div>
  )
}
