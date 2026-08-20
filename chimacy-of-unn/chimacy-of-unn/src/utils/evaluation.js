/**
 * Smart Evaluation Engine
 * ------------------------
 * Pure functions that take a programme (from admission_database.json) and a
 * JAMB score and return the eligibility status, benchmark analysis,
 * recommended working type and price - entirely data-driven off the JSON
 * database. Nothing here is hardcoded per-course.
 */

export const STATUS = {
  ELIGIBLE: 'Eligible',
  ELIGIBLE_DOUBLE: 'Eligible (Double Working)',
  NOT_ELIGIBLE: 'Not Eligible',
}

export const WORKING_TYPE = {
  SINGLE: 'Single Working',
  DOUBLE: 'Double Working',
}

/**
 * Evaluates a client's JAMB score against a chosen programme.
 * @param {object} programme - a programme object from the database
 * @param {number} jambScore
 * @param {string} [preferredWorkingType] - optional user override ('Single Working' | 'Double Working')
 */
export function evaluateCandidate(programme, jambScore, preferredWorkingType) {
  if (!programme) {
    return {
      status: STATUS.NOT_ELIGIBLE,
      workingType: null,
      price: 0,
      benchmarkStatus: 'No programme selected',
      recommendation: 'Please select a programme to evaluate.',
      grade: null,
    }
  }

  const score = Number(jambScore) || 0
  const preferredScore = Number(programme.preferredScore)
  const doubleScore = Number(programme.doubleWorkingScore)
  const minimumScore = Number(programme.minimumScore)

  // 1) Score meets (or exceeds) the preferred/normal benchmark -> straightforward eligibility.
  if (score >= preferredScore) {
    const workingType = WORKING_TYPE.SINGLE
    return {
      status: STATUS.ELIGIBLE,
      workingType,
      price: programme.price,
      benchmarkStatus: `Meets normal benchmark (${programme.normalBenchmark})`,
      recommendation: 'Excellent benchmark. Candidate is comfortably eligible under Normal Working.',
      grade: programme.grade,
    }
  }

  // 2) Score falls within the double-working band -> eligible, but only via double working.
  if (score >= doubleScore) {
    const workingType = WORKING_TYPE.DOUBLE
    return {
      status: STATUS.ELIGIBLE_DOUBLE,
      workingType,
      price: programme.doublePrice,
      benchmarkStatus: `Within double working benchmark (${programme.doubleBenchmark})`,
      recommendation: 'Double Working recommended to strengthen the admission chances for this score range.',
      grade: programme.grade,
    }
  }

  // 3) Score is above the bare minimum but below double-working threshold: borderline.
  if (score >= minimumScore) {
    return {
      status: STATUS.ELIGIBLE_DOUBLE,
      workingType: WORKING_TYPE.DOUBLE,
      price: programme.doublePrice,
      benchmarkStatus: `Below preferred benchmark, above minimum threshold (min: ${minimumScore})`,
      recommendation: 'Borderline score. Double Working strongly recommended; consider a second-choice programme as backup.',
      grade: programme.grade,
    }
  }

  // 4) Below every threshold -> not eligible for this programme.
  return {
    status: STATUS.NOT_ELIGIBLE,
    workingType: null,
    price: 0,
    benchmarkStatus: `Below minimum benchmark (min required: ${minimumScore})`,
    recommendation: 'Score is below the internal benchmark for this programme. Recommend another programme with a lower benchmark, or a change-of-course/institution strategy.',
    grade: programme.grade,
  }
}

/**
 * Given a JAMB score, suggests alternative programmes the candidate is
 * eligible for, sorted by best-fit (closest match to their score) first.
 * @param {Array} programmes
 * @param {number} jambScore
 * @param {string} [excludeId]
 * @param {number} [limit]
 */
export function suggestAlternatives(programmes, jambScore, excludeId, limit = 5) {
  const score = Number(jambScore) || 0
  return programmes
    .filter((p) => p.id !== excludeId)
    .map((p) => ({ programme: p, evaluation: evaluateCandidate(p, score) }))
    .filter((r) => r.evaluation.status !== STATUS.NOT_ELIGIBLE)
    .sort((a, b) => {
      // Prefer Single Working eligibility, then closeness of score to preferred benchmark
      const aDiff = Math.abs(score - Number(a.programme.preferredScore))
      const bDiff = Math.abs(score - Number(b.programme.preferredScore))
      if (a.evaluation.status !== b.evaluation.status) {
        return a.evaluation.status === STATUS.ELIGIBLE ? -1 : 1
      }
      return aDiff - bDiff
    })
    .slice(0, limit)
}

/**
 * Returns a badge color scheme keyed by status - used by UI components.
 */
export function statusBadgeStyle(status) {
  switch (status) {
    case STATUS.ELIGIBLE:
      return 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-400'
    case STATUS.ELIGIBLE_DOUBLE:
      return 'bg-amber-100 text-amber-700 dark:bg-amber-950/50 dark:text-amber-400'
    case STATUS.NOT_ELIGIBLE:
      return 'bg-red-100 text-red-700 dark:bg-red-950/50 dark:text-red-400'
    default:
      return 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300'
  }
}
