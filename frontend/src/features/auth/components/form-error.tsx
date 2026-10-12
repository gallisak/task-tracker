import { CircleAlertIcon } from 'lucide-react'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { getErrorMessage } from '@/lib/api-client'

export function FormError({ error }: { error: unknown }) {
  if (!error) {
    return null
  }

  return (
    <Alert variant="destructive">
      <CircleAlertIcon />
      <AlertDescription>{getErrorMessage(error)}</AlertDescription>
    </Alert>
  )
}
