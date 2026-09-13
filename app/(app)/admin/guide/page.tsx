import { notFound } from 'next/navigation'
import { getCurrentUserWithRole } from '@/lib/auth'
import { isAdmin } from '@/lib/permissions'
import { PageHeader } from '@/components/ui/PageHeader'
import { Section } from '@/components/ui/Section'

// Admin-only onboarding guide. Static content — a reference for getting used to Archflow.
export default async function GuidePage() {
  const { role } = await getCurrentUserWithRole()
  if (!isAdmin(role)) notFound()

  return (
    <div className="max-w-2xl space-y-6">
      <PageHeader title="Getting started" meta={<span className="text-ink-faint">How Archflow is organised and how to work in it</span>} />

      <Section title="The big idea">
        <Card>
          <p>Archflow is one workspace, not a set of dashboards. You move down a hierarchy:</p>
          <p className="mt-2 font-mono text-xs text-ink-muted">Workspace → Project → Building / Floor / Room → Ticket → detail</p>
          <p className="mt-2">Everything hangs off a <b>Project</b>. A project has spatial structure (buildings, floors, rooms), work (tickets), drawings, site issues, materials and docs — all views of the same project.</p>
        </Card>
      </Section>

      <Section title="Finding your way">
        <ul className="space-y-2 text-sm text-ink">
          <Li k="Sidebar">Workspace areas up top (Overview, My Work, Approvals, Pages), then your Projects — click a project to reveal its sections. Favorites ★ and Recent give you fast returns.</Li>
          <Li k="⌘K / Ctrl+K">Opens the command menu from anywhere — search projects, tickets, drawings, materials and pages, or jump to any area. Fastest way around.</Li>
          <Li k="Breadcrumb">The top bar always shows where you are.</Li>
        </ul>
      </Section>

      <Section title="Working with tickets">
        <ul className="space-y-2 text-sm text-ink">
          <Li k="Two kinds">A <b>Task</b> is planned work. A <b>Site issue</b> is a problem found on site — capture it with a photo and drop a pin on the exact spot.</Li>
          <Li k="Views">In a project’s <b>Work</b> section, switch between <b>Table</b>, <b>Board</b> (kanban), <b>Calendar</b> and <b>Timeline</b> — same tickets, different lens. Use <b>Sort / Group / Properties</b> to shape the table.</Li>
          <Li k="Detail drawer">Click any ticket to open it on the right without leaving the list — edit status inline, add subtasks, tags, comments, and see linked drawings/materials.</Li>
          <Li k="Status flow">Tasks: open → in progress → closed. Site issues: open → in progress → resolved → <b>verified</b> (needs an after-photo) → closed.</Li>
        </ul>
      </Section>

      <Section title="Drawings, materials & approvals">
        <ul className="space-y-2 text-sm text-ink">
          <Li k="Drawings">Each drawing holds revisions. Upload a new revision, send it for review, and approve it — approving supersedes the previous approved revision automatically.</Li>
          <Li k="Materials">Register a material, attach photos/datasheets, then Approve / Reject / Reopen. Link it to its spec drawing.</Li>
          <Li k="Approvals inbox">The <b>Approvals</b> area collects everything awaiting a decision across all projects — revisions under review and proposed materials — in one place.</Li>
        </ul>
      </Section>

      <Section title="Pages & docs">
        <Card>
          <p><b>Pages</b> (workspace) and a project’s <b>Docs</b> are lightweight documents — briefs, notes, snag lists. Add blocks (text, headings, to-dos, bullets, callouts); they autosave as you type.</p>
        </Card>
      </Section>

      <Section title="Roles">
        <Card>
          <p><b>Staff</b> can create and edit everything day-to-day. <b>Admins</b> additionally delete records and manage roles (Admin → Users). Only admins see this Admin section.</p>
          <p className="mt-2 text-ink-muted">New people are created in Supabase and start as staff; an admin promotes them.</p>
        </Card>
      </Section>

      <Section title="A good first hour">
        <ol className="list-decimal space-y-1.5 pl-5 text-sm text-ink">
          <li>Open a project from the sidebar and skim its Overview.</li>
          <li>Go to Work → try Table, then Board, then Timeline.</li>
          <li>Open a ticket, change its status inline, add a tag and a comment.</li>
          <li>Open a drawing and look at its revision history.</li>
          <li>Hit ⌘K and jump straight to a material by name.</li>
          <li>★ a project so it pins to the top of your sidebar.</li>
        </ol>
      </Section>
    </div>
  )
}

function Card({ children }: { children: React.ReactNode }) {
  return <div className="rounded-lg border border-subtle bg-surface p-4 text-sm text-ink">{children}</div>
}
function Li({ k, children }: { k: string; children: React.ReactNode }) {
  return (
    <li className="rounded-lg border border-subtle bg-surface p-3">
      <span className="mr-2 font-medium text-ink">{k}</span>
      <span className="text-ink-muted">{children}</span>
    </li>
  )
}
