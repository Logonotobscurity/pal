import Link from "next/link";
import results from "@/data/benchmark-results.json";

export default function PublicReportPage() {
  return (
    <main className="mx-auto max-w-4xl px-4 py-12 sm:px-6">
      <h1 className="text-3xl font-semibold text-neutral-100">PAL — Public Benchmark Report</h1>
      <p className="mt-3 text-sm text-neutral-400">Public judge-facing report. No authentication is required.</p>
      <div className="mt-8 rounded-xl border border-amber-800/50 bg-amber-950/20 p-5">
        <p className="text-sm font-semibold text-amber-400">Status: {results.status}</p>
        <p className="mt-2 text-sm text-neutral-300">{results.statusNote}</p>
      </div>
      <div className="mt-8 flex gap-3">
        <Link href="/evaluation/methodology" className="rounded-lg bg-emerald-600 px-4 py-2 text-sm text-white">Methodology</Link>
        <Link href="/evaluation" className="rounded-lg border border-neutral-700 px-4 py-2 text-sm text-neutral-300">Evaluation</Link>
      </div>
    </main>
  );
}
