import { AnimatePresence, motion } from "framer-motion"
import { CircleAlert, CircleCheck, CircleX, Info, X } from "lucide-react"
import { useNotificationContext } from "../../context/NotificationContext"

const iconMap = {
  success: <CircleCheck className="text-emerald-400" size={16} />,
  error: <CircleX className="text-red-400" size={16} />,
  warning: <CircleAlert className="text-amber-300" size={16} />,
  info: <Info className="text-sky-400" size={16} />,
}

const NotificationToast = () => {
  const { notifications, dismiss } = useNotificationContext()

  return (
    <div className="pointer-events-none fixed right-4 top-4 z-[140] flex w-[320px] flex-col gap-2">
      <AnimatePresence>
        {notifications.map((notification) => (
          <motion.div
            key={notification.id}
            initial={{ opacity: 0, x: 20, scale: 0.98 }}
            animate={{ opacity: 1, x: 0, scale: 1 }}
            exit={{ opacity: 0, x: 30, scale: 0.98 }}
            transition={{ duration: 0.2 }}
            className="pointer-events-auto rounded-xl border border-neutral-700 bg-neutral-900/95 p-3 shadow-lg"
          >
            <div className="flex items-start gap-2">
              <span>{iconMap[notification.type]}</span>
              <div className="flex-1">
                <p className="text-sm font-semibold text-neutral-100">{notification.title}</p>
                {notification.description ? (
                  <p className="mt-0.5 text-xs text-neutral-400">{notification.description}</p>
                ) : null}
              </div>
              <button
                type="button"
                className="rounded p-1 text-neutral-500 hover:bg-neutral-800 hover:text-neutral-300"
                onClick={() => dismiss(notification.id)}
                title="Dismiss notification"
                aria-label="Dismiss notification"
              >
                <X size={14} />
              </button>
            </div>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  )
}

export { NotificationToast }
