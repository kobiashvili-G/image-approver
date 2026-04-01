import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'
import { getNextImages } from '@/lib/queries/images'

export async function POST(request: NextRequest) {
  const body = await request.json()
  const { image_id, voter_name, vote, reason } = body

  if (!image_id || !voter_name || !vote) {
    return NextResponse.json({ error: 'Missing fields' }, { status: 400 })
  }

  if (vote !== 'approve' && vote !== 'reject') {
    return NextResponse.json({ error: 'Vote must be approve or reject' }, { status: 400 })
  }

  const trimmedReason = vote === 'reject' ? (reason ?? '').trim() : null

  if (vote === 'reject' && !trimmedReason) {
    return NextResponse.json({ error: 'Rejection reason is required' }, { status: 400 })
  }

  const supabase = createAdminClient()

  const { error } = await supabase.from('votes').insert({
    image_id,
    voter_name: voter_name.trim().toLowerCase(),
    vote,
    reason: trimmedReason,
  })

  if (error) {
    if (error.code === '23505') {
      return NextResponse.json({ error: 'Already voted on this image' }, { status: 409 })
    }
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  // Return next images so the client doesn't need a separate GET
  const result = await getNextImages(supabase, voter_name.trim().toLowerCase())

  if ('error' in result) {
    // Vote succeeded but fetching next images failed — still return success
    return NextResponse.json({ success: true })
  }

  return NextResponse.json({ success: true, ...result })
}
