import { Routes, Route, useLocation } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import { KOSProvider, useKOS } from './context/KOSContext'
import NavBar from './components/NavBar'
import TalkPage from './pages/TalkPage'
import ExplorePage from './pages/ExplorePage'
import BuildPage from './pages/BuildPage'
import BuildWorkspacePage from './pages/BuildWorkspacePage'

const BG: Record<string, string> = {
  talk:    '#05000e',
  explore: '#05000e',
  build:   '#0e0e12',
}

function Layout() {
  const location = useLocation()
  const { mode } = useKOS()

  return (
    <motion.div
      className="min-h-screen text-text-primary"
      animate={{ backgroundColor: BG[mode] }}
      transition={{ duration: 0.3, ease: 'easeInOut' }}
    >
      <NavBar />
      <main className="md:mt-[52px] pb-[56px] md:pb-0 h-screen md:h-[calc(100vh-52px)]">
        <AnimatePresence mode="wait">
          <motion.div
            key={location.pathname}
            className="h-full"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3, ease: 'easeInOut' }}
          >
            <Routes location={location}>
              <Route path="/"               element={<TalkPage />} />
              <Route path="/explore"        element={<ExplorePage />} />
              <Route path="/build"          element={<BuildPage />} />
              <Route path="/build/:appType" element={<BuildWorkspacePage />} />
            </Routes>
          </motion.div>
        </AnimatePresence>
      </main>
    </motion.div>
  )
}

export default function App() {
  return (
    <KOSProvider>
      <Layout />
    </KOSProvider>
  )
}
