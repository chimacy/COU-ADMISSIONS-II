import { supabase } from '../lib/supabaseClient.js'
import { cached, invalidate } from './cache.js'

/* =============================== PROGRAMMES =============================== */

export async function getProgrammes() {
  return cached('programmes', async () => {
    const { data, error } = await supabase.from('programmes').select('*').order('grade').order('name')
    if (error) throw error
    return (data || []).map(mapProgrammeFromDb)
  })
}

export async function saveProgramme(programme) {
  const payload = mapProgrammeToDb(programme)
  let result
  if (programme.id) {
    const { data, error } = await supabase.from('programmes').update(payload).eq('id', programme.id).select().single()
    if (error) throw error
    result = mapProgrammeFromDb(data)
  } else {
    const { data, error } = await supabase.from('programmes').insert(payload).select().single()
    if (error) throw error
    result = mapProgrammeFromDb(data)
  }
  invalidate('programmes')
  return result
}

export async function deleteProgramme(id) {
  const { error } = await supabase.from('programmes').delete().eq('id', id)
  if (error) throw error
  invalidate('programmes')
}

function mapProgrammeFromDb(row) {
  return {
    id: row.id,
    name: row.name,
    grade: row.grade,
    price: Number(row.price),
    doublePrice: Number(row.double_price),
    minimumScore: row.minimum_score,
    preferredScore: row.preferred_score,
    doubleWorkingScore: row.double_working_score,
    normalBenchmark: row.normal_benchmark,
    doubleBenchmark: row.double_benchmark,
    priceEstimated: row.price_estimated,
    benchmarkDefault: row.benchmark_default,
  }
}

function mapProgrammeToDb(p) {
  return {
    name: p.name,
    grade: p.grade,
    price: Number(p.price) || 0,
    double_price: Number(p.doublePrice) || 0,
    minimum_score: Number(p.minimumScore) || 0,
    preferred_score: Number(p.preferredScore) || 0,
    double_working_score: Number(p.doubleWorkingScore) || 0,
    normal_benchmark: p.normalBenchmark || '',
    double_benchmark: p.doubleBenchmark || '',
    price_estimated: !!p.priceEstimated,
    benchmark_default: !!p.benchmarkDefault,
  }
}

export const GRADE_ORDER = [
  'First Grade',
  'Second Grade Grade I',
  'Second Grade Grade II',
  'Third Grade',
  'Fourth Grade',
]

/* ================================== RULES ================================== */

export async function getRules() {
  return cached('rules', async () => {
    const { data, error } = await supabase.from('rules').select('*').order('sort_order')
    if (error) throw error
    return (data || []).map((r) => ({ id: r.id, title: r.title, text: r.body }))
  })
}

export async function saveRule(rule, sortOrder = 0) {
  const payload = { title: rule.title || '', body: rule.text, sort_order: sortOrder }
  let result
  if (rule.id) {
    const { data, error } = await supabase.from('rules').update(payload).eq('id', rule.id).select().single()
    if (error) throw error
    result = { id: data.id, title: data.title, text: data.body }
  } else {
    const { data, error } = await supabase.from('rules').insert(payload).select().single()
    if (error) throw error
    result = { id: data.id, title: data.title, text: data.body }
  }
  invalidate('rules')
  return result
}

export async function deleteRule(id) {
  const { error } = await supabase.from('rules').delete().eq('id', id)
  if (error) throw error
  invalidate('rules')
}

/* ============================== QUOTATIONS/CLIENTS ============================== */
/* Not cached - this data changes constantly and admins need to see the
   latest state (payments, new clients) every time they open the page. */

export async function getQuotations() {
  const { data, error } = await supabase.from('quotations').select('*').order('created_at', { ascending: false })
  if (error) throw error
  return (data || []).map(mapQuotationFromDb)
}

export async function getQuotationById(id) {
  const { data, error } = await supabase.from('quotations').select('*').eq('id', id).maybeSingle()
  if (error) throw error
  return data ? mapQuotationFromDb(data) : null
}

