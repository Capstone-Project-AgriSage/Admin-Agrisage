import { usePageHeader } from '../../context/PageHeaderContext'

export default function AiModelsPage() {
  usePageHeader({ title: 'AI Models', subtitle: 'Quản lý AI Model và các version' })

  return (
    <div className="flex flex-col gap-6 max-w-[1400px] mx-auto pb-8 w-full px-2">
      <div className="p-12 text-center text-on-surface-variant border-2 border-dashed border-outline-variant rounded-xl bg-surface-container-lowest">
        <span className="material-symbols-outlined text-[48px] text-outline mb-4">model_training</span>
        <h2 className="text-xl font-medium text-on-surface mb-2">Chưa có dữ liệu</h2>
        <p>Tính năng Quản lý AI Model đang được xây dựng.</p>
      </div>
    </div>
  )
}
