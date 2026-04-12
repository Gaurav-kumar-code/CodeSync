"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.evaluateAgainstTestCases = exports.runOneCompiler = exports.buildFilesPayload = void 0;
const axios_1 = __importDefault(require("axios"));
const FILE_MAP = {
    python: "main.py",
    javascript: "index.js",
    java: "Main.java",
    cpp: "main.cpp",
    html: "index.html",
    react: "App.js",
    vue: "App.vue",
    angular: "main.ts",
};
const normalizeOutput = (value) => value
    .replace(/\r\n/g, "\n")
    .trim();
const getExecutionOutput = (data) => {
    if (data?.stdout)
        return String(data.stdout);
    if (data?.stderr)
        return String(data.stderr);
    if (data?.exception)
        return String(data.exception);
    if (data?.error)
        return String(data.error);
    return "";
};
const buildFilesPayload = (language, code, files) => {
    if (files && files.length > 0) {
        return files;
    }
    return [
        {
            name: FILE_MAP[language] || "main.txt",
            content: code,
        },
    ];
};
exports.buildFilesPayload = buildFilesPayload;
const runOneCompiler = async ({ code, language, input, files, }) => {
    const response = await axios_1.default.post("https://api.onecompiler.com/v1/run", {
        language,
        stdin: input || "",
        files: (0, exports.buildFilesPayload)(language, code, files),
    }, {
        headers: {
            "Content-Type": "application/json",
            "X-API-Key": process.env.ONECOMPILER_API_KEY,
        },
    });
    return response.data;
};
exports.runOneCompiler = runOneCompiler;
const evaluateAgainstTestCases = async ({ code, language, testCases, mode, files, }) => {
    const selectedCases = mode === "submit"
        ? testCases
        : testCases.filter((testCase) => !testCase.hidden);
    const runnableCases = selectedCases.length > 0 ? selectedCases : testCases;
    const results = await Promise.all(runnableCases.map(async (testCase, index) => {
        try {
            const executionResult = await (0, exports.runOneCompiler)({
                code,
                language,
                input: testCase.input,
                files,
            });
            const actualOutput = normalizeOutput(getExecutionOutput(executionResult));
            const expectedOutput = normalizeOutput(testCase.expectedOutput);
            const passed = actualOutput === expectedOutput;
            const isHidden = Boolean(testCase.hidden);
            return {
                id: testCase.id || `case-${index + 1}`,
                input: isHidden && mode === "submit"
                    ? "[hidden]"
                    : testCase.input,
                expectedOutput: isHidden && mode === "submit"
                    ? "[hidden]"
                    : testCase.expectedOutput,
                actualOutput,
                passed,
                hidden: isHidden,
            };
        }
        catch (error) {
            return {
                id: testCase.id || `case-${index + 1}`,
                input: testCase.input,
                expectedOutput: testCase.expectedOutput,
                actualOutput: "",
                passed: false,
                hidden: Boolean(testCase.hidden),
                error: error?.response?.data?.message ||
                    error?.response?.data?.error ||
                    error?.message ||
                    "Execution failed",
            };
        }
    }));
    const passedCount = results.filter((result) => result.passed).length;
    return {
        mode,
        verdict: passedCount === results.length ? "Passed" : "Failed",
        passedCount,
        totalCount: results.length,
        results,
    };
};
exports.evaluateAgainstTestCases = evaluateAgainstTestCases;
