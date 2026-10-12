import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'
import { Link, useLocation } from 'react-router-dom'
import { FormField } from '@/components/form-field'
import { Button } from '@/components/ui/button'
import { AuthCard } from '../components/auth-card'
import { FormError } from '@/components/form-error'
import { registerSchema, type RegisterFormValues } from '../schemas'
import { useRegister } from '../use-auth'

export function RegisterPage() {
  const location = useLocation()
  const signUp = useRegister()
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<RegisterFormValues>({
    resolver: zodResolver(registerSchema),
    defaultValues: { name: '', email: '', password: '' },
  })

  return (
    <AuthCard
      title="Create an account"
      description="Start organising work with your team."
      footer={
        <span>
          Already have an account?{' '}
          <Link
            to="/login"
            state={location.state}
            className="font-medium text-foreground underline-offset-4 hover:underline"
          >
            Sign in
          </Link>
        </span>
      }
    >
      <form
        noValidate
        className="space-y-4"
        onSubmit={handleSubmit((values) => signUp.mutate(values))}
      >
        <FormError error={signUp.error} />
        <FormField
          label="Name"
          autoComplete="name"
          error={errors.name?.message}
          {...register('name')}
        />
        <FormField
          label="Email"
          type="email"
          autoComplete="email"
          error={errors.email?.message}
          {...register('email')}
        />
        <FormField
          label="Password"
          type="password"
          autoComplete="new-password"
          error={errors.password?.message}
          {...register('password')}
        />
        <Button type="submit" className="w-full" disabled={signUp.isPending}>
          {signUp.isPending ? 'Creating account…' : 'Create account'}
        </Button>
      </form>
    </AuthCard>
  )
}