export async function saveQuotation(quotation) {
  const payload = mapQuotationToDb(quotation)
  if (quotation.id) {
    const { data, error } = await supabase.from('quotations').update(payload).eq('id', quotation.id).select().single()
    if (error) throw error
    return mapQuotationFromDb(data)
  }
  const { data: userData } = await supabase.auth.getUser()
  const { data, error } = await supabase
    .from('quotations')
    .insert({ ...payload, created_by: userData?.user?.id || null })
    .select()
    .single()
  if (error) throw error
  return mapQuotationFromDb(data)
}

export async function deleteQuotation(id) {
  const { error } = await supabase.from('quotations').delete().eq('id', id)
  if (error) throw error
}

export async function markQuotationPaid(id, { amount, method, date }) {
  const payload = {
    paid: true,
    paid_amount: amount,
    payment_method: method,
    paid_date: date,
  }
  const { data, error } = await supabase.from('quotations').update(payload).eq('id', id).select().single()
  if (error) throw error
  return mapQuotationFromDb(data)
}

/**
 * Generates (assigns) an invoice number for an already-paid quotation. This
 * is a deliberate, separate admin action - confirming payment must never
 * automatically create or download an invoice.
 */
export async function generateInvoiceNumber(id) {
  const existing = await getQuotationById(id)
  if (existing?.invoiceNumber) return existing // already generated - idempotent
  const invoiceNumber = `INV-${(existing?.quotationNumber || '').replace('CHM-', '') || Date.now()}`
  const { data, error } = await supabase.from('quotations').update({ invoice_number: invoiceNumber }).eq('id', id).select().single()
  if (error) throw error
  return mapQuotationFromDb(data)
}

