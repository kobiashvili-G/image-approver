import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'
import { getNextImages } from '@/lib/queries/images'

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
const MAX_NAME_LENGTH = 100
const MAX_REASON_LENGTH = 500

export async function POST(request: NextRequest) {
  const body = await request.json()
  const { image_id, voter_name, vote, reason } = body

  if (!image_id || !voter_name || !vote) {
    return NextResponse.json({ error: 'Missing fields' }, { status: 400 })
  }

  if (typeof image_id !== 'string' || !UUID_RE.test(image_id)) {
    return NextResponse.json({ error: 'Invalid image ID' }, { status: 400 })
  }

  if (typeof voter_name !== 'string' || voter_name.trim().length === 0 || voter_name.trim().length > MAX_NAME_LENGTH) {
    return NextResponse.json({ error: `Voter name must be 1-${MAX_NAME_LENGTH} characters` }, { status: 400 })
  }

  if (vote !== 'approve' && vote !== 'reject') {
    return NextResponse.json({ error: 'Vote must be approve or reject' }, { status: 400 })
  }

  const trimmedReason = vote === 'reject' ? (reason ?? '').trim().slice(0, MAX_REASON_LENGTH) : null

  if (vote === 'reject' && !trimmedReason) {
    return NextResponse.json({ error: 'Rejection reason is required' }, { status: 400 })
  }

  const supabase = createAdminClient()
  const normalizedName = voter_name.trim().toLowerCase()

  const { error } = await supabase.from('votes').insert({
    image_id,
    voter_name: normalizedName,
    vote,
    reason: trimmedReason,
  })

  if (error) {
    if (error.code === '23505') {
      // Duplicate vote — still return next images so client can advance
      const nextResult = await getNextImages(supabase, normalizedName)
      if ('error' in nextResult) {
        return NextResponse.json({ error: 'Already voted on this image' }, { status: 409 })
      }
      return NextResponse.json({ error: 'Already voted on this image', ...nextResult }, { status: 409 })
    }
    return NextResponse.json({ error: 'An internal error occurred' }, { status: 500 })
  }

  // Return next images so the client doesn't need a separate GET
  const result = await getNextImages(supabase, normalizedName)

  if ('error' in result) {
    // Vote succeeded but fetching next images failed — still return success
    return NextResponse.json({ success: true })
  }

  return NextResponse.json({ success: true, ...result })
}
