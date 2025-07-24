export default function Loading() {
  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <div className="h-8 bg-gray-200 rounded-md animate-pulse mb-2 w-64"></div>
        <div className="h-4 bg-gray-200 rounded-md animate-pulse w-96"></div>
      </div>
      
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }).map((_, index) => (
          <div key={index} className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden animate-pulse">
            <div className="p-6">
              <div className="h-6 bg-gray-200 rounded-md mb-4 w-3/4"></div>
              <div className="h-4 bg-gray-200 rounded-md mb-2 w-full"></div>
              <div className="h-4 bg-gray-200 rounded-md mb-4 w-2/3"></div>
              <div className="flex justify-between items-center">
                <div className="h-4 bg-gray-200 rounded-md w-24"></div>
                <div className="h-8 bg-gray-200 rounded-md w-20"></div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}