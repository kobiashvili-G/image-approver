import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'

export async function GET() {
  const supabase = createAdminClient()

  const { data: votes } = await supabase
    .from('votes')
    .select('voter_name, vote, reason, created_at, images(filename)')
    .order('created_at', { ascending: true })

  const rows = (votes ?? []).map((v: any) => ({
    image: v.images?.filename ?? 'unknown',
    voter: v.voter_name,
    vote: v.vote,
    reason: v.reason ?? '',
    date: v.created_at,
  }))

  const esc = (s: string) => s.replace(/"/g, '""')
  const header = 'image_filename,voter_name,vote,reason,voted_at'
  const csvRows = rows.map(
    (r) => `"${esc(r.image)}","${esc(r.voter)}","${esc(r.vote)}","${esc(r.reason)}","${esc(r.date)}"`
  )
  const csv = [header, ...csvRows].join('\n')

  return new Response(csv, {
    headers: {
      'Content-Type': 'text/csv',
      'Content-Disposition': 'attachment; filename="votes-export.csv"',
    },
  })
}
