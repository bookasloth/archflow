export function ComingSoon({ title, description }: { title: string; description?: string }) {
  return (
    <div className="mx-auto max-w-md py-20 text-center">
      <h1 className="font-heading text-2xl font-semibold text-ink">{title}</h1>
      <p className="mt-2 text-sm text-ink-muted">
        {description ?? 'This area is part of the Archflow roadmap and is coming soon.'}
      </p>
    </div>
  )
}
