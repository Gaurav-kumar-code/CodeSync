import { useState } from "react"
import { Button, Input, Modal, Tabs } from "../ui/core"
import { ThemeMode } from "../../hooks/useTheme"

interface SettingsModalProps {
  open: boolean
  onClose: () => void
  initialTheme: ThemeMode
  initialFontSize: number
  initialFontFamily: string
  initialTabSize: number
  onSave: (settings: {
    theme: ThemeMode
    fontSize: number
    fontFamily: string
    tabSize: number
  }) => void
}

const SettingsModal = ({
  open,
  onClose,
  initialTheme,
  initialFontSize,
  initialFontFamily,
  initialTabSize,
  onSave,
}: SettingsModalProps) => {
  const [theme, setTheme] = useState<ThemeMode>(initialTheme)
  const [fontSize, setFontSize] = useState(initialFontSize)
  const [fontFamily, setFontFamily] = useState(initialFontFamily)
  const [tabSize, setTabSize] = useState(initialTabSize)

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Workspace Settings"
      description="Customize your editor, theme, and key preferences."
      footer={
        <div className="flex justify-end gap-2">
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button
            onClick={() => {
              onSave({
                theme,
                fontSize,
                fontFamily,
                tabSize,
              })
              onClose()
            }}
          >
            Save Settings
          </Button>
        </div>
      }
    >
      <div className="space-y-4">
        <div>
          <p className="mb-2 text-sm text-neutral-300">Theme</p>
          <Tabs
            tabs={[
              { id: "light", label: "Light" },
              { id: "dark", label: "Dark" },
              { id: "system", label: "System" },
            ]}
            activeTab={theme}
            onChange={(next) => setTheme(next as ThemeMode)}
          />
        </div>

        <Input
          label="Font Size"
          type="number"
          value={fontSize}
          onChange={(event) => setFontSize(Number(event.target.value))}
          min={10}
          max={24}
        />

        <Input
          label="Font Family"
          value={fontFamily}
          onChange={(event) => setFontFamily(event.target.value)}
          placeholder="JetBrains Mono"
        />

        <Input
          label="Tab Size"
          type="number"
          value={tabSize}
          onChange={(event) => setTabSize(Number(event.target.value))}
          min={2}
          max={8}
        />

        <div className="rounded-xl border border-neutral-800 bg-neutral-900 p-3 text-xs text-neutral-400">
          Shortcuts: Ctrl/Cmd+S save, Ctrl/Cmd+P quick-open, Ctrl/Cmd+/ toggle comment.
        </div>
      </div>
    </Modal>
  )
}

export { SettingsModal }
