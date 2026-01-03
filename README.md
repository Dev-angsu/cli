# @dev-angsu/cli

A powerful CLI tool designed to streamline developer workflows, featuring project scaffolding, AI-powered code reviews, and codebase context extraction for LLMs.

## Installation

```bash
npm install -g @dev-angsu/cli
```

Or run directly with npx:

```bash
npx @dev-angsu/cli <command>
```

## Configuration

For AI features (Review), you need to set up your environment variables.

1. Create a `.env` file in your project root (or set these in your CI environment):
   ```bash
   OPENAI_API_KEY=sk-...
   AI_BASE_URL=https://api.openai.com/v1/ # Optional, defaults to custom endpoint
   AI_MODEL=gpt-4 # Optional
   ```

## Commands

### 1. Create Project

Scaffold a new project structure quickly.

**Usage:**

```bash
dev-angsu create [name] [options]
# Alias
dev-angsu c [name]
```

**Options:**

- `-t, --type <type>`: Specify project type (Node.js, Python, Go).

**Examples:**

```bash
dev-angsu create my-app --type Node.js
dev-angsu c # Interactive mode
```

### 2. AI Code Review

Analyze your code changes using AI. Works locally on staged changes and in CI/CD pipelines.

**Usage:**

```bash
dev-angsu review
# Alias
dev-angsu r
```

**Local Mode:**

- Reviews changes currently staged in git (`git add .`).
- Prints feedback to the console.

**CI/CD Mode (GitHub Actions):**

- Automatically detects if running in a PR or Push event.
- Posts comments directly to the Pull Request or Commit.

**GitHub Action Usage:**
Add this to your `.github/workflows/review.yml`:

```yaml
steps:
  - uses: actions/checkout@v3
  - uses: dev-angsu/cli@main
    with:
      openai_api_key: ${{ secrets.OPENAI_API_KEY }}
```

### 3. Copy Code Context

Prepare your codebase for Large Language Models (LLMs). Scans the directory, respects `.gitignore`, filters out binary files/noise, and copies the context to your clipboard.

**Usage:**

```bash
dev-angsu copycode [options]
# Alias
dev-angsu cp
```

**Options:**

- `-o, --output <file>`: Save the result to a file instead of the clipboard.
- `-d, --dry-run`: Preview the file list and token estimation without copying.

**Examples:**

```bash
# Copy current directory context to clipboard
dev-angsu cp

# Save context to a markdown file
dev-angsu cp --output context.md

# Check what files will be included
dev-angsu cp --dry-run
```

## Features

- **Smart Filtering**: Automatically ignores `node_modules`, `.git`, lock files, and binary files.
- **Safety Checks**: Warns before copying massive payloads (>500KB) to the clipboard.
- **Token Estimation**: Provides a rough token count for LLM context windows.
