import { RegisterForm } from "@/components/auth/register-form";
import { googleConfigured } from "@/lib/oauth";

export const metadata = { title: "Sign up" };

export default function RegisterPage() {
  return <RegisterForm googleEnabled={googleConfigured()} />;
}
