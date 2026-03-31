import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'

export async function DELETE(request: NextRequest) {
  const { image_ids } = await request.json()

  if (!image_ids || !Array.isArray(image_ids) || image_ids.length === 0) {
    return NextResponse.json({ error: 'image_ids required' }, { status: 400 })
  }

  const supabase = createAdminClient()

  const { data: images } = await supabase
    .from('images')
    .select('storage_path')
    .in('id', image_ids)

  const paths = (images ?? []).map((i) => i.storage_path)

  if (paths.length > 0) {
    await supabase.storage.from('images').remove(paths)
  }

  const { count } = await supabase
    .from('images')
    .delete({ count: 'exact' })
    .in('id', image_ids)

  return NextResponse.json({ deleted: count ?? 0 })
}
