'use client'

import { useState } from 'react'
import { QRCodeSVG } from 'qrcode.react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Copy, QrCode, Check } from 'lucide-react'

interface ShareLinkProps {
  conversationId: string
}

export function ShareLink({ conversationId }: ShareLinkProps) {
  const [copied, setCopied] = useState(false)
  const [showQR, setShowQR] = useState(false)
  
  const shareUrl = `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/join?c=${conversationId}`

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch (err) {
      console.error('Failed to copy:', err)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Invite Patient</CardTitle>
        <CardDescription>
          Share this link with your patient to join the conversation
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex gap-2">
          <Input
            value={shareUrl}
            readOnly
            className="font-mono text-sm"
          />
          <Button onClick={copyToClipboard} variant="outline" size="icon">
            {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
          </Button>
          <Button onClick={() => setShowQR(!showQR)} variant="outline" size="icon">
            <QrCode className="h-4 w-4" />
          </Button>
        </div>

        {showQR && (
          <div className="flex justify-center p-4 bg-white rounded-lg border">
            <QRCodeSVG value={shareUrl} size={200} />
          </div>
        )}

        <p className="text-xs text-gray-500">
          Patients will need to log in or create an account to join the conversation
        </p>
      </CardContent>
    </Card>
  )
}
