import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'

export async function GET(request: NextRequest) {
  const voter = request.nextUrl.searchParams.get('voter')
  if (!voter) {
    return NextResponse.json({ error: 'voter param required' }, { status: 400 })
  }

  const supabase = createAdminClient()

  const { data: votedRows, error: votedError } = await supabase
    .from('votes')
    .select('image_id')
    .eq('voter_name', voter)

  if (votedError) {
    return NextResponse.json({ error: 'votes query failed', detail: votedError.message }, { status: 500 })
  }

  const votedIds = (votedRows ?? []).map((r) => r.image_id)

  const { count: total, error: countError } = await supabase
    .from('images')
    .select('*', { count: 'exact', head: true })

  if (countError) {
    return NextResponse.json({ error: 'count query failed', detail: countError.message }, { status: 500 })
  }

  let query = supabase.from('images').select('id, url').limit(2)
  if (votedIds.length > 0) {
    query = query.not('id', 'in', `(${votedIds.join(',')})`)
  }
  const { data: images, error: imagesError } = await query

  if (imagesError) {
    return NextResponse.json({ error: 'images query failed', detail: imagesError.message }, { status: 500 })
  }

  const image = images && images.length > 0 ? images[0] : null
  const nextImage = images && images.length > 1 ? images[1] : null
  const remaining = (total ?? 0) - votedIds.length

  return NextResponse.json({ image, nextImage, remaining, total: total ?? 0 })
}
