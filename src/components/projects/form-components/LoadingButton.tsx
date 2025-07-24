interface LoadingButtonProps {
  type?: 'button' | 'submit' | 'reset'
  isLoading?: boolean
  disabled?: boolean
  onClick?: () => void
  children: React.ReactNode
  variant?: 'primary' | 'secondary'
}

export default function LoadingButton({
  type = 'button',
  isLoading = false,
  disabled = false,
  onClick,
  children,
  variant = 'primary'
}: LoadingButtonProps) {
  const isDisabled = disabled || isLoading

  const baseClasses = "inline-flex items-center justify-center px-4 py-2 text-sm font-medium rounded-md focus:outline-none focus:ring-2 focus:ring-offset-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
  
  const variantClasses = {
    primary: "text-white bg-blue-600 hover:bg-blue-700 focus:ring-blue-500 disabled:hover:bg-blue-600",
    secondary: "text-gray-700 bg-white border border-gray-300 hover:bg-gray-50 focus:ring-blue-500 disabled:hover:bg-white"
  }

  const buttonClasses = `${baseClasses} ${variantClasses[variant]}`

  return (
    <button
      type={type}
      disabled={isDisabled}
      onClick={onClick}
      className={buttonClasses}
    >
      {isLoading && (
        <svg
          className="animate-spin -ml-1 mr-2 h-4 w-4"
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
        >
          <circle
            className="opacity-25"
            cx="12"
            cy="12"
            r="10"
            stroke="currentColor"
            strokeWidth="4"
          />
          <path
            className="opacity-75"
            fill="currentColor"
            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
          />
        </svg>
      )}
      {children}
    </button>
  )
}