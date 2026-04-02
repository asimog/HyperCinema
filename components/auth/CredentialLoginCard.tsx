interface CredentialLoginCardProps {
  title: string;
  summary: string;
  error?: string;
}

export function CredentialLoginCard({ title, summary, error }: CredentialLoginCardProps) {
  return (
    <div className="cinema-shell cinema-noise min-h-[100dvh] overflow-hidden px-4 py-6 text-[#fff1dc] md:px-8 md:py-8">
      <div className="mx-auto max-w-md">
        <section className="panel gate-panel">
          <div className="panel-header">
            <div>
              <p className="eyebrow">Admin Access</p>
              <h2>{title}</h2>
            </div>
          </div>
          <p className="route-summary mb-6">{summary}</p>

          <form action="/api/cockpit/login" method="POST" className="space-y-4">
            <div>
              <label htmlFor="username" className="block text-sm font-medium mb-2">
                Username
              </label>
              <input
                id="username"
                name="username"
                type="text"
                className="w-full px-3 py-2 bg-black/20 border border-white/20 rounded-md text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-white/50"
                placeholder="Username"
                required
              />
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium mb-2">
                Password
              </label>
              <input
                id="password"
                name="password"
                type="password"
                className="w-full px-3 py-2 bg-black/20 border border-white/20 rounded-md text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-white/50"
                placeholder="Password"
                required
              />
            </div>

            {error && (
              <div className="text-red-400 text-sm bg-red-900/20 border border-red-500/20 rounded-md p-3">
                {error}
              </div>
            )}

            <button
              type="submit"
              className="w-full bg-white text-black font-medium py-2 px-4 rounded-md hover:bg-white/90 transition-colors focus:outline-none focus:ring-2 focus:ring-white/50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Enter cockpit
            </button>
          </form>
        </section>
      </div>
    </div>
  );
}