function mapQuotationFromDb(row) {
  return {
    id: row.id,
    quotationNumber: row.quotation_number,
    clientName: row.client_name,
    parentName: row.parent_name,
    phone: row.phone,
    email: row.email,
    jambRegNumber: row.jamb_reg_number,
    jambScore: row.jamb_score,
    programmeId: row.programme_id,
    programme: row.programme_name,
    programmeGrade: row.programme_grade,
    workingType: row.working_type,
    price: Number(row.price) || 0,
    status: row.status,
    benchmarkStatus: row.benchmark_status,
    recommendation: row.recommendation,
    category: row.category,
    remarks: row.remarks,
    date: row.quote_date,
    rulesSnapshot: row.rules_snapshot || [],
    paid: row.paid,
    paidAmount: Number(row.paid_amount) || 0,
    paidDate: row.paid_date,
    paymentMethod: row.payment_method,
    invoiceNumber: row.invoice_number,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

function mapQuotationToDb(q) {
  return {
    client_name: q.clientName,
    parent_name: q.parentName || '',
    phone: q.phone || '',
    email: q.email || '',
    jamb_reg_number: q.jambRegNumber || '',
    jamb_score: Number(q.jambScore) || 0,
    programme_id: q.programmeId || null,
    programme_name: q.programme || '',
    programme_grade: q.programmeGrade || '',
    working_type: q.workingType || '',
    price: Number(q.price) || 0,
    status: q.status || '',
    benchmark_status: q.benchmarkStatus || '',
    recommendation: q.recommendation || '',
    category: q.category || 'New Application',
    remarks: q.remarks || '',
    quote_date: q.date || new Date().toISOString().slice(0, 10),
    rules_snapshot: q.rulesSnapshot || [],
  }
}

/* ============================== ASSISTANCE REQUESTS (admin side) ============================== */

export async function getRequests() {
  const { data, error } = await supabase.from('requests').select('*').order('created_at', { ascending: false })
  if (error) throw error
  return (data || []).map(mapRequestFromDb)
}

export async function getRequestById(id) {
  const { data, error } = await supabase.from('requests').select('*').eq('id', id).maybeSingle()
  if (error) throw error
  return data ? mapRequestFromDb(data) : null
}

export async function updateRequestStatus(id, status) {
  const { data, error } = await supabase.from('requests').update({ status }).eq('id', id).select().single()
  if (error) throw error
  return mapRequestFromDb(data)
}

export async function getRequestStatusHistory(requestId) {
  const { data, error } = await supabase
    .from('request_status_history')
    .select('*')
    .eq('request_id', requestId)
    .order('changed_at', { ascending: true })
  if (error) throw error
  return data || []
}

export async function getRequestNotes(requestId) {
  const { data, error } = await supabase
    .from('request_notes')
    .select('*')
    .eq('request_id', requestId)
    .order('created_at', { ascending: false })
  if (error) throw error
  return data || []
}

export async function addRequestNote(requestId, note) {
  const { data: userData } = await supabase.auth.getUser()
  const { data: profile } = await supabase.from('admin_profiles').select('display_name').eq('id', userData?.user?.id).maybeSingle()
  const { data, error } = await supabase
    .from('request_notes')
    .insert({
      request_id: requestId,
      admin_id: userData?.user?.id || null,
      admin_name: profile?.display_name || userData?.user?.email || 'Admin',
      note,
    })
    .select()
    .single()
  if (error) throw error
  return data
}

/**
 * Accepts a request and converts it into a full client record (quotation) so
 * every existing downstream workflow (Client Records, Checkout, invoices,
 * PDFs) keeps working unchanged - no pricing/eligibility logic is
 * duplicated between the two tables.
 */
export async function acceptRequestAndConvert(request) {
  const quotation = await saveQuotation({
    clientName: request.fullName,
    phone: request.phone,
    email: request.email,
    jambRegNumber: request.jambRegNumber,
    jambScore: request.jambScore,
    programmeId: request.programmeId,
    programme: request.programmeName,
    programmeGrade: request.programmeGrade,
    workingType: request.workingType,
    price: request.price,
    status: request.eligibilityStatus,
    benchmarkStatus: request.benchmarkStatus,
    recommendation: request.recommendation,
    category: 'New Application',
    remarks: request.additionalNotes,
    date: new Date().toISOString().slice(0, 10),
    rulesSnapshot: await getRules(),
  })

  const { data, error } = await supabase
    .from('requests')
    .update({ status: 'ACCEPTED', linked_quotation_id: quotation.id })
    .eq('id', request.id)
    .select()
    .single()
  if (error) throw error
  return { request: mapRequestFromDb(data), quotation }
}

function mapRequestFromDb(row) {
  return {
    id: row.id,
    requestNumber: row.request_number,
    fullName: row.full_name,
    phone: row.phone,
    email: row.email,
    jambRegNumber: row.jamb_reg_number,
    jambScore: row.jamb_score,
    institution: row.institution,
    programmeId: row.programme_id,
    programmeName: row.programme_name,
    programmeGrade: row.programme_grade,
    workingType: row.working_type,
    price: Number(row.price) || 0,
    eligibilityStatus: row.eligibility_status,
    benchmarkStatus: row.benchmark_status,
    recommendation: row.recommendation,
    additionalNotes: row.additional_notes,
    termsAccepted: row.terms_accepted,
    termsAcceptedAt: row.terms_accepted_at,
    status: row.status,
    linkedQuotationId: row.linked_quotation_id,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

export const REQUEST_STATUSES = [
  'PENDING', 'UNDER_REVIEW', 'ACCEPTED', 'CONTACTED', 'PAYMENT_PENDING',
  'PAYMENT_CONFIRMED', 'PROCESSING', 'COMPLETED', 'REJECTED', 'CANCELLED',
]

/* ============================== ADMIN PROFILES (Administrators page) ============================== */

export async function getAdminProfiles() {
  const { data, error } = await supabase.from('admin_profiles').select('*').order('created_at')
  if (error) throw error
  return data || []
}

export async function updateAdminProfile(id, patch) {
  const { data, error } = await supabase.from('admin_profiles').update(patch).eq('id', id).select().single()
  if (error) throw error
  return data
}

/* ============================== BACKUP (export only) ============================== */

export async function exportAllData() {
  const [programmes, rules, quotations, requests] = await Promise.all([
    getProgrammes(), getRules(), getQuotations(), getRequests(),
  ])
  return {
    programmes, rules, quotations, requests, exportedAt: new Date().toISOString(),
  }
}
