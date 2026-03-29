/**
 * Compress and resize an image file using Canvas.
 * Returns a base64 data URL (JPEG).
 *
 * @param {File} file - Image file
 * @param {number} maxW - Max width in pixels
 * @param {number} maxH - Max height in pixels
 * @param {number} quality - JPEG quality 0–1 (default 0.8)
 * @returns {Promise<string>} compressed data URL
 */
export function compressImage(file, maxW = 800, maxH = 800, quality = 0.8) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = e => {
      const img = new Image()
      img.onload = () => {
        let { width, height } = img
        // Scale down keeping aspect ratio
        if (width > maxW || height > maxH) {
          const ratio = Math.min(maxW / width, maxH / height)
          width = Math.round(width * ratio)
          height = Math.round(height * ratio)
        }
        const canvas = document.createElement('canvas')
        canvas.width = width
        canvas.height = height
        const ctx = canvas.getContext('2d')
        ctx.drawImage(img, 0, 0, width, height)
        resolve(canvas.toDataURL('image/jpeg', quality))
      }
      img.onerror = reject
      img.src = e.target.result
    }
    reader.onerror = reject
    reader.readAsDataURL(file)
  })
}
