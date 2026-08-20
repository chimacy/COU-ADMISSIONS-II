/**
 * Given a list of programmes ({ id, name, grade, price, doublePrice }) and a
 * budget amount, returns the programmes affordable under Normal Working,
 * sorted with the closest-to-budget (most "premium" affordable) option
 * first - so someone with, say, ₦900,000 sees the best-grade programme
 * their money can reach at the top, not just an alphabetical list.
 */
export function filterProgrammesByBudget(programmes, budget) {
  const amount = Number(budget)
  if (!amount || amount <= 0) return []
  return (programmes || [])
    .filter((p) => Number(p.price) <= amount)
    .sort((a, b) => Number(b.price) - Number(a.price))
}
