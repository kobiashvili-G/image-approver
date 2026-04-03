import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'
import { getNextImages } from '@/lib/queries/images'

export async function GET(request: NextRequest) {
  const voter = request.nextUrl.searchParams.get('voter')
  if (!voter || voter.trim().length === 0) {
    return NextResponse.json({ error: 'voter param required' }, { status: 400 })
  }

  if (voter.trim().length > 100) {
    return NextResponse.json({ error: 'voter name too long' }, { status: 400 })
  }

  const supabase = createAdminClient()
  const result = await getNextImages(supabase, voter.trim().toLowerCase())

  if ('error' in result) {
    return NextResponse.json({ error: 'Failed to fetch images' }, { status: 500 })
  }

  return NextResponse.json(result)
}
