export const money = (value: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 }).format(value);
export const number = (value: number) => new Intl.NumberFormat('pt-BR').format(value);
export const shortMoney = (value: number) => Math.abs(value) >= 1_000_000 ? `R$ ${(value / 1_000_000).toFixed(2).replace('.', ',')} mi` : money(value);
export function dateLabel(day: number) {
  const months = ['JAN', 'FEV', 'MAR', 'ABR', 'MAI', 'JUN', 'JUL', 'AGO', 'SET', 'OUT', 'NOV', 'DEZ'];
  return `${String(day % 30 + 1).padStart(2, '0')} ${months[Math.floor(day / 30) % 12]} ${2026 + Math.floor(day / 360)}`;
}
