import { Link, useLocation } from 'react-router-dom'
import { LayoutDashboard, Beer, Ticket } from 'lucide-react'
import { motion } from 'framer-motion'

export function CardNav() {
  const location = useLocation()

  const navItems = [
    { path: '/', label: 'Visão Geral', icon: LayoutDashboard },
    { path: '/bar', label: 'Bar', icon: Beer },
    { path: '/vendas-ingresso', label: 'Vendas de Ingresso', icon: Ticket },
  ]

  const isActive = (path: string) => location.pathname === path

  return (
    <nav className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-6">
      <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
        <div className="flex flex-col items-center gap-4 md:flex-row md:justify-between">
          {/* Logo centralizado */}
          <div className="flex items-center gap-3">
            <svg width="40" height="40" viewBox="0 0 200 100" className="h-10 w-auto">
              <path
                d="M 10 50 Q 30 20, 50 50 T 90 50"
                stroke="black"
                strokeWidth="3"
                fill="none"
                strokeLinecap="round"
              />
              <circle cx="100" cy="50" r="3" fill="black" />
            </svg>
            <div>
              <h1 className="text-lg font-extrabold text-gray-900">
                GRUPO ONDA
              </h1>
              <p className="text-[10px] font-medium tracking-wider text-gray-500">
                INTELIGÊNCIA EM ENTRETENIMENTO
              </p>
            </div>
          </div>

          {/* Navigation Cards */}
          <div className="flex flex-wrap items-center justify-center gap-2">
            {navItems.map((item) => {
              const Icon = item.icon
              const active = isActive(item.path)

              return (
                <Link
                  key={item.path}
                  to={item.path}
                  className="relative"
                >
                  <motion.div
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    className={`flex items-center gap-2 rounded-xl px-4 py-2.5 transition-all ${
                      active
                        ? 'bg-gradient-to-br from-onda-yellow to-onda-orange text-gray-900 shadow-md'
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    }`}
                  >
                    <Icon className="h-4 w-4" />
                    <span className="text-sm font-semibold">
                      {item.label}
                    </span>
                  </motion.div>
                  {active && (
                    <motion.div
                      layoutId="activeCard"
                      className="absolute -bottom-1 left-1/2 h-1 w-12 -translate-x-1/2 rounded-full bg-onda-orange"
                      transition={{ type: 'spring', duration: 0.5 }}
                    />
                  )}
                </Link>
              )
            })}
          </div>
        </div>
      </div>
    </nav>
  )
}
