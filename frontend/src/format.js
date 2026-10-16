export const CATEGORY_NAMES = {
  1: 'Satuan',
  2: 'Mentai',
  3: 'Bolognese',
  4: 'Saus Keju',
  5: 'Carbonara',
  6: 'Ekstra',
}

export const EXPENSE_CATEGORIES = ['Bahan Baku', 'Kemasan', 'Operasional', 'Lainnya']

export function formatRupiah(value) {
  const amount = Number(value) || 0
  return `Rp ${amount.toLocaleString('id-ID')}`
}

export function formatDateTime(value) {
  if (!value) return '-'
  const parsed = new Date(String(value).includes('T') ? value : String(value).replace(' ', 'T'))
  if (Number.isNaN(parsed.getTime())) return value
  return parsed.toLocaleString('id-ID', { dateStyle: 'medium', timeStyle: 'short' })
}

export function formatDate(value) {
  if (!value) return '-'
  const parsed = new Date(String(value).includes('T') ? value : String(value).replace(' ', 'T'))
  if (Number.isNaN(parsed.getTime())) return value
  return parsed.toLocaleDateString('id-ID', { day: '2-digit', month: 'short' })
}
