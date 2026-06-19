"use client"

import { useState, type FormEvent } from "react"
import { Globe, Mail, Phone, CheckCircle2, Loader2 } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Reveal } from "./reveal"

const CONTACT_DETAILS = [
  { icon: Phone, label: "+1 (555) 010-2400", href: "tel:+15550102400" },
  {
    icon: Mail,
    label: "hello@demandforecasting.ai",
    href: "mailto:hello@demandforecasting.ai",
  },
  { icon: Globe, label: "demandforecasting.ai", href: "#" },
]

type Status = "idle" | "submitting" | "success"

export function ContactSection() {
  const [status, setStatus] = useState<Status>("idle")

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const form = event.currentTarget
    setStatus("submitting")
    // Simulated submission. Swap for a POST to your contact endpoint when ready.
    await new Promise((resolve) => setTimeout(resolve, 900))
    form.reset()
    setStatus("success")
  }

  return (
    <section id="contact" className="py-24 md:py-32">
      <div className="mx-auto grid max-w-6xl gap-12 px-4 lg:grid-cols-2 lg:items-start lg:gap-16">
        <Reveal direction="right" className="flex flex-col gap-6">
          <h2 className="text-balance text-4xl font-semibold tracking-tight lg:text-5xl">
            Contact Us
          </h2>
          <p className="max-w-md text-pretty text-lg leading-relaxed text-muted-foreground">
            Have a question about forecasting your catalog, or want a guided
            walkthrough of the dashboard? Send us a line and we&apos;ll get back
            to you.
          </p>
          <ul className="mt-2 flex flex-col gap-4">
            {CONTACT_DETAILS.map((detail) => (
              <li key={detail.label}>
                <a
                  href={detail.href}
                  className="group flex items-center gap-3 text-sm font-medium text-foreground transition-colors hover:text-primary"
                >
                  <span className="flex size-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
                    <detail.icon className="size-4" aria-hidden="true" />
                  </span>
                  {detail.label}
                </a>
              </li>
            ))}
          </ul>
        </Reveal>

        <Reveal direction="left" delay={0.1}>
        <Card className="bg-muted/40">
          <CardHeader>
            <CardTitle>Send us a message</CardTitle>
            <CardDescription>
              We usually reply within one business day.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {status === "success" ? (
              <div className="flex flex-col items-center gap-3 rounded-lg border border-accent/30 bg-accent/10 px-6 py-12 text-center">
                <CheckCircle2 className="size-10 text-accent" aria-hidden="true" />
                <p className="text-lg font-semibold text-foreground">
                  Message sent
                </p>
                <p className="text-sm text-muted-foreground">
                  Thanks for reaching out — we&apos;ll be in touch shortly.
                </p>
                <Button
                  variant="outline"
                  className="mt-2"
                  onClick={() => setStatus("idle")}
                >
                  Send another
                </Button>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="flex flex-col gap-5">
                <div className="grid gap-5 sm:grid-cols-2">
                  <div className="grid gap-2">
                    <Label htmlFor="firstName">
                      First name <span className="text-destructive">*</span>
                    </Label>
                    <Input
                      id="firstName"
                      name="firstName"
                      placeholder="Jordan"
                      autoComplete="given-name"
                      required
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="lastName">
                      Last name <span className="text-destructive">*</span>
                    </Label>
                    <Input
                      id="lastName"
                      name="lastName"
                      placeholder="Kim"
                      autoComplete="family-name"
                      required
                    />
                  </div>
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="email">
                    Email <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="email"
                    name="email"
                    type="email"
                    placeholder="you@company.com"
                    autoComplete="email"
                    required
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="subject">
                    Subject <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="subject"
                    name="subject"
                    placeholder="Question about forecasting"
                    required
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="message">
                    Message <span className="text-destructive">*</span>
                  </Label>
                  <Textarea
                    id="message"
                    name="message"
                    placeholder="Tell us what you are forecasting..."
                    rows={4}
                    required
                  />
                </div>
                <Button
                  type="submit"
                  className="w-full"
                  disabled={status === "submitting"}
                >
                  {status === "submitting" ? (
                    <>
                      <Loader2 className="size-4 animate-spin" />
                      Sending...
                    </>
                  ) : (
                    "Send message"
                  )}
                </Button>
              </form>
            )}
          </CardContent>
        </Card>
        </Reveal>
      </div>
    </section>
  )
}
