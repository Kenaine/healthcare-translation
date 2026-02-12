'use server'

import { genAI, MODEL_NAME, generationConfig } from './config'

// Language name mappings for better prompts
const languageNames: Record<string, string> = {
  en: 'English',
  es: 'Spanish',
  fr: 'French',
  de: 'German',
  it: 'Italian',
  pt: 'Portuguese',
  ru: 'Russian',
  zh: 'Chinese',
  ja: 'Japanese',
  ko: 'Korean',
  ar: 'Arabic',
  hi: 'Hindi',
  tr: 'Turkish',
  pl: 'Polish',
  nl: 'Dutch',
}

/**
 * Translate text from source language to target language using Gemini API
 * Optimized for medical terminology and healthcare context
 */
export async function translateText(
  text: string,
  sourceLanguage: string,
  targetLanguage: string
): Promise<{ translation: string; error?: string }> {
  // If source and target are the same, return original text
  if (sourceLanguage === targetLanguage) {
    return { translation: text }
  }

  // Check if API is configured
  if (!genAI) {
    console.error('Gemini API not configured')
    return {
      translation: text,
      error: 'Translation service not configured',
    }
  }

  try {
    const model = genAI.getGenerativeModel({
      model: MODEL_NAME,
      generationConfig,
    })

    const sourceLangName = languageNames[sourceLanguage] || sourceLanguage.toUpperCase()
    const targetLangName = languageNames[targetLanguage] || targetLanguage.toUpperCase()

    // Create medical-focused translation prompt
    const prompt = `You are a professional medical translator. Translate the following text from ${sourceLangName} to ${targetLangName}.

IMPORTANT GUIDELINES:
- Preserve medical terminology accuracy
- Maintain the original tone and urgency
- Keep numbers, measurements, and dosages exactly as provided
- Translate common symptoms and conditions using standard medical terms
- If unsure about medical terms, keep them in the original language
- Provide ONLY the translation, no explanations or notes

Text to translate:
"${text}"

Translation:`

    const result = await model.generateContent(prompt)
    const response = result.response
    const translation = response.text().trim()

    // Remove quotes if the model added them
    const cleanedTranslation = translation.replace(/^["']|["']$/g, '')

    return { translation: cleanedTranslation }
  } catch (error) {
    console.error('Translation error:', error)
    
    // Return original text as fallback
    return {
      translation: text,
      error: error instanceof Error ? error.message : 'Translation failed',
    }
  }
}

/**
 * Translate text with retry logic for better reliability
 */
export async function translateTextWithRetry(
  text: string,
  sourceLanguage: string,
  targetLanguage: string,
  maxRetries: number = 2
): Promise<{ translation: string; error?: string }> {
  let lastError: string | undefined

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    const result = await translateText(text, sourceLanguage, targetLanguage)
    
    if (!result.error) {
      return result
    }

    lastError = result.error

    // Wait before retry (exponential backoff)
    if (attempt < maxRetries) {
      await new Promise(resolve => setTimeout(resolve, Math.pow(2, attempt) * 1000))
    }
  }

  // All retries failed, return original text
  return {
    translation: text,
    error: `Translation failed after ${maxRetries + 1} attempts: ${lastError}`,
  }
}
