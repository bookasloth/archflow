import { PhotoMarker, type Marker } from '@/components/PhotoMarker'

type Photo = { url: string; markers: Marker[] }

export function BeforeAfter({ before, after }: { before: Photo[]; after: Photo[] }) {
  return (
    <div className="grid grid-cols-2 gap-4">
      <div>
        <h4 className="mb-1 text-sm font-medium">Before</h4>
        {before.length === 0 && <p className="text-sm text-gray-400">No before photo.</p>}
        {before.map((p, i) => (
          <PhotoMarker key={i} src={p.url} value={p.markers} editable={false} />
        ))}
      </div>
      <div>
        <h4 className="mb-1 text-sm font-medium">After</h4>
        {after.length === 0 && <p className="text-sm text-gray-400">No after photo yet.</p>}
        {after.map((p, i) => (
          <PhotoMarker key={i} src={p.url} value={p.markers} editable={false} />
        ))}
      </div>
    </div>
  )
}
