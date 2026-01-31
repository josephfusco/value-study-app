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

  const canvasRef = useRef<HTMLCanvasElement>(null)
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

  const handleFile = (file: File) => {
    if (!file.type.startsWith("image/")) return

    const img = new Image()
    img.onload = () => {
      const canvas = canvasRef.current
      if (!canvas) return

      canvas.width = img.width
      canvas.height = img.height

      const ctx = canvas.getContext("2d")
      if (!ctx) return

      ctx.drawImage(img, 0, 0)
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
    <div className="min-h-screen p-8 flex flex-col items-center">
      <h1 className="text-2xl font-semibold mb-6">Value Study</h1>

      <div
        role="button"
        tabIndex={0}
        aria-label={image ? "Click to upload a new image" : "Click or drop image to upload"}
        className={`w-full max-w-2xl border-2 border-dashed rounded-lg p-4 mb-6 transition-colors ${
          isDragging ? "border-gray-900 bg-gray-100" : "border-gray-300"
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

        <canvas
          ref={canvasRef}
          role="img"
          aria-label={`Processed image with ${levels} value levels and ${contrast} contrast`}
          className={image ? "w-full h-auto cursor-pointer" : "hidden"}
        />
        {!image && (
          <div className="h-64 flex items-center justify-center text-gray-500 cursor-pointer">
            Drop image or click to upload
          </div>
        )}
      </div>

      {image && (
        <div className="w-full max-w-2xl space-y-4">
          <div className="flex items-center gap-2">
            <span id="values-label" className="text-sm font-medium w-16">Values</span>
            <div role="group" aria-labelledby="values-label" className="flex gap-2">
              {VALUE_PRESETS.map((preset) => (
                <Button
                  key={preset}
                  variant={levels === preset ? "default" : "outline"}
                  size="sm"
                  onClick={() => setLevels(preset)}
                  aria-pressed={levels === preset}
                >
                  {preset}
                </Button>
              ))}
            </div>
          </div>

          <div className="flex items-center gap-4">
            <span className="text-sm font-medium w-16">Contrast</span>
            <Slider
              value={[contrast]}
              onValueChange={([v]) => setContrast(v)}
              min={-100}
              max={100}
              step={1}
              className="flex-1"
            />
            <span className="text-sm text-gray-500 w-8 text-right">{contrast}</span>
          </div>

          <Button onClick={handleDownload} className="w-full">
            Download PNG
          </Button>
        </div>
      )}
    </div>
  )
}
