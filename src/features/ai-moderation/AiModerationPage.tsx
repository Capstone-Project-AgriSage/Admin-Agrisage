import { useRef, useState } from 'react'
import { usePageHeader } from '../../context/PageHeaderContext'
import { useToast } from '../../context/ToastContext'
import EmptyTableRow from '../../components/ui/EmptyTableRow'
import DetailModal from '../../components/ui/DetailModal'
import Pagination from '../../components/ui/Pagination'
import SearchInput from '../../components/ui/SearchInput'
import FilterSelect from '../../components/ui/FilterSelect'
import StatusBadge from '../../components/ui/StatusBadge'
import { useSelectableList } from '../../hooks/useSelectableList'
import { useFilteredList } from '../../hooks/useFilteredList'
import { usePagination } from '../../hooks/usePagination'
import * as aiEscalationsService from '../../services/aiEscalationsService'
import { getAiEscalationStatusBadge } from '../../utils/badges'
import { downloadCsv } from '../../utils/csv'
import type { AiEscalationCase, AiEscalationReason } from '../../types'

const REASON_OPTIONS = [
  { value: '', label: 'Tất cả lý do leo thang' },
  { value: 'Độ tin cậy thấp', label: 'Độ tin cậy thấp' },
  { value: 'Đại lý từ chối', label: 'Đại lý từ chối' },
  { value: 'Nông dân khiếu nại', label: 'Nông dân khiếu nại' },
  { value: 'Đại lý yêu cầu hỗ trợ', label: 'Đại lý yêu cầu hỗ trợ' },
]

const STATUS_OPTIONS = [
  { value: '', label: 'Tất cả trạng thái' },
  { value: 'Chờ Admin xử lý', label: 'Chờ Admin xử lý' },
  { value: 'Đã phê duyệt', label: 'Đã phê duyệt' },
  { value: 'Đã từ chối', label: 'Đã từ chối' },
  { value: 'Đã yêu cầu khảo sát lại', label: 'Đã yêu cầu khảo sát lại' },
]

const REASON_TAG_CLASS: Record<AiEscalationReason, string> = {
  'Độ tin cậy thấp': 'bg-orange-50 text-orange-700 border-orange-200',
  'Đại lý từ chối': 'bg-rose-50 text-rose-700 border-rose-200',
  'Nông dân khiếu nại': 'bg-purple-50 text-purple-700 border-purple-200',
  'Đại lý yêu cầu hỗ trợ': 'bg-sky-50 text-sky-700 border-sky-200',
}

const DECISION_MESSAGES: Record<'approve' | 'reject' | 'survey', (id: string) => string> = {
  approve: (id) => `Đã phê duyệt ca #${id} — gợi ý đã được gửi đến nông dân`,
  reject: (id) => `Đã từ chối ca #${id}`,
  survey: (id) => `Đã yêu cầu đại lý khảo sát thực địa lại cho ca #${id}`,
}

