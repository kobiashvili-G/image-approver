import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'
import JSZip from 'jszip'

export async function POST(request: NextRequest) {
  const { image_ids } = await request.json()

  if (!image_ids || !Array.isArray(image_ids) || image_ids.length === 0) {
    return NextResponse.json({ error: 'image_ids required' }, { status: 400 })
  }

  const supabase = createAdminClient()

  const { data: images } = await supabase
    .from('images')
    .select('filename, storage_path')
    .in('id', image_ids)

  if (!images || images.length === 0) {
    return NextResponse.json({ error: 'No images found' }, { status: 404 })
  }

  const zip = new JSZip()

  for (const img of images) {
    const { data } = await supabase.storage
      .from('images')
      .download(img.storage_path)

    if (data) {
      const buffer = await data.arrayBuffer()
      zip.file(img.filename, buffer)
    }
  }

  const zipBuffer = await zip.generateAsync({ type: 'arraybuffer' })

  return new Response(zipBuffer, {
    headers: {
      'Content-Type': 'application/zip',
      'Content-Disposition': 'attachment; filename="images.zip"',
    },
  })
}
