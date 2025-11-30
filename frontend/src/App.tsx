import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import { AnimatePresence } from 'framer-motion'
import { CardNav } from './components/CardNav'
import { VisaoGeralPage } from './pages/visao-geral'
import { Bar } from './pages/Bar'
import { VendasIngresso } from './pages/VendasIngresso'

function App() {
  return (
    <Router>
      <div className="relative min-h-screen bg-gray-50">
        <div className="relative z-10">
          <CardNav />
          <div className="container mx-auto px-4 pb-12 sm:px-6 lg:px-8">
            <AnimatePresence mode="wait">
              <Routes>
                <Route path="/" element={<VisaoGeralPage />} />
                <Route path="/bar" element={<Bar />} />
                <Route path="/vendas-ingresso" element={<VendasIngresso />} />
              </Routes>
            </AnimatePresence>
          </div>
        </div>
      </div>
    </Router>
  )
}

export default App
