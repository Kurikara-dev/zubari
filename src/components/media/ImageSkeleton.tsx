interface ImageSkeletonProps {
  count?: number
}

export default function ImageSkeleton({ count = 6 }: ImageSkeletonProps) {
  return (
    <div className="grid gap-4 grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6">
      {Array.from({ length: count }).map((_, index) => (
        <div 
          key={index} 
          className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden animate-pulse"
        >
          {/* Image placeholder */}
          <div className="aspect-square bg-gray-200" />
          
          {/* Metadata placeholder */}
          <div className="p-3">
            <div className="h-4 bg-gray-200 rounded-md mb-2 w-3/4"></div>
            <div className="h-3 bg-gray-200 rounded-md mb-1 w-1/2"></div>
            <div className="h-3 bg-gray-200 rounded-md w-1/3"></div>
          </div>
        </div>
      ))}
    </div>
  )
}