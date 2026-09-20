import { useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { usePageHeader } from '../../context/PageHeaderContext'
import { useToast } from '../../context/ToastContext'
import DetailModal from '../../components/ui/DetailModal'
import Pagination from '../../components/ui/Pagination'
import { useSelectableList } from '../../hooks/useSelectableList'
import { useFilteredList } from '../../hooks/useFilteredList'
import { usePagination } from '../../hooks/usePagination'
import * as aiEscalationsService from '../../services/aiEscalationsService'
import { downloadCsv } from '../../utils/csv'
import type { AiEscalationCase, AiEscalationReason } from '../../types'

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
  usePageHeader({ title: '', subtitle: '' }) // Clear default header

  const [cases, setCases] = useState<AiEscalationCase[]>(() => aiEscalationsService.list())
  const { showToast } = useToast()
  const decisionNoteRef = useRef<HTMLTextAreaElement>(null)

  const [reasonFilter, setReasonFilter] = useState('')
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('')

  const decideCase = (id: string, decision: 'approve' | 'reject' | 'survey') => {
    const note = decisionNoteRef.current?.value.trim()
    aiEscalationsService.decide(id, decision, note)
    setCases(aiEscalationsService.list())
    showToast(DECISION_MESSAGES[decision](id))
  }

  const { selectedId, setSelectedId, selected } = useSelectableList(cases, (c) => c.id)

  const {
    filtered: filteredCases,
  } = useFilteredList(
    cases,
    'Chờ Admin xử lý', // Default sort logic inside hook if configured, else just filters
    (item, keyword, status) =>
      (!keyword ||
        item.id.toLowerCase().includes(keyword) ||
        item.farmerName.toLowerCase().includes(keyword) ||
        item.agentName.toLowerCase().includes(keyword)) &&
      (!status || item.status === status) &&
      (!reasonFilter || item.reason === reasonFilter),
    '', // Default search empty
  )

  // Sync back search/status for standard behavior
  const currentFilteredCases = cases.filter(item => 
      (!search ||
        item.id.toLowerCase().includes(search.toLowerCase()) ||
        item.farmerName.toLowerCase().includes(search.toLowerCase()) ||
        item.agentName.toLowerCase().includes(search.toLowerCase())) &&
      (!statusFilter || item.status === statusFilter) &&
      (!reasonFilter || item.reason === reasonFilter)
  )

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
  } = usePagination(currentFilteredCases, 12)

  const pendingCount = cases.filter((c) => c.status === 'Chờ Admin xử lý').length
  const lowConfidenceCount = cases.filter((c) => c.status === 'Chờ Admin xử lý' && c.confidencePercent < 70).length
  const decidedTodayCount = cases.filter((c) => c.status === 'Đã phê duyệt' || c.status === 'Đã từ chối').length
  const totalCasesCount = cases.length

  const handleExport = () => {
    downloadCsv(
      `ho-tro-duyet-ai-${Date.now()}.csv`,
      currentFilteredCases.map((c) => ({
        'Mã ca': c.id,
        'Nông dân': c.farmerName,
        'Đại lý phụ trách': c.agentName,
        'Bệnh nhận diện': c.diseaseLabel,
        'Độ tin cậy': `${c.confidencePercent}%`,
        'Lý do leo thang': c.reason,
        'Trạng thái': c.status,
      })),
    )
    showToast(`Đã xuất báo cáo ${currentFilteredCases.length} ca leo thang`)
  }

  return (
    <div className="flex flex-col gap-6 max-w-[1400px] mx-auto pb-8 w-full px-2">
      {/* HEADER ROW */}
      <div className="flex items-start justify-between mt-2">
        <div className="flex flex-col gap-1.5">
          <h1 className="text-3xl font-semibold text-on-surface">Hỗ trợ duyệt AI</h1>
          <p className="text-on-surface-variant text-sm">Các ca chẩn đoán bệnh cần sự can thiệp từ Quản trị viên.</p>
        </div>
        <div className="flex items-center gap-3">
          <button 
            className="flex items-center gap-1.5 px-3 py-1.5 border border-outline-variant rounded bg-white hover:bg-surface-container-low text-on-surface font-medium text-sm shadow-sm"
            onClick={handleExport}
          >
            <span className="material-symbols-outlined text-[16px]">download</span> Xuất báo cáo
          </button>
        </div>
      </div>



      {/* KPI CARDS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mt-2">
        <div className="p-4 rounded-xl border-2 border-amber-400/80 bg-white flex flex-col justify-between h-32 shadow-sm">
          <span className="text-sm text-amber-700 font-medium">Cần Admin xử lý</span>
          <div>
            <div className="text-3xl font-medium text-on-surface">{pendingCount}</div>
            <div className="text-xs text-amber-700 mt-1">Đã leo thang từ đại lý</div>
          </div>
        </div>
        <div className="p-4 rounded-xl border border-outline-variant bg-white flex flex-col justify-between h-32 shadow-sm">
          <span className="text-sm text-orange-700 font-medium">Độ tin cậy thấp (&lt;70%)</span>
          <div>
            <div className="text-3xl font-medium text-on-surface">{lowConfidenceCount}</div>
            <div className="text-xs text-orange-700 mt-1">Cần xem xét kỹ trước khi duyệt</div>
          </div>
        </div>
        <div className="p-4 rounded-xl border border-outline-variant bg-white flex flex-col justify-between h-32 shadow-sm">
          <span className="text-sm text-on-surface-variant font-medium">Đã xử lý</span>
          <div>
            <div className="text-3xl font-medium text-emerald-700">{decidedTodayCount}</div>
            <div className="text-xs text-emerald-700/80 mt-1">Phê duyệt hoặc từ chối</div>
          </div>
        </div>
        <div className="p-4 rounded-xl border border-outline-variant bg-white flex flex-col justify-between h-32 shadow-sm">
          <span className="text-sm text-on-surface-variant font-medium">Tổng ca leo thang</span>
          <div>
            <div className="text-3xl font-medium text-on-surface">{totalCasesCount}</div>
            <div className="text-xs text-on-surface-variant mt-1">Toàn hệ thống</div>
          </div>
        </div>
      </div>

      {/* ALERT BANNER */}
      {pendingCount > 0 && (
        <div className="bg-[#fff9e6] border border-[#fce69a] rounded-lg p-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-amber-600 text-[18px]">warning</span>
            <span className="text-sm font-medium text-amber-900">Yêu cầu xử lý</span>
          </div>
          <div className="flex items-center gap-4 text-sm">
            <span className="text-amber-800">Hệ thống ghi nhận {pendingCount} ca chẩn đoán đang chờ Quản trị viên xử lý.</span>
          </div>
        </div>
      )}

      {/* TOOLBAR */}
      <div className="flex items-center justify-between mt-2">
        <div className="relative w-[320px]">
          <span className="material-symbols-outlined absolute left-2.5 top-1/2 -translate-y-1/2 text-[18px] text-outline">search</span>
          <input 
            type="text" 
            placeholder="Tìm mã ca / nông dân / đại lý..." 
            className="w-full h-9 pl-9 pr-3 text-sm bg-white border border-outline-variant rounded focus:border-primary focus:ring-1 focus:ring-primary text-on-surface shadow-sm"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 text-sm text-on-surface">
            <span className="text-on-surface-variant font-medium">Lý do:</span>
            <select className="bg-transparent font-medium outline-none cursor-pointer border-b border-dashed border-outline-variant pb-0.5" value={reasonFilter} onChange={e => setReasonFilter(e.target.value)}>
              <option value="">Tất cả</option>
              <option value="Độ tin cậy thấp">Độ tin cậy thấp</option>
              <option value="Đại lý từ chối">Đại lý từ chối</option>
              <option value="Nông dân khiếu nại">Nông dân khiếu nại</option>
              <option value="Đại lý yêu cầu hỗ trợ">Đại lý yêu cầu hỗ trợ</option>
            </select>
          </div>
          <div className="flex items-center gap-2 text-sm text-on-surface">
            <span className="text-on-surface-variant font-medium">Trạng thái:</span>
            <select className="bg-transparent font-medium outline-none cursor-pointer border-b border-dashed border-outline-variant pb-0.5" value={statusFilter} onChange={e => setStatusFilter(e.target.value)}>
              <option value="">Tất cả</option>
              <option value="Chờ Admin xử lý">Chờ Admin xử lý</option>
              <option value="Đã phê duyệt">Đã phê duyệt</option>
              <option value="Đã từ chối">Đã từ chối</option>
              <option value="Đã yêu cầu khảo sát lại">Đã yêu cầu khảo sát lại</option>
            </select>
          </div>
        </div>
      </div>

      {/* FLAT DATA TABLE */}
      <div className="border border-outline-variant/60 rounded-xl overflow-hidden bg-white shadow-sm mt-2 flex flex-col">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[1000px]">
            <thead>
              <tr className="bg-surface-container-lowest border-b border-outline-variant/60">
                <th className="py-3 px-4 font-semibold text-[13px] text-on-surface border-r border-outline-variant/40 w-[10%] uppercase tracking-wider">Mã ca</th>
                <th className="py-3 px-4 font-semibold text-[13px] text-on-surface border-r border-outline-variant/40 w-[20%] uppercase tracking-wider">Nông dân</th>
                <th className="py-3 px-4 font-semibold text-[13px] text-on-surface border-r border-outline-variant/40 w-[20%] uppercase tracking-wider">Đại lý phụ trách</th>
                <th className="py-3 px-4 font-semibold text-[13px] text-on-surface border-r border-outline-variant/40 w-[20%] uppercase tracking-wider">Nhận diện AI</th>
                <th className="py-3 px-4 font-semibold text-[13px] text-on-surface border-r border-outline-variant/40 text-center w-[15%] uppercase tracking-wider">Trạng thái</th>
                <th className="py-3 px-2 w-[15%] text-center uppercase tracking-wider font-semibold text-[13px] text-on-surface">Thao tác</th>
              </tr>
            </thead>
            <tbody className="text-sm divide-y divide-outline-variant/60">
              {currentFilteredCases.length === 0 && (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-on-surface-variant">Không tìm thấy dữ liệu.</td>
                </tr>
              )}
              {paginatedCases.map((item) => {
                const isSelected = item.id === selectedId
                const canDecide = aiEscalationsService.actionsFor(item.status).length > 0
                return (
                  <tr key={item.id} className={`transition-colors group hover:bg-surface-container-low ${isSelected ? 'bg-primary/5' : ''}`} onClick={() => setSelectedId(item.id)}>
                    <td className="py-3 px-4 border-r border-outline-variant/40">
                      <span className={`font-semibold font-mono text-xs ${isSelected ? 'text-primary' : 'text-outline'}`}>#{item.id}</span>
                    </td>
                    <td className="py-3 px-4 border-r border-outline-variant/40">
                      <div className="font-medium text-on-surface group-hover:text-primary transition-colors cursor-pointer">{item.farmerName}</div>
                      <div className="text-[11px] text-outline mt-0.5">{item.farmerLocation}</div>
                    </td>
                    <td className="py-3 px-4 border-r border-outline-variant/40">
                      <div className="font-medium text-on-surface">{item.agentName}</div>
                      <div className="text-[11px] text-outline mt-0.5">{item.agentHub}</div>
                    </td>
                    <td className="py-3 px-4 border-r border-outline-variant/40">
                      <div className="flex items-center gap-2 mb-1">
                        <div className="w-10 bg-surface-container rounded-full h-1.5 overflow-hidden">
                          <div className={`h-full rounded-full ${item.confidencePercent < 70 ? 'bg-orange-500' : 'bg-emerald-600'}`} style={{ width: `${item.confidencePercent}%` }}></div>
                        </div>
                        <span className={`font-bold text-[11px] ${item.confidencePercent < 70 ? 'text-orange-700' : 'text-emerald-700'}`}>{item.confidencePercent}%</span>
                      </div>
                      <div className="font-medium text-on-surface truncate">{item.diseaseLabel}</div>
                    </td>
                    <td className="py-3 px-4 border-r border-outline-variant/40 text-center">
                      <span className={`px-2.5 py-1 rounded-md border text-[11px] uppercase tracking-wider font-semibold bg-white shadow-sm whitespace-nowrap
                        ${item.status === 'Chờ Admin xử lý' ? 'border-amber-400 text-amber-700' : ''}
                        ${item.status === 'Đã phê duyệt' ? 'border-outline-variant/60 text-on-surface' : ''}
                        ${item.status === 'Đã từ chối' ? 'border-error/40 text-error' : ''}
                        ${item.status === 'Đã yêu cầu khảo sát lại' ? 'border-sky-400/60 text-sky-700' : ''}
                      `}>
                        {item.status === 'Chờ Admin xử lý' ? 'Pending' : item.status === 'Đã phê duyệt' ? 'Approved' : item.status === 'Đã từ chối' ? 'Rejected' : 'Survey'}
                      </span>
                    </td>
                    <td className="py-3 px-2 text-center">
                      {canDecide ? (
                        <div className="flex justify-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button
                            className="px-2 py-1.5 rounded border border-error/40 hover:bg-error/5 text-error text-[11px] font-semibold bg-white shadow-sm"
                            onClick={(e) => { e.stopPropagation(); decideCase(item.id, 'reject') }}
                          >
                            Từ chối
                          </button>
                          <button
                            className="px-2 py-1.5 rounded border border-primary/40 bg-primary/10 hover:bg-primary text-primary hover:text-white text-[11px] font-semibold shadow-sm transition-colors"
                            onClick={(e) => { e.stopPropagation(); decideCase(item.id, 'approve') }}
                          >
                            Duyệt
                          </button>
                        </div>
                      ) : (
                        <span className="text-[11px] text-outline font-medium">Đã xử lý</span>
                      )}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
        
        {/* FOOTER PAGINATION */}
        <div className="px-4 py-3 bg-white flex items-center justify-between text-sm text-on-surface-variant">
          <div>
            Hiển thị {startIndex + 1} đến {endIndex} của {totalCount} ca leo thang
          </div>
          <div className="flex items-center gap-6">
            <Pagination
              page={page}
              totalPages={totalPages}
              startIndex={startIndex}
              endIndex={endIndex}
              totalCount={totalCount}
              unitLabel=""
              goPrev={goPrev}
              goNext={goNext}
              setPage={setPage}
            />
          </div>
        </div>
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
              <span className={`px-2.5 py-1 rounded font-semibold text-[11px] border uppercase tracking-wider ${
                  selected.status === 'Chờ Admin xử lý' ? 'border-amber-400 text-amber-700 bg-amber-50' : 
                  selected.status === 'Đã phê duyệt' ? 'border-outline-variant/60 text-on-surface bg-surface-container-lowest' : 'border-error/40 text-error bg-error/5'
                }`}>{selected.status}</span>
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
                <div className="p-2.5 rounded bg-amber-50/90 border-l-4 border-amber-500 text-amber-900 text-xs flex items-start gap-2 mt-1">
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
                      className="w-full py-2.5 px-3 rounded-lg bg-[#171833] hover:bg-black text-white font-title-md text-title-md flex items-center justify-center gap-1.5 transition-colors shadow-sm"
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
    </div>
  )
}
