export class HttpError extends Error {
  statusCode: number
  details?: unknown

  constructor(statusCode: number, message: string, details?: unknown) {
    super(message)
    this.statusCode = statusCode
    this.details = details
  }
}

export const isHttpError = (value: unknown): value is HttpError => {
  return value instanceof HttpError
}
