'use client'

import { useState } from 'react'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Sparkles, Loader2, FileText, Clipboard, Check } from 'lucide-react'
import { generateSummary, getLatestSummary } from '@/lib/conversations/actions'
import { formatDistanceToNow } from 'date-fns'

type Summary = {
  id: string
  overall_summary: string
  symptoms: string[]
  diagnoses: string[]
  medications: string[]
  allergies: string[]
  follow_up_actions: string[]
  patient_concerns: string[]
  doctor_recommendations: string[]
  created_at: string
}

type SummaryModalProps = {
  conversationId: string
  isDoctor: boolean
}

export default function SummaryModal({ conversationId, isDoctor }: SummaryModalProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [summary, setSummary] = useState<Summary | null>(null)
  const [isGenerating, setIsGenerating] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [copied, setCopied] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const loadSummary = async () => {
    setIsLoading(true)
    setError(null)
    
    const { summary: existingSummary, error: fetchError } = await getLatestSummary(conversationId)
    
    if (fetchError) {
      setError(fetchError)
    } else {
      setSummary(existingSummary)
    }
    
    setIsLoading(false)
  }

  const handleGenerate = async () => {
    setIsGenerating(true)
    setError(null)

    const { summary: newSummary, error: genError } = await generateSummary(conversationId)

    if (genError) {
      setError(genError)
    } else {
      setSummary(newSummary)
    }

    setIsGenerating(false)
  }

  const handleCopy = async () => {
    if (!summary) return

    const text = `MEDICAL CONSULTATION SUMMARY

${summary.overall_summary}

SYMPTOMS:
${summary.symptoms.length > 0 ? summary.symptoms.map(s => `• ${s}`).join('\n') : 'None mentioned'}

DIAGNOSES:
${summary.diagnoses.length > 0 ? summary.diagnoses.map(d => `• ${d}`).join('\n') : 'None mentioned'}

MEDICATIONS:
${summary.medications.length > 0 ? summary.medications.map(m => `• ${m}`).join('\n') : 'None prescribed'}

ALLERGIES:
${summary.allergies.length > 0 ? summary.allergies.map(a => `• ${a}`).join('\n') : 'None mentioned'}

PATIENT CONCERNS:
${summary.patient_concerns.length > 0 ? summary.patient_concerns.map(c => `• ${c}`).join('\n') : 'None mentioned'}

DOCTOR RECOMMENDATIONS:
${summary.doctor_recommendations.length > 0 ? summary.doctor_recommendations.map(r => `• ${r}`).join('\n') : 'None provided'}

FOLLOW-UP ACTIONS:
${summary.follow_up_actions.length > 0 ? summary.follow_up_actions.map(f => `• ${f}`).join('\n') : 'None required'}

Generated: ${new Date(summary.created_at).toLocaleString()}
`

    await navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const handleOpenChange = (open: boolean) => {
    setIsOpen(open)
    if (open) {
      loadSummary()
    } else {
      setError(null)
    }
  }

  if (!isDoctor) {
    return null
  }

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <Sparkles className="w-4 h-4 mr-2" />
          AI Summary
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="w-5 h-5" />
            Medical Consultation Summary
          </DialogTitle>
          <DialogDescription>
            AI-generated summary of symptoms, diagnoses, and recommendations
          </DialogDescription>
        </DialogHeader>

        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
          </div>
        ) : !summary ? (
          <div className="py-8 text-center">
            <Sparkles className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
            <p className="text-muted-foreground mb-6">
              No summary has been generated for this conversation yet.
            </p>
            <Button onClick={handleGenerate} disabled={isGenerating}>
              {isGenerating ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Generating Summary...
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4 mr-2" />
                  Generate Summary
                </>
              )}
            </Button>
            {error && (
              <p className="text-sm text-destructive mt-4">{error}</p>
            )}
          </div>
        ) : (
          <div className="space-y-6">
            {/* Header Actions */}
            <div className="flex items-center justify-between border-b pb-4">
              <div className="text-sm text-muted-foreground">
                Generated {formatDistanceToNow(new Date(summary.created_at), { addSuffix: true })}
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleCopy}
                  disabled={copied}
                >
                  {copied ? (
                    <>
                      <Check className="w-4 h-4 mr-2" />
                      Copied!
                    </>
                  ) : (
                    <>
                      <Clipboard className="w-4 h-4 mr-2" />
                      Copy
                    </>
                  )}
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleGenerate}
                  disabled={isGenerating}
                >
                  {isGenerating ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Regenerating...
                    </>
                  ) : (
                    'Regenerate'
                  )}
                </Button>
              </div>
            </div>

            {/* Overall Summary */}
            <div>
              <h3 className="font-semibold mb-2">Overview</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                {summary.overall_summary}
              </p>
            </div>

            {/* Symptoms */}
            <SummarySection title="Symptoms" items={summary.symptoms} emptyText="No symptoms mentioned" />

            {/* Diagnoses */}
            <SummarySection title="Diagnoses" items={summary.diagnoses} emptyText="No diagnoses provided" />

            {/* Medications */}
            <SummarySection title="Medications" items={summary.medications} emptyText="No medications prescribed" />

            {/* Allergies */}
            <SummarySection 
              title="Allergies" 
              items={summary.allergies} 
              emptyText="No allergies mentioned"
              variant="warning"
            />

            {/* Patient Concerns */}
            <SummarySection title="Patient Concerns" items={summary.patient_concerns} emptyText="No concerns raised" />

            {/* Doctor Recommendations */}
            <SummarySection 
              title="Doctor Recommendations" 
              items={summary.doctor_recommendations} 
              emptyText="No recommendations provided"
            />

            {/* Follow-up Actions */}
            <SummarySection 
              title="Follow-up Actions" 
              items={summary.follow_up_actions} 
              emptyText="No follow-up required"
              variant="info"
            />

            {error && (
              <div className="text-sm text-destructive mt-4 p-3 bg-destructive/10 rounded">
                {error}
              </div>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}

type SummarySectionProps = {
  title: string
  items: string[]
  emptyText: string
  variant?: 'default' | 'warning' | 'info'
}

function SummarySection({ title, items, emptyText, variant = 'default' }: SummarySectionProps) {
  const variantStyles = {
    default: 'bg-muted',
    warning: 'bg-orange-50 border border-orange-200',
    info: 'bg-blue-50 border border-blue-200',
  }

  return (
    <div>
      <h3 className="font-semibold mb-2">{title}</h3>
      {items.length > 0 ? (
        <ul className="space-y-2">
          {items.map((item, index) => (
            <li key={index} className="flex items-start gap-2">
              <span className="text-primary mt-1">•</span>
              <span className="text-sm flex-1">{item}</span>
            </li>
          ))}
        </ul>
      ) : (
        <p className={`text-sm text-muted-foreground italic p-3 rounded ${variantStyles[variant]}`}>
          {emptyText}
        </p>
      )}
    </div>
  )
}
