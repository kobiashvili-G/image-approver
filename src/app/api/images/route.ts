import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'
import { getNextImages } from '@/lib/queries/images'

export async function GET(request: NextRequest) {
  const voter = request.nextUrl.searchParams.get('voter')
  if (!voter) {
    return NextResponse.json({ error: 'voter param required' }, { status: 400 })
  }

  const supabase = createAdminClient()
  const result = await getNextImages(supabase, voter.toLowerCase())

  if ('error' in result) {
    return NextResponse.json({ error: result.error, detail: result.detail }, { status: 500 })
  }

  return NextResponse.json(result)
}
