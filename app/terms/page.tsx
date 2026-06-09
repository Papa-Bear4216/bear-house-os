'use client';

export default function TermsPage() {
  const lastUpdated = 'June 9, 2026';
  const contactEmail = 'michael711hebert@gmail.com';
  const appName = 'DysfunctionJunction';

  return (
    <main className="min-h-screen bg-slate-50 py-12 px-4">
      <div className="max-w-3xl mx-auto">
        <div className="mb-10">
          <h1 className="font-display text-4xl font-black tracking-tighter text-slate-900 uppercase mb-2">
            Terms of Service
          </h1>
          <p className="text-sm font-bold text-slate-500 bg-[#a7f3d0] inline-block px-3 py-1 border-2 border-slate-900 shadow-[2px_2px_0_#1e293b]">
            {appName} · Last updated {lastUpdated}
          </p>
        </div>

        <div className="space-y-8 text-slate-700 text-base leading-relaxed">
          <section>
            <h2 className="font-black text-xl text-slate-900 mb-2 uppercase tracking-tight">1. Acceptance</h2>
            <p>
              By accessing or using {appName} ("the App"), you agree to be bound by these Terms of Service.
              The App is a private family productivity tool — not a public commercial service.
            </p>
          </section>

          <section>
            <h2 className="font-black text-xl text-slate-900 mb-2 uppercase tracking-tight">2. Who Can Use the App</h2>
            <p>
              Access is restricted to authorized family members of the household. Accounts are provisioned by the
              household administrator. You must use a Google account that has been granted access to use the App.
            </p>
          </section>

          <section>
            <h2 className="font-black text-xl text-slate-900 mb-2 uppercase tracking-tight">3. Acceptable Use</h2>
            <p>You agree not to:</p>
            <ul className="list-disc list-inside mt-2 space-y-1 text-sm">
              <li>Share your login credentials with anyone outside the household</li>
              <li>Attempt to access data belonging to other users without authorization</li>
              <li>Use the App to store or transmit unlawful content</li>
              <li>Attempt to reverse engineer, tamper with, or disrupt the App</li>
            </ul>
          </section>

          <section>
            <h2 className="font-black text-xl text-slate-900 mb-2 uppercase tracking-tight">4. Google Services</h2>
            <p>
              The App integrates with Google Sign-In and Google Calendar via OAuth. By connecting your Google
              account you also agree to{' '}
              <a href="https://policies.google.com/terms" className="text-blue-600 underline" target="_blank" rel="noopener noreferrer">
                Google&apos;s Terms of Service
              </a>. You may revoke access at any time via{' '}
              <a href="https://myaccount.google.com/permissions" className="text-blue-600 underline" target="_blank" rel="noopener noreferrer">
                Google Account Permissions
              </a>.
            </p>
          </section>

          <section>
            <h2 className="font-black text-xl text-slate-900 mb-2 uppercase tracking-tight">5. Data & Privacy</h2>
            <p>
              Your use of the App is also governed by our{' '}
              <a href="/privacy" className="text-blue-600 underline">Privacy Policy</a>, which is incorporated
              into these terms by reference.
            </p>
          </section>

          <section>
            <h2 className="font-black text-xl text-slate-900 mb-2 uppercase tracking-tight">6. Disclaimer</h2>
            <p>
              The App is provided "as is" without warranties of any kind. As a private family tool it carries no
              uptime guarantees. The household administrator may modify, suspend, or shut down the App at any time.
            </p>
          </section>

          <section>
            <h2 className="font-black text-xl text-slate-900 mb-2 uppercase tracking-tight">7. Changes</h2>
            <p>
              These terms may be updated at any time. The "last updated" date at the top reflects the most recent
              revision. Continued use of the App constitutes acceptance.
            </p>
          </section>

          <section>
            <h2 className="font-black text-xl text-slate-900 mb-2 uppercase tracking-tight">8. Contact</h2>
            <p>Questions about these terms? Reach out at:</p>
            <div className="mt-3 p-4 bg-white border-2 border-slate-900 shadow-[4px_4px_0_#1e293b] rounded-2xl inline-block">
              <p className="font-black text-slate-900">{appName}</p>
              <a href={`mailto:${contactEmail}`} className="text-blue-600 font-bold underline">{contactEmail}</a>
            </div>
          </section>
        </div>

        <div className="mt-12 pt-6 border-t-2 border-slate-200 text-center text-xs text-slate-400 font-medium">
          {appName} · Private family household application · {lastUpdated}
        </div>
      </div>
    </main>
  );
}
