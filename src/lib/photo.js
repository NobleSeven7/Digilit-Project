// Shrinks a photo from the phone's camera before it is kept, so it uploads
// quickly and fits in the browser's storage. No library needed: the browser
// draws it onto a canvas at a smaller size and saves it as a JPEG.

// The longest side, in pixels, and the JPEG quality (0 to 1).
const MAX_SIDE = 1024
const QUALITY = 0.72

// Returns a canvas with the photo drawn on it, at most MAX_SIDE wide or high.
async function drawSmaller(file, maxSide) {
  const bitmap = await createImageBitmap(file)
  const scale = Math.min(1, maxSide / Math.max(bitmap.width, bitmap.height))
  const canvas = document.createElement('canvas')
  canvas.width = Math.round(bitmap.width * scale)
  canvas.height = Math.round(bitmap.height * scale)
  canvas.getContext('2d').drawImage(bitmap, 0, 0, canvas.width, canvas.height)
  bitmap.close?.()
  return canvas
}

// A JPEG Blob, for uploading to the shared backend.
export async function shrinkToBlob(file) {
  const canvas = await drawSmaller(file, MAX_SIDE)
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => (blob ? resolve(blob) : reject(new Error('no blob'))), 'image/jpeg', QUALITY)
  })
}

// A "data:" address holding the JPEG, for keeping in this browser (demo
// without the shared backend). Smaller still, as browser storage is tight.
export async function shrinkToDataUrl(file) {
  const canvas = await drawSmaller(file, 720)
  return canvas.toDataURL('image/jpeg', 0.65)
}
