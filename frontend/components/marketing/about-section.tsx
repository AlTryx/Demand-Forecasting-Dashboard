import Image from "next/image"
import { Activity } from "lucide-react"

import { Reveal } from "./reveal"
import { Parallax } from "./parallax"

const CAPABILITIES = [
  { label: "Forecast accuracy", value: "94.7%" },
  { label: "SKUs tracked", value: "500+" },
  { label: "Forecast horizon", value: "30d" },
  { label: "Models ensembled", value: "6" },
]

const CONTENT_SECTIONS = [
  {
    title: "The idea",
    content:
      "Inventory decisions are too often made on gut feel. I'm building this platform so that anyone — without a data-science background — can forecast demand with real rigor.\n\nIt turns historical sales into clear, actionable predictions so you can hold the right stock, at the right time, in the right place.",
  },
  {
    title: "How it works",
    content:
      "Multiple statistical and machine-learning models are ensembled, then scored continuously against real outcomes. The result is a single, trustworthy forecast with confidence bands.\n\nEverything is transparent: you can inspect model health, volatility, and the live forecast log for any SKU at any time.",
  },
]

export function AboutSection() {
  return (
    <section id="about" className="py-24 md:py-32">
      <div className="mx-auto max-w-6xl px-4">
        <Reveal className="mb-12 flex flex-col gap-5 lg:w-2/3">
          <h2 className="text-balance text-4xl font-semibold tracking-tight lg:text-5xl">
            About the Project
          </h2>
          <p className="text-pretty text-lg text-muted-foreground">
            An independent project — built solo — to make machine-learning
            demand forecasting practical for everyday inventory decisions.
          </p>
        </Reveal>

        <div className="grid gap-6 lg:grid-cols-3">
          <Reveal
            direction="right"
            className="lg:col-span-2"
          >
            <div className="relative aspect-[4/3] overflow-hidden rounded-xl border border-border lg:aspect-[16/10]">
              <Parallax offset={40} className="absolute inset-0">
                <Image
                  src="/images/dashboard-overview.png"
                  alt="Demand forecasting dashboard overview"
                  fill
                  sizes="(max-width: 1024px) 100vw, 66vw"
                  className="scale-110 object-cover object-top"
                />
              </Parallax>
            </div>
          </Reveal>

          <Reveal direction="left" delay={0.1}>
            <div className="flex h-full flex-col gap-6 md:flex-row lg:flex-col">
              <div className="flex flex-col justify-between gap-6 rounded-xl bg-primary p-7 text-primary-foreground md:w-1/2 lg:w-auto">
                <span className="flex size-11 items-center justify-center rounded-lg bg-primary-foreground/15">
                  <Activity className="size-5" aria-hidden="true" />
                </span>
                <div>
                  <p className="mb-2 text-lg font-semibold">
                    Built for operators, not just data scientists
                  </p>
                  <p className="text-sm text-primary-foreground/80">
                    Clear forecasts, model transparency, and per-SKU detail — no
                    notebooks required.
                  </p>
                </div>
              </div>
              <div className="relative grow basis-0 overflow-hidden rounded-xl border border-border md:w-1/2 lg:min-h-48 lg:w-auto">
                <Image
                  src="/images/dashboard-analytics.png"
                  alt="Demand analytics and forecast log"
                  fill
                  sizes="(max-width: 1024px) 50vw, 33vw"
                  className="object-cover object-top"
                />
              </div>
            </div>
          </Reveal>
        </div>

        <Reveal className="mt-12 overflow-hidden rounded-xl bg-muted p-7 md:p-12">
          <h3 className="text-2xl font-medium md:text-3xl">
            Platform capabilities
          </h3>
          <div className="mt-8 grid grid-cols-2 gap-x-4 gap-y-8 md:flex md:flex-wrap md:justify-between">
            {CAPABILITIES.map((item) => (
              <div className="flex flex-col gap-1.5" key={item.label}>
                <span className="font-mono text-4xl font-semibold text-primary md:text-5xl">
                  {item.value}
                </span>
                <p className="text-sm text-muted-foreground">{item.label}</p>
              </div>
            ))}
          </div>
        </Reveal>

        <div className="mx-auto mt-16 grid max-w-5xl gap-12 md:grid-cols-2 md:gap-20">
          {CONTENT_SECTIONS.map((section, i) => (
            <Reveal key={section.title} delay={i * 0.1}>
              <h3 className="mb-4 text-2xl font-medium md:text-3xl">
                {section.title}
              </h3>
              <p className="whitespace-pre-line text-pretty leading-7 text-muted-foreground">
                {section.content}
              </p>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  )
}
