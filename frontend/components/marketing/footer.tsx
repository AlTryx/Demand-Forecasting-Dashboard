import Link from "next/link"

const FOOTER_LINKS = [
  { href: "#features", label: "Features" },
  { href: "#about", label: "About" },
  { href: "#contact", label: "Contact" },
  { href: "/signin", label: "Sign In" },
]

export function Footer() {
  return (
    <footer className="border-t border-border bg-card">
      <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-6 px-4 py-10 md:flex-row">
        <Link href="/" className="flex items-center gap-2 font-semibold text-foreground">
          <span className="flex size-6 items-center justify-center rounded-lg bg-primary text-xs font-bold text-primary-foreground">
            DF
          </span>
          Demand Forecasting Dashboard
        </Link>

        <nav className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-sm text-muted-foreground">
          {FOOTER_LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="transition-colors hover:text-primary"
            >
              {link.label}
            </Link>
          ))}
        </nav>

        <p className="text-xs text-muted-foreground">
          &copy; {new Date().getFullYear()} Demand Forecasting Dashboard.
        </p>
      </div>
    </footer>
  )
}
