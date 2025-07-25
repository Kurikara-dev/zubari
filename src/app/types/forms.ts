export interface ProjectFormData {
  name: string
  description: string
}

export interface ProjectFormErrors {
  name?: string
  description?: string
  submit?: string
}

export interface ProjectFormState {
  data: ProjectFormData
  errors: ProjectFormErrors
  isSubmitting: boolean
  isValid: boolean
}

export type FormFieldType = 'input' | 'textarea'

export interface FormFieldProps {
  id: string
  name: string
  type: FormFieldType
  label: string
  value: string
  onChange: (value: string) => void
  error?: string
  required?: boolean
  maxLength?: number
  placeholder?: string
  rows?: number
}

export interface ImageUploadZoneProps {
  onFileSelect: (file: File | null) => void
  acceptedTypes?: string[]
  maxSize?: number
  disabled?: boolean
  error?: string
  placeholder?: string
}

export interface FilePreviewProps {
  file: File | null
  previewUrl?: string | null
  onRemove?: () => void
  disabled?: boolean
  showSize?: boolean
  showType?: boolean
}

export interface UploadProgressProps {
  progress: number
  status: 'idle' | 'uploading' | 'success' | 'error'
  fileName?: string
  errorMessage?: string
  onCancel?: () => void
  showPercentage?: boolean
  size?: 'small' | 'medium' | 'large'
}