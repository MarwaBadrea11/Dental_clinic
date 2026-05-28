import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Button } from '@/components/ui/Button'

export default function NotFoundPage() {
  const navigate = useNavigate()
  return (
    <div className="min-h-screen bg-[var(--color-background)] flex items-center justify-center p-6">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center max-w-md"
      >
        <p className="text-8xl font-bold text-[var(--color-primary)]/20 mb-4" style={{ fontFamily: 'Manrope, sans-serif' }}>404</p>
        <h1 className="text-2xl font-bold text-[var(--color-on-surface)] mb-2" style={{ fontFamily: 'Manrope, sans-serif' }}>
          Page not found
        </h1>
        <p className="text-[var(--color-on-surface-variant)] mb-6">
          The page you're looking for doesn't exist or has been moved.
        </p>
        <Button onClick={() => navigate('/')}>Back to Dashboard</Button>
      </motion.div>
    </div>
  )
}
