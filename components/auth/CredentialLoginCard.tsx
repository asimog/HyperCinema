interface CredentialLoginCardProps {
  title: string;
  summary: string;
  error?: string;
}

export function CredentialLoginCard({ title, summary, error }: CredentialLoginCardProps) {
  return (
    <div className="cinema-shell cinema-noise min-h-[100dvh] overflow-hidden px-4 py-6 text-[#f4efe8] md:px-8 md:py-8">
      <div className="home-stage">
        <div className="home-stage-backdrop" aria-hidden="true" />
        <div className="relative z-10 mx-auto w-full max-w-md">
          <section className="panel gate-panel grid gap-5">
            <div className="panel-header">
              <div>
                <p className="eyebrow">Admin Access</p>
                <h2>{title}</h2>
              </div>
            </div>
            <p className="route-summary">{summary}</p>

            <form action="/api/cockpit/login" method="POST" className="space-y-4">
              <label htmlFor="username" className="field">
                <span>Username</span>
                <input
                  id="username"
                  name="username"
                  type="text"
                  placeholder="Username"
                  required
                />
              </label>

              <label htmlFor="password" className="field">
                <span>Password</span>
                <input
                  id="password"
                  name="password"
                  type="password"
                  placeholder="Password"
                  required
                />
              </label>

              {error ? <div className="inline-error">{error}</div> : null}

              <button type="submit" className="button button-primary w-full">
                Enter cockpit
              </button>
            </form>
          </section>
        </div>
      </div>
    </div>
  );
}
