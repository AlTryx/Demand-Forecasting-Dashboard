import { LoginForm } from "@/components/auth/login-form"
import { RedirectIfAuthenticated } from "@/components/auth/route-guard"

export default function SignInPage() {
  return (
    <RedirectIfAuthenticated>
      <div className="flex flex-1 items-center justify-center px-4 py-16">
        <LoginForm />
      </div>
    </RedirectIfAuthenticated>
  )
}
