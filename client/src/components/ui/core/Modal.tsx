import { ReactNode } from "react"
import clsx from "clsx"
import { X } from "lucide-react"

interface ModalProps {
  open: boolean
  onClose: () => void
  title?: string
  description?: string
  children: ReactNode
  footer?: ReactNode
  side?: "center" | "right"
}

const Modal = ({
  open,
  onClose,
  title,
  description,
  children,
  footer,
  side = "center",
}: ModalProps) => {
  if (!open) {
    return null
  }

  return (
    <div className="fixed inset-0 z-[120] bg-neutral-950/60 backdrop-blur-sm animate-fade-in" role="dialog" aria-modal>
      <div
        className={clsx(
          "h-full w-full p-4",
          side === "center" ? "flex items-center justify-center" : "flex justify-end"
        )}
      >
        <div
          className={clsx(
            "relative w-full max-w-xl overflow-hidden rounded-2xl border border-neutral-700",
            "bg-neutral-900/90 shadow-[0_20px_40px_rgba(0,0,0,0.4)] animate-scale-up",
            side === "right" ? "h-full max-w-lg rounded-none rounded-l-2xl" : ""
          )}
        >
          <button
            type="button"
            className="absolute right-3 top-3 rounded-lg p-1 text-neutral-400 transition hover:bg-neutral-800 hover:text-neutral-100"
            onClick={onClose}
            aria-label="Close"
          >
            <X size={18} />
          </button>
          <div className="border-b border-neutral-800 px-6 py-4">
            {title ? <h3 className="text-lg font-semibold text-neutral-100">{title}</h3> : null}
            {description ? <p className="mt-1 text-sm text-neutral-400">{description}</p> : null}
          </div>
          <div className="max-h-[70vh] overflow-y-auto px-6 py-5">{children}</div>
          {footer ? <div className="border-t border-neutral-800 px-6 py-4">{footer}</div> : null}
        </div>
      </div>
    </div>
  )
}

export { Modal }
