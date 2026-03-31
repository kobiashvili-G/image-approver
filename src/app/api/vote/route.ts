import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'

export async function POST(request: NextRequest) {
  const body = await request.json()
  const { image_id, voter_name, vote } = body

  if (!image_id || !voter_name || !vote) {
    return NextResponse.json({ error: 'Missing fields' }, { status: 400 })
  }

  if (vote !== 'approve' && vote !== 'reject') {
    return NextResponse.json({ error: 'Vote must be approve or reject' }, { status: 400 })
  }

  const supabase = createAdminClient()

  const { error } = await supabase.from('votes').insert({
    image_id,
    voter_name: voter_name.trim(),
    vote,
  })

  if (error) {
    if (error.code === '23505') {
      return NextResponse.json({ error: 'Already voted on this image' }, { status: 409 })
    }
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}
