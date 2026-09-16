import { useState } from 'react'
import { usePageHeader } from '../../context/PageHeaderContext'
import { useToast } from '../../context/ToastContext'
import RowActionsMenu from '../../components/ui/RowActionsMenu'
import EmptyTableRow from '../../components/ui/EmptyTableRow'
import DetailModal from '../../components/ui/DetailModal'
import FormModal from '../../components/ui/FormModal'
import Pagination from '../../components/ui/Pagination'
import SearchInput from '../../components/ui/SearchInput'
import FilterSelect from '../../components/ui/FilterSelect'
import StatusBadge from '../../components/ui/StatusBadge'
import { useSelectableList } from '../../hooks/useSelectableList'
import { useFilteredList } from '../../hooks/useFilteredList'
import { usePagination } from '../../hooks/usePagination'
import { useFormValues } from '../../hooks/useFormValues'
import * as accountsService from '../../services/accountsService'
import { getAccountStatusBadge } from '../../utils/badges'
import { downloadCsv } from '../../utils/csv'
import type { Account, AccountActionId, AccountRole, AccountStatus } from '../../types'

const ROLE_OPTIONS = [
  { value: '', label: 'Tất cả vai trò' },
  { value: 'Quản trị viên', label: 'Quản trị viên' },
  { value: 'Đại lý', label: 'Đại lý' },
  { value: 'Nông dân', label: 'Nông dân' },
]

const STATUS_OPTIONS = [
  { value: '', label: 'Tất cả trạng thái' },
  { value: 'Đang hoạt động', label: 'Đang hoạt động' },
  { value: 'Bị khóa', label: 'Bị khóa' },
  { value: 'Chờ duyệt', label: 'Chờ duyệt' },
]

const ROLE_TAG_CLASS: Record<AccountRole, string> = {
  'Quản trị viên': 'bg-primary/10 text-primary',
  'Đại lý': 'bg-secondary-container/40 text-on-secondary-container',
  'Nông dân': 'bg-surface-container-high text-on-surface-variant',
}

