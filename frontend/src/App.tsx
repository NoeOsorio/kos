import { Routes, Route } from 'react-router-dom'

function Home() {
  return (
    <div className="min-h-screen bg-gray-950 text-white flex items-center justify-center">
      <div className="text-center space-y-4">
        <div className="text-6xl">🧠</div>
        <h1 className="text-3xl font-bold">KOS</h1>
        <p className="text-gray-400 text-lg">Knowledge Operating System</p>
        <p className="text-gray-600 text-sm">Week 1 — scaffold ready</p>
      </div>
    </div>
  )
}

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Home />} />
    </Routes>
  )
}
