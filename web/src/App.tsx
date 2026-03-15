import { Routes, Route } from 'react-router'
import { ComicGrid } from './components/ComicGrid'
import { Reader } from './components/Reader'

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<ComicGrid />} />
      <Route path="/read/:slug" element={<Reader />} />
    </Routes>
  )
}
