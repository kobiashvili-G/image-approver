import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'

export async function GET(request: NextRequest) {
  const voter = request.nextUrl.searchParams.get('voter')
  if (!voter) {
    return NextResponse.json({ error: 'voter param required' }, { status: 400 })
  }

  const supabase = createAdminClient()

  // Get all image IDs this voter has already voted on
  const { data: votedRows } = await supabase
    .from('votes')
    .select('image_id')
    .eq('voter_name', voter)

  const votedIds = (votedRows ?? []).map((r) => r.image_id)

  // Get total images count
  const { count: total } = await supabase
    .from('images')
    .select('*', { count: 'exact', head: true })

  // Get next unvoted image
  let query = supabase.from('images').select('id, url').limit(1)
  if (votedIds.length > 0) {
    query = query.not('id', 'in', `(${votedIds.join(',')})`)
  }
  const { data: images } = await query

  const image = images && images.length > 0 ? images[0] : null
  const remaining = (total ?? 0) - votedIds.length

  return NextResponse.json({ image, remaining, total: total ?? 0 })
}
