'use client'

import { useEffect, useState, Suspense } from "react"
import VisualizerMain from "./visualizer-main"
import { Button } from "@/components/ui/button"
import { ArrowUpRight, HelpCircle, Loader2, Upload, Sparkles } from "lucide-react"
import { Link, useLocation, useNavigate, useSearchParams } from "react-router-dom"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"

type FileState = {
  loading: boolean
  progress: number
  file?: File
}

const DEMO_BASE = 'https://viz2d-demo.vercel.app'

export const config = {
  companyLogo: '/logo.png?v=5',
  websiteUrl: '/',
  name: 'Think Decor',
  sampleFiles: [
    { name: 'Living Room 1', image: '/assets/samples/1.webp', viz2dFile: `${DEMO_BASE}/assets/samples/1.viz2d` },
    { name: 'Living Room 2', image: '/assets/samples/2.webp', viz2dFile: `${DEMO_BASE}/assets/samples/2.viz2d` },
    { name: 'Bed Room', image: '/assets/samples/3.webp', viz2dFile: `${DEMO_BASE}/assets/samples/3.viz2d` },
    { name: 'Bathroom', image: '/assets/samples/4.webp', viz2dFile: `${DEMO_BASE}/assets/samples/4.viz2d` },
    { name: 'Kitchen', image: '/assets/samples/5.webp', viz2dFile: `${DEMO_BASE}/assets/samples/5.viz2d` },
    { name: 'Garage', image: '/assets/samples/6.webp', viz2dFile: `${DEMO_BASE}/assets/samples/6.viz2d` },
    { name: 'Terrace', image: '/assets/samples/7.webp', viz2dFile: `${DEMO_BASE}/assets/samples/7.viz2d` },
    { name: 'Stairs', image: '/assets/samples/8.webp', viz2dFile: `${DEMO_BASE}/assets/samples/8.viz2d` },
    { name: 'Balcony', image: '/assets/samples/9.webp', viz2dFile: `${DEMO_BASE}/assets/samples/9.viz2d` },
  ],
  textureKeywords: ['wall', 'floor'],
  textures: [
    { image: '/assets/samples/textures/1.webp', scale: 1, keywords: ['wall', 'floor'] },
    { image: '/assets/samples/textures/2.webp', scale: 1, keywords: ['wall'] },
  ],
  useCredits: false,
  allowScaling: true,
  allowUploadingTextures: true,
}

export type VisualizerConfig = typeof config

export default function VisualizerComponent() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <span className="text-muted-foreground text-sm">Loading Visualizer...</span>
        </div>
      </div>
    }>
      <Main config={config} />
    </Suspense>
  )
}

