import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'

export async function GET() {
  const supabase = createAdminClient()

  const { count: totalImages } = await supabase
    .from('images')
    .select('*', { count: 'exact', head: true })

  const { data: votes } = await supabase
    .from('votes')
    .select('voter_name, vote, image_id, images(filename, url)')
    .order('voter_name')

  const allVotes = votes ?? []

  // Build voter stats
  const voterMap = new Map<string, { approved: number; rejected: number; total: number }>()
  for (const v of allVotes) {
    const entry = voterMap.get(v.voter_name) ?? { approved: 0, rejected: 0, total: 0 }
    entry.total++
    if (v.vote === 'approve') entry.approved++
    else entry.rejected++
    voterMap.set(v.voter_name, entry)
  }

  const voters = Array.from(voterMap.entries()).map(([name, stats]) => ({
    name,
    ...stats,
    approvalRate: stats.total > 0 ? Math.round((stats.approved / stats.total) * 100) : null,
    totalImages: totalImages ?? 0,
  }))

  // Build disagreements: group votes by image, compute split
  const imageVoteMap = new Map<string, { filename: string; url: string; votes: { voter: string; vote: string }[] }>()
  for (const v of allVotes) {
    const img = v.images as any
    const entry = imageVoteMap.get(v.image_id) ?? {
      filename: img?.filename ?? 'unknown',
      url: img?.url ?? '',
      votes: [] as { voter: string; vote: string }[],
    }
    entry.votes.push({ voter: v.voter_name, vote: v.vote })
    imageVoteMap.set(v.image_id, entry)
  }

  const disagreements = Array.from(imageVoteMap.entries())
    .map(([imageId, data]) => {
      const approves = data.votes.filter((v) => v.vote === 'approve').length
      const rejects = data.votes.filter((v) => v.vote === 'reject').length
      const total = approves + rejects
      // Disagreement score: 0 = unanimous, 0.5 = perfect split
      const disagreementScore = total > 1 ? Math.min(approves, rejects) / total : 0

      return {
        imageId,
        filename: data.filename,
        url: data.url,
        approves,
        rejects,
        total,
        disagreementScore,
        votes: data.votes,
      }
    })
    .filter((d) => d.total > 1 && d.disagreementScore > 0)
    .sort((a, b) => b.disagreementScore - a.disagreementScore)

  return NextResponse.json({ voters, disagreements })
}
