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
    <main className="container" style={{ maxWidth: 420, marginTop: 48 }}>
      <h1 className="page-title">Sign in to dwellchecker</h1>
      {checkEmail ? (
        <p className="page-sub">Check your email for a sign-in link.</p>
      ) : (
        <form
          action={async (formData) => {
            "use server";
            await signIn("nodemailer", {
              email: formData.get("email"),
              redirectTo: callbackUrl,
            });
          }}
          style={{ display: "flex", flexDirection: "column", gap: 12 }}
        >
          <label>
            Email
            <input
              name="email"
              type="email"
              required
              autoComplete="email"
              className="input"
              style={{ width: "100%" }}
            />
          </label>
          <button type="submit" className="btn btn-primary">
            Send sign-in link
          </button>
          {sp.error ? <p style={{ color: "tomato" }}>Sign-in failed. Try again.</p> : null}
        </form>
      )}
    </main>
  );
}
