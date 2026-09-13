import { RevisionPreview } from '@/components/RevisionPreview'

type Att = { id: string; url: string; kind: string; path: string }

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
      {datasheets.map((d) => (
        <RevisionPreview key={d.id} url={d.url} path={d.path} />
      ))}
      {attachments.length === 0 && <p className="text-sm text-gray-400">No photos or datasheets.</p>}
    </div>
  )
}
