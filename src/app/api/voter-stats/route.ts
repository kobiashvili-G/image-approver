import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'

export async function GET(request: NextRequest) {
  const voter = request.nextUrl.searchParams.get('voter')
  if (!voter) {
    return NextResponse.json({ error: 'voter param required' }, { status: 400 })
  }

  const supabase = createAdminClient()

  const { data: votes } = await supabase
    .from('votes')
    .select('vote')
    .eq('voter_name', voter.toLowerCase())

  const all = votes ?? []
  const approved = all.filter((v) => v.vote === 'approve').length
  const rejected = all.filter((v) => v.vote === 'reject').length

  return NextResponse.json({
    total: all.length,
    approved,
    rejected,
  })
}
