import { SupabaseClient } from '@supabase/supabase-js'

export async function getNextImages(supabase: SupabaseClient, voterName: string) {
  const { data: votedRows, error: votedError } = await supabase
    .from('votes')
    .select('image_id')
    .eq('voter_name', voterName)

  if (votedError) {
    return { error: 'votes query failed', detail: votedError.message }
  }

  const votedIds = (votedRows ?? []).map((r) => r.image_id)

  const excludeFilter = votedIds.length > 0
    ? `(${votedIds.join(',')})`
    : null

  let countQuery = supabase.from('images').select('id', { count: 'exact', head: true })
  let imagesQuery = supabase.from('images').select('id, url').order('created_at', { ascending: true }).limit(2)
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
    return { error: 'total count query failed', detail: totalResult.error.message }
  }
  if (remainingResult.error) {
    return { error: 'remaining count query failed', detail: remainingResult.error.message }
  }
  if (imagesResult.error) {
    return { error: 'images query failed', detail: imagesResult.error.message }
  }

  const total = totalResult.count ?? 0
  const remaining = remainingResult.count ?? 0
  const image = imagesResult.data?.[0] ?? null
  const nextImage = imagesResult.data?.[1] ?? null

  return { image, nextImage, remaining, total }
}
