import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'
import { FormError } from '@/components/form-error'
import { FormTextarea } from '@/components/form-textarea'
import { Button } from '@/components/ui/button'
import { commentSchema, type CommentFormValues } from '../schemas'

interface CommentFormProps {
  label: string
  defaultBody?: string
  submitLabel: string
  isPending: boolean
  error: unknown
  onSubmit: (body: string, reset: () => void) => void
  onCancel?: () => void
}

export function CommentForm({
  label,
  defaultBody = '',
  submitLabel,
  isPending,
  error,
  onSubmit,
  onCancel,
}: CommentFormProps) {
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<CommentFormValues>({
    resolver: zodResolver(commentSchema),
    defaultValues: { body: defaultBody },
  })

  return (
    <form
      noValidate
      className="space-y-2"
      onSubmit={handleSubmit(({ body }) => onSubmit(body, reset))}
    >
      <FormError error={error} />
      <FormTextarea
        label={label}
        rows={3}
        error={errors.body?.message}
        {...register('body')}
      />
      <div className="flex justify-end gap-2">
        {onCancel && (
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={isPending}
            onClick={onCancel}
          >
            Cancel
          </Button>
        )}
        <Button type="submit" size="sm" disabled={isPending}>
          {submitLabel}
        </Button>
      </div>
    </form>
  )
}
