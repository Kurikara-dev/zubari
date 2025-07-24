'use client'

import { useState, useEffect } from 'react'
import { ProjectFormData, ProjectFormErrors, ProjectFormState } from '@/app/types/forms'
import { Project } from '@/lib/types/api'
import FormField from './form-components/FormField'
import FormErrors from './form-components/FormErrors'
import LoadingButton from './form-components/LoadingButton'

interface ProjectFormProps {
  initialData?: Project
  onSubmit: (data: ProjectFormData) => Promise<void>
  submitLabel: string
  isEditing?: boolean
}

const initialFormData: ProjectFormData = {
  name: '',
  description: ''
}

const initialFormErrors: ProjectFormErrors = {}

export default function ProjectForm({
  initialData,
  onSubmit,
  submitLabel,
  isEditing = false
}: ProjectFormProps) {
  const [formState, setFormState] = useState<ProjectFormState>({
    data: initialData ? {
      name: initialData.name,
      description: initialData.description || ''
    } : initialFormData,
    errors: initialFormErrors,
    isSubmitting: false,
    isValid: false
  })

  const validateField = (name: keyof ProjectFormData, value: string): string | undefined => {
    switch (name) {
      case 'name':
        if (!value.trim()) {
          return 'Project name is required'
        }
        if (value.length > 100) {
          return 'Project name cannot exceed 100 characters'
        }
        return undefined
      case 'description':
        if (value.length > 500) {
          return 'Description cannot exceed 500 characters'
        }
        return undefined
      default:
        return undefined
    }
  }

  const validateForm = (data: ProjectFormData): ProjectFormErrors => {
    const errors: ProjectFormErrors = {}
    
    Object.keys(data).forEach(key => {
      const fieldName = key as keyof ProjectFormData
      const error = validateField(fieldName, data[fieldName])
      if (error) {
        errors[fieldName] = error
      }
    })

    return errors
  }

  const updateField = (name: keyof ProjectFormData, value: string) => {
    const newData = { ...formState.data, [name]: value }
    const fieldError = validateField(name, value)
    const newErrors = { ...formState.errors }
    
    if (fieldError) {
      newErrors[name] = fieldError
    } else {
      delete newErrors[name]
    }
    
    const allErrors = validateForm(newData)
    const isValid = Object.keys(allErrors).length === 0 && newData.name.trim().length > 0

    setFormState({
      ...formState,
      data: newData,
      errors: newErrors,
      isValid
    })
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    const errors = validateForm(formState.data)
    if (Object.keys(errors).length > 0) {
      setFormState({
        ...formState,
        errors
      })
      return
    }

    setFormState({
      ...formState,
      isSubmitting: true,
      errors: { ...formState.errors, submit: undefined }
    })

    try {
      await onSubmit(formState.data)
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'An unexpected error occurred'
      setFormState({
        ...formState,
        isSubmitting: false,
        errors: { ...formState.errors, submit: errorMessage }
      })
    }
  }

  useEffect(() => {
    const errors: ProjectFormErrors = {}
    
    Object.keys(formState.data).forEach(key => {
      const fieldName = key as keyof ProjectFormData
      const error = validateField(fieldName, formState.data[fieldName])
      if (error) {
        errors[fieldName] = error
      }
    })

    const isValid = Object.keys(errors).length === 0 && formState.data.name.trim().length > 0
    
    if (formState.isValid !== isValid) {
      setFormState(prev => ({ ...prev, isValid }))
    }
  }, [formState.data, formState.isValid])

  return (
    <form onSubmit={handleSubmit} className="max-w-lg mx-auto space-y-4">
      <FormErrors error={formState.errors.submit} />
      
      <FormField
        id="name"
        name="name"
        type="input"
        label="Project Name"
        value={formState.data.name}
        onChange={(value) => updateField('name', value)}
        error={formState.errors.name}
        required
        maxLength={100}
        placeholder="Enter project name"
      />

      <FormField
        id="description"
        name="description"
        type="textarea"
        label="Description"
        value={formState.data.description}
        onChange={(value) => updateField('description', value)}
        error={formState.errors.description}
        maxLength={500}
        placeholder="Enter project description (optional)"
        rows={4}
      />

      <div className="flex gap-3 pt-4">
        <LoadingButton
          type="submit"
          isLoading={formState.isSubmitting}
          disabled={!formState.isValid || formState.isSubmitting}
          variant="primary"
        >
          {formState.isSubmitting ? 'Saving...' : submitLabel}
        </LoadingButton>
        
        {isEditing && (
          <LoadingButton
            type="button"
            onClick={() => window.history.back()}
            variant="secondary"
            disabled={formState.isSubmitting}
          >
            Cancel
          </LoadingButton>
        )}
      </div>
    </form>
  )
}