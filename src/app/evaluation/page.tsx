import Link from "next/link";
import { AppHeader } from "@/components/layout/app-header";
import results from "@/data/benchmark-results.json";

const metrics = [
  "WER / CER",
  "Code-switch span F1",
  "Critical-field precision / recall",
  "Intent accuracy / entity F1",
  "Action validity / correctness",
  "Approval routing accuracy",
  "Critical-field blocking",
  "Provenance coverage",
];

export default function EvaluationPage() {
  const hasResults =
    results.status === "completed" &&
    (results.werByCondition.length > 0 || results.downstream.length > 0);

  return (
    <>
      <AppHeader active="evaluation" />
      <main className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
        <p className="text-xs font-medium uppercase tracking-[0.25em] text-neutral-500">
          Evaluation
        </p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight text-neutral-100">
          Benchmark report
        </h1>
        <p className="mt-3 max-w-3xl text-sm leading-relaxed text-neutral-400">
          Public evaluation surface for the Sahara CodeSwitch Africa Challenge. Measured values
          are shown only after a completed run is stored in the repository.
        </p>

        <section className="mt-8 rounded-2xl border border-amber-700/50 bg-amber-950/20 p-6">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-amber-400">
            {hasResults ? "Completed benchmark run" : "No completed benchmark run published"}
          </p>
          <p className="mt-2 text-sm leading-relaxed text-neutral-300">
            {hasResults
              ? "Measured run artifacts are available below."
              : "The public submission currently publishes methodology, declared models, datasets, and safety architecture. Earlier planning figures are not presented as measured results."}
          </p>
          <p className="mt-3 text-xs text-neutral-500">
            Status: {results.status} ·{" "}
            <Link href="/evaluation/methodology" className="text-emerald-500 hover:underline">
              Read methodology →
            </Link>
          </p>
        </section>

        <section className="mt-10">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-neutral-400">
            Declared model comparison
          </h2>
          <div className="mt-4 grid gap-4 md:grid-cols-3">
            {results.models.map((model) => (
              <div key={model.id} className="rounded-xl border border-neutral-800 bg-neutral-900/40 p-5">
                <p className="text-xs font-medium text-emerald-500/90">{model.role}</p>
                <h3 className="mt-1 text-base font-semibold text-neutral-100">{model.name}</h3>
                <p className="mt-2 text-xs text-neutral-500">
                  Measurement status: {hasResults ? "published" : "pending"}
                </p>
              </div>
            ))}
          </div>
        </section>

        <section className="mt-10 rounded-xl border border-neutral-800 bg-neutral-900/30 p-6">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-neutral-400">Metrics</h2>
          <div className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
            {metrics.map((metric) => (
              <div key={metric} className="rounded-lg border border-neutral-800 bg-neutral-950/50 px-3 py-2 text-xs text-neutral-300">
                {metric}
              </div>
            ))}
          </div>
        </section>

        <section className="mt-10">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-neutral-400">Datasets</h2>
          <div className="mt-4 grid gap-3 md:grid-cols-2">
            {results.datasets.map((dataset) => (
              <a
                key={dataset.name}
                href={dataset.url}
                target="_blank"
                rel="noopener noreferrer"
                className="rounded-xl border border-neutral-800 bg-neutral-900/30 p-4 transition hover:border-neutral-600"
              >
                <p className="text-sm font-medium text-emerald-400">{dataset.name}</p>
                <p className="mt-1 text-xs text-neutral-400">{dataset.domain}</p>
                <p className="mt-1 text-xs text-neutral-600">{dataset.notes}</p>
              </a>
            ))}
          </div>
        </section>

        <section className="mt-10 rounded-xl border border-neutral-800 bg-neutral-900/30 p-6">
          <h2 className="text-sm font-semibold text-neutral-200">Safety interpretation</h2>
          <p className="mt-2 text-sm leading-relaxed text-neutral-400">
            Approval routing and critical-field blocking are architecture controls and should be
            reported separately from model-quality measurements.
          </p>
        </section>
      </main>
    </>
  );
}
