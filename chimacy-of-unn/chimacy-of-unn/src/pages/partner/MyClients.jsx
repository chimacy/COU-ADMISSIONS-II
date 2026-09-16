import React, {
  useEffect,
  useMemo,
  useState,
} from 'react'
import {
  Search,
  Loader2,
  Users,
  Inbox,
} from 'lucide-react'
import DashboardLayout from '../../components/Layout/DashboardLayout.jsx'
import Card from '../../components/UI/Card.jsx'
import {
  getMyClients,
  getMyRequests,
} from '../../utils/db.js'
import {
  formatCurrency,
  formatDate,
} from '../../utils/format.js'
import { statusBadgeStyle } from '../../utils/evaluation.js'
import { useSettings } from '../../context/SettingsContext.jsx'

const REQUEST_STATUS_COLORS = {
  PENDING:
    'bg-amber-100 text-amber-700',

  UNDER_REVIEW:
    'bg-blue-100 text-blue-700',

  ACCEPTED:
    'bg-emerald-100 text-emerald-700',

  CONTACTED:
    'bg-blue-100 text-blue-700',

  PAYMENT_PENDING:
    'bg-amber-100 text-amber-700',

  PAYMENT_CONFIRMED:
    'bg-emerald-100 text-emerald-700',

  PROCESSING:
    'bg-blue-100 text-blue-700',

  COMPLETED:
    'bg-emerald-100 text-emerald-700',

  REJECTED:
    'bg-red-100 text-red-700',

  CANCELLED:
    'bg-slate-100 text-slate-500',
}

