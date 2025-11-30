/**
 * WaveLoader Component
 *
 * Loading animation with wave effect using Grupo Onda colors
 */

export function WaveLoader() {
  const colors = ['#FBC33D', '#F9501E', '#8BC5E5', '#FBC33D', '#F9501E']

  return (
    <div className="flex items-center justify-center gap-2">
      {colors.map((color, index) => (
        <div
          key={index}
          className="h-4 w-4 animate-wave rounded-full"
          style={{
            backgroundColor: color,
            animationDelay: `${index * 0.1}s`,
          }}
        />
      ))}
      <style>{`
        @keyframes wave {
          0%, 100% {
            transform: translateY(0px);
          }
          50% {
            transform: translateY(-10px);
          }
        }

        .animate-wave {
          animation: wave 0.6s ease-in-out infinite;
        }
      `}</style>
    </div>
  )
}

/**
 * Página de loading completa
 */
export function WaveLoaderPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-white">
      <div className="text-center">
        <WaveLoader />
        <p className="mt-6 text-sm font-medium text-gray-600">Carregando...</p>
      </div>
    </div>
  )
}
