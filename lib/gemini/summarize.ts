import { GoogleGenerativeAI } from '@google/generative-ai'
import { MODEL_NAME, generationConfig } from './config'

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '')

type Message = {
  sender_role: 'doctor' | 'patient'
  original_text: string | null
  translated_text: string | null
  created_at: string
}

type SummaryResult = {
  overall_summary: string
  symptoms: string[]
  diagnoses: string[]
  medications: string[]
  allergies: string[]
  follow_up_actions: string[]
  patient_concerns: string[]
  doctor_recommendations: string[]
}

export async function generateMedicalSummary(
  messages: Message[]
): Promise<SummaryResult> {
  const model = genAI.getGenerativeModel({ model: MODEL_NAME })

  // Format conversation for the prompt
  const conversationText = messages
    .map((msg) => {
      const text = msg.original_text || msg.translated_text || ''
      const role = msg.sender_role === 'doctor' ? 'Doctor' : 'Patient'
      return `${role}: ${text}`
    })
    .join('\n')

  const prompt = `You are a medical assistant analyzing a doctor-patient consultation. Read the following conversation and extract key medical information.

CONVERSATION:
${conversationText}

Please provide a comprehensive medical summary in the following JSON format:
{
  "overall_summary": "A brief 2-3 sentence summary of the entire consultation",
  "symptoms": ["list", "of", "symptoms", "mentioned"],
  "diagnoses": ["list", "of", "diagnoses", "or", "suspected", "conditions"],
  "medications": ["list", "of", "medications", "prescribed", "or", "discussed"],
  "allergies": ["list", "of", "allergies", "mentioned"],
  "follow_up_actions": ["list", "of", "follow-up", "tasks", "or", "appointments"],
  "patient_concerns": ["list", "of", "patient", "concerns", "or", "questions"],
  "doctor_recommendations": ["list", "of", "doctor", "advice", "or", "recommendations"]
}

IMPORTANT INSTRUCTIONS:
- Use empty arrays [] for categories with no information
- Be concise and accurate
- Use medical terminology when appropriate
- Include only information explicitly mentioned in the conversation
- Do not make assumptions or add information not in the conversation
- Return ONLY valid JSON, no additional text

JSON SUMMARY:`

  try {
    const result = await model.generateContent({
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
      generationConfig,
    })

    const response = result.response
    const text = response.text()

    // Try to parse JSON response
    // Remove markdown code blocks if present
    const cleanedText = text
      .replace(/```json\n?/g, '')
      .replace(/```\n?/g, '')
      .trim()

    const summary = JSON.parse(cleanedText) as SummaryResult

    // Validate structure
    if (!summary.overall_summary) {
      throw new Error('Invalid summary structure: missing overall_summary')
    }

    // Ensure all arrays exist
    return {
      overall_summary: summary.overall_summary,
      symptoms: summary.symptoms || [],
      diagnoses: summary.diagnoses || [],
      medications: summary.medications || [],
      allergies: summary.allergies || [],
      follow_up_actions: summary.follow_up_actions || [],
      patient_concerns: summary.patient_concerns || [],
      doctor_recommendations: summary.doctor_recommendations || [],
    }
  } catch (error) {
    console.error('Error generating medical summary:', error)
    throw new Error('Failed to generate medical summary')
  }
}

export async function generateMedicalSummaryWithRetry(
  messages: Message[],
  maxRetries = 3
): Promise<SummaryResult> {
  let lastError: Error | null = null

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await generateMedicalSummary(messages)
    } catch (error) {
      lastError = error as Error
      console.error(`Summary generation attempt ${attempt} failed:`, error)

      if (attempt < maxRetries) {
        // Wait before retry (exponential backoff)
        await new Promise((resolve) =>
          setTimeout(resolve, Math.pow(2, attempt) * 1000)
        )
      }
    }
  }

  throw lastError || new Error('Failed to generate summary after retries')
}
