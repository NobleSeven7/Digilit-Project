// Pricing model from the proposal: PKR 200 base fee + PKR 60 per kg.
import { BASE_FEE, FEE_PER_KG, COURIER_FEE } from '../data/constants.js'

// Example: 5 kg -> 200 + (5 x 60) = PKR 500
export function calculatePrice(weightKg) {
  return BASE_FEE + weightKg * FEE_PER_KG
}

// Money saved compared with the PKR 1,000 courier baseline.
export function calculateSaving(weightKg) {
  return COURIER_FEE - calculatePrice(weightKg)
}

// Saving % = [(Courier Fee - Platform Fee) / Courier Fee] x 100
export function savingPercent(weightKg) {
  return Math.round((calculateSaving(weightKg) / COURIER_FEE) * 100)
}
