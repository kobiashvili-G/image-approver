import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'

export async function POST(request: NextRequest) {
  const supabase = createAdminClient()
  const formData = await request.formData()
  const files = formData.getAll('files') as File[]

  if (files.length === 0) {
    return NextResponse.json({ error: 'No files provided' }, { status: 400 })
  }

  const results = await Promise.all(
    files.map(async (file) => {
      const ext = file.name.split('.').pop()
      const storagePath = `${crypto.randomUUID()}.${ext}`

      const { error: uploadError } = await supabase.storage
        .from('images')
        .upload(storagePath, file)

      if (uploadError) return false

      const { data: urlData } = supabase.storage
        .from('images')
        .getPublicUrl(storagePath)

      await supabase.from('images').insert({
        filename: file.name,
        storage_path: storagePath,
        url: urlData.publicUrl,
      })

      return true
    })
  )

  return NextResponse.json({ uploaded: results.filter(Boolean).length })
}
