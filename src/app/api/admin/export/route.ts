import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'

export async function GET() {
  const supabase = createAdminClient()

  const { data: votes } = await supabase
    .from('votes')
    .select('voter_name, vote, created_at, images(filename)')
    .order('created_at', { ascending: true })

  const rows = (votes ?? []).map((v: any) => ({
    image: v.images?.filename ?? 'unknown',
    voter: v.voter_name,
    vote: v.vote,
    date: v.created_at,
  }))

  const header = 'image_filename,voter_name,vote,voted_at'
  const csvRows = rows.map(
    (r) => `"${r.image}","${r.voter}","${r.vote}","${r.date}"`
  )
  const csv = [header, ...csvRows].join('\n')

  return new Response(csv, {
    headers: {
      'Content-Type': 'text/csv',
      'Content-Disposition': 'attachment; filename="votes-export.csv"',
    },
  })
}
