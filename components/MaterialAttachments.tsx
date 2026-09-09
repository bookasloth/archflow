type Att = { id: string; url: string; kind: string; ext: string }

export function MaterialAttachments({ attachments }: { attachments: Att[] }) {
  const photos = attachments.filter((a) => a.kind === 'photo')
  const datasheets = attachments.filter((a) => a.kind === 'datasheet')
  return (
    <div className="space-y-3">
      {photos.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {photos.map((p) => (
            // eslint-disable-next-line @next/next/no-img-element
            <img key={p.id} src={p.url} alt="" className="h-32 rounded border" />
          ))}
        </div>
      )}
      {datasheets.length > 0 && (
        <ul className="text-sm">
          {datasheets.map((d) => (
            <li key={d.id}>
              <a href={d.url} target="_blank" rel="noreferrer" className="text-blue-600 underline">
                Datasheet (.{d.ext})
              </a>
            </li>
          ))}
        </ul>
      )}
      {attachments.length === 0 && <p className="text-sm text-gray-400">No photos or datasheets.</p>}
    </div>
  )
}
