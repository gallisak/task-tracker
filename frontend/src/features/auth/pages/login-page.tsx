import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'
import { Link, useLocation } from 'react-router-dom'
import { FormField } from '@/components/form-field'
import { Button } from '@/components/ui/button'
import { AuthCard } from '../components/auth-card'
import { FormError } from '../components/form-error'
import { loginSchema, type LoginFormValues } from '../schemas'
import { useLogin } from '../use-auth'

export function LoginPage() {
  const location = useLocation()
  const login = useLogin()
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: '', password: '' },
  })

  return (
    <AuthCard
      title="Sign in"
      description="Welcome back. Enter your details to continue."
      footer={
        <span>
          No account yet?{' '}
          <Link
            to="/register"
            state={location.state}
            className="font-medium text-foreground underline-offset-4 hover:underline"
          >
            Create one
          </Link>
        </span>
      }
    >
      <form
        noValidate
        className="space-y-4"
        onSubmit={handleSubmit((values) => login.mutate(values))}
      >
        <FormError error={login.error} />
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
          autoComplete="current-password"
          error={errors.password?.message}
          {...register('password')}
        />
        <Button type="submit" className="w-full" disabled={login.isPending}>
          {login.isPending ? 'Signing in…' : 'Sign in'}
        </Button>
      </form>
    </AuthCard>
  )
}