export default function AiModerationPage() {
  usePageHeader({ title: 'Hỗ trợ duyệt AI', subtitle: 'Các ca chẩn đoán AI được đại lý leo thang lên Admin xử lý' })

  const [cases, setCases] = useState<AiEscalationCase[]>(() => aiEscalationsService.list())
  const { showToast } = useToast()
  const decisionNoteRef = useRef<HTMLTextAreaElement>(null)

  const [reasonFilter, setReasonFilter] = useState('')

  const decideCase = (id: string, decision: 'approve' | 'reject' | 'survey') => {
    const note = decisionNoteRef.current?.value.trim()
    aiEscalationsService.decide(id, decision, note)
    setCases(aiEscalationsService.list())
    showToast(DECISION_MESSAGES[decision](id))
  }

  const { selectedId, setSelectedId, selected } = useSelectableList(cases, (c) => c.id)

  const {
    search,
    setSearch,
    statusFilter,
    setStatusFilter,
    filtered: filteredCases,
    clearFilters: handleClearFiltersBase,
  } = useFilteredList(
    cases,
    'Chờ Admin xử lý',
    (item, keyword, status) =>
      (!keyword ||
        item.id.toLowerCase().includes(keyword) ||
        item.farmerName.toLowerCase().includes(keyword) ||
        item.agentName.toLowerCase().includes(keyword)) &&
      (!status || item.status === status) &&
      (!reasonFilter || item.reason === reasonFilter),
    '',
  )

  const handleClearFilters = () => {
    handleClearFiltersBase()
    setReasonFilter('')
  }

  const {
    page,
    totalPages,
    paginated: paginatedCases,
    startIndex,
    endIndex,
    totalCount,
    goPrev,
    goNext,
    setPage,
  } = usePagination(filteredCases, 10)

  const pendingCount = cases.filter((c) => c.status === 'Chờ Admin xử lý').length
  const lowConfidenceCount = cases.filter((c) => c.status === 'Chờ Admin xử lý' && c.confidencePercent < 70).length
  const decidedTodayCount = cases.filter((c) => c.status === 'Đã phê duyệt' || c.status === 'Đã từ chối').length
  const totalCasesCount = cases.length

  return (
    <>
      <div className="flex items-center justify-end gap-space-md">
        <button
          className="flex items-center gap-2 px-3.5 py-2 rounded-lg bg-surface-container-lowest border border-outline-variant hover:bg-surface-container-low text-on-surface font-label-md text-label-md shadow-sm transition-colors"
          onClick={() => {
            downloadCsv(
              `ho-tro-duyet-ai-${Date.now()}.csv`,
              filteredCases.map((c) => ({
                'Mã ca': c.id,
                'Nông dân': c.farmerName,
                'Đại lý phụ trách': c.agentName,
                'Bệnh nhận diện': c.diseaseLabel,
                'Độ tin cậy': `${c.confidencePercent}%`,
                'Lý do leo thang': c.reason,
                'Trạng thái': c.status,
              })),
            )
            showToast(`Đã xuất báo cáo ${filteredCases.length} ca leo thang`)
          }}
        >
          <span className="material-symbols-outlined text-[18px] text-outline">file_download</span>
          <span>Xuất báo cáo</span>
        </button>
      </div>

      {/* KPI SUMMARY CARDS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-space-md">
        <div className="p-space-base rounded-xl bg-surface-container-lowest border-2 border-amber-400/80 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="font-label-md text-label-md text-outline">Cần Admin xử lý</span>
            <span className="p-1 rounded bg-amber-50 text-amber-700 material-symbols-outlined text-[18px]">hourglass_top</span>
          </div>
          <div className="mt-space-sm">
            <div className="font-metric-num text-metric-num text-on-surface font-semibold">{pendingCount}</div>
            <div className="font-body-sm text-body-sm text-amber-700 font-medium mt-1">Đã leo thang từ đại lý</div>
          </div>
        </div>
        <div className="p-space-base rounded-xl bg-surface-container-lowest border border-outline-variant shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="font-label-md text-label-md text-outline">Độ tin cậy thấp (&lt;70%)</span>
            <span className="p-1 rounded bg-orange-50 text-orange-700 material-symbols-outlined text-[18px]">warning</span>
          </div>
          <div className="mt-space-sm">
            <div className="font-metric-num text-metric-num text-orange-700 font-semibold">{lowConfidenceCount}</div>
            <div className="font-body-sm text-body-sm text-orange-700 mt-1">Cần xem xét kỹ trước khi duyệt</div>
          </div>
        </div>
        <div className="p-space-base rounded-xl bg-surface-container-lowest border border-outline-variant shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="font-label-md text-label-md text-outline">Đã xử lý</span>
            <span className="p-1 rounded bg-emerald-50 text-emerald-700 material-symbols-outlined text-[18px]">check_circle</span>
          </div>
          <div className="mt-space-sm">
            <div className="font-metric-num text-metric-num text-primary font-semibold">{decidedTodayCount}</div>
            <div className="font-body-sm text-body-sm text-emerald-700 font-medium mt-1">Phê duyệt hoặc từ chối</div>
          </div>
        </div>
        <div className="p-space-base rounded-xl bg-surface-container-lowest border border-outline-variant shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="font-label-md text-label-md text-outline">Tổng ca leo thang</span>
            <span className="p-1 rounded bg-blue-50 text-blue-700 material-symbols-outlined text-[18px]">analytics</span>
          </div>
          <div className="mt-space-sm">
            <div className="font-metric-num text-metric-num text-on-surface font-semibold">{totalCasesCount}</div>
            <div className="font-body-sm text-body-sm text-outline mt-1">Toàn hệ thống</div>
          </div>
        </div>
      </div>

      {/* FILTER BAR */}
      <div className="p-space-md rounded-xl bg-surface-container-lowest border border-outline-variant shadow-sm flex flex-wrap items-center justify-between gap-space-md">
        <div className="flex flex-wrap items-center gap-space-sm flex-1">
          <SearchInput
            value={search}
            onChange={setSearch}
            placeholder="Tìm mã ca / tên nông dân / đại lý..."
            className="relative min-w-[240px] flex-1 max-w-sm"
          />
          <FilterSelect value={reasonFilter} onChange={setReasonFilter} options={REASON_OPTIONS} />
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

      {/* MAIN TABLE */}
      <div className="bg-surface-container-lowest rounded-xl border border-outline-variant shadow-sm overflow-hidden flex flex-col">
        <div className="px-space-md py-space-sm border-b border-outline-variant flex items-center justify-between bg-surface-container-low/40">
          <div className="flex items-center gap-2">
            <span className="font-title-md text-title-md text-on-surface font-semibold">Danh sách ca leo thang</span>
            <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-primary/10 text-primary">{filteredCases.length} kết quả</span>
          </div>
        </div>
        <div className="flex-1 overflow-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-surface-container-low/80 border-b border-outline-variant">
                <th className="py-2.5 px-3 font-label-sm text-label-sm text-outline uppercase tracking-wider">Mã ca</th>
                <th className="py-2.5 px-3 font-label-sm text-label-sm text-outline uppercase tracking-wider">Nông dân</th>
                <th className="py-2.5 px-3 font-label-sm text-label-sm text-outline uppercase tracking-wider">Đại lý phụ trách</th>
                <th className="py-2.5 px-3 font-label-sm text-label-sm text-outline uppercase tracking-wider">Bệnh nhận diện</th>
                <th className="py-2.5 px-3 font-label-sm text-label-sm text-outline uppercase tracking-wider">Độ tin cậy</th>
                <th className="py-2.5 px-3 font-label-sm text-label-sm text-outline uppercase tracking-wider">Lý do leo thang</th>
                <th className="py-2.5 px-3 font-label-sm text-label-sm text-outline uppercase tracking-wider">Trạng thái</th>
                <th className="py-2.5 px-3 font-label-sm text-label-sm text-outline uppercase tracking-wider text-right">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-outline-variant/60 font-body-sm text-body-sm">
              {filteredCases.length === 0 ? (
                <EmptyTableRow colSpan={8} message="Không tìm thấy ca phù hợp với bộ lọc." />
              ) : null}
              {paginatedCases.map((item) => {
                const isSelected = item.id === selectedId
                const statusBadge = getAiEscalationStatusBadge(item.status)
                const canDecide = aiEscalationsService.actionsFor(item.status).length > 0
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
                      <div className="font-medium text-on-surface">{item.farmerName}</div>
                      <div className="text-[11px] text-outline">{item.farmerLocation}</div>
                    </td>
                    <td className="py-3 px-3">
                      <div className="font-medium text-on-surface">{item.agentName}</div>
                      <div className="text-[11px] text-outline">{item.agentHub}</div>
                    </td>
                    <td className="py-3 px-3">
                      <span className="font-medium text-on-surface">{item.diseaseLabel}</span>
                      {item.diseaseLatin ? <div className="text-[11px] text-outline italic">{item.diseaseLatin}</div> : null}
                    </td>
                    <td className="py-3 px-3">
                      <div className="flex items-center gap-1.5">
                        <div className="w-12 bg-surface-container rounded-full h-1.5 overflow-hidden">
                          <div
                            className={`h-full rounded-full ${item.confidencePercent < 70 ? 'bg-orange-500' : 'bg-emerald-600'}`}
                            style={{ width: `${item.confidencePercent}%` }}
                          ></div>
                        </div>
                        <span className={`font-semibold text-[11px] ${item.confidencePercent < 70 ? 'text-orange-700' : 'text-emerald-700'}`}>
                          {item.confidencePercent}%
                        </span>
                      </div>
                    </td>
                    <td className="py-3 px-3">
                      <span className={`px-2 py-0.5 rounded text-[11px] font-medium border ${REASON_TAG_CLASS[item.reason]}`}>{item.reason}</span>
                    </td>
                    <td className="py-3 px-3">
                      <StatusBadge label={statusBadge.label} className={statusBadge.className} minWidthClassName="min-w-[158px]" />
                    </td>
                    <td className="py-3 px-3 text-right">
                      {canDecide ? (
                        <div className="flex items-center justify-end gap-1">
                          <button
                            className="px-2 py-1 rounded bg-error-container/60 hover:bg-error-container text-on-error-container text-[11px] font-medium"
                            onClick={(e) => {
                              e.stopPropagation()
                              decideCase(item.id, 'reject')
                            }}
                          >
                            Từ chối
                          </button>
                          <button
                            className="px-2 py-1 rounded bg-primary hover:bg-primary-container text-on-primary text-[11px] font-medium"
                            onClick={(e) => {
                              e.stopPropagation()
                              decideCase(item.id, 'approve')
                            }}
                          >
                            Phê duyệt
                          </button>
                        </div>
                      ) : (
                        <span className="text-[11px] text-outline">Đã xử lý</span>
                      )}
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
          unitLabel="ca leo thang"
          goPrev={goPrev}
          goNext={goNext}
          setPage={setPage}
        />
      </div>

      {/* DETAIL MODAL */}
      <DetailModal open={selected !== null} onClose={() => setSelectedId(null)} widthClassName="max-w-xl">
        {selected ? (
          <div className="flex flex-col divide-y divide-outline-variant">
            <div className="p-space-md bg-surface-container-low/50 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="px-2 py-0.5 rounded font-mono font-bold text-xs bg-primary/10 text-primary">#{selected.id}</span>
                <span className="font-title-md text-title-md text-on-surface font-semibold">Chi tiết ca leo thang</span>
              </div>
              <StatusBadge
                label={getAiEscalationStatusBadge(selected.status).label}
                className={getAiEscalationStatusBadge(selected.status).className}
              />
            </div>

            <div className="p-space-md flex flex-col gap-space-xs">
              <div className="flex items-center justify-between text-outline font-label-sm text-label-sm uppercase tracking-wide">
                <span>1. Thông tin nông dân &amp; đại lý</span>
                <span className="material-symbols-outlined text-[16px]">person</span>
              </div>
              <div className="grid grid-cols-2 gap-x-space-md gap-y-2 mt-1">
                <div>
                  <div className="text-[11px] text-outline">Nông dân</div>
                  <div className="font-medium text-on-surface text-sm">{selected.farmerName}</div>
                  <div className="text-xs text-primary font-mono">{selected.farmerPhone}</div>
                </div>
                <div>
                  <div className="text-[11px] text-outline">Vị trí</div>
                  <div className="font-medium text-on-surface text-sm">{selected.farmerLocation}</div>
                </div>
                <div>
                  <div className="text-[11px] text-outline">Đại lý phụ trách</div>
                  <div className="font-medium text-on-surface text-sm">{selected.agentName}</div>
                  <div className="text-xs text-outline">{selected.agentHub}</div>
                </div>
                <div>
                  <div className="text-[11px] text-outline">Thời gian leo thang</div>
                  <div className="font-medium text-on-surface text-sm">{selected.escalatedAgo}</div>
                </div>
              </div>
            </div>

            <div className="p-space-md flex flex-col gap-space-xs">
              <div className="flex items-center justify-between text-outline font-label-sm text-label-sm uppercase tracking-wide">
                <span>2. Kết quả nhận diện AI</span>
                <span className="material-symbols-outlined text-[16px]">psychology</span>
              </div>
              <div className="relative w-full h-40 rounded-lg overflow-hidden border border-outline-variant bg-slate-900 mt-1">
                <img className="w-full h-full object-cover opacity-90" data-alt={selected.imageAlt} src={selected.imageSrc} />
                <div className="absolute bottom-2 right-2 bg-black/70 text-white text-[10px] px-2 py-1 rounded flex items-center gap-1 backdrop-blur-sm">
                  <span className="material-symbols-outlined text-[12px]">crop_free</span>
                  <span>AI Vision Model v2.4 Rice Disease</span>
                </div>
              </div>
              <div className="mt-2 p-2.5 rounded-lg bg-surface-container-low border border-outline-variant/60 flex items-center justify-between">
                <div>
                  <div className="text-[11px] text-outline">Bệnh nhận diện</div>
                  <div className="font-semibold text-on-surface text-sm">
                    {selected.diseaseLabel}{' '}
                    {selected.diseaseLatin ? <span className="font-normal text-outline text-xs italic">({selected.diseaseLatin})</span> : null}
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-[11px] text-outline">Độ tin cậy</div>
                  <div className={`font-bold text-sm flex items-center justify-end gap-1 ${selected.confidencePercent < 70 ? 'text-orange-700' : 'text-emerald-700'}`}>
                    <span className="material-symbols-outlined text-[16px]">verified</span>
                    {selected.confidencePercent}%
                  </div>
                </div>
              </div>
              {selected.productSuggestion ? (
                <div className="text-xs text-on-surface-variant bg-surface-container-low p-2 rounded mt-1">
                  <span className="font-medium text-on-surface">Sản phẩm gợi ý:</span> {selected.productSuggestion}
                </div>
              ) : null}
            </div>

            <div className="p-space-md flex flex-col gap-space-xs">
              <div className="flex items-center justify-between text-outline font-label-sm text-label-sm uppercase tracking-wide">
                <span>3. Lý do leo thang</span>
                <span className="material-symbols-outlined text-[16px]">campaign</span>
              </div>
              <span className={`self-start px-2 py-0.5 rounded text-[11px] font-medium border ${REASON_TAG_CLASS[selected.reason]}`}>
                {selected.reason}
              </span>
              <p className="text-xs text-on-surface-variant leading-relaxed bg-surface-container-low p-2 rounded mt-1">{selected.reasonNote}</p>
              {selected.agentNote ? (
                <div className="p-2.5 rounded bg-amber-50/90 border-l-4 border-amber-500 text-amber-900 text-xs flex items-start gap-2">
                  <span className="material-symbols-outlined text-amber-600 text-[16px] mt-0.5 shrink-0">chat</span>
                  <div>
                    <span className="font-semibold">Ghi chú của đại lý:</span> {selected.agentNote}
                  </div>
                </div>
              ) : null}
            </div>

            <div className="p-space-md flex flex-col gap-space-sm bg-surface-container-low/30">
              <div className="flex items-center justify-between text-outline font-label-sm text-label-sm uppercase tracking-wide">
                <span>4. Quyết định của Admin</span>
                <span className="material-symbols-outlined text-[16px]">assignment_turned_in</span>
              </div>
              {aiEscalationsService.actionsFor(selected.status).length > 0 ? (
                <>
                  <textarea
                    key={selected.id}
                    ref={decisionNoteRef}
                    className="w-full p-2.5 bg-surface-container-lowest border border-outline-variant rounded-lg font-body-sm text-body-sm text-on-surface focus:ring-1 focus:ring-primary focus:border-primary placeholder:text-outline"
                    placeholder="Ghi chú quyết định (hiển thị trong lịch sử xử lý)..."
                    rows={2}
                  />
                  <div className="grid grid-cols-3 gap-space-sm pt-1">
                    <button
                      className="w-full py-2.5 px-3 rounded-lg bg-surface-container-lowest border border-sky-400/50 hover:bg-sky-50 text-sky-700 font-title-md text-title-md flex items-center justify-center gap-1.5 transition-colors"
                      onClick={() => decideCase(selected.id, 'survey')}
                    >
                      <span className="material-symbols-outlined text-[18px]">travel_explore</span>
                      Khảo sát lại
                    </button>
                    <button
                      className="w-full py-2.5 px-3 rounded-lg bg-surface-container-lowest border border-error/40 hover:bg-error/5 text-error font-title-md text-title-md flex items-center justify-center gap-1.5 transition-colors"
                      onClick={() => decideCase(selected.id, 'reject')}
                    >
                      <span className="material-symbols-outlined text-[18px]">close</span>
                      Từ chối
                    </button>
                    <button
                      className="w-full py-2.5 px-3 rounded-lg bg-primary-container hover:bg-primary text-white font-title-md text-title-md flex items-center justify-center gap-1.5 transition-colors shadow-sm"
                      onClick={() => decideCase(selected.id, 'approve')}
                    >
                      <span className="material-symbols-outlined text-[18px]">check</span>
                      Phê duyệt
                    </button>
                  </div>
                </>
              ) : (
                <p className="text-xs text-on-surface-variant bg-surface-container-low p-2.5 rounded">
                  <span className="font-medium text-on-surface">Kết luận:</span> {selected.adminDecisionNote}
                </p>
              )}
            </div>
          </div>
        ) : null}
      </DetailModal>
    </>
  )
}
