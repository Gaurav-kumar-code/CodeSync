import { FilterQuery, Types } from "mongoose"
import { LogModel } from "../models"

type CreateLogPayload = {
  actionType: string
  userId?: string
  projectId?: string
  fileId?: string
  sessionId?: string
  details?: Record<string, unknown>
  ipAddress?: string
  userAgent?: string
  requestId?: string
  statusCode?: number
  durationMs?: number
  success?: boolean
  errorMessage?: string
}

const parseDateRange = (from?: string, to?: string) => {
  const query: { $gte?: Date; $lte?: Date } = {}

  if (from) {
    query.$gte = new Date(from)
  }

  if (to) {
    query.$lte = new Date(to)
  }

  return Object.keys(query).length > 0 ? query : undefined
}

class LogService {
  static async createLog(payload: CreateLogPayload) {
    const log = await LogModel.create({
      actionType: payload.actionType,
      user: payload.userId,
      project: payload.projectId,
      file: payload.fileId,
      session: payload.sessionId,
      details: payload.details ?? {},
      ipAddress: payload.ipAddress ?? "",
      userAgent: payload.userAgent ?? "",
      requestId: payload.requestId,
      statusCode: payload.statusCode,
      durationMs: payload.durationMs,
      success: payload.success ?? true,
      errorMessage: payload.errorMessage ?? "",
    })

    return log
  }

  static async getUserActivityLogs(userId: string, limit: number = 100) {
    return LogModel.find({ user: userId }).sort({ createdAt: -1 }).limit(limit).lean()
  }

  static async getProjectActivityLogs(projectId: string, limit: number = 200) {
    return LogModel.find({ project: projectId })
      .sort({ createdAt: -1 })
      .limit(limit)
      .populate("user", "email profile.username profile.avatar")
      .lean()
  }

  static async getExecutionHistory(projectId: string, limit: number = 100) {
    return LogModel.find({
      project: projectId,
      actionType: { $in: ["CODE_EXECUTED", "CODE_EVALUATED"] },
    })
      .sort({ createdAt: -1 })
      .limit(limit)
      .lean()
  }

  static async getErrorLogs(projectId: string, limit: number = 100) {
    return LogModel.find({
      project: projectId,
      $or: [{ actionType: "ERROR" }, { success: false }],
    })
      .sort({ createdAt: -1 })
      .limit(limit)
      .lean()
  }

  static async getProjectStatistics(projectId: string, from?: string, to?: string) {
    const createdAt = parseDateRange(from, to)

    const filter: FilterQuery<any> = {
      project: new Types.ObjectId(projectId),
    }

    if (createdAt) {
      filter.createdAt = createdAt
    }

    const [totals] = await LogModel.aggregate([
      { $match: filter },
      {
        $group: {
          _id: null,
          totalActions: { $sum: 1 },
          totalExecutions: {
            $sum: {
              $cond: [{ $in: ["$actionType", ["CODE_EXECUTED", "CODE_EVALUATED"]] }, 1, 0],
            },
          },
          successCount: {
            $sum: {
              $cond: [{ $eq: ["$success", true] }, 1, 0],
            },
          },
          failureCount: {
            $sum: {
              $cond: [{ $eq: ["$success", false] }, 1, 0],
            },
          },
          avgDurationMs: { $avg: "$durationMs" },
        },
      },
    ])

    const actionDistribution = await LogModel.aggregate([
      { $match: filter },
      {
        $group: {
          _id: "$actionType",
          count: { $sum: 1 },
        },
      },
      { $sort: { count: -1 } },
    ])

    const timeline = await LogModel.aggregate([
      { $match: filter },
      {
        $group: {
          _id: {
            date: {
              $dateToString: {
                format: "%Y-%m-%d",
                date: "$createdAt",
              },
            },
          },
          count: { $sum: 1 },
          errors: {
            $sum: {
              $cond: [{ $eq: ["$success", false] }, 1, 0],
            },
          },
        },
      },
      { $sort: { "_id.date": 1 } },
    ])

    return {
      totals: totals ?? {
        totalActions: 0,
        totalExecutions: 0,
        successCount: 0,
        failureCount: 0,
        avgDurationMs: 0,
      },
      actionDistribution,
      timeline,
    }
  }

  static async getActivityReport(projectId: string, period: "daily" | "weekly" | "monthly") {
    const now = new Date()
    const from = new Date(now)

    if (period === "daily") {
      from.setDate(now.getDate() - 1)
    } else if (period === "weekly") {
      from.setDate(now.getDate() - 7)
    } else {
      from.setMonth(now.getMonth() - 1)
    }

    const stats = await this.getProjectStatistics(projectId, from.toISOString(), now.toISOString())

    return {
      period,
      from,
      to: now,
      ...stats,
    }
  }

  static async exportProjectLogsCsv(projectId: string) {
    const logs = await LogModel.find({ project: projectId }).sort({ createdAt: -1 }).lean()

    const header = [
      "timestamp",
      "actionType",
      "user",
      "statusCode",
      "success",
      "durationMs",
      "ipAddress",
      "errorMessage",
    ]

    const lines = logs.map((log) => {
      const row = [
        new Date(log.createdAt).toISOString(),
        log.actionType,
        String(log.user ?? ""),
        String(log.statusCode ?? ""),
        String(log.success ?? ""),
        String(log.durationMs ?? ""),
        String(log.ipAddress ?? ""),
        String(log.errorMessage ?? ""),
      ]

      return row
        .map((field) => `"${String(field).replace(/"/g, '""')}"`)
        .join(",")
    })

    return [header.join(","), ...lines].join("\n")
  }
}

export { LogService, CreateLogPayload }
