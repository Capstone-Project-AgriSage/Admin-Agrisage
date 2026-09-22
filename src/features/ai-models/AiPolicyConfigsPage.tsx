import { usePageHeader } from '../../context/PageHeaderContext'

export default function AiPolicyConfigsPage() {
  usePageHeader({ title: 'AI Policy Configs', subtitle: 'Quản lý cấu hình Policy bật/tắt Model' })

  return (
    <div className="flex flex-col gap-6 max-w-[1400px] mx-auto pb-8 w-full px-2">
      <div className="p-12 text-center text-on-surface-variant border-2 border-dashed border-outline-variant rounded-xl bg-surface-container-lowest">
        <span className="material-symbols-outlined text-[48px] text-outline mb-4">settings_suggest</span>
        <h2 className="text-xl font-medium text-on-surface mb-2">Chưa có dữ liệu</h2>
        <p>Tính năng Cấu hình AI Policy đang được xây dựng.</p>
      </div>
    </div>
  )
}
