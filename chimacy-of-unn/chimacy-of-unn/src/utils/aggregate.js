/**
 * UNN Aggregate Calculator
 * -------------------------
 * Implements the configurable screening model:
 *   JAMB Contribution   = JAMB Score x jambWeight   (default 0.90)
 *   O'Level Contribution = O'Level Score x olevelWeight (default 0.10)
 *   O'Level Score        = sum of 4 selected subject grade-marks
 *                           + oneSittingBonus (only if olevelSittings === 1)
 *   Final Aggregate       = JAMB Contribution + O'Level Contribution
 *
 * IMPORTANT: this is a *model*, not a permanent guarantee of how UNN scores
 * candidates. Every number here (jambWeight, olevelWeight, oneSittingBonus,
 * and the grade->marks conversion table) comes from the `aggregate_settings`
 * / `grade_conversion` tables (fetched via the get_assessment_config RPC),
 * never hardcoded, so a super admin can update the model from the Admin
 * Portal the moment UNN's official method changes.
 */

/**
 * @param {object} params
 * @param {number} params.jambScore
 * @param {Array<{subject: string, grade: string}>} params.olevelSubjects - expects exactly 4
 * @param {number} params.olevelSittings
 * @param {object} params.gradeConversion - { A1: 90, B2: 80, ... }
 * @param {object} params.aggregateSettings - { jamb_weight, olevel_weight, one_sitting_bonus }
 */
export function calculateAggregate({
  jambScore, olevelSubjects, olevelSittings, gradeConversion, aggregateSettings,
}) {
  const jambWeight = Number(aggregateSettings?.jamb_weight ?? 0.9)
  const olevelWeight = Number(aggregateSettings?.olevel_weight ?? 0.1)
  const oneSittingBonus = Number(aggregateSettings?.one_sitting_bonus ?? 40)

  const gradeTotal = (olevelSubjects || []).reduce((sum, s) => {
    const marks = Number(gradeConversion?.[s.grade] ?? 0)
    return sum + marks
  }, 0)

  const bonusApplied = Number(olevelSittings) === 1 ? oneSittingBonus : 0
  const olevelScore = gradeTotal + bonusApplied

  const jambContribution = round1(Number(jambScore || 0) * jambWeight)
  const olevelContribution = round1(olevelScore * olevelWeight)
  const aggregate = round1(jambContribution + olevelContribution)

  return {
    gradeTotal,
    bonusApplied,
    olevelScore,
    jambContribution,
    olevelContribution,
    aggregate,
  }
}

function round1(n) {
  return Math.round(n * 10) / 10
}
