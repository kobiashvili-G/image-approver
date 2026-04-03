import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'

const MAX_FILE_SIZE = 10 * 1024 * 1024 // 10 MB

// Allowed image types with their magic byte signatures
const IMAGE_SIGNATURES: { mime: string; ext: string; magic: number[] }[] = [
  { mime: 'image/jpeg', ext: 'jpg', magic: [0xFF, 0xD8, 0xFF] },
  { mime: 'image/png', ext: 'png', magic: [0x89, 0x50, 0x4E, 0x47] },
  { mime: 'image/gif', ext: 'gif', magic: [0x47, 0x49, 0x46] },
  { mime: 'image/webp', ext: 'webp', magic: [0x52, 0x49, 0x46, 0x46] }, // RIFF header
]

function detectImageType(bytes: Uint8Array): { mime: string; ext: string } | null {
  for (const sig of IMAGE_SIGNATURES) {
    if (sig.magic.every((b, i) => bytes[i] === b)) {
      return { mime: sig.mime, ext: sig.ext }
    }
  }
  return null
}

export async function POST(request: NextRequest) {
  const supabase = createAdminClient()
  const formData = await request.formData()
  const file = formData.get('file') as File | null

  if (!file) {
    return NextResponse.json({ success: false, filename: '', error: 'No file provided' }, { status: 400 })
  }

  if (file.size > MAX_FILE_SIZE) {
    return NextResponse.json({ success: false, filename: file.name, error: 'File exceeds 10 MB limit' }, { status: 400 })
  }

  // Validate actual file content via magic bytes (not client-supplied MIME type)
  const headerBytes = new Uint8Array(await file.slice(0, 16).arrayBuffer())
  const detected = detectImageType(headerBytes)

  if (!detected) {
    return NextResponse.json({ success: false, filename: file.name, error: 'File is not a supported image (JPEG, PNG, GIF, WebP)' }, { status: 400 })
  }

  const storagePath = `${crypto.randomUUID()}.${detected.ext}`

  const { error: uploadError } = await supabase.storage
    .from('images')
    .upload(storagePath, file)

  if (uploadError) {
    return NextResponse.json({ success: false, filename: file.name, error: 'Upload failed' }, { status: 500 })
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
    return NextResponse.json({ success: false, filename: file.name, error: 'Failed to save image record' })
  }

  return NextResponse.json({ success: true, filename: file.name })
}
