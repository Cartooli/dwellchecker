import { signIn } from "@/auth";

export default async function SignInPage({
  searchParams,
}: {
  searchParams: Promise<{ callbackUrl?: string; "check-email"?: string; error?: string }>;
}) {
  const sp = await searchParams;
  const callbackUrl = sp.callbackUrl ?? "/dashboard";
  const checkEmail = sp["check-email"];

  return (
    <main className="container auth-shell">
      <section className="auth-card" aria-labelledby="sign-in-title">
        <div className="eyebrow">Secure access</div>
        <h1 id="sign-in-title" className="auth-title">Sign in to Dwellchecker</h1>
        {checkEmail ? (
          <p className="auth-note">Check your email for a sign-in link. It usually arrives within a minute.</p>
        ) : (
          <>
            <p className="auth-note">
              Use the email connected to your property workspace. We&apos;ll send a one-time link
              so you can get straight back to the dashboard.
            </p>
            <form
              className="auth-form"
              action={async (formData) => {
                "use server";
                await signIn("resend", {
                  email: formData.get("email"),
                  redirectTo: callbackUrl,
                });
              }}
            >
              <label className="auth-label" htmlFor="email">
                <span>Email</span>
                <input
                  id="email"
                  name="email"
                  type="email"
                  required
                  autoComplete="email"
                  className="input"
                />
              </label>
              <button type="submit" className="btn btn-primary auth-submit">
                Send sign-in link
              </button>
              {sp.error ? (
                <p role="alert" className="form-error">
                  We couldn&apos;t send the sign-in link. Try again.
                </p>
              ) : null}
            </form>
          </>
        )}
      </section>
    </main>
  );
}
