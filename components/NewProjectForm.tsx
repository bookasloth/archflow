'use client'
import { createProject } from '@/app/(app)/actions'

export function NewProjectForm() {
  return (
    <form action={createProject} className="flex flex-wrap gap-2">
      <input name="name" placeholder="Project name" required className="rounded border p-2" />
      <input name="code" placeholder="Code" className="rounded border p-2" />
      <input name="client_name" placeholder="Client" className="rounded border p-2" />
      <button className="rounded bg-black px-3 text-white">Add</button>
    </form>
  )
}
