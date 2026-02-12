import { GoogleGenerativeAI } from '@google/generative-ai'

// Initialize Gemini API with API key from environment
const apiKey = process.env.GEMINI_API_KEY

if (!apiKey) {
  console.warn('GEMINI_API_KEY is not set in environment variables')
}

// Create Gemini client instance
export const genAI = apiKey ? new GoogleGenerativeAI(apiKey) : null

// Model configuration - using gemini-2.5-flash (confirmed working)
export const MODEL_NAME = 'gemini-2.5-flash'

// Generation config for consistent API calls
export const generationConfig = {
  temperature: 0.3, // Lower temperature for more consistent translations
  topP: 0.95,
  topK: 40,
  maxOutputTokens: 1024,
}
