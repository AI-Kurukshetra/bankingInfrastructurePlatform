const steps = [
  "Integrate API",
  "Onboard customers",
  "Create accounts",
  "Issue cards",
  "Move money",
  "Monitor risk"
];

export function HowItWorks() {
  return (
    <section className="mx-auto max-w-7xl px-6 py-20 lg:px-10">
      <div className="max-w-3xl">
        <p className="text-sm font-semibold uppercase tracking-[0.2em] text-blue-600">How the platform works</p>
        <h2 className="mt-3 text-4xl font-semibold tracking-[-0.03em] text-slate-950">From integration to active operations in six steps</h2>
      </div>

      <div className="mt-10 grid gap-4 md:grid-cols-2 xl:grid-cols-6">
        {steps.map((step, index) => (
          <div key={step} className="relative rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-blue-600 text-sm font-semibold text-white">
              {index + 1}
            </span>
            <p className="mt-4 text-sm font-semibold text-slate-950">{step}</p>
            {index < steps.length - 1 ? <div className="absolute -right-2 top-1/2 hidden h-px w-4 bg-blue-200 xl:block" /> : null}
          </div>
        ))}
      </div>
    </section>
  );
}
