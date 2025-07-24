import { FormFieldProps } from '@/app/types/forms'

export default function FormField({
  id,
  name,
  type,
  label,
  value,
  onChange,
  error,
  required = false,
  maxLength,
  placeholder,
  rows = 4
}: FormFieldProps) {
  const baseClasses = "w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
  const errorClasses = error ? "border-red-500 focus:ring-red-500 focus:border-red-500" : "border-gray-300"
  const inputClasses = `${baseClasses} ${errorClasses}`

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    onChange(e.target.value)
  }

  return (
    <div className="mb-4">
      <label htmlFor={id} className="block text-sm font-medium text-gray-700 mb-1">
        {label}
        {required && <span className="text-red-500 ml-1">*</span>}
      </label>
      
      {type === 'textarea' ? (
        <div>
          <textarea
            id={id}
            name={name}
            value={value}
            onChange={handleChange}
            className={inputClasses}
            placeholder={placeholder}
            rows={rows}
            maxLength={maxLength}
          />
          {maxLength && (
            <div className="flex justify-end mt-1">
              <span className="text-xs text-gray-500">
                {value.length}/{maxLength}
              </span>
            </div>
          )}
        </div>
      ) : (
        <div>
          <input
            type="text"
            id={id}
            name={name}
            value={value}
            onChange={handleChange}
            className={inputClasses}
            placeholder={placeholder}
            maxLength={maxLength}
          />
          {maxLength && (
            <div className="flex justify-end mt-1">
              <span className="text-xs text-gray-500">
                {value.length}/{maxLength}
              </span>
            </div>
          )}
        </div>
      )}
      
      {error && (
        <p className="mt-1 text-sm text-red-600" role="alert">
          {error}
        </p>
      )}
    </div>
  )
}