import { Link } from 'react-router-dom'
import { usePageHeader } from '../../context/PageHeaderContext'
import StatusBadge from '../../components/ui/StatusBadge'
import * as accountsService from '../../services/accountsService'
import * as aiEscalationsService from '../../services/aiEscalationsService'
import { getAiEscalationStatusBadge } from '../../utils/badges'
import { systemAlerts, recentActivity } from '../../data/mockDashboard'

const ALERT_ICON_WRAP = 'w-9 h-9 rounded-lg flex items-center justify-center shrink-0'

export default function DashboardPage() {
  usePageHeader({ title: 'Tổng quan hệ thống', subtitle: 'Bức tranh toàn cảnh AgriSage: tài khoản, đại lý và hoạt động AI' })

  const accounts = accountsService.list()
  const aiEscalations = aiEscalationsService.list()

  const totalAccounts = accounts.length
  const activeAgents = accounts.filter((a) => a.role === 'Đại lý' && a.status === 'Đang hoạt động').length
  const totalFarmers = accounts.filter((a) => a.role === 'Nông dân').length
  const pendingAccounts = accounts.filter((a) => a.status === 'Chờ duyệt').length

  const pendingAiCases = aiEscalations.filter((c) => c.status === 'Chờ Admin xử lý')
  const lowConfidenceCases = pendingAiCases.filter((c) => c.confidencePercent < 70).length

  const roleBreakdown = [
    { label: 'Đại lý', count: accounts.filter((a) => a.role === 'Đại lý').length, className: 'bg-secondary-container' },
    { label: 'Nông dân', count: accounts.filter((a) => a.role === 'Nông dân').length, className: 'bg-primary/60' },
    { label: 'Quản trị viên', count: accounts.filter((a) => a.role === 'Quản trị viên').length, className: 'bg-tertiary-container' },
  ]
  const maxRoleCount = Math.max(...roleBreakdown.map((r) => r.count))

  return (
    <>
      {/* KPI SUMMARY CARDS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-space-md">
        <div className="p-space-base rounded-xl bg-surface-container-lowest border border-outline-variant shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="font-label-md text-label-md text-outline">Tổng tài khoản</span>
            <span className="p-1 rounded bg-primary/10 text-primary material-symbols-outlined text-[18px]">group</span>
          </div>
          <div className="mt-space-sm">
            <div className="font-metric-num text-metric-num text-on-surface font-semibold">{totalAccounts}</div>
            {pendingAccounts > 0 ? (
              <Link to="/accounts" className="font-body-sm text-body-sm text-amber-700 font-medium mt-1 flex items-center gap-1 hover:underline">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-600"></span>
                {pendingAccounts} tài khoản chờ duyệt
              </Link>
            ) : (
              <div className="font-body-sm text-body-sm text-outline mt-1">Không có tài khoản chờ duyệt</div>
            )}
          </div>
        </div>
        <div className="p-space-base rounded-xl bg-surface-container-lowest border border-outline-variant shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="font-label-md text-label-md text-outline">Đại lý hoạt động</span>
            <span className="p-1 rounded bg-emerald-50 text-emerald-700 material-symbols-outlined text-[18px]">storefront</span>
          </div>
          <div className="mt-space-sm">
            <div className="font-metric-num text-metric-num text-emerald-700 font-semibold">{activeAgents}</div>
            <div className="font-body-sm text-body-sm text-outline mt-1">Đang vận hành trên toàn hệ thống</div>
          </div>
        </div>
        <div className="p-space-base rounded-xl bg-surface-container-lowest border border-outline-variant shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="font-label-md text-label-md text-outline">Nông dân</span>
            <span className="p-1 rounded bg-blue-50 text-blue-700 material-symbols-outlined text-[18px]">agriculture</span>
          </div>
          <div className="mt-space-sm">
            <div className="font-metric-num text-metric-num text-on-surface font-semibold">{totalFarmers}</div>
            <div className="font-body-sm text-body-sm text-outline mt-1">Đang sử dụng ứng dụng AgriSage</div>
          </div>
        </div>
        <div className="p-space-base rounded-xl bg-surface-container-lowest border-2 border-amber-400/80 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="font-label-md text-label-md text-outline">Ca AI chờ xử lý</span>
            <span className="p-1 rounded bg-amber-50 text-amber-700 material-symbols-outlined text-[18px]">psychology</span>
          </div>
          <div className="mt-space-sm">
            <div className="font-metric-num text-metric-num text-on-surface font-semibold">{pendingAiCases.length}</div>
            <Link to="/ai-moderation" className="font-body-sm text-body-sm text-amber-700 font-medium mt-1 flex items-center gap-1 hover:underline">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-600"></span>
              {lowConfidenceCases} ca độ tin cậy thấp
            </Link>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-space-md">
        {/* ROLE BREAKDOWN */}
        <div className="lg:col-span-2 bg-surface-container-lowest rounded-xl border border-outline-variant shadow-sm p-space-md flex flex-col gap-space-md">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-[18px] text-primary">donut_large</span>
            <span className="font-title-md text-title-md text-on-surface font-semibold">Phân bổ tài khoản theo vai trò</span>
          </div>
          <div className="flex flex-col gap-space-sm">
            {roleBreakdown.map((row) => (
              <div key={row.label}>
                <div className="flex items-center justify-between text-xs mb-1">
                  <span className="font-medium text-on-surface">{row.label}</span>
                  <span className="text-outline tabular-nums">{row.count} tài khoản</span>
                </div>
                <div className="w-full bg-surface-container rounded-full h-2 overflow-hidden">
                  <div
                    className={`h-full rounded-full ${row.className}`}
                    style={{ width: `${maxRoleCount ? (row.count / maxRoleCount) * 100 : 0}%` }}
                  ></div>
                </div>
              </div>
            ))}
          </div>

          <div className="pt-2 border-t border-outline-variant/60">
            <div className="flex items-center gap-2 mb-space-sm">
              <span className="material-symbols-outlined text-[18px] text-primary">report</span>
              <span className="font-title-md text-title-md text-on-surface font-semibold">Cảnh báo hệ thống</span>
            </div>
            <div className="flex flex-col gap-2">
              {systemAlerts.map((alert, i) => (
                <div key={i} className="flex items-start gap-2.5 p-2.5 rounded-lg bg-surface-container-low border border-outline-variant/60">
                  <span className={`${ALERT_ICON_WRAP} ${alert.iconClassName}`}>
                    <span className="material-symbols-outlined text-[18px]">{alert.icon}</span>
                  </span>
                  <div className="min-w-0">
                    <div className="font-medium text-on-surface text-xs">{alert.title}</div>
                    <p className="text-[11px] text-on-surface-variant mt-0.5 leading-relaxed">{alert.note}</p>
                    <div className="text-[10px] text-outline mt-1">{alert.timeAgo}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* AI CASES NEEDING URGENT REVIEW */}
        <div className="lg:col-span-3 bg-surface-container-lowest rounded-xl border border-outline-variant shadow-sm flex flex-col overflow-hidden">
          <div className="px-space-md py-space-sm border-b border-outline-variant flex items-center justify-between bg-surface-container-low/40">
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-[18px] text-primary">priority_high</span>
              <span className="font-title-md text-title-md text-on-surface font-semibold">Ca AI cần Admin xử lý gấp</span>
            </div>
            <Link to="/ai-moderation" className="text-xs text-primary font-medium hover:underline flex items-center gap-0.5">
              Xem tất cả
              <span className="material-symbols-outlined text-[14px]">arrow_forward</span>
            </Link>
          </div>
          <div className="flex-1 overflow-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-surface-container-low/80 border-b border-outline-variant">
                  <th className="py-2 px-3 font-label-sm text-label-sm text-outline uppercase tracking-wider">Mã ca</th>
                  <th className="py-2 px-3 font-label-sm text-label-sm text-outline uppercase tracking-wider">Nông dân</th>
                  <th className="py-2 px-3 font-label-sm text-label-sm text-outline uppercase tracking-wider">Bệnh</th>
                  <th className="py-2 px-3 font-label-sm text-label-sm text-outline uppercase tracking-wider">Độ tin cậy</th>
                  <th className="py-2 px-3 font-label-sm text-label-sm text-outline uppercase tracking-wider">Trạng thái</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-outline-variant/60 text-body-sm font-body-sm">
                {pendingAiCases.slice(0, 5).map((c) => {
                  const badge = getAiEscalationStatusBadge(c.status)
                  return (
                    <tr key={c.id} className="hover:bg-surface-container-low">
                      <td className="py-2.5 px-3 font-mono text-xs text-outline font-semibold">#{c.id}</td>
                      <td className="py-2.5 px-3">
                        <div className="font-medium text-on-surface">{c.farmerName}</div>
                        <div className="text-[11px] text-outline">{c.escalatedAgo}</div>
                      </td>
                      <td className="py-2.5 px-3 text-on-surface-variant">{c.diseaseLabel}</td>
                      <td className="py-2.5 px-3">
                        <span className={`font-semibold text-[11px] ${c.confidencePercent < 70 ? 'text-orange-700' : 'text-emerald-700'}`}>
                          {c.confidencePercent}%
                        </span>
                      </td>
                      <td className="py-2.5 px-3">
                        <StatusBadge label={badge.label} className={badge.className} size="xs" />
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* RECENT ACTIVITY */}
      <div className="bg-surface-container-lowest rounded-xl border border-outline-variant shadow-sm overflow-hidden flex flex-col">
        <div className="px-space-md py-space-sm border-b border-outline-variant flex items-center gap-2 bg-surface-container-low/40">
          <span className="material-symbols-outlined text-[18px] text-primary">history</span>
          <span className="font-title-md text-title-md text-on-surface font-semibold">Hoạt động gần đây</span>
        </div>
        <div className="overflow-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-surface-container-low/80 border-b border-outline-variant">
                <th className="py-2 px-3 font-label-sm text-label-sm text-outline uppercase tracking-wider">Người thực hiện</th>
                <th className="py-2 px-3 font-label-sm text-label-sm text-outline uppercase tracking-wider">Hành động</th>
                <th className="py-2 px-3 font-label-sm text-label-sm text-outline uppercase tracking-wider">Đối tượng</th>
                <th className="py-2 px-3 font-label-sm text-label-sm text-outline uppercase tracking-wider">Thời gian</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-outline-variant/60 text-body-sm font-body-sm">
              {recentActivity.map((entry, i) => (
                <tr key={i} className="hover:bg-surface-container-low">
                  <td className="py-2.5 px-3">
                    <div className="flex items-center gap-2">
                      <div className={`w-7 h-7 rounded-full flex items-center justify-center font-bold text-[11px] shrink-0 ${entry.actorAvatarClassName}`}>
                        {entry.actorInitials}
                      </div>
                      <div>
                        <div className="font-medium text-on-surface text-xs">{entry.actorName}</div>
                        <div className="text-[10px] text-outline">{entry.actorRole}</div>
                      </div>
                    </div>
                  </td>
                  <td className={`py-2.5 px-3 font-medium ${entry.resultClassName}`}>{entry.action}</td>
                  <td className="py-2.5 px-3 text-on-surface-variant">{entry.target}</td>
                  <td className="py-2.5 px-3 text-outline text-[11px]">{entry.time}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </>
  )
}
