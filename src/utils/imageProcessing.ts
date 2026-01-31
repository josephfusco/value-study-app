export interface ProcessingOptions {
  levels: number
  contrast: number
}

/**
 * Build a lookup table for fast pixel processing.
 * Precomputes all 256 possible output values based on contrast and levels.
 */
export function buildLUT(levels: number, contrast: number): Uint8Array {
  const lut = new Uint8Array(256)
  const factor = (259 * (contrast + 255)) / (255 * (259 - contrast))
  const step = 255 / (levels - 1)

  for (let i = 0; i < 256; i++) {
    let val = contrast !== 0 ? factor * (i - 128) + 128 : i
    val = Math.max(0, Math.min(255, val))
    lut[i] = Math.round(Math.round(val / step) * step)
  }
  return lut
}

/**
 * Apply a lookup table to grayscale data and produce an ImageData.
 */
export function applyLUT(
  grayData: Uint8Array,
  lut: Uint8Array,
  width: number,
  height: number
): ImageData {
  const output = new Uint8ClampedArray(grayData.length * 4)
  for (let i = 0; i < grayData.length; i++) {
    const val = lut[grayData[i]]
    const j = i * 4
    output[j] = val
    output[j + 1] = val
    output[j + 2] = val
    output[j + 3] = 255
  }
  return new ImageData(output, width, height)
}

/**
 * Extract grayscale values from ImageData (run once on image load).
 */
export function extractGrayscale(imageData: ImageData): Uint8Array {
  const gray = new Uint8Array(imageData.width * imageData.height)
  const data = imageData.data
  for (let i = 0; i < gray.length; i++) {
    const j = i * 4
    gray[i] = Math.round(0.299 * data[j] + 0.587 * data[j + 1] + 0.114 * data[j + 2])
  }
  return gray
}

function rgbToGray(r: number, g: number, b: number): number {
  return 0.299 * r + 0.587 * g + 0.114 * b
}

function applyContrast(value: number, contrast: number): number {
  const factor = (259 * (contrast + 255)) / (255 * (259 - contrast))
  const result = factor * (value - 128) + 128
  return Math.max(0, Math.min(255, result))
}

function quantize(gray: number, levels: number): number {
  const step = 255 / (levels - 1)
  return Math.round(Math.round(gray / step) * step)
}

export function createValueStudy(
  imageData: ImageData,
  options: ProcessingOptions
): ImageData {
  const { levels, contrast } = options
  const data = imageData.data
  const output = new Uint8ClampedArray(data.length)

  for (let i = 0; i < data.length; i += 4) {
    let gray = rgbToGray(data[i], data[i + 1], data[i + 2])

    if (contrast !== 0) {
      gray = applyContrast(gray, contrast)
    }

    const quantized = quantize(gray, levels)

    output[i] = quantized
    output[i + 1] = quantized
    output[i + 2] = quantized
    output[i + 3] = data[i + 3]
  }

  return new ImageData(output, imageData.width, imageData.height)
}
