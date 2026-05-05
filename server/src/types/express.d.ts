declare global {
  namespace Express {
    interface Request {
      requestId?: string
      user?: { _id?: string } | any
    }
  }
}

export {}
