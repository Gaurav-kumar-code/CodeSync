"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.GitHubService = void 0;
const axios_1 = __importDefault(require("axios"));
const env_1 = require("../config/env");
const models_1 = require("../models");
const crypto_1 = require("../utils/crypto");
const httpError_1 = require("../utils/httpError");
const GITHUB_API_BASE_URL = "https://api.github.com";
class GitHubService {
    static getAuthorizationUrl(state) {
        const scopes = ["repo", "read:user", "user:email"];
        const url = new URL("https://github.com/login/oauth/authorize");
        url.searchParams.set("client_id", env_1.env.githubClientId);
        url.searchParams.set("redirect_uri", env_1.env.githubRedirectUri);
        url.searchParams.set("scope", scopes.join(" "));
        url.searchParams.set("state", state);
        return url.toString();
    }
    static async exchangeCodeForToken(code) {
        const response = await axios_1.default.post("https://github.com/login/oauth/access_token", {
            client_id: env_1.env.githubClientId,
            client_secret: env_1.env.githubClientSecret,
            code,
            redirect_uri: env_1.env.githubRedirectUri,
        }, {
            headers: {
                Accept: "application/json",
            },
        });
        if (!response.data?.access_token) {
            throw new httpError_1.HttpError(400, "Failed to exchange GitHub code");
        }
        return {
            accessToken: response.data.access_token,
            refreshToken: response.data.refresh_token,
            expiresIn: response.data.expires_in,
        };
    }
    static createClient(accessToken) {
        return axios_1.default.create({
            baseURL: GITHUB_API_BASE_URL,
            headers: {
                Authorization: `Bearer ${accessToken}`,
                Accept: "application/vnd.github+json",
                "X-GitHub-Api-Version": "2022-11-28",
            },
        });
    }
    static async getAuthenticatedClient(userId) {
        const user = await models_1.UserModel.findById(userId);
        const encryptedToken = user?.github?.accessTokenEncrypted;
        if (!user || !encryptedToken) {
            throw new httpError_1.HttpError(400, "GitHub account not connected");
        }
        return this.createClient((0, crypto_1.decrypt)(encryptedToken));
    }
    static async getUserProfile(accessToken) {
        const client = this.createClient(accessToken);
        const [profileResponse, emailResponse] = await Promise.all([
            client.get("/user"),
            client.get("/user/emails"),
        ]);
        const primaryEmail = emailResponse.data.find((email) => email.primary);
        return {
            id: String(profileResponse.data.id),
            login: String(profileResponse.data.login),
            avatarUrl: profileResponse.data.avatar_url,
            profileUrl: profileResponse.data.html_url,
            email: primaryEmail?.email ?? profileResponse.data.email,
        };
    }
    static async listRepositories(userId, page = 1, perPage = 20) {
        const client = await this.getAuthenticatedClient(userId);
        const response = await client.get("/user/repos", {
            params: {
                page,
                per_page: perPage,
                sort: "updated",
            },
        });
        return response.data;
    }
    static async getRepositoryContents(params) {
        const client = await this.getAuthenticatedClient(params.userId);
        const response = await client.get(`/repos/${params.owner}/${params.repo}/contents/${params.path ?? ""}`, {
            params: {
                ref: params.ref,
            },
        });
        return response.data;
    }
    static async cloneRepositoryAsZip(params) {
        const client = await this.getAuthenticatedClient(params.userId);
        const response = await client.get(`/repos/${params.owner}/${params.repo}/zipball/${params.branch ?? "main"}`, {
            responseType: "arraybuffer",
        });
        return Buffer.from(response.data);
    }
    static async createRepository(params) {
        const client = await this.getAuthenticatedClient(params.userId);
        const response = await client.post("/user/repos", {
            name: params.name,
            description: params.description,
            private: params.isPrivate ?? true,
            auto_init: params.autoInit ?? true,
        });
        return response.data;
    }
    static async getBranches(userId, owner, repo) {
        const client = await this.getAuthenticatedClient(userId);
        const response = await client.get(`/repos/${owner}/${repo}/branches`);
        return response.data;
    }
    static async getCommits(userId, owner, repo, branch) {
        const client = await this.getAuthenticatedClient(userId);
        const response = await client.get(`/repos/${owner}/${repo}/commits`, {
            params: {
                sha: branch,
            },
        });
        return response.data;
    }
    static async importRepository(params) {
        const client = await this.getAuthenticatedClient(params.userId);
        const branch = params.branch ?? "main";
        const treeResponse = await client.get(`/repos/${params.owner}/${params.repo}/git/trees/${branch}`, {
            params: {
                recursive: 1,
            },
        });
        const tree = treeResponse.data?.tree;
        const files = tree.filter((node) => node.type === "blob");
        const directories = tree.filter((node) => node.type === "tree");
        const limitedFiles = files.slice(0, 400);
        const fileContents = await Promise.all(limitedFiles.map(async (file) => {
            const blobResponse = await client.get(`/repos/${params.owner}/${params.repo}/git/blobs/${file.sha}`);
            const content = Buffer.from(blobResponse.data.content, "base64").toString("utf8");
            return {
                path: file.path,
                content,
                size: file.size ?? content.length,
            };
        }));
        return {
            owner: params.owner,
            repo: params.repo,
            branch,
            directories,
            files: fileContents,
            truncated: files.length > limitedFiles.length,
            originalFileCount: files.length,
        };
    }
    static async pullLatestChanges(params) {
        return this.importRepository(params);
    }
    static async pushCode(userId, payload) {
        const client = await this.getAuthenticatedClient(userId);
        const conflicts = [];
        const committed = [];
        for (const file of payload.files) {
            try {
                let sha;
                try {
                    const existing = await client.get(`/repos/${payload.owner}/${payload.repo}/contents/${file.path}`, {
                        params: { ref: payload.branch },
                    });
                    sha = existing.data.sha;
                }
                catch (error) {
                    if (error?.response?.status !== 404) {
                        throw error;
                    }
                }
                await client.put(`/repos/${payload.owner}/${payload.repo}/contents/${file.path}`, {
                    message: payload.message,
                    content: Buffer.from(file.content, "utf8").toString("base64"),
                    branch: payload.branch,
                    sha,
                });
                committed.push(file.path);
            }
            catch (error) {
                if (error?.response?.status === 409) {
                    conflicts.push(file.path);
                    if (!payload.force) {
                        continue;
                    }
                }
                else {
                    throw error;
                }
            }
        }
        return {
            committed,
            conflicts,
            hasConflicts: conflicts.length > 0,
        };
    }
    static async switchBranch(params) {
        const branches = await this.getBranches(params.userId, params.owner, params.repo);
        const target = branches.find((branch) => branch.name === params.branch);
        if (!target) {
            throw new httpError_1.HttpError(404, "Branch not found");
        }
        return {
            activeBranch: target.name,
            commitSha: target.commit?.sha,
        };
    }
}
exports.GitHubService = GitHubService;
