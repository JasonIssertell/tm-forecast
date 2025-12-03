import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://mngsmmvgwakqvehuanmv.supabase.co'
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1uZ3NtbXZnd2FrcXZlaHVhbm12Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQ3MTM5MzEsImV4cCI6MjA4MDI4OTkzMX0.Nyvy_lka6Iz9q9I3JeW69xEpyGqRBQshPSF3_EHaiss'

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

// AMM Pricing Functions
export function calculatePrice(yesPool, noPool) {
  const total = yesPool + noPool
  return {
    yes: yesPool / total,
    no: noPool / total
  }
}

export function calculateCost(shares, side, yesPool, noPool) {
  // Using constant product AMM (simplified)
  // Cost = how much the pool needs to maintain balance
  const k = yesPool * noPool // invariant
  
  if (side === 'yes') {
    const newNoPool = noPool + shares
    const newYesPool = k / newNoPool
    return yesPool - newYesPool
  } else {
    const newYesPool = yesPool + shares
    const newNoPool = k / newYesPool
    return noPool - newNoPool
  }
}

export function calculateShares(amount, side, yesPool, noPool) {
  // How many shares can you buy for a given amount?
  const k = yesPool * noPool
  
  if (side === 'yes') {
    // Buying YES: we're adding to NO pool equivalent
    const newYesPool = yesPool - amount
    if (newYesPool <= 0) return 0
    const newNoPool = k / newYesPool
    return newNoPool - noPool
  } else {
    const newNoPool = noPool - amount
    if (newNoPool <= 0) return 0
    const newYesPool = k / newNoPool
    return newYesPool - yesPool
  }
}

// Simplified share calculation for UI
export function getSharesForAmount(amount, side, yesPool, noPool) {
  const price = side === 'yes' 
    ? yesPool / (yesPool + noPool)
    : noPool / (yesPool + noPool)
  
  // Approximate shares (actual AMM would be slightly different)
  return amount / price
}

export function formatCurrency(amount) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(amount)
}

export function formatPercent(decimal) {
  return `${(decimal * 100).toFixed(1)}%`
}