export default function MyClients({
  title = 'My Clients',
  mode = 'clients',
}) {
  const { settings } = useSettings()

  const [rows, setRows] = useState([])
  const [loading, setLoading] = useState(true)
  const [query, setQuery] = useState('')

  useEffect(() => {
    let cancelled = false

    async function load() {
      setLoading(true)

      try {
        const data =
          mode === 'requests'
            ? await getMyRequests()
            : await getMyClients()

        if (!cancelled) {
          setRows(data)
        }
      } finally {
        if (!cancelled) {
          setLoading(false)
        }
      }
    }

    load()

    return () => {
      cancelled = true
    }
  }, [mode])

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()

    if (!q) return rows

    if (mode === 'requests') {
      return rows.filter((r) =>
        [
          r.fullName,
          r.requestNumber,
          r.programmeName,
          r.status,
        ]
          .filter(Boolean)
          .some((f) =>
            String(f)
              .toLowerCase()
              .includes(q),
          ),
      )
    }

    return rows.filter((c) =>
      [
        c.clientName,
        c.quotationNumber,
        c.programme,
        c.status,
      ]
        .filter(Boolean)
        .some((f) =>
          String(f)
            .toLowerCase()
            .includes(q),
        ),
    )
  }, [rows, query, mode])

  return (
    <DashboardLayout title={title}>
      <div className="space-y-5">
        <Card className="!p-4">
          <div className="relative">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />

            <input
              value={query}
              onChange={(e) =>
                setQuery(e.target.value)
              }
              placeholder={
                mode === 'requests'
                  ? 'Search your requests...'
                  : 'Search your clients...'
              }
              className="input-field !pl-10"
            />
          </div>
        </Card>

        <Card className="!p-0 overflow-hidden">
          {loading ? (
            <div className="text-center py-16">
              <Loader2 className="h-6 w-6 animate-spin text-primary-500 mx-auto" />
            </div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-16 px-4">
              {mode === 'requests' ? (
                <Inbox className="h-10 w-10 text-slate-300 mx-auto mb-2" />
              ) : (
                <Users className="h-10 w-10 text-slate-300 mx-auto mb-2" />
              )}

              <p className="text-sm text-slate-500">
                {rows.length === 0
                  ? mode === 'requests'
                    ? 'No assistance requests submitted yet - submit a request to see it here.'
                    : 'No accepted clients yet - once a Super Admin accepts one of your assistance requests, it appears here.'
                  : 'Nothing matches your search.'}
              </p>
            </div>
          ) : mode === 'requests' ? (
            <div className="overflow-x-auto">
              <table className="w-full text-sm min-w-[700px]">
                <thead>
                  <tr className="text-left text-xs uppercase tracking-wide text-slate-500 bg-primary-50/60 border-b border-primary-100">
                    <th className="px-4 py-3 font-semibold">
                      Request #
                    </th>

                    <th className="px-4 py-3 font-semibold">
                      Client
                    </th>

                    <th className="px-4 py-3 font-semibold">
                      Programme
                    </th>

                    <th className="px-4 py-3 font-semibold">
                      Status
                    </th>

                    <th className="px-4 py-3 font-semibold">
                      Date
                    </th>
                  </tr>
                </thead>

                <tbody>
                  {filtered.map((r) => (
                    <tr
                      key={r.id}
                      className="border-b border-slate-100 last:border-0"
                    >
                      <td className="px-4 py-3 font-mono text-xs text-slate-500">
                        {r.requestNumber}
                      </td>

                      <td className="px-4 py-3 font-medium text-slate-800">
                        {r.fullName}
                      </td>

                      <td className="px-4 py-3 text-slate-600">
                        {r.programmeName}
                      </td>

                      <td className="px-4 py-3">
                        <span
                          className={`badge ${
                            REQUEST_STATUS_COLORS[
                              r.status
                            ] || 'bg-slate-100 text-slate-600'
                          }`}
                        >
                          {r.status
                            ?.replace(
                              /_/g,
                              ' ',
                            )}
                        </span>
                      </td>

                      <td className="px-4 py-3 text-slate-500 whitespace-nowrap">
                        {formatDate(
                          r.createdAt,
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm min-w-[700px]">
                <thead>
                  <tr className="text-left text-xs uppercase tracking-wide text-slate-500 bg-primary-50/60 border-b border-primary-100">
                    <th className="px-4 py-3 font-semibold">
                      Client
                    </th>

                    <th className="px-4 py-3 font-semibold">
                      Programme
                    </th>

                    <th className="px-4 py-3 font-semibold">
                      Status
                    </th>

                    <th className="px-4 py-3 font-semibold">
                      Fee
                    </th>

                    <th className="px-4 py-3 font-semibold">
                      Payment
                    </th>

                    <th className="px-4 py-3 font-semibold">
                      Date
                    </th>
                  </tr>
                </thead>

                <tbody>
                  {filtered.map((c) => (
                    <tr
                      key={c.id}
                      className="border-b border-slate-100 last:border-0"
                    >
                      <td className="px-4 py-3 font-medium text-slate-800">
                        {c.clientName}
                      </td>

                      <td className="px-4 py-3 text-slate-600">
                        {c.programme}
                      </td>

                      <td className="px-4 py-3">
                        <span
                          className={`badge ${statusBadgeStyle(
                            c.status,
                          )}`}
                        >
                          {c.status}
                        </span>
                      </td>

                      <td className="px-4 py-3 text-slate-600 whitespace-nowrap">
                        {formatCurrency(
                          c.price,
                          settings.currency_symbol,
                        )}
                      </td>

                      <td className="px-4 py-3">
                        {c.paid ? (
                          <span className="badge bg-emerald-100 text-emerald-700">
                            Paid
                          </span>
                        ) : c.paidAmount > 0 ? (
                          <span className="badge bg-amber-100 text-amber-700">
                            {formatCurrency(
                              c.paidAmount,
                              settings.currency_symbol,
                            )}{' '}
                            of{' '}
                            {formatCurrency(
                              c.price,
                              settings.currency_symbol,
                            )}
                          </span>
                        ) : (
                          <span className="badge bg-slate-100 text-slate-500">
                            Unpaid
                          </span>
                        )}
                      </td>

                      <td className="px-4 py-3 text-slate-500 whitespace-nowrap">
                        {formatDate(
                          c.date,
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      </div>
    </DashboardLayout>
  )
}
