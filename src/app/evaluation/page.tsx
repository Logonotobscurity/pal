import Link from "next/link";
import { AppHeader } from "@/components/layout/app-header";
import results from "@/data/benchmark-results.json";

function pct(n: number) {
  return `${n}%`;
}

export default function EvaluationPage() {
  return (
    <>
      <AppHeader active="evaluation" />
      <main className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
        <div className="mb-8">
          <p className="text-xs font-medium uppercase tracking-[0.25em] text-neutral-500">
            Evaluation
          </p>
          <h1 className="mt-2 text-2xl font-semibold text-neutral-100 sm:text-3xl">
            Benchmark results
          </h1>
          <p className="mt-2 max-w-2xl text-sm text-neutral-400">
            {results.challenge}. Three speech models feed the same PAL pipeline
            (meaning → plan → policy → approval). Safety metrics are
            architecture-enforced, not ASR-dependent.
          </p>
          <p className="mt-2 text-xs text-neutral-500">
            Report date: {results.date} ·{" "}
            <Link
              href="/evaluation/methodology"
              className="text-emerald-500 hover:underline"
            >
              How we measure →
            </Link>
          </p>
        </div>

        <section className="mb-10">
          <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-neutral-400">
            Models compared
          </h2>
          <div className="grid gap-4 md:grid-cols-3">
            {results.models.map((m) => (
              <div
                key={m.id}
                className="rounded-xl border border-neutral-800 bg-neutral-900/40 p-5"
              >
                <p className="text-xs font-medium text-emerald-500/90">{m.role}</p>
                <h3 className="mt-1 text-base font-semibold text-neutral-100">{m.name}</h3>
                <p className="mt-3 text-xs text-neutral-400">
                  <span className="text-neutral-300">Pros:</span> {m.pros}
                </p>
                <p className="mt-2 text-xs text-neutral-500">
                  <span className="text-neutral-400">Cons:</span> {m.cons}
                </p>
              </div>
            ))}
          </div>
        </section>

        <section className="mb-10 grid gap-4 sm:grid-cols-3">
          <div className="rounded-xl border border-emerald-900/40 bg-emerald-950/20 px-5 py-4 text-center">
            <p className="text-2xl font-bold text-emerald-400">93.5%</p>
            <p className="text-xs text-neutral-400">Code-switch F1 (Sahara)</p>
          </div>
          <div className="rounded-xl border border-emerald-900/40 bg-emerald-950/20 px-5 py-4 text-center">
            <p className="text-2xl font-bold text-emerald-400">83.9%</p>
            <p className="text-xs text-neutral-400">Action correctness (Sahara)</p>
          </div>
          <div className="rounded-xl border border-emerald-900/40 bg-emerald-950/20 px-5 py-4 text-center">
            <p className="text-2xl font-bold text-emerald-400">0%</p>
            <p className="text-xs text-neutral-400">Unsupervised side effects</p>
          </div>
        </section>

        <section className="mb-10 overflow-x-auto">
          <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-neutral-400">
            Transcription (WER / CER) by condition
          </h2>
          <table className="w-full min-w-[640px] border-collapse text-left text-xs">
            <thead>
              <tr className="border-b border-neutral-800 text-neutral-400">
                <th className="py-2 pr-3 font-medium">Condition</th>
                <th className="py-2 px-2 font-medium">Sahara WER</th>
                <th className="py-2 px-2 font-medium">Sahara CER</th>
                <th className="py-2 px-2 font-medium">Whisper WER</th>
                <th className="py-2 px-2 font-medium">Whisper CER</th>
                <th className="py-2 px-2 font-medium">AfriSp. WER</th>
                <th className="py-2 px-2 font-medium">AfriSp. CER</th>
              </tr>
            </thead>
            <tbody>
              {results.werByCondition.map((row) => (
                <tr key={row.condition} className="border-b border-neutral-900 text-neutral-300">
                  <td className="py-2 pr-3 text-neutral-200">{row.condition}</td>
                  <td className="py-2 px-2 text-emerald-400/90">{pct(row.saharaWer)}</td>
                  <td className="py-2 px-2">{pct(row.saharaCer)}</td>
                  <td className="py-2 px-2">{pct(row.whisperWer)}</td>
                  <td className="py-2 px-2">{pct(row.whisperCer)}</td>
                  <td className="py-2 px-2">{pct(row.afrispeechWer)}</td>
                  <td className="py-2 px-2">{pct(row.afrispeechCer)}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <p className="mt-2 text-xs text-neutral-600">
            Lower is better. Highlighted WER favors Sahara on mixed speech.
          </p>
        </section>

        <section className="mb-10 overflow-x-auto">
          <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-neutral-400">
            Downstream task performance (same PAL pipeline)
          </h2>
          <table className="w-full min-w-[520px] border-collapse text-left text-xs">
            <thead>
              <tr className="border-b border-neutral-800 text-neutral-400">
                <th className="py-2 pr-3 font-medium">Metric</th>
                <th className="py-2 px-2 font-medium">Sahara</th>
                <th className="py-2 px-2 font-medium">Whisper L-v3</th>
                <th className="py-2 px-2 font-medium">AfriSpeech-W</th>
              </tr>
            </thead>
            <tbody>
              {results.downstream.map((row) => (
                <tr key={row.metric} className="border-b border-neutral-900 text-neutral-300">
                  <td className="py-2 pr-3 text-neutral-200">{row.metric}</td>
                  <td className="py-2 px-2 text-emerald-400/90">
                    {row.sahara}
                    {row.unit}
                  </td>
                  <td className="py-2 px-2">
                    {row.whisper}
                    {row.unit}
                  </td>
                  <td className="py-2 px-2">
                    {row.afrispeech}
                    {row.unit}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>

        <section className="mb-10">
          <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-neutral-400">
            Datasets
          </h2>
          <ul className="space-y-3">
            {results.datasets.map((d) => (
              <li
                key={d.name}
                className="rounded-lg border border-neutral-800 bg-neutral-900/30 px-4 py-3"
              >
                <a
                  href={d.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm font-medium text-emerald-400 hover:underline"
                >
                  {d.name}
                </a>
                <p className="mt-1 text-xs text-neutral-400">{d.domain}</p>
                <p className="text-xs text-neutral-600">{d.notes}</p>
              </li>
            ))}
          </ul>
        </section>

        <section className="rounded-xl border border-neutral-800 bg-neutral-900/30 px-6 py-5">
          <h2 className="text-sm font-semibold text-neutral-200">Methodology & safety</h2>
          <p className="mt-2 text-sm text-neutral-400">
            PAL scores the full chain: transcription → critical fields → intent → constrained
            workflow → policy → human approval. No model may execute external side effects.
          </p>
          <div className="mt-4 flex flex-wrap gap-3">
            <Link
              href="/evaluation/methodology"
              className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-emerald-500"
            >
              Full methodology
            </Link>
            <Link
              href="/approvals"
              className="rounded-lg border border-neutral-700 px-4 py-2 text-sm text-neutral-300 transition hover:border-neutral-500"
            >
              Open Approvals
            </Link>
          </div>
        </section>
      </main>
    </>
  );
}
