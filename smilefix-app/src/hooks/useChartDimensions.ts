import { useEffect, useRef, useState } from 'react'

interface Dimensions { width: number; height: number }

/**
 * Measures a container element with ResizeObserver and returns pixel dimensions.
 * Returns { width: 0, height: 0 } until the container has real layout dimensions.
 * Use the returned `containerRef` on the wrapper div, then pass `width` and `height`
 * directly to Recharts charts instead of using ResponsiveContainer — this fully
 * eliminates the "width/height should be greater than 0" warning in all React modes.
 */
export function useChartDimensions(): { containerRef: React.RefObject<HTMLDivElement>; dimensions: Dimensions } {
  const containerRef = useRef<HTMLDivElement>(null)
  const [dimensions, setDimensions] = useState<Dimensions>({ width: 0, height: 0 })

  useEffect(() => {
    const el = containerRef.current
    if (!el) return

    const update = (w: number, h: number) => {
      if (w > 0 && h > 0) setDimensions({ width: Math.floor(w), height: Math.floor(h) })
    }

    const observer = new ResizeObserver((entries) => {
      const { width, height } = entries[0].contentRect
      update(width, height)
    })

    observer.observe(el)

    // Seed with current size in case already laid out
    const rect = el.getBoundingClientRect()
    update(rect.width, rect.height)

    return () => observer.disconnect()
  }, [])

  return { containerRef, dimensions }
}
