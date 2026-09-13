const IMG = ['png', 'jpg', 'jpeg', 'webp', 'gif']

export function RevisionPreview({ url, path }: { url: string; path: string }) {
  if (!url) return null
  const ext = (path.split('.').pop() || '').toLowerCase()
  if (ext === 'pdf') {
    return <iframe src={url} className="h-[70vh] w-full rounded border" title="drawing" />
  }
  if (IMG.includes(ext)) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={url} alt="" className="max-w-full rounded border" />
  }
  return (
    <a href={url} className="text-sm text-primary underline" target="_blank" rel="noreferrer">
      Download file (.{ext})
    </a>
  )
}
