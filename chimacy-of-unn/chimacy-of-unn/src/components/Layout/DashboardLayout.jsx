import React, { useState, useCallback } from 'react'
import Sidebar from './Sidebar.jsx'
import Topbar from './Topbar.jsx'

export default function DashboardLayout({ title, children }) {
  const [sidebarOpen, setSidebarOpen] = useState(false)

  // Stable function identities across re-renders - required for the
  // memo()-wrapped Sidebar/Topbar to actually skip re-rendering when
  // unrelated parts of a page update.
  const openSidebar = useCallback(() => setSidebarOpen(true), [])
  const closeSidebar = useCallback(() => setSidebarOpen(false), [])

  return (
    <div className="min-h-screen flex bg-white dark:bg-slate-950">
      <Sidebar open={sidebarOpen} onClose={closeSidebar} />
      <div className="flex-1 min-w-0 flex flex-col">
        <Topbar title={title} onMenuClick={openSidebar} />
        <main className="flex-1 px-3 sm:px-6 py-5 sm:py-6 max-w-[1400px] w-full mx-auto">
          {children}
        </main>
      </div>
    </div>
  )
}
