export function formatUSD(amount: string | number): string {
  const numAmount =
    typeof amount === 'string' ? parseFloat(amount.replace(/[^0-9.-]/g, '')) : amount

  if (isNaN(numAmount)) {
    return '$0'
  }

  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 2,
    minimumFractionDigits: 0,
  }).format(numAmount)
}

export function formatNumberWithDecimalPlaces(num: number): string {
  if (!isFinite(num) || isNaN(num)) {
    return '0'
  }

  // Handle very small numbers close to zero
  if (Math.abs(num) < 0.000001) {
    return '0'
  }

  // Format with up to 4 decimals, trim trailing zeros & dot
  return num.toFixed(4).replace(/\.?0+$/, '')
}
