'use client'
import { createProject } from '@/app/(app)/actions'

export function NewProjectForm() {
  return (
    <form action={createProject} className="flex flex-wrap gap-2">
      <input name="name" placeholder="Project name" required className="rounded border p-2" />
      <input name="code" placeholder="Code" className="rounded border p-2" />
      <input name="client_name" placeholder="Client" className="rounded border p-2" />
      <button className="rounded bg-primary px-3 hover:bg-primary-hover text-white">Add</button>
    </form>
  )
}
