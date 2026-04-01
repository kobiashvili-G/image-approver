import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'

export async function POST(request: NextRequest) {
  const supabase = createAdminClient()
  const formData = await request.formData()
  const file = formData.get('file') as File | null

  if (!file) {
    return NextResponse.json({ success: false, filename: '', error: 'No file provided' }, { status: 400 })
  }

  if (!file.type.startsWith('image/')) {
    return NextResponse.json({ success: false, filename: file.name, error: 'File must be an image' }, { status: 400 })
  }

  const ext = file.name.includes('.')
    ? file.name.split('.').pop()
    : file.type.split('/').pop()
  const storagePath = `${crypto.randomUUID()}.${ext}`

  const { error: uploadError } = await supabase.storage
    .from('images')
    .upload(storagePath, file)

  if (uploadError) {
    return NextResponse.json({ success: false, filename: file.name, error: uploadError.message }, { status: 500 })
  }

  const { data: urlData } = supabase.storage
    .from('images')
    .getPublicUrl(storagePath)

  const { error: dbError } = await supabase.from('images').insert({
    filename: file.name,
    storage_path: storagePath,
    url: urlData.publicUrl,
  })

  if (dbError) {
    await supabase.storage.from('images').remove([storagePath])
    return NextResponse.json({ success: false, filename: file.name, error: dbError.message })
  }

  return NextResponse.json({ success: true, filename: file.name })
}
