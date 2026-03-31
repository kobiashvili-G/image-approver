import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'

export async function GET() {
  const supabase = createAdminClient()

  const { data: images } = await supabase
    .from('images')
    .select('id, filename, url, created_at')
    .order('created_at', { ascending: false })

  const { data: votes } = await supabase
    .from('votes')
    .select('image_id, vote')

  const allVotes = votes ?? []
  const imageList = (images ?? []).map((img) => {
    const imgVotes = allVotes.filter((v) => v.image_id === img.id)
    const approved = imgVotes.filter((v) => v.vote === 'approve').length
    const rejected = imgVotes.filter((v) => v.vote === 'reject').length
    const total = approved + rejected
    const approvalPct = total > 0 ? Math.round((approved / total) * 100) : null

    return { ...img, approved, rejected, total, approvalPct }
  })

  return NextResponse.json({ images: imageList })
}
