import { ReactNode } from "react"
import clsx from "clsx"

export interface TabItem {
  id: string
  label: string
  icon?: ReactNode
  disabled?: boolean
}

interface TabsProps {
  tabs: TabItem[]
  activeTab: string
  onChange: (tabId: string) => void
}

const Tabs = ({ tabs, activeTab, onChange }: TabsProps) => {
  return (
    <div className="rounded-xl border border-neutral-800 bg-neutral-900/70 p-1">
      <div className="grid grid-cols-2 gap-1 sm:grid-cols-4">
        {tabs.map((tab) => {
          const active = tab.id === activeTab

          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => !tab.disabled && onChange(tab.id)}
              disabled={tab.disabled}
              className={clsx(
                "relative inline-flex items-center justify-center gap-1 rounded-lg px-3 py-2 text-sm font-medium transition-all",
                active
                  ? "bg-brand-500 text-neutral-900 shadow-[0_8px_18px_rgba(65,200,122,0.28)]"
                  : "text-neutral-300 hover:bg-neutral-800",
                tab.disabled ? "cursor-not-allowed opacity-50" : ""
              )}
            >
              {tab.icon}
              <span>{tab.label}</span>
            </button>
          )
        })}
      </div>
    </div>
  )
}

export { Tabs }
