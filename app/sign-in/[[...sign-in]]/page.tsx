import { SignIn } from "@clerk/nextjs";

export default function SignInPage() {
  return (
    <main className="container" style={{ maxWidth: 420, marginTop: 48 }}>
      <SignIn fallbackRedirectUrl="/dashboard" signUpUrl="/sign-up" />
    </main>
  );
}
