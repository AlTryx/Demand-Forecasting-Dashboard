"use client"

import { useState, type FormEvent } from "react"
import { Mail, Trash2, UserPlus, Users } from "lucide-react"
import { Modal } from "./modal"

type Member = {
  id: string
  name: string
  email: string
  role: "Owner" | "Editor" | "Viewer"
  status: "Active" | "Invited"
}

const INITIAL_MEMBERS: Member[] = [
  {
    id: "you",
    name: "You",
    email: "you@demandforecasting.ai",
    role: "Owner",
    status: "Active",
  },
]

function roleBadgeClass(role: Member["role"]) {
  switch (role) {
    case "Owner":
      return "bg-primary/10 text-primary"
    case "Editor":
      return "bg-chart-4/15 text-chart-4"
    default:
      return "bg-muted text-muted-foreground"
  }
}

type TeamDialogProps = {
  open: boolean
  onClose: () => void
}

/**
 * Collaboration space: list members and invite teammates by email. Invitations
 * are tracked in local state so the flow is fully interactive in the demo.
 */
export function TeamDialog({ open, onClose }: TeamDialogProps) {
  const [members, setMembers] = useState<Member[]>(INITIAL_MEMBERS)
  const [email, setEmail] = useState("")
  const [role, setRole] = useState<Member["role"]>("Viewer")

  const invite = (event: FormEvent) => {
    event.preventDefault()
    const trimmed = email.trim()
    if (!trimmed) return
    setMembers((prev) => [
      ...prev,
      {
        id: `${trimmed}-${Date.now()}`,
        name: trimmed.split("@")[0],
        email: trimmed,
        role,
        status: "Invited",
      },
    ])
    setEmail("")
    setRole("Viewer")
  }

  const remove = (id: string) =>
    setMembers((prev) => prev.filter((m) => m.id !== id))

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Team"
      description="Invite collaborators to view and edit forecasts."
      icon={<Users className="size-4" />}
    >
      <div className="flex flex-col gap-5">
        <form onSubmit={invite} className="flex flex-col gap-2 sm:flex-row">
          <div className="relative flex-1">
            <Mail className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="teammate@company.com"
              className="w-full rounded-lg border border-input bg-background py-2 pl-9 pr-3 text-sm text-foreground outline-none transition-colors focus:border-ring focus:ring-2 focus:ring-ring/30"
            />
          </div>
          <select
            value={role}
            onChange={(e) => setRole(e.target.value as Member["role"])}
            className="rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground outline-none focus:border-ring"
            aria-label="Role"
          >
            <option value="Viewer">Viewer</option>
            <option value="Editor">Editor</option>
          </select>
          <button
            type="submit"
            className="inline-flex items-center justify-center gap-1.5 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90"
          >
            <UserPlus className="size-4" />
            Invite
          </button>
        </form>

        <ul className="flex flex-col gap-2">
          {members.map((member) => (
            <li
              key={member.id}
              className="flex items-center justify-between gap-3 rounded-lg border border-border bg-background px-3 py-2.5"
            >
              <div className="flex min-w-0 items-center gap-3">
                <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-sm font-semibold uppercase text-primary">
                  {member.name.charAt(0)}
                </span>
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-foreground">
                    {member.name}
                    {member.status === "Invited" && (
                      <span className="ml-2 rounded-full bg-chart-3/15 px-1.5 py-0.5 text-[10px] font-medium text-chart-3">
                        Invited
                      </span>
                    )}
                  </p>
                  <p className="truncate text-xs text-muted-foreground">
                    {member.email}
                  </p>
                </div>
              </div>
              <div className="flex shrink-0 items-center gap-2">
                <span
                  className={`rounded-full px-2 py-0.5 text-xs font-medium ${roleBadgeClass(
                    member.role,
                  )}`}
                >
                  {member.role}
                </span>
                {member.role !== "Owner" && (
                  <button
                    type="button"
                    onClick={() => remove(member.id)}
                    aria-label={`Remove ${member.name}`}
                    className="rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
                  >
                    <Trash2 className="size-4" />
                  </button>
                )}
              </div>
            </li>
          ))}
        </ul>
      </div>
    </Modal>
  )
}
