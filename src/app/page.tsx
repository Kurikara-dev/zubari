import LoginButton from '@/components/auth/LoginButton';

export default function Home() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-orange-50">
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <h1 className="text-2xl font-bold text-blue-900">
                Zubari
              </h1>
              <span className="ml-2 text-sm text-gray-500">MVP</span>
            </div>
            <LoginButton />
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="text-center">
          <h1 className="text-4xl font-bold text-gray-900 sm:text-6xl">
            Visual Construction
            <span className="text-blue-600"> Communication</span>
          </h1>
          <p className="mt-6 text-lg leading-8 text-gray-600 max-w-2xl mx-auto">
            Pin-based visual communication tool for construction teams. 
            Add pins to photos and drawings to give clear, location-specific instructions.
          </p>
          
          <div className="mt-10 flex items-center justify-center gap-6">
            <div className="bg-white p-6 rounded-lg shadow-sm">
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                📸 Photo Pins
              </h3>
              <p className="text-sm text-gray-600">
                Mark specific locations on construction photos
              </p>
            </div>
            
            <div className="bg-white p-6 rounded-lg shadow-sm">
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                📋 Clear Instructions
              </h3>
              <p className="text-sm text-gray-600">
                Add titles and detailed instructions to each pin
              </p>
            </div>
            
            <div className="bg-white p-6 rounded-lg shadow-sm">
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                🔗 Easy Sharing
              </h3>
              <p className="text-sm text-gray-600">
                Share with team members via simple URLs
              </p>
            </div>
          </div>

          <div className="mt-12">
            <p className="text-sm text-gray-500">
              Sprint 0: Basic authentication and project setup
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}
