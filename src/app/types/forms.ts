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