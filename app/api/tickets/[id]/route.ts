import { getTicketDetail } from '@/app/(app)/actions'

// Drawer data as a plain GET: runs in parallel with server actions instead of queueing behind them.
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  return Response.json(await getTicketDetail(id))
}
