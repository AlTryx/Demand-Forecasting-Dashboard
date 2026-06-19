import { RegisterForm } from "@/components/auth/register-form"
import { RedirectIfAuthenticated } from "@/components/auth/route-guard"

export default function SignUpPage() {
  return (
    <RedirectIfAuthenticated>
      <div className="flex flex-1 items-center justify-center px-4 py-16">
        <RegisterForm />
      </div>
    </RedirectIfAuthenticated>
  )
}
