import { useEffect, useMemo, useState } from "react"
import {
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  Cell,
} from "recharts"
import { apiClient } from "../../services/api"
import { Card } from "../ui/core"

interface AnalyticsResponse {
  totals: {
    totalActions: number
    totalExecutions: number
    successCount: number
    failureCount: number
    avgDurationMs: number
  }
  actionDistribution: Array<{ _id: string; count: number }>
  timeline: Array<{ _id: { date: string }; count: number; errors: number }>
}

const COLOR_PALETTE = ["#41C87A", "#0EA5E9", "#F59E0B", "#EF4444", "#A855F7", "#94A3B8"]

const AnalyticsDashboard = ({ projectId }: { projectId: string }) => {
  const [range, setRange] = useState<"day" | "week" | "month">("week")
  const [analytics, setAnalytics] = useState<AnalyticsResponse | null>(null)

  useEffect(() => {
    const loadAnalytics = async () => {
      const now = new Date()
      const from = new Date(now)
      if (range === "day") from.setDate(now.getDate() - 1)
      if (range === "week") from.setDate(now.getDate() - 7)
      if (range === "month") from.setMonth(now.getMonth() - 1)

      const response = await apiClient.get<AnalyticsResponse>(`/projects/${projectId}/analytics`, {
        params: {
          from: from.toISOString(),
          to: now.toISOString(),
        },
      })

      setAnalytics(response.data)
    }

    void loadAnalytics()
  }, [projectId, range])

  const timelineData = useMemo(
    () =>
      (analytics?.timeline ?? []).map((item) => ({
        date: item._id.date,
        actions: item.count,
        errors: item.errors,
      })),
    [analytics?.timeline]
  )

  const actionData = useMemo(
    () =>
      (analytics?.actionDistribution ?? []).map((item) => ({
        name: item._id,
        value: item.count,
      })),
    [analytics?.actionDistribution]
  )

  return (
    <section className="space-y-4 rounded-2xl border border-neutral-800 bg-neutral-900/50 p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h3 className="text-lg font-semibold text-neutral-100">Project Analytics</h3>
        <div className="inline-flex rounded-xl border border-neutral-700 bg-neutral-900 p-1 text-xs">
          {(["day", "week", "month"] as const).map((item) => (
            <button
              key={item}
              type="button"
              onClick={() => setRange(item)}
              className={`rounded-lg px-3 py-1.5 transition ${range === item ? "bg-brand-500 text-neutral-900" : "text-neutral-300"}`}
            >
              {item}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <Card>
          <p className="text-xs text-neutral-400">Total Executions</p>
          <p className="text-2xl font-semibold text-neutral-100">{analytics?.totals.totalExecutions ?? 0}</p>
        </Card>
        <Card>
          <p className="text-xs text-neutral-400">Success Rate</p>
          <p className="text-2xl font-semibold text-emerald-300">
            {analytics && analytics.totals.totalActions > 0
              ? `${Math.round((analytics.totals.successCount / analytics.totals.totalActions) * 100)}%`
              : "0%"}
          </p>
        </Card>
        <Card>
          <p className="text-xs text-neutral-400">Failures</p>
          <p className="text-2xl font-semibold text-red-300">{analytics?.totals.failureCount ?? 0}</p>
        </Card>
        <Card>
          <p className="text-xs text-neutral-400">Avg Time</p>
          <p className="text-2xl font-semibold text-sky-300">{Math.round(analytics?.totals.avgDurationMs ?? 0)}ms</p>
        </Card>
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        <Card className="h-[320px]">
          <p className="mb-3 text-sm font-medium text-neutral-300">Execution Timeline</p>
          <ResponsiveContainer width="100%" height="90%">
            <LineChart data={timelineData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#2f2f37" />
              <XAxis dataKey="date" stroke="#9ca3af" />
              <YAxis stroke="#9ca3af" />
              <Tooltip />
              <Line type="monotone" dataKey="actions" stroke="#41C87A" strokeWidth={2} dot={false} />
              <Line type="monotone" dataKey="errors" stroke="#EF4444" strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </Card>

        <Card className="h-[320px]">
          <p className="mb-3 text-sm font-medium text-neutral-300">Action Distribution</p>
          <ResponsiveContainer width="100%" height="90%">
            <PieChart>
              <Pie data={actionData} dataKey="value" nameKey="name" outerRadius={100} label>
                {actionData.map((_, index) => (
                  <Cell key={index} fill={COLOR_PALETTE[index % COLOR_PALETTE.length]} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </Card>
      </div>

      <Card className="h-[300px]">
        <p className="mb-3 text-sm font-medium text-neutral-300">Top Activities</p>
        <ResponsiveContainer width="100%" height="90%">
          <BarChart data={actionData.slice(0, 8)}>
            <CartesianGrid strokeDasharray="3 3" stroke="#2f2f37" />
            <XAxis dataKey="name" stroke="#9ca3af" />
            <YAxis stroke="#9ca3af" />
            <Tooltip />
            <Bar dataKey="value" fill="#0EA5E9" radius={[6, 6, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </Card>
    </section>
  )
}

export { AnalyticsDashboard }
