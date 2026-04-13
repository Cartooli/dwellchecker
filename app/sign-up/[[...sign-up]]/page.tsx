import { SignUp } from "@clerk/nextjs";

export default function SignUpPage() {
  return (
    <main className="container" style={{ maxWidth: 420, marginTop: 48 }}>
      <SignUp fallbackRedirectUrl="/dashboard" signInUrl="/sign-in" />
    </main>
  );
}