function Main({ config }: { config: VisualizerConfig }) {
  const [fileState, setFileState] = useState<FileState>({
    loading: false,
    progress: 0,
  })

  const [searchParams] = useSearchParams()
  const { pathname } = useLocation()
  const navigate = useNavigate()
  const fileUrl = searchParams.get("fileUrl")

  useEffect(() => {
    if (fileUrl) {
      loadFromUrl(fileUrl)
      navigate(pathname, { replace: true })
    }
  }, [fileUrl])

  async function loadFromUrl(url: string) {
    setFileState({ loading: true, progress: 0 })

    const response = await fetch(url)
    if (!response.body) throw new Error("Streaming not supported")

    const contentLength = Number(response.headers.get("Content-Length")) || 0
    const reader = response.body.getReader()

    let received = 0
    const chunks: Uint8Array<ArrayBuffer>[] = []

    while (true) {
      const { done, value } = await reader.read()
      if (done) break

      if (value) {
        chunks.push(value)
        received += value.length

        if (contentLength) {
          setFileState(prev => ({
            ...prev,
            progress: Math.round((received / contentLength) * 100),
          }))
        }
      }
    }

    const blob = new Blob(chunks, { type: "application/octet-stream" })
    const file = new File([blob], "visualizer.viz2d", {
      type: blob.type,
      lastModified: Date.now(),
    })

    setFileState({ loading: false, progress: 100, file })
  }

  return (
    <Suspense fallback={<Loader2 className="mx-auto my-10 animate-spin text-primary" />}>
      <>
        {/* Loading overlay */}
        {fileState.loading && (
          <div className="fixed inset-0 z-50 bg-background/90 backdrop-blur-md flex flex-col items-center justify-center gap-5">
            <div className="flex items-center gap-3 text-lg font-medium text-foreground">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
              Loading room…
            </div>
            <div className="w-64 h-2 bg-secondary rounded-full overflow-hidden">
              <div
                className="h-full bg-primary rounded-full transition-all duration-300 ease-out"
                style={{ width: `${fileState.progress}%` }}
              />
            </div>
            <span className="text-xs text-muted-foreground">{fileState.progress}%</span>
          </div>
        )}

        {fileState.file ? (
          <VisualizerMain
            config={config}
            file={fileState.file}
            onClose={() => { setFileState({ loading: false, progress: 0 }) }}
          />
        ) : (
          <div className="min-h-screen bg-background">
            {/* Header */}
            <header className="border-b border-border/50 bg-card/30 backdrop-blur-sm sticky top-0 z-10">
              <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
                <Link to="/" className="flex items-center gap-3">
                  <img src={config.companyLogo} className="h-9 invert" alt="Think Decor" />
                  <span className="text-lg font-semibold text-foreground">Think Decor</span>
                </Link>
                <div className="flex items-center gap-3">
                  <ConvertInfo />
                  <Button variant="outline" size="sm" asChild>
                    <label htmlFor="fileinput" className="cursor-pointer">
                      <input
                        type="file"
                        accept=".viz2d"
                        id="fileinput"
                        className="hidden"
                        onChange={(e) => {
                          const file = e.target.files?.[0]
                          if (file) {
                            setFileState({ loading: false, progress: 100, file })
                          }
                          e.target.value = ""
                        }}
                      />
                      <Upload className="h-4 w-4" />
                      Upload .viz2d
                    </label>
                  </Button>
                </div>
              </div>
            </header>

            {/* Hero */}
            <section className="relative py-16 px-6">
              <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,hsl(255_72%_67%_/_0.08)_0%,transparent_60%)]" />
              <div className="relative max-w-3xl mx-auto text-center space-y-4">
                <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-primary/10 border border-primary/20 text-primary text-sm font-medium mb-2">
                  <Sparkles className="h-3.5 w-3.5" />
                  Interactive Demo
                </div>
                <h1 className="text-3xl md:text-4xl font-bold text-foreground tracking-tight">
                  Visualize Your Space
                </h1>
                <p className="text-muted-foreground text-base md:text-lg max-w-xl mx-auto">
                  Select a room below and apply textures to walls, floors, and surfaces in real-time.
                </p>
              </div>
            </section>

            {/* Sample Grid */}
            <section className="max-w-7xl mx-auto px-6 pb-20">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                {config.sampleFiles.map((sample, index) => (
                  <Link
                    key={index}
                    to={pathname + '?fileUrl=' + encodeURIComponent(sample.viz2dFile)}
                    className="group relative bg-card rounded-xl border border-border/50 overflow-hidden transition-all duration-300 hover:border-primary/40 hover:shadow-lg hover:shadow-primary/5"
                  >
                    <div className="aspect-video overflow-hidden">
                      <img
                        src={sample.image}
                        alt={sample.name}
                        className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                      />
                    </div>
                    <div className="p-4 flex items-center justify-between">
                      <span className="font-medium text-foreground text-sm">{sample.name}</span>
                      <span className="text-xs text-muted-foreground group-hover:text-primary transition-colors">
                        Try it →
                      </span>
                    </div>
                  </Link>
                ))}
              </div>
            </section>
          </div>
        )}
      </>
    </Suspense>
  )
}

function ConvertInfo() {
  const [open, setOpen] = useState(false)

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          aria-label="How to convert files to Viz2D"
          className="text-muted-foreground hover:text-foreground transition-colors"
          onMouseEnter={() => setOpen(true)}
          onMouseLeave={() => setOpen(false)}
          onFocus={() => setOpen(true)}
          onBlur={() => setOpen(false)}
        >
          <HelpCircle className="h-4 w-4" />
        </button>
      </PopoverTrigger>
      <PopoverContent
        onMouseEnter={() => setOpen(true)}
        onMouseLeave={() => setOpen(false)}
        className="max-w-56 p-3 space-y-2"
      >
        <p className="text-sm">
          Don't have a <strong>.viz2d</strong> file yet?
        </p>
        <Button size="sm" asChild>
          <a
            href="https://viz2d.com/convert"
            target="_blank"
            rel="noopener noreferrer"
          >
            Open converter <ArrowUpRight className="h-3.5 w-3.5" />
          </a>
        </Button>
      </PopoverContent>
    </Popover>
  )
}
