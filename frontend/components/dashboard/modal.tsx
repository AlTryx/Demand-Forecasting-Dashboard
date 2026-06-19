"use client"

import { useEffect, type ReactNode } from "react"
import { AnimatePresence, motion } from "framer-motion"
import { X } from "lucide-react"

type ModalProps = {
  open: boolean
  onClose: () => void
  title: string
  description?: string
  icon?: ReactNode
  children: ReactNode
  /** Optional footer (e.g. action buttons). */
  footer?: ReactNode
}

/**
 * Lightweight animated modal dialog. Single responsibility: present overlay
 * content with enter/exit motion, escape-to-close, and a labelled header.
 */
export function Modal({
  open,
  onClose,
  title,
  description,
  icon,
  children,
  footer,
}: ModalProps) {
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose()
    }
    document.addEventListener("keydown", onKey)
    document.body.style.overflow = "hidden"
    return () => {
      document.removeEventListener("keydown", onKey)
      document.body.style.overflow = ""
    }
  }, [open, onClose])

  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
          <motion.div
            className="absolute inset-0 bg-foreground/40 backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            aria-hidden="true"
          />
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-label={title}
            initial={{ opacity: 0, scale: 0.96, y: 12 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.97, y: 8 }}
            transition={{ type: "spring", stiffness: 320, damping: 28 }}
            className="relative z-10 flex max-h-[85vh] w-full max-w-lg flex-col overflow-hidden rounded-2xl border border-border bg-card shadow-2xl"
          >
            <header className="flex items-start gap-3 border-b border-border px-6 py-5">
              {icon && (
                <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  {icon}
                </span>
              )}
              <div className="min-w-0 flex-1">
                <h2 className="text-base font-semibold text-foreground">
                  {title}
                </h2>
                {description && (
                  <p className="mt-0.5 text-sm text-muted-foreground">
                    {description}
                  </p>
                )}
              </div>
              <button
                type="button"
                onClick={onClose}
                aria-label="Close"
                className="rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
              >
                <X className="size-4" />
              </button>
            </header>

            <div className="flex-1 overflow-y-auto px-6 py-5">{children}</div>

            {footer && (
              <footer className="flex items-center justify-end gap-2 border-t border-border bg-muted/40 px-6 py-4">
                {footer}
              </footer>
            )}
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  )
}
