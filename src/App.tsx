import { useState, useRef, useCallback, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Slider } from "@/components/ui/slider"
import { buildLUT, applyLUT, extractGrayscale } from "@/utils/imageProcessing"

const VALUE_PRESETS = [3, 5, 9] as const

export default function App() {
  const [image, setImage] = useState<HTMLImageElement | null>(null)
  const [levels, setLevels] = useState(5)
  const [contrast, setContrast] = useState(0)
  const [isDragging, setIsDragging] = useState(false)
  const [showOriginal, setShowOriginal] = useState(false)

  const canvasRef = useRef<HTMLCanvasElement>(null)
  const originalCanvasRef = useRef<HTMLCanvasElement>(null)
  const emojiCanvasRef = useRef<HTMLCanvasElement>(null)
  const heartCanvasRef = useRef<HTMLCanvasElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const grayDataRef = useRef<Uint8Array | null>(null)
  const dimensionsRef = useRef<{ width: number; height: number } | null>(null)
  const rafRef = useRef<number | null>(null)

  const processImage = useCallback(() => {
    if (!grayDataRef.current || !dimensionsRef.current || !canvasRef.current) return

    const canvas = canvasRef.current
    const ctx = canvas.getContext("2d")
    if (!ctx) return

    const { width, height } = dimensionsRef.current
    const lut = buildLUT(levels, contrast)
    const processed = applyLUT(grayDataRef.current, lut, width, height)
    ctx.putImageData(processed, 0, 0)
  }, [levels, contrast])

  useEffect(() => {
    if (rafRef.current !== null) {
      cancelAnimationFrame(rafRef.current)
    }
    rafRef.current = requestAnimationFrame(() => {
      processImage()
      rafRef.current = null
    })
    return () => {
      if (rafRef.current !== null) {
        cancelAnimationFrame(rafRef.current)
      }
    }
  }, [processImage, image])

  useEffect(() => {
    const canvas = emojiCanvasRef.current
    if (!canvas) return

    const size = 32
    canvas.width = size
    canvas.height = size
    const ctx = canvas.getContext("2d")
    if (!ctx) return

    // Draw emoji
    ctx.font = `${size - 4}px serif`
    ctx.textAlign = "center"
    ctx.textBaseline = "middle"
    ctx.fillText("🎨", size / 2, size / 2)

    // Only apply value study effect after an image is uploaded
    if (image) {
      const imageData = ctx.getImageData(0, 0, size, size)
      const originalAlpha = new Uint8Array(size * size)
      for (let i = 0; i < size * size; i++) {
        originalAlpha[i] = imageData.data[i * 4 + 3]
      }
      const gray = extractGrayscale(imageData)
      const lut = buildLUT(levels, contrast)
      const processed = applyLUT(gray, lut, size, size)
      for (let i = 0; i < size * size; i++) {
        processed.data[i * 4 + 3] = originalAlpha[i]
      }
      ctx.putImageData(processed, 0, 0)
    }

    // Update favicon to match
    let link = document.querySelector<HTMLLinkElement>("link[rel~='icon']")
    if (!link) {
      link = document.createElement("link")
      link.rel = "icon"
      document.head.appendChild(link)
    }
    link.href = canvas.toDataURL()
  }, [levels, contrast, image])

  // Heart emoji canvas effect (mirrors art emoji behavior)
  useEffect(() => {
    const canvas = heartCanvasRef.current
    if (!canvas) return

    const size = 24
    canvas.width = size
    canvas.height = size
    const ctx = canvas.getContext("2d")
    if (!ctx) return

    // Draw emoji with padding to prevent clipping
    ctx.font = `${size - 6}px serif`
    ctx.textAlign = "center"
    ctx.textBaseline = "middle"
    ctx.fillText("❤️", size / 2, size / 2 + 1)

    // Only apply value study effect after an image is uploaded
    if (image) {
      const imageData = ctx.getImageData(0, 0, size, size)
      const originalAlpha = new Uint8Array(size * size)
      for (let i = 0; i < size * size; i++) {
        originalAlpha[i] = imageData.data[i * 4 + 3]
      }
      const gray = extractGrayscale(imageData)
      const lut = buildLUT(levels, contrast)
      const processed = applyLUT(gray, lut, size, size)
      for (let i = 0; i < size * size; i++) {
        processed.data[i * 4 + 3] = originalAlpha[i]
      }
      ctx.putImageData(processed, 0, 0)
    }
  }, [levels, contrast, image])

  const handleFile = (file: File) => {
    if (!file.type.startsWith("image/")) return

    const img = new Image()
    img.onload = () => {
      const canvas = canvasRef.current
      const originalCanvas = originalCanvasRef.current
      if (!canvas || !originalCanvas) return

      canvas.width = img.width
      canvas.height = img.height
      originalCanvas.width = img.width
      originalCanvas.height = img.height

      const ctx = canvas.getContext("2d")
      const originalCtx = originalCanvas.getContext("2d")
      if (!ctx || !originalCtx) return

      ctx.drawImage(img, 0, 0)
      originalCtx.drawImage(img, 0, 0)
      const imageData = ctx.getImageData(0, 0, img.width, img.height)
      grayDataRef.current = extractGrayscale(imageData)
      dimensionsRef.current = { width: img.width, height: img.height }

      setImage(img)
    }
    img.src = URL.createObjectURL(file)
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
    const file = e.dataTransfer.files[0]
    if (file) handleFile(file)
  }

  const handleDownload = () => {
    if (!canvasRef.current) return
    const link = document.createElement("a")
    link.download = "value-study.png"
    link.href = canvasRef.current.toDataURL("image/png")
    link.click()
  }

  return (
    <div className="h-screen p-4 sm:p-6 flex flex-col items-center overflow-hidden">
      <h1 className="text-2xl font-semibold mb-4 flex items-center gap-2 text-stone-700 flex-shrink-0">
        <canvas ref={emojiCanvasRef} className="w-8 h-8" />
        Value Study
      </h1>

      <div
        role="button"
        tabIndex={0}
        aria-label={image ? "Click to upload a new image" : "Click or drop image to upload"}
        className={`w-full max-w-4xl border-2 border-dashed rounded-lg p-2 mb-4 transition-colors flex-1 min-h-0 flex flex-col ${
          isDragging ? "border-amber-700/60 bg-amber-50/50" : "border-stone-300"
        }`}
        onDragOver={(e) => {
          e.preventDefault()
          setIsDragging(true)
        }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault()
            fileInputRef.current?.click()
          }
        }}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0]
            if (file) handleFile(file)
          }}
        />

        <div
          className={image ? "relative flex-1 min-h-0 flex items-center justify-center" : "hidden"}
          onMouseDown={(e) => { e.stopPropagation(); setShowOriginal(true) }}
          onMouseUp={() => setShowOriginal(false)}
          onMouseLeave={() => setShowOriginal(false)}
          onTouchStart={(e) => { e.stopPropagation(); setShowOriginal(true) }}
          onTouchEnd={() => setShowOriginal(false)}
          onClick={(e) => e.stopPropagation()}
        >
          <canvas
            ref={canvasRef}
            role="img"
            aria-label={`Processed image with ${levels} value levels and ${contrast} contrast`}
            className="max-w-full max-h-full cursor-pointer transition-opacity duration-150 object-contain"
            style={{ opacity: showOriginal ? 0 : 1 }}
          />
          <canvas
            ref={originalCanvasRef}
            role="img"
            aria-label="Original image"
            className="absolute max-w-full max-h-full cursor-pointer transition-opacity duration-150 object-contain"
            style={{ opacity: showOriginal ? 1 : 0 }}
          />
          <p className="absolute bottom-2 left-1/2 -translate-x-1/2 text-xs text-stone-400">Hold to compare</p>
        </div>
        {!image && (
          <div className="flex-1 flex flex-col items-center justify-center cursor-pointer gap-2">
            <span className="text-stone-500">drop an image here</span>
            <span className="text-xs text-stone-400">your images stay private</span>
          </div>
        )}
      </div>

      {image && (
        <div className="w-full max-w-4xl flex-shrink-0 space-y-4">
          {/* Values */}
          <div className="flex items-center gap-3">
            <span id="values-label" className="text-sm text-stone-600 w-20">Tonal Range</span>
            <div role="group" aria-labelledby="values-label" className="flex gap-1">
              {VALUE_PRESETS.map((preset) => (
                <Button
                  key={preset}
                  variant={levels === preset ? "default" : "outline"}
                  size="sm"
                  onClick={() => setLevels(preset)}
                  aria-pressed={levels === preset}
                  className={levels === preset
                    ? "rounded bg-stone-800 hover:bg-stone-900 text-white"
                    : "rounded border-stone-300 text-stone-600 hover:bg-stone-100"
                  }
                >
                  {preset}-value
                </Button>
              ))}
            </div>
          </div>

          {/* Contrast */}
          <div className="flex items-center gap-3">
            <span className="text-sm text-stone-600 w-20">Contrast</span>
            <Slider
              value={[contrast]}
              onValueChange={([v]) => setContrast(v)}
              min={-100}
              max={100}
              step={1}
              className="flex-1"
            />
            <span className="text-sm text-stone-500 w-8 text-right">{contrast}</span>
          </div>

          {/* Save */}
          <div className="flex justify-end">
            <Button onClick={handleDownload} size="sm" className="rounded bg-stone-800 hover:bg-stone-900 text-white px-4">
              Save Image
            </Button>
          </div>
        </div>
      )}

      <footer className="mt-auto pt-12 text-center text-sm text-stone-400 flex-shrink-0 space-y-4">
        <p style={{ fontFamily: "'Caveat', cursive" }} className="text-lg text-stone-500">
          crafted with <canvas ref={heartCanvasRef} className="inline-block w-6 h-6 align-middle mx-0.5" /> in rochester, new york
        </p>
        <a
          href="https://github.com/josephfusco/value-study-app"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 text-stone-400 hover:text-stone-600 transition-colors underline"
        >
          <svg
            viewBox="0 0 16 16"
            className="w-4 h-4"
            fill="currentColor"
            aria-hidden="true"
          >
            <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0016 8c0-4.42-3.58-8-8-8z" />
          </svg>
          GitHub
        </a>
      </footer>
    </div>
  )
}
