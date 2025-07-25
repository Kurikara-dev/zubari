import LoginButton from '@/components/auth/LoginButton';

export default function Header() {
  return (
    <header className="bg-white shadow-sm border-b">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          <div className="flex items-center">
            <h1 className="text-2xl font-bold text-blue-900">
              markitto
            </h1>
            <span className="ml-2 text-sm text-gray-500">MVP</span>
          </div>
          <LoginButton />
        </div>
      </div>
    </header>
  );
}