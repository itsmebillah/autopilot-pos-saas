"use client";
export default function ErrorPage({ reset }: { reset: () => void }) {
  return <section className="panel space-y-3"><h1 className="text-xl font-bold">Platform data could not be loaded</h1><p>Check your session and connection, then retry. Unavailable data is not shown as zero.</p><button className="action" onClick={reset}>Try again</button></section>;
}
