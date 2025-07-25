import { vi, describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import '@testing-library/jest-dom'
import UploadValidation from '../UploadValidation'

describe('UploadValidation', () => {
  describe('規則表示', () => {
    it('デフォルトで規則を表示する', () => {
      render(<UploadValidation />)
      
      expect(screen.getByText('アップロード可能なファイル')).toBeInTheDocument()
      expect(screen.getByText(/ファイル形式: JPEG, PNG, WebP/)).toBeInTheDocument()
      expect(screen.getByText(/最大ファイルサイズ: 10MB/)).toBeInTheDocument()
    })

    it('showRules=falseで規則を非表示にする', () => {
      render(<UploadValidation showRules={false} />)
      
      expect(screen.queryByText('アップロード可能なファイル')).not.toBeInTheDocument()
    })

    it('compactモードで簡潔な表示にする', () => {
      render(<UploadValidation compact />)
      
      expect(screen.getByText('JPEG, PNG, WebP • 最大 10MB')).toBeInTheDocument()
      expect(screen.queryByText('アップロード可能なファイル')).not.toBeInTheDocument()
    })
  })

  describe('ファイルバリデーション', () => {
    it('有効なファイルで成功メッセージを表示する', () => {
      const validFile = new File(['content'], 'test.jpg', { type: 'image/jpeg' })
      
      render(<UploadValidation files={[validFile]} />)
      
      expect(screen.getByText('すべてのファイルが有効です')).toBeInTheDocument()
      expect(screen.queryByRole('alert')).not.toBeInTheDocument()
    })

    it('無効なファイル形式でエラーを表示する', () => {
      const invalidFile = new File(['content'], 'test.gif', { type: 'image/gif' })
      
      render(<UploadValidation files={[invalidFile]} />)
      
      expect(screen.getByRole('alert')).toHaveTextContent('test.gif: サポートされていないファイル形式です')
      expect(screen.queryByText('すべてのファイルが有効です')).not.toBeInTheDocument()
    })

    it('大きすぎるファイルでエラーを表示する', () => {
      const largeContent = new Array(11 * 1024 * 1024).fill('a').join('')
      const largeFile = new File([largeContent], 'large.jpg', { type: 'image/jpeg' })
      
      render(<UploadValidation files={[largeFile]} />)
      
      expect(screen.getByRole('alert')).toHaveTextContent(/large.jpg: ファイルサイズが大きすぎます/)
      expect(screen.queryByText('すべてのファイルが有効です')).not.toBeInTheDocument()
    })

    it('複数のエラーを同時に表示する', () => {
      const invalidFile = new File(['content'], 'test.gif', { type: 'image/gif' })
      const largeContent = new Array(11 * 1024 * 1024).fill('a').join('')
      const largeFile = new File([largeContent], 'large.jpg', { type: 'image/jpeg' })
      
      render(<UploadValidation files={[invalidFile, largeFile]} />)
      
      const errors = screen.getAllByRole('alert')
      expect(errors).toHaveLength(2)
      expect(errors[0]).toHaveTextContent('test.gif: サポートされていないファイル形式です')
      expect(errors[1]).toHaveTextContent(/large.jpg: ファイルサイズが大きすぎます/)
    })
  })

  describe('バリデーション変更コールバック', () => {
    it('有効なファイルでコールバックを呼び出す', () => {
      const onValidationChange = vi.fn()
      const validFile = new File(['content'], 'test.jpg', { type: 'image/jpeg' })
      
      render(<UploadValidation files={[validFile]} onValidationChange={onValidationChange} />)
      
      expect(onValidationChange).toHaveBeenCalledWith(true, [])
    })

    it('無効なファイルでコールバックを呼び出す', () => {
      const onValidationChange = vi.fn()
      const invalidFile = new File(['content'], 'test.gif', { type: 'image/gif' })
      
      render(<UploadValidation files={[invalidFile]} onValidationChange={onValidationChange} />)
      
      expect(onValidationChange).toHaveBeenCalledWith(false, [
        {
          type: 'format',
          message: 'test.gif: サポートされていないファイル形式です',
          file: 'test.gif'
        }
      ])
    })
  })

  describe('compactモードのエラー表示', () => {
    it('compactモードでエラーを簡潔に表示する', () => {
      const invalidFile = new File(['content'], 'test.gif', { type: 'image/gif' })
      
      render(<UploadValidation files={[invalidFile]} compact />)
      
      expect(screen.getByRole('alert')).toHaveTextContent('test.gif: サポートされていないファイル形式です')
      expect(screen.queryByText('バリデーションエラー')).not.toBeInTheDocument()
    })
  })
})