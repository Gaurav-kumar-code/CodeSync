import axios, { AxiosInstance } from "axios"
import { env } from "../config/env"
import { UserModel } from "../models"
import { decrypt } from "../utils/crypto"
import { HttpError } from "../utils/httpError"

const GITHUB_API_BASE_URL = "https://api.github.com"

type GitHubFilePayload = {
  path: string
  content: string
}

type PushCodePayload = {
  owner: string
  repo: string
  branch: string
  message: string
  files: GitHubFilePayload[]
  force?: boolean
}

class GitHubService {
  static getAuthorizationUrl(state: string) {
    const scopes = ["repo", "read:user", "user:email"]

    const url = new URL("https://github.com/login/oauth/authorize")
    url.searchParams.set("client_id", env.githubClientId)
    url.searchParams.set("redirect_uri", env.githubRedirectUri)
    url.searchParams.set("scope", scopes.join(" "))
    url.searchParams.set("state", state)

    return url.toString()
  }

  static async exchangeCodeForToken(code: string) {
    const response = await axios.post(
      "https://github.com/login/oauth/access_token",
      {
        client_id: env.githubClientId,
        client_secret: env.githubClientSecret,
        code,
        redirect_uri: env.githubRedirectUri,
      },
      {
        headers: {
          Accept: "application/json",
        },
      }
    )

    if (!response.data?.access_token) {
      throw new HttpError(400, "Failed to exchange GitHub code")
    }

    return {
      accessToken: response.data.access_token as string,
      refreshToken: response.data.refresh_token as string | undefined,
      expiresIn: response.data.expires_in as number | undefined,
    }
  }

  static createClient(accessToken: string): AxiosInstance {
    return axios.create({
      baseURL: GITHUB_API_BASE_URL,
      headers: {
        Authorization: `Bearer ${accessToken}`,
        Accept: "application/vnd.github+json",
        "X-GitHub-Api-Version": "2022-11-28",
      },
    })
  }

  static async getAuthenticatedClient(userId: string): Promise<AxiosInstance> {
    const user = await UserModel.findById(userId)
    const encryptedToken = user?.github?.accessTokenEncrypted

    if (!user || !encryptedToken) {
      throw new HttpError(400, "GitHub account not connected")
    }

    return this.createClient(decrypt(encryptedToken))
  }

  static async getUserProfile(accessToken: string) {
    const client = this.createClient(accessToken)

    const [profileResponse, emailResponse] = await Promise.all([
      client.get("/user"),
      client.get("/user/emails"),
    ])

    const primaryEmail = (emailResponse.data as Array<{ email: string; primary: boolean }>).find(
      (email) => email.primary
    )

    return {
      id: String(profileResponse.data.id),
      login: String(profileResponse.data.login),
      avatarUrl: profileResponse.data.avatar_url as string,
      profileUrl: profileResponse.data.html_url as string,
      email: primaryEmail?.email ?? profileResponse.data.email,
    }
  }

  static async listRepositories(userId: string, page: number = 1, perPage: number = 20) {
    const client = await this.getAuthenticatedClient(userId)

    const response = await client.get("/user/repos", {
      params: {
        page,
        per_page: perPage,
        sort: "updated",
      },
    })

    return response.data
  }

  static async getRepositoryContents(params: {
    userId: string
    owner: string
    repo: string
    path?: string
    ref?: string
  }) {
    const client = await this.getAuthenticatedClient(params.userId)

    const response = await client.get(`/repos/${params.owner}/${params.repo}/contents/${params.path ?? ""}`, {
      params: {
        ref: params.ref,
      },
    })

    return response.data
  }

  static async cloneRepositoryAsZip(params: {
    userId: string
    owner: string
    repo: string
    branch?: string
  }) {
    const client = await this.getAuthenticatedClient(params.userId)

    const response = await client.get(`/repos/${params.owner}/${params.repo}/zipball/${params.branch ?? "main"}`, {
      responseType: "arraybuffer",
    })

    return Buffer.from(response.data)
  }

  static async createRepository(params: {
    userId: string
    name: string
    description?: string
    isPrivate?: boolean
    autoInit?: boolean
  }) {
    const client = await this.getAuthenticatedClient(params.userId)

    const response = await client.post("/user/repos", {
      name: params.name,
      description: params.description,
      private: params.isPrivate ?? true,
      auto_init: params.autoInit ?? true,
    })

    return response.data
  }

  static async getBranches(userId: string, owner: string, repo: string) {
    const client = await this.getAuthenticatedClient(userId)
    const response = await client.get(`/repos/${owner}/${repo}/branches`)
    return response.data
  }

  static async getCommits(userId: string, owner: string, repo: string, branch?: string) {
    const client = await this.getAuthenticatedClient(userId)
    const response = await client.get(`/repos/${owner}/${repo}/commits`, {
      params: {
        sha: branch,
      },
    })

    return response.data
  }

  static async importRepository(params: {
    userId: string
    owner: string
    repo: string
    branch?: string
  }) {
    const client = await this.getAuthenticatedClient(params.userId)
    const branch = params.branch ?? "main"

    const treeResponse = await client.get(`/repos/${params.owner}/${params.repo}/git/trees/${branch}`, {
      params: {
        recursive: 1,
      },
    })

    const tree = treeResponse.data?.tree as Array<{
      path: string
      mode: string
      type: "blob" | "tree"
      sha: string
      size?: number
    }>

    const files = tree.filter((node) => node.type === "blob")
    const directories = tree.filter((node) => node.type === "tree")

    const limitedFiles = files.slice(0, 400)

    const fileContents = await Promise.all(
      limitedFiles.map(async (file) => {
        const blobResponse = await client.get(
          `/repos/${params.owner}/${params.repo}/git/blobs/${file.sha}`
        )

        const content = Buffer.from(blobResponse.data.content, "base64").toString("utf8")

        return {
          path: file.path,
          content,
          size: file.size ?? content.length,
        }
      })
    )

    return {
      owner: params.owner,
      repo: params.repo,
      branch,
      directories,
      files: fileContents,
      truncated: files.length > limitedFiles.length,
      originalFileCount: files.length,
    }
  }

  static async pullLatestChanges(params: {
    userId: string
    owner: string
    repo: string
    branch?: string
  }) {
    return this.importRepository(params)
  }

  static async pushCode(userId: string, payload: PushCodePayload) {
    const client = await this.getAuthenticatedClient(userId)
    const conflicts: string[] = []
    const committed: string[] = []

    for (const file of payload.files) {
      try {
        let sha: string | undefined

        try {
          const existing = await client.get(`/repos/${payload.owner}/${payload.repo}/contents/${file.path}`, {
            params: { ref: payload.branch },
          })

          sha = existing.data.sha
        } catch (error: any) {
          if (error?.response?.status !== 404) {
            throw error
          }
        }

        await client.put(`/repos/${payload.owner}/${payload.repo}/contents/${file.path}`, {
          message: payload.message,
          content: Buffer.from(file.content, "utf8").toString("base64"),
          branch: payload.branch,
          sha,
        })

        committed.push(file.path)
      } catch (error: any) {
        if (error?.response?.status === 409) {
          conflicts.push(file.path)
          if (!payload.force) {
            continue
          }
        } else {
          throw error
        }
      }
    }

    return {
      committed,
      conflicts,
      hasConflicts: conflicts.length > 0,
    }
  }

  static async switchBranch(params: {
    userId: string
    owner: string
    repo: string
    branch: string
  }) {
    const branches = await this.getBranches(params.userId, params.owner, params.repo)
    const target = branches.find((branch: { name: string }) => branch.name === params.branch)

    if (!target) {
      throw new HttpError(404, "Branch not found")
    }

    return {
      activeBranch: target.name,
      commitSha: target.commit?.sha,
    }
  }
}

export { GitHubService, PushCodePayload }
