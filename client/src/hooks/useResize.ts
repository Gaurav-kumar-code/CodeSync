import { RefObject, useEffect, useState } from "react"

interface Breakpoints {
  isMobile: boolean
  isTablet: boolean
  isDesktop: boolean
}

const getBreakpoints = (width: number): Breakpoints => ({
  isMobile: width < 768,
  isTablet: width >= 768 && width < 1024,
  isDesktop: width >= 1024,
})

export const useResize = (targetRef?: RefObject<HTMLElement>) => {
  const [size, setSize] = useState({
    width: window.innerWidth,
    height: window.innerHeight,
  })

  useEffect(() => {
    const onWindowResize = () => {
      if (targetRef?.current) {
        const rect = targetRef.current.getBoundingClientRect()
        setSize({
          width: rect.width,
          height: rect.height,
        })
        return
      }

      setSize({
        width: window.innerWidth,
        height: window.innerHeight,
      })
    }

    onWindowResize()
    window.addEventListener("resize", onWindowResize)

    let observer: ResizeObserver | null = null

    if (targetRef?.current) {
      observer = new ResizeObserver(onWindowResize)
      observer.observe(targetRef.current)
    }

    return () => {
      window.removeEventListener("resize", onWindowResize)
      observer?.disconnect()
    }
  }, [targetRef])

  return {
    ...size,
    ...getBreakpoints(size.width),
  }
}
