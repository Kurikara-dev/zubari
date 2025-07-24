import ProjectList from '@/components/projects/ProjectList'

export default function ProjectsPage() {
  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">プロジェクト一覧</h1>
        <p className="text-gray-600">あなたのプロジェクトを管理・確認できます</p>
      </div>
      
      <ProjectList />
    </div>
  )
}