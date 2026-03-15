import { forwardRef, useEffect, useRef, useState } from 'react'

interface LazyImageProps {
  src: string
  alt: string
  style?: React.CSSProperties
  imgStyle?: React.CSSProperties
}

export const LazyImage = forwardRef<HTMLDivElement, LazyImageProps>(
  ({ src, alt, style, imgStyle }, ref) => {
    const [isVisible, setIsVisible] = useState(false)
    const [isLoaded, setIsLoaded] = useState(false)
    const localRef = useRef<HTMLDivElement>(null)

    useEffect(() => {
      if (typeof ref === 'function') {
        ref(localRef.current)
      } else if (ref) {
        ref.current = localRef.current
      }
    }, [ref])

    useEffect(() => {
      const observer = new IntersectionObserver(
        (entries) => {
          if (entries[0].isIntersecting) {
            setIsVisible(true)
            observer.disconnect()
          }
        },
        // Preload images when they are within 1.5 viewport heights
        { rootMargin: '150% 0px' }
      )

      if (localRef.current) {
        observer.observe(localRef.current)
      }

      return () => {
        observer.disconnect()
      }
    }, [])

    return (
      <div
        ref={localRef}
        style={{
          ...style,
          minHeight: isLoaded ? undefined : '80vh',
          backgroundColor: isLoaded ? 'transparent' : '#1a1a1a', // slight tint to show it's loading
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        {isVisible && (
          <img 
            src={src} 
            alt={alt} 
            style={imgStyle} 
            onLoad={() => setIsLoaded(true)}
          />
        )}
      </div>
    )
  }
)