export default function AccountsPage() {
  usePageHeader({ title: 'Quản lý tài khoản', subtitle: 'Toàn bộ tài khoản Quản trị viên, Đại lý và Nông dân trong hệ thống' })

  const [accountList, setAccountList] = useState<Account[]>(() => accountsService.list())
  const { showToast } = useToast()
  const [createOpen, setCreateOpen] = useState(false)
  const createForm = useFormValues({ fullName: '', email: '', phone: '', role: 'Đại lý', region: '' })

  const [roleChangeTarget, setRoleChangeTarget] = useState<Account | null>(null)
  const roleChangeForm = useFormValues({ role: 'Đại lý' })

  const [roleFilter, setRoleFilter] = useState('')

  const {
    search,
    setSearch,
    statusFilter,
    setStatusFilter,
    filtered: filteredAccounts,
    clearFilters: handleClearFiltersBase,
  } = useFilteredList(
    accountList,
    '',
    (item, keyword, status) =>
      (!keyword ||
        item.id.toLowerCase().includes(keyword) ||
        item.fullName.toLowerCase().includes(keyword) ||
        item.email.toLowerCase().includes(keyword) ||
        item.phone.includes(keyword)) &&
      (!status || item.status === (status as AccountStatus)) &&
      (!roleFilter || item.role === (roleFilter as AccountRole)),
    '',
  )

  const handleClearFilters = () => {
    handleClearFiltersBase()
    setRoleFilter('')
  }

  const {
    page,
    totalPages,
    paginated: paginatedAccounts,
    startIndex,
    endIndex,
    totalCount,
    goPrev,
    goNext,
    setPage,
  } = usePagination(filteredAccounts, 10)

  const { selectedId, setSelectedId, selected } = useSelectableList(accountList, (a) => a.id)

  const totalAccounts = accountList.length
  const activeCount = accountList.filter((a) => a.status === 'Đang hoạt động').length
  const lockedCount = accountList.filter((a) => a.status === 'Bị khóa').length
  const pendingCount = accountList.filter((a) => a.status === 'Chờ duyệt').length

  const setAccountStatus = (id: string, status: AccountStatus, logNote: string, toastMessage: string) => {
    accountsService.setStatus(id, status, logNote)
    setAccountList(accountsService.list())
    showToast(toastMessage)
  }

  const openRoleChange = (account: Account) => {
    roleChangeForm.reset({ role: account.role })
    setRoleChangeTarget(account)
  }

  const handleAccountAction = (account: Account, actionId: AccountActionId) => {
    switch (actionId) {
      case 'view':
        setSelectedId(account.id)
        break
      case 'lock':
        setAccountStatus(account.id, 'Bị khóa', 'Khóa tài khoản', `Đã khóa tài khoản ${account.fullName}`)
        break
      case 'unlock':
        setAccountStatus(account.id, 'Đang hoạt động', 'Mở khóa tài khoản', `Đã mở khóa tài khoản ${account.fullName}`)
        break
      case 'approve':
        setAccountStatus(account.id, 'Đang hoạt động', 'Phê duyệt tài khoản', `Đã phê duyệt tài khoản ${account.fullName}`)
        break
      case 'reject':
        setAccountStatus(account.id, 'Bị khóa', 'Từ chối đăng ký', `Đã từ chối đăng ký của ${account.fullName}`)
        break
      case 'reset-password':
        accountsService.resetPassword(account.id)
        setAccountList(accountsService.list())
        showToast(`Đã gửi email đặt lại mật khẩu cho ${account.email}`)
        break
      case 'change-role':
        openRoleChange(account)
        break
    }
  }

  const handleChangeRole = () => {
    if (!roleChangeTarget) return
    const newRole = roleChangeForm.values.role as AccountRole
    if (newRole === roleChangeTarget.role) {
      showToast('Vai trò mới trùng với vai trò hiện tại')
      return
    }
    accountsService.setRole(roleChangeTarget.id, newRole)
    setAccountList(accountsService.list())
    showToast(`Đã đổi vai trò của ${roleChangeTarget.fullName} thành "${newRole}"`)
    setRoleChangeTarget(null)
  }

  const handleCreateAccount = () => {
    const { fullName, email, phone, role, region } = createForm.values
    if (!fullName || !email) {
      showToast('Vui lòng nhập đầy đủ họ tên và email')
      return
    }
    const created = accountsService.create({ fullName, email, phone, role: role as AccountRole, region })
    setAccountList(accountsService.list())
    showToast(`Đã tạo tài khoản mới #${created.id} cho ${fullName}`)
    setCreateOpen(false)
    createForm.reset({ fullName: '', email: '', phone: '', role: 'Đại lý', region: '' })
  }

  return (
    <>
      {/* UTILITY ACTIONS */}
      <div className="flex items-center justify-end gap-space-md">
        <div className="flex items-center gap-space-sm">
          <button
            className="flex items-center gap-2 px-3.5 py-2 rounded-lg bg-surface-container-lowest border border-outline-variant hover:bg-surface-container-low text-on-surface font-label-md text-label-md shadow-sm transition-colors"
            onClick={() => {
              downloadCsv(
                `danh-sach-tai-khoan-${Date.now()}.csv`,
                filteredAccounts.map((a) => ({
                  'Mã tài khoản': a.id,
                  'Họ tên': a.fullName,
                  Email: a.email,
                  'Số điện thoại': a.phone,
                  'Vai trò': a.role,
                  'Khu vực': a.region,
                  'Trạng thái': a.status,
                })),
              )
              showToast(`Đã xuất danh sách ${filteredAccounts.length} tài khoản`)
            }}
          >
            <span className="material-symbols-outlined text-[18px] text-outline">file_download</span>
            <span>Xuất danh sách</span>
          </button>
          <button
            className="flex items-center gap-2 px-3.5 py-2 rounded-lg bg-primary hover:bg-primary-container text-on-primary font-label-md text-label-md shadow-sm transition-colors"
            onClick={() => setCreateOpen(true)}
          >
            <span className="material-symbols-outlined text-[18px]">person_add</span>
            <span>Tạo tài khoản mới</span>
          </button>
        </div>
      </div>

      {/* KPI SUMMARY CARDS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-space-md">
        <div className="p-space-base rounded-xl bg-surface-container-lowest border border-outline-variant shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="font-label-md text-label-md text-outline">Tổng tài khoản</span>
            <span className="p-1 rounded bg-primary/10 text-primary material-symbols-outlined text-[18px]">group</span>
          </div>
          <div className="mt-space-sm">
            <div className="font-metric-num text-metric-num text-on-surface font-semibold">{totalAccounts}</div>
            <div className="font-body-sm text-body-sm text-outline mt-1">Quản trị viên, đại lý &amp; nông dân</div>
          </div>
        </div>
        <div className="p-space-base rounded-xl bg-surface-container-lowest border border-outline-variant shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="font-label-md text-label-md text-outline">Đang hoạt động</span>
            <span className="p-1 rounded bg-emerald-50 text-emerald-700 material-symbols-outlined text-[18px]">check_circle</span>
          </div>
          <div className="mt-space-sm">
            <div className="font-metric-num text-metric-num text-emerald-700 font-semibold">{activeCount}</div>
            <div className="font-body-sm text-body-sm text-emerald-700 mt-1">Có thể đăng nhập &amp; sử dụng</div>
          </div>
        </div>
        <div className="p-space-base rounded-xl bg-surface-container-lowest border-2 border-amber-400/80 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="font-label-md text-label-md text-outline">Chờ duyệt</span>
            <span className="p-1 rounded bg-amber-50 text-amber-700 material-symbols-outlined text-[18px]">hourglass_top</span>
          </div>
          <div className="mt-space-sm">
            <div className="font-metric-num text-metric-num text-on-surface font-semibold">{pendingCount}</div>
            <div className="font-body-sm text-body-sm text-amber-700 font-medium mt-1">Cần xác minh trước khi kích hoạt</div>
          </div>
        </div>
        <div className="p-space-base rounded-xl bg-surface-container-lowest border border-outline-variant shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="font-label-md text-label-md text-outline">Bị khóa</span>
            <span className="p-1 rounded bg-slate-100 text-slate-700 material-symbols-outlined text-[18px]">lock</span>
          </div>
          <div className="mt-space-sm">
            <div className="font-metric-num text-metric-num text-on-surface font-semibold">{lockedCount}</div>
            <div className="font-body-sm text-body-sm text-slate-600 mt-1">Vi phạm hoặc đang xác minh</div>
          </div>
        </div>
      </div>

      {/* FILTER BAR */}
      <div className="p-space-md rounded-xl bg-surface-container-lowest border border-outline-variant shadow-sm flex flex-wrap items-center justify-between gap-space-md">
        <div className="flex flex-wrap items-center gap-space-sm flex-1">
          <SearchInput
            value={search}
            onChange={setSearch}
            placeholder="Tìm mã / tên / email / SĐT..."
            className="relative min-w-[240px] flex-1 max-w-sm"
          />
          <FilterSelect value={roleFilter} onChange={setRoleFilter} options={ROLE_OPTIONS} />
          <FilterSelect value={statusFilter} onChange={setStatusFilter} options={STATUS_OPTIONS} />
        </div>
        <button
          className="px-3 py-1.5 rounded-lg text-outline hover:text-on-surface hover:bg-surface-container-low font-label-md text-label-md flex items-center gap-1 transition-colors"
          onClick={handleClearFilters}
        >
          <span className="material-symbols-outlined text-[16px]">restart_alt</span>
          <span>Xóa bộ lọc</span>
        </button>
      </div>

      {/* ACCOUNTS TABLE */}
      <div className="bg-surface-container-lowest rounded-xl border border-outline-variant shadow-sm overflow-hidden flex flex-col">
        <div className="px-space-md py-space-sm border-b border-outline-variant flex items-center justify-between bg-surface-container-low/40">
          <div className="flex items-center gap-2">
            <span className="font-title-md text-title-md text-on-surface font-semibold">Danh sách tài khoản</span>
            <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-primary/10 text-primary">{filteredAccounts.length} tài khoản</span>
          </div>
        </div>
        <div className="flex-1 overflow-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-surface-container-low/80 border-b border-outline-variant">
                <th className="py-2.5 px-3 font-label-sm text-label-sm text-outline uppercase tracking-wider">Mã</th>
                <th className="py-2.5 px-3 font-label-sm text-label-sm text-outline uppercase tracking-wider">Tài khoản</th>
                <th className="py-2.5 px-3 font-label-sm text-label-sm text-outline uppercase tracking-wider">Vai trò</th>
                <th className="py-2.5 px-3 font-label-sm text-label-sm text-outline uppercase tracking-wider">Khu vực</th>
                <th className="py-2.5 px-3 font-label-sm text-label-sm text-outline uppercase tracking-wider">Hoạt động gần nhất</th>
                <th className="py-2.5 px-3 font-label-sm text-label-sm text-outline uppercase tracking-wider">Trạng thái</th>
                <th className="py-2.5 px-3 font-label-sm text-label-sm text-outline uppercase tracking-wider text-right">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-outline-variant/60 font-body-sm text-body-sm">
              {filteredAccounts.length === 0 ? (
                <EmptyTableRow colSpan={7} message="Không tìm thấy tài khoản phù hợp với bộ lọc." />
              ) : null}
              {paginatedAccounts.map((item) => {
                const isSelected = item.id === selectedId
                const statusBadge = getAccountStatusBadge(item.status)
                return (
                  <tr
                    key={item.id}
                    onClick={() => setSelectedId(item.id)}
                    className={`transition-colors cursor-pointer ${
                      isSelected ? 'border-l-4 border-l-primary bg-primary/5 hover:bg-primary/10' : 'hover:bg-surface-container-low'
                    }`}
                  >
                    <td className={`py-3 px-3 font-semibold font-mono text-xs ${isSelected ? 'text-primary' : 'text-outline'}`}>#{item.id}</td>
                    <td className="py-3 px-3">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-full bg-primary-container text-on-primary flex items-center justify-center font-bold text-xs shrink-0">
                          {item.initials}
                        </div>
                        <div className="min-w-0">
                          <div className="font-medium text-on-surface truncate">{item.fullName}</div>
                          <div className="text-[11px] text-outline truncate">{item.email}</div>
                        </div>
                      </div>
                    </td>
                    <td className="py-3 px-3">
                      <span className={`px-2 py-0.5 rounded text-[11px] font-semibold ${ROLE_TAG_CLASS[item.role]}`}>{item.role}</span>
                    </td>
                    <td className="py-3 px-3 text-on-surface-variant">{item.region}</td>
                    <td className="py-3 px-3 text-on-surface-variant text-[12px]">{item.lastActiveAgo}</td>
                    <td className="py-3 px-3">
                      <StatusBadge label={statusBadge.label} className={statusBadge.className} minWidthClassName="min-w-[120px]" />
                    </td>
                    <td className="py-3 px-3 text-right">
                      <div className="flex items-center justify-end">
                        <RowActionsMenu
                          triggerLabel={`Thao tác tài khoản #${item.id}`}
                          actions={accountsService.actionsFor(item.status, item.role).map((action) => ({
                            ...action,
                            onClick: () => handleAccountAction(item, action.id),
                          }))}
                        />
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
        <Pagination
          page={page}
          totalPages={totalPages}
          startIndex={startIndex}
          endIndex={endIndex}
          totalCount={totalCount}
          unitLabel="tài khoản"
          goPrev={goPrev}
          goNext={goNext}
          setPage={setPage}
        />
      </div>

      {/* DETAIL MODAL */}
      <DetailModal open={selected !== null} onClose={() => setSelectedId(null)} widthClassName="max-w-lg">
        {selected ? (
          <div className="flex flex-col divide-y divide-outline-variant">
            <div className="p-space-md bg-surface-container-low/50 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-primary-container text-on-primary flex items-center justify-center font-bold text-sm shrink-0">
                  {selected.initials}
                </div>
                <div>
                  <div className="font-title-md text-title-md text-on-surface font-semibold">{selected.fullName}</div>
                  <div className="text-xs text-outline font-mono">#{selected.id}</div>
                </div>
              </div>
              <StatusBadge label={getAccountStatusBadge(selected.status).label} className={getAccountStatusBadge(selected.status).className} />
            </div>

            <div className="p-space-md flex flex-col gap-space-xs">
              <div className="flex items-center justify-between text-outline font-label-sm text-label-sm uppercase tracking-wide">
                <span>1. Thông tin liên hệ</span>
                <span className="material-symbols-outlined text-[16px]">contact_page</span>
              </div>
              <div className="grid grid-cols-2 gap-x-space-md gap-y-2 mt-1">
                <div>
                  <div className="text-[11px] text-outline">Email</div>
                  <div className="font-medium text-on-surface text-sm">{selected.email}</div>
                </div>
                <div>
                  <div className="text-[11px] text-outline">Số điện thoại</div>
                  <div className="font-medium text-on-surface text-sm font-mono">{selected.phone}</div>
                </div>
                <div className="col-span-2">
                  <div className="text-[11px] text-outline">Địa chỉ / Khu vực</div>
                  <div className="font-medium text-on-surface text-sm">{selected.addressDetail}</div>
                </div>
                <div>
                  <div className="text-[11px] text-outline">Ngày tạo</div>
                  <div className="font-medium text-on-surface text-sm">{selected.createdAt}</div>
                </div>
                <div>
                  <div className="text-[11px] text-outline">Xác minh danh tính</div>
                  <div className={`font-medium text-sm flex items-center gap-1 ${selected.verified ? 'text-emerald-700' : 'text-amber-700'}`}>
                    <span className="material-symbols-outlined text-[15px]">{selected.verified ? 'verified' : 'pending'}</span>
                    {selected.verified ? 'Đã xác minh' : 'Chưa xác minh'}
                  </div>
                </div>
              </div>
            </div>

            <div className="p-space-md flex flex-col gap-space-xs">
              <div className="flex items-center justify-between text-outline font-label-sm text-label-sm uppercase tracking-wide">
                <span>2. Vai trò &amp; ghi chú quản trị</span>
                <span className="material-symbols-outlined text-[16px]">admin_panel_settings</span>
              </div>
              <div className="flex items-center gap-2 mt-1">
                <span className={`px-2 py-0.5 rounded text-[11px] font-semibold ${ROLE_TAG_CLASS[selected.role]}`}>{selected.role}</span>
                <span className="text-xs text-outline">{selected.ordersOrCases}</span>
                <button
                  type="button"
                  className="ml-auto text-xs text-primary font-medium hover:underline flex items-center gap-0.5"
                  onClick={() => openRoleChange(selected)}
                >
                  <span className="material-symbols-outlined text-[14px]">edit</span>
                  Đổi vai trò
                </button>
              </div>
              <p className="text-xs text-on-surface-variant leading-relaxed bg-surface-container-low p-2 rounded mt-1">{selected.joinNote}</p>
            </div>

            <div className="p-space-md flex flex-col gap-2">
              <div className="flex items-center justify-between text-outline font-label-sm text-label-sm uppercase tracking-wide">
                <span>3. Lịch sử hoạt động gần đây</span>
                <span className="material-symbols-outlined text-[16px]">history</span>
              </div>
              <div className="flex flex-col gap-2 text-xs">
                {selected.activityLog.map((entry, i) => (
                  <div key={i} className="p-2 rounded bg-surface-container-low/60 border border-outline-variant/40 flex items-start gap-2">
                    <span className="w-2 h-2 rounded-full mt-1 shrink-0 bg-primary"></span>
                    <div className="flex-1">
                      <div className="text-on-surface font-medium">{entry.action}</div>
                      <div className="text-outline text-[11px]">
                        {entry.note} · {entry.time}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="p-space-md flex items-center gap-2 bg-surface-container-low/30">
              {selected.status === 'Bị khóa' ? (
                <button
                  className="flex-1 py-2.5 px-4 rounded-lg bg-primary hover:bg-primary-container text-on-primary font-title-md text-title-md flex items-center justify-center gap-1.5 transition-colors"
                  onClick={() => handleAccountAction(selected, 'unlock')}
                >
                  <span className="material-symbols-outlined text-[18px]">lock_open</span>
                  Mở khóa tài khoản
                </button>
              ) : selected.status === 'Chờ duyệt' ? (
                <>
                  <button
                    className="flex-1 py-2.5 px-4 rounded-lg border border-error/40 hover:bg-error/5 text-error font-title-md text-title-md flex items-center justify-center gap-1.5 transition-colors"
                    onClick={() => handleAccountAction(selected, 'reject')}
                  >
                    <span className="material-symbols-outlined text-[18px]">cancel</span>
                    Từ chối
                  </button>
                  <button
                    className="flex-1 py-2.5 px-4 rounded-lg bg-primary hover:bg-primary-container text-on-primary font-title-md text-title-md flex items-center justify-center gap-1.5 transition-colors"
                    onClick={() => handleAccountAction(selected, 'approve')}
                  >
                    <span className="material-symbols-outlined text-[18px]">check_circle</span>
                    Phê duyệt
                  </button>
                </>
              ) : (
                <button
                  className="flex-1 py-2.5 px-4 rounded-lg border border-error/40 hover:bg-error/5 text-error font-title-md text-title-md flex items-center justify-center gap-1.5 transition-colors"
                  onClick={() => handleAccountAction(selected, 'lock')}
                >
                  <span className="material-symbols-outlined text-[18px]">lock</span>
                  Khóa tài khoản
                </button>
              )}
            </div>
          </div>
        ) : null}
      </DetailModal>

      {/* CREATE ACCOUNT MODAL */}
      <FormModal
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        title="Tạo tài khoản mới"
        values={createForm.values}
        onChange={createForm.update}
        onSubmit={handleCreateAccount}
        submitLabel="Tạo tài khoản"
        fields={[
          { key: 'fullName', label: 'Họ và tên', placeholder: 'Nguyễn Văn A', group: 'name' },
          { key: 'phone', label: 'Số điện thoại', placeholder: '09xx xxx xxx', group: 'name' },
          { key: 'email', label: 'Email', placeholder: 'ten@agrisage.vn', group: 'contact' },
          { key: 'role', label: 'Vai trò', type: 'select', options: ['Đại lý', 'Nông dân', 'Quản trị viên'], group: 'contact' },
          { key: 'region', label: 'Khu vực / Địa chỉ', placeholder: 'VD: Cần Thơ' },
        ]}
      />

      {/* CHANGE ROLE MODAL */}
      <FormModal
        open={roleChangeTarget !== null}
        onClose={() => setRoleChangeTarget(null)}
        title={roleChangeTarget ? `Đổi vai trò — ${roleChangeTarget.fullName}` : 'Đổi vai trò'}
        values={roleChangeForm.values}
        onChange={roleChangeForm.update}
        onSubmit={handleChangeRole}
        submitLabel="Xác nhận đổi vai trò"
        fields={[
          {
            key: 'role',
            label: 'Vai trò mới',
            type: 'select',
            options: ['Quản trị viên', 'Đại lý', 'Nông dân'],
          },
        ]}
      />
    </>
  )
}
