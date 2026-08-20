import { supabase } from '../lib/supabaseClient.js'

/**
 * Returns { jamb_subjects, olevel_subjects, grade_conversion, aggregate_settings }
 * - the full configurable assessment model, safe for anonymous visitors.
 */
export async function getAssessmentConfig() {
  const { data, error } = await supabase.rpc('get_assessment_config')
  if (error) throw error
  return data
}

/**
 * Programme list for the public dropdown - name/grade/price only, never the
 * confidential benchmark numbers.
 */
export async function listProgrammesPublic() {
  const { data, error } = await supabase.rpc('list_programmes_public')
  if (error) throw error
  return (data || []).map((p) => ({
    id: p.id, name: p.name, grade: p.grade, price: Number(p.price), doublePrice: Number(p.double_price),
  }))
}

/**
 * Server-side eligibility calculation for one programme - the raw benchmark
 * database never leaves Supabase; only this computed result does.
 */
export async function checkEligibilityPublic(programmeId, jambScore) {
  const { data, error } = await supabase.rpc('check_eligibility', {
    p_programme_id: programmeId,
    p_jamb_score: Number(jambScore) || 0,
  })
  if (error) throw error
  return data
}

/**
 * Submits a full assistance request (contact info + JAMB/O'Level assessment
 * + terms acceptance). Runs through a SECURITY DEFINER function so no
 * direct table privileges on `requests` are ever needed by anon.
 */
export async function submitRequest(payload) {
  const { data, error } = await supabase.rpc('create_request', { payload })
  if (error) throw error
  return data
}

/**
 * Public request tracking - request number + phone act together as a
 * shared secret. Returns null if there's no match.
 */
export async function trackRequest(requestNumber, phone) {
  const { data, error } = await supabase.rpc('get_request_status', {
    p_request_number: requestNumber,
    p_phone: phone,
  })
  if (error) throw error
  return data
}
