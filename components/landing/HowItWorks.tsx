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
    <section className="mx-auto max-w-7xl px-4 py-12 sm:px-6 sm:py-16 lg:px-10 lg:py-20">
      <div className="max-w-3xl">
        <p className="text-sm font-semibold uppercase tracking-[0.2em] text-blue-600">How the platform works</p>
        <h2 className="mt-3 text-2xl font-semibold tracking-[-0.03em] text-slate-950 sm:text-3xl lg:text-4xl">From integration to active operations in six steps</h2>
      </div>

      <div className="mt-8 grid grid-cols-2 gap-4 sm:grid-cols-3 xl:grid-cols-6">
        {steps.map((step, index) => (
          <div key={step} className="relative rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
            <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-blue-600 text-sm font-semibold text-white">
              {index + 1}
            </span>
            <p className="mt-3 text-sm font-semibold text-slate-950 sm:mt-4">{step}</p>
            {index < steps.length - 1 ? <div className="absolute -right-2 top-1/2 hidden h-px w-4 bg-blue-200 xl:block" /> : null}
          </div>
        ))}
      </div>
    </section>
  );
}
