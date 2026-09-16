import type { PermissionModule, Role } from '../types'

export const permissionModules: PermissionModule[] = [
  {
    key: 'accounts',
    label: 'Quản lý tài khoản',
    icon: 'group',
    permissions: [
      { key: 'view', label: 'Xem' },
      { key: 'create', label: 'Tạo mới' },
      { key: 'edit', label: 'Sửa' },
      { key: 'lock', label: 'Khóa / Mở khóa' },
    ],
  },
  {
    key: 'roles',
    label: 'Phân quyền',
    icon: 'admin_panel_settings',
    permissions: [
      { key: 'view', label: 'Xem' },
      { key: 'edit', label: 'Chỉnh sửa quyền' },
    ],
  },
  {
    key: 'ai-moderation',
    label: 'Hỗ trợ duyệt AI',
    icon: 'psychology',
    permissions: [
      { key: 'view', label: 'Xem' },
      { key: 'approve', label: 'Phê duyệt / Từ chối' },
      { key: 'override', label: 'Ghi đè quyết định đại lý' },
    ],
  },
  {
    key: 'products',
    label: 'Sản phẩm & Kho hàng',
    icon: 'inventory_2',
    permissions: [
      { key: 'view', label: 'Xem' },
      { key: 'edit', label: 'Sửa' },
    ],
  },
  {
    key: 'orders',
    label: 'Đơn hàng & Thanh toán',
    icon: 'receipt_long',
    permissions: [
      { key: 'view', label: 'Xem' },
      { key: 'edit', label: 'Sửa' },
    ],
  },
  {
    key: 'reports',
    label: 'Báo cáo & Tổng quan hệ thống',
    icon: 'monitoring',
    permissions: [{ key: 'view', label: 'Xem' }],
  },
]

const allKeysFor = (moduleKeys: string[]) =>
  permissionModules
    .filter((m) => moduleKeys.includes(m.key))
    .flatMap((m) => m.permissions.map((p) => `${m.key}:${p.key}`))

export const roles: Role[] = [
  {
    id: 'admin',
    name: 'Quản trị viên',
    description: 'Toàn quyền quản trị hệ thống: tài khoản, phân quyền, duyệt AI và báo cáo.',
    colorClassName: 'bg-primary/10 text-primary border-primary/30',
    icon: 'shield_person',
    accountCount: 2,
    grantedKeys: allKeysFor(['accounts', 'roles', 'ai-moderation', 'products', 'orders', 'reports']),
    editable: false,
  },
  {
    id: 'agent',
    name: 'Đại lý',
    description: 'Quản lý sản phẩm, kho hàng, đơn hàng và duyệt gợi ý AI cho nông dân mình phụ trách.',
    colorClassName: 'bg-secondary-container/40 text-on-secondary-container border-secondary/30',
    icon: 'storefront',
    accountCount: 4,
    grantedKeys: [
      'products:view',
      'products:edit',
      'orders:view',
      'orders:edit',
      'ai-moderation:view',
      'ai-moderation:approve',
      'reports:view',
    ],
    editable: true,
  },
  {
    id: 'farmer',
    name: 'Nông dân',
    description: 'Sử dụng ứng dụng để đặt hàng, xem gợi ý AI và theo dõi công nợ cá nhân.',
    colorClassName: 'bg-surface-container-high text-on-surface-variant border-outline-variant',
    icon: 'agriculture',
    accountCount: 6,
    grantedKeys: ['orders:view'],
    editable: true,
  },
]
