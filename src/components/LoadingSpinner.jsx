export default function LoadingSpinner() {
  return (
    <div className="min-h-screen bg-fairway flex items-center justify-center">
      <div className="text-center">
        <div className="relative w-16 h-16 mx-auto mb-4">
          {/* Golf ball spinning */}
          <div className="absolute inset-0 border-4 border-masters-800 rounded-full"></div>
          <div className="absolute inset-0 border-4 border-transparent border-t-gold-500 rounded-full animate-spin"></div>
          <div className="absolute inset-2 bg-masters-50 rounded-full flex items-center justify-center">
            <div className="w-1 h-1 bg-masters-400 rounded-full"></div>
          </div>
        </div>
        <p className="text-masters-400 text-sm">Loading...</p>
      </div>
    </div>
  )
}
