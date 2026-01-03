#!/usr/bin/env node

import { simpleGit } from "simple-git";
import OpenAI from "openai";
import { fileURLToPath } from "url";
import "dotenv/config"; // Loads .env file automatically

import * as core from "@actions/core";
import * as github from "@actions/github";

const git = simpleGit();

// async function getStagedDiff() {
//   const diff = await git.diff(["--staged"]);
//   return diff;
// }
// STRATEGY 1: Local Development
async function getLocalDiff() {
  console.log("💻 Running in Local Mode...");
  const git = simpleGit();
  const diff = await git.diff(["--staged"]);
  return diff;
}
// STRATEGY 2: GitHub Actions (CI/CD)
async function getPRDiff() {
  console.log("☁️ Running in GitHub Actions Mode...");

  // The 'GITHUB_TOKEN' is automatically provided by the workflow
  const token = process.env.GITHUB_TOKEN;
  const octokit = github.getOctokit(token);

  const context = github.context;
  const prNumber = context.payload.pull_request?.number;

  if (!prNumber) {
    throw new Error(
      "❌ No Pull Request found in context. Are you running this on push?"
    );
  }

  // Fetch the diff specifically
  const { data: diff } = await octokit.rest.pulls.get({
    owner: context.repo.owner,
    repo: context.repo.repo,
    pull_number: prNumber,
    mediaType: {
      format: "diff", // Ask GitHub to return the raw diff text
    },
  });

  return diff;
}

async function generateReview(diff) {
  // 1. Token Safety: Truncate if too huge (basic safety mechanism)
  const MAX_CHARS = 15000;
  const processedDiff =
    diff.length > MAX_CHARS
      ? diff.substring(0, MAX_CHARS) + "\n...[Diff Truncated due to size]..."
      : diff;

  console.log("🤔 Analyzing changes...");

  if (!process.env.OPENAI_API_KEY) {
    throw new Error("❌ Error: OPENAI_API_KEY is missing in .env file.");
  }

  const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
    baseURL: process.env.AI_BASE_URL || "https://api.z.ai/api/paas/v4/",
  });

  const response = await openai.chat.completions.create({
    model: process.env.AI_MODEL || "glm-4.6v-flash",
    messages: [
      {
        role: "system",
        content: `You are a Senior Software Engineer doing a Code Review.
        
        Rules:
        1. Summarize the changes in 1 sentence.
        2. Identify any critical bugs or security risks (SQL injection, hardcoded secrets).
        3. Suggest code style improvements (focus on readability).
        4. Generate a concise, conventional commit message for these changes.
        5. If the code looks good, output "LGTM" (Looks Good To Me) with a thumbs up.
        
        Format your response in nice Markdown.`,
      },
      {
        role: "user",
        content: `Here is the git diff of the changes:\n\n${processedDiff}`,
      },
    ],
  });

  return response.choices[0].message.content;
}

// Main Execution
export async function run() {
  try {
    // const diff = await getStagedDiff();
    // 1. SELECT STRATEGY
    let diff;
    if (process.env.CI) {
      diff = await getPRDiff();
    } else {
      diff = await getLocalDiff();
    }

    if (!diff) {
      console.log("⚠️ No staged changes found. Did you run 'git add'?");
      return;
    }

    const review = await generateReview(diff);
    if (process.env.CI) {
      // In CI, we post a comment back to the PR
      const token = process.env.GITHUB_TOKEN;
      const octokit = github.getOctokit(token);
      const context = github.context;

      await octokit.rest.issues.createComment({
        owner: context.repo.owner,
        repo: context.repo.repo,
        issue_number: context.payload.pull_request.number,
        body: review,
      });
      console.log("✅ Review posted to GitHub PR!");
    } else {
      // Locally, we just print it
      console.log("\n================ 🤖 AI CODE REVIEW ================ \n");
      console.log(review);
      console.log("\n=================================================== \n");
    }
  } catch (error) {
    console.error("Error:", error.message);
    if (process.env.CI) core.setFailed(error.message); // Fail the pipeline
  }
}

const currentFile = fileURLToPath(import.meta.url);
// Check if run directly (robust against symlinks/path variations in CI)
if (
  process.argv[1] === currentFile ||
  process.argv[1].endsWith("src/utils/engine.js") ||
  process.argv[1].endsWith("review-code")
) {
  run();
}
