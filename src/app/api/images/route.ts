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

  const excludeFilter = votedIds.length > 0
    ? `(${votedIds.join(',')})`
    : null

  let countQuery = supabase.from('images').select('id', { count: 'exact', head: true })
  let imagesQuery = supabase.from('images').select('id, url').limit(2)
  if (excludeFilter) {
    countQuery = countQuery.not('id', 'in', excludeFilter)
    imagesQuery = imagesQuery.not('id', 'in', excludeFilter)
  }

  const [totalResult, remainingResult, imagesResult] = await Promise.all([
    supabase.from('images').select('id', { count: 'exact', head: true }),
    countQuery,
    imagesQuery,
  ])

  if (totalResult.error) {
    return NextResponse.json({ error: 'total count query failed', detail: totalResult.error.message }, { status: 500 })
  }
  if (remainingResult.error) {
    return NextResponse.json({ error: 'remaining count query failed', detail: remainingResult.error.message }, { status: 500 })
  }
  if (imagesResult.error) {
    return NextResponse.json({ error: 'images query failed', detail: imagesResult.error.message }, { status: 500 })
  }

  const total = totalResult.count ?? 0
  const remaining = remainingResult.count ?? 0
  const image = imagesResult.data?.[0] ?? null
  const nextImage = imagesResult.data?.[1] ?? null

  return NextResponse.json({ image, nextImage, remaining, total })
}
