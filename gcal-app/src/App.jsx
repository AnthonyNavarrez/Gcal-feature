import { useEffect, useRef, useState } from 'react'
import DefaultScreen from './components/DefaultScreen'

const DESIGN_WIDTH = 1911

export default function App() {
  const [scale, setScale] = useState(1)

  useEffect(() => {
    const update = () => setScale(window.innerWidth / DESIGN_WIDTH)
    update()
    window.addEventListener('resize', update)
    return () => window.removeEventListener('resize', update)
  }, [])

  return (
    <div style={{ width: '100vw', height: '100vh', overflow: 'hidden', background: '#1f1f1f' }}>
      <div style={{
        transform: `scale(${scale})`,
        transformOrigin: 'top left',
        width: `${DESIGN_WIDTH}px`,
      }}>
        <DefaultScreen />
      </div>
    </div>
  )
}
