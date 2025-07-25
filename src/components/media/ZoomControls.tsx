'use client'

interface ZoomControlsProps {
  scale: number
  onZoomIn: () => void
  onZoomOut: () => void
  onReset: () => void
  onFit: () => void
  minScale: number
  maxScale: number
}

export function ZoomControls({
  scale,
  onZoomIn,
  onZoomOut,
  onReset,
  onFit,
  minScale,
  maxScale
}: ZoomControlsProps) {
  const canZoomIn = scale < maxScale
  const canZoomOut = scale > minScale
  const scalePercentage = Math.round(scale * 100)

  return (
    <div className="absolute bottom-4 right-4 flex flex-col space-y-2 bg-black bg-opacity-60 rounded-lg p-2 backdrop-blur-sm">
      {/* Scale indicator */}
      <div className="text-white text-sm text-center font-medium px-2">
        {scalePercentage}%
      </div>
      
      <div className="flex flex-col space-y-1">
        {/* Zoom In */}
        <button
          type="button"
          onClick={onZoomIn}
          disabled={!canZoomIn}
          className="w-10 h-10 flex items-center justify-center text-white bg-transparent hover:bg-white hover:bg-opacity-20 disabled:opacity-50 disabled:cursor-not-allowed rounded transition-colors touch-target"
          aria-label="Zoom in"
          title="Zoom in (+)"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
          </svg>
        </button>

        {/* Zoom Out */}
        <button
          type="button"
          onClick={onZoomOut}
          disabled={!canZoomOut}
          className="w-10 h-10 flex items-center justify-center text-white bg-transparent hover:bg-white hover:bg-opacity-20 disabled:opacity-50 disabled:cursor-not-allowed rounded transition-colors touch-target"
          aria-label="Zoom out"
          title="Zoom out (-)"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 12H6" />
          </svg>
        </button>

        {/* Reset to 100% */}
        <button
          type="button"
          onClick={onReset}
          className="w-10 h-10 flex items-center justify-center text-white bg-transparent hover:bg-white hover:bg-opacity-20 rounded transition-colors touch-target"
          aria-label="Reset zoom"
          title="Reset zoom (0)"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
        </button>

        {/* Fit to container */}
        <button
          type="button"
          onClick={onFit}
          className="w-10 h-10 flex items-center justify-center text-white bg-transparent hover:bg-white hover:bg-opacity-20 rounded transition-colors touch-target"
          aria-label="Fit to screen"
          title="Fit to screen"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
          </svg>
        </button>
      </div>
    </div>
  )
}