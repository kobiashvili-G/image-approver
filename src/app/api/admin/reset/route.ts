import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'

export async function POST(request: NextRequest) {
  const { image_ids } = await request.json()

  if (!image_ids || !Array.isArray(image_ids) || image_ids.length === 0) {
    return NextResponse.json({ error: 'image_ids required' }, { status: 400 })
  }

  if (image_ids.length > 500) {
    return NextResponse.json({ error: 'Maximum 500 images per request' }, { status: 400 })
  }

  const supabase = createAdminClient()

  const { count } = await supabase
    .from('votes')
    .delete({ count: 'exact' })
    .in('image_id', image_ids)

  return NextResponse.json({ reset: count ?? 0 })
}
