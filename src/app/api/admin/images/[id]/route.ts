import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const supabase = createAdminClient()

  const { data: image, error: imageError } = await supabase
    .from('images')
    .select('id, filename, url, created_at')
    .eq('id', id)
    .single()

  if (imageError || !image) {
    return NextResponse.json({ error: 'Image not found' }, { status: 404 })
  }

  const { data: votes } = await supabase
    .from('votes')
    .select('voter_name, vote, reason, created_at')
    .eq('image_id', id)
    .order('created_at', { ascending: true })

  const allVotes = votes ?? []
  const approved = allVotes.filter((v) => v.vote === 'approve').length
  const rejected = allVotes.filter((v) => v.vote === 'reject').length

  return NextResponse.json({
    image: {
      ...image,
      approved,
      rejected,
      total: allVotes.length,
      approvalPct: allVotes.length > 0 ? Math.round((approved / allVotes.length) * 100) : null,
    },
    votes: allVotes,
  })
}
