/**
 * AnimatedList Component
 *
 * Provides smooth animation for list items appearing
 */

import { ReactNode } from 'react'
import { motion } from 'framer-motion'

interface AnimatedListProps {
  children: ReactNode
  className?: string
  delay?: number
}

export function AnimatedList({ children, className = '', delay = 0 }: AnimatedListProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay }}
      className={className}
    >
      {children}
    </motion.div>
  )
}

interface AnimatedListItemProps {
  children: ReactNode
  index?: number
  className?: string
}

export function AnimatedListItem({ children, index = 0, className = '' }: AnimatedListItemProps) {
  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.3, delay: index * 0.05 }}
      className={className}
    >
      {children}
    </motion.div>
  )
}
