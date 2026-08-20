import React from 'react'
import { GraduationCap, AlertCircle } from 'lucide-react'

export default function ConfigNeeded() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-white px-4">
      <div className="max-w-md w-full text-center">
        <div className="h-16 w-16 rounded-2xl mx-auto mb-5 flex items-center justify-center shadow-lg bg-gradient-to-br from-primary-700 to-primary-900">
          <GraduationCap className="h-8 w-8 text-white" />
        </div>
        <h1 className="text-xl font-bold font-display text-slate-800 mb-2">Almost there — one step left</h1>
        <p className="text-sm text-slate-500 mb-6">
          This site built and deployed successfully, but it isn't connected to its database yet, so there's nothing to show.
        </p>

        <div className="text-left bg-primary-50 border border-primary-100 rounded-xl p-4 flex gap-3">
          <AlertCircle className="h-5 w-5 text-primary-700 shrink-0 mt-0.5" />
          <div className="text-sm text-slate-700">
            <p className="font-semibold mb-1">To fix this:</p>
            <ol className="list-decimal list-inside space-y-1 text-slate-600">
              <li>Set up your free Supabase project</li>
              <li>Add <code className="bg-white px-1 rounded">VITE_SUPABASE_URL</code> and <code className="bg-white px-1 rounded">VITE_SUPABASE_ANON_KEY</code> in Netlify → Site configuration → Environment variables</li>
              <li>Redeploy (Deploys → Trigger deploy → Clear cache and deploy site)</li>
            </ol>
          </div>
        </div>

        <p className="text-xs text-slate-400 mt-6">See the README for the full step-by-step guide.</p>
      </div>
    </div>
  )
}
