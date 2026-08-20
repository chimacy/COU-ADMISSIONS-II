const ACCEPTED_TYPES = ['image/png', 'image/jpeg', 'image/jpg', 'image/webp']

export function validateImageFile(file) {
  if (!file) return 'No file selected.'
  if (!ACCEPTED_TYPES.includes(file.type)) {
    return 'Please upload a PNG, JPG, JPEG, or WEBP image.'
  }
  if (file.size > 8 * 1024 * 1024) {
    return 'Image is too large (max 8MB before compression).'
  }
  return null
}

/**
 * Resizes an image file down to a max dimension and re-encodes it as JPEG at
 * a moderate quality, returning a new File. Keeps uploaded branding assets
 * small and fast to load everywhere they're displayed (sidebar, topbar,
 * login screen, PDFs) instead of storing a multi-megabyte original.
 */
export function compressImage(file, { maxDimension = 512, quality = 0.85 } = {}) {
  return new Promise((resolve, reject) => {
    const img = new Image()
    const reader = new FileReader()

    reader.onerror = () => reject(new Error('Could not read the selected file.'))
    reader.onload = () => {
      img.onerror = () => reject(new Error('Could not read that image.'))
      img.onload = () => {
        let { width, height } = img
        if (width > maxDimension || height > maxDimension) {
          if (width > height) {
            height = Math.round((height / width) * maxDimension)
            width = maxDimension
          } else {
            width = Math.round((width / height) * maxDimension)
            height = maxDimension
          }
        }

        const canvas = document.createElement('canvas')
        canvas.width = width
        canvas.height = height
        const ctx = canvas.getContext('2d')
        ctx.drawImage(img, 0, 0, width, height)

        canvas.toBlob(
          (blob) => {
            if (!blob) {
              reject(new Error('Image compression failed.'))
              return
            }
            const ext = file.type === 'image/png' ? 'png' : 'jpg'
            const mime = file.type === 'image/png' ? 'image/png' : 'image/jpeg'
            resolve(new File([blob], `logo.${ext}`, { type: mime }))
          },
          file.type === 'image/png' ? 'image/png' : 'image/jpeg',
          quality,
        )
      }
      img.src = reader.result
    }
    reader.readAsDataURL(file)
  })
}
