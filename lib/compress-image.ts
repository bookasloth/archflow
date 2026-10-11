// Phone photos are 3–8 MB — a site upload over 4G took ~20s. Re-encode to ≤1600px JPEG
// (~200–400 KB) in the browser first. Markers are stored normalized (0–1), so resizing is safe.
// Anything that isn't a re-encodable photo (PDF, datasheet, GIF, SVG) passes through untouched.
export async function compressImage(file: File, maxSide = 1600, quality = 0.8): Promise<File> {
  if (!/^image\/(jpeg|png|webp|heic|heif)$/.test(file.type)) return file
  try {
    const bmp = await createImageBitmap(file, { imageOrientation: 'from-image' })
    const scale = Math.min(1, maxSide / Math.max(bmp.width, bmp.height))
    const canvas = document.createElement('canvas')
    canvas.width = Math.round(bmp.width * scale)
    canvas.height = Math.round(bmp.height * scale)
    canvas.getContext('2d')!.drawImage(bmp, 0, 0, canvas.width, canvas.height)
    bmp.close()
    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/jpeg', quality))
    if (!blob || blob.size >= file.size) return file
    return new File([blob], file.name.replace(/\.[^.]+$/, '') + '.jpg', { type: 'image/jpeg' })
  } catch {
    return file // e.g. HEIC on a browser that can't decode it — upload the original
  }
}

export const extOf = (file: File, fallback: string) => file.name.split('.').pop() || fallback
