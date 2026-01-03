#!/usr/bin/env node
import { createRequire } from "module";
const require = createRequire(import.meta.url);

const packageJson = require("../package.json");

import { Command } from "commander";
import inquirer from "inquirer";
import chalk from "chalk";
import ora from "ora";
import fs from "fs";

import { run as review } from "../src/utils/engine.js";
import { copyCode } from "../src/commands/copy.js";

const program = new Command();

// 1. Metadata
program
  .name("cli")
  .description("A CLI to demonstrate industry")
  .version("1.0.1");

// 2. Define a Command
program
  .command("create")
  .alias("c")
  .description("Create a new project file")
  .argument("[name]", "Name of the project") // Optional argument
  .option("-t, --type <type>", "Type of project (node/python)")
  .action(async (name, options) => {
    // 3. Interactivity (If args are missing, ask for them)
    let answers = {};
    if (!name || !options.type) {
      answers = await inquirer.prompt([
        {
          type: "input",
          name: "projectName",
          message: "What is the project name?",
          default: name || "my-project",
          when: !name, // Only ask if name wasn't passed as arg
        },
        {
          type: "list",
          name: "projectType",
          message: "Pick a template:",
          choices: ["Node.js", "Python", "Go"],
          when: !options.type,
        },
      ]);
    }

    const finalName = name || answers.projectName;
    const finalType = options.type || answers.projectType;

    // 4. Feedback (Spinners)
    const spinner = ora(
      `Scaffolding ${finalType} project: ${finalName}...`
    ).start();

    try {
      // Simulate work (e.g., copying files, git clone)
      await new Promise((resolve) => setTimeout(resolve, 2000));

      // Write a dummy file
      fs.writeFileSync(`${finalName}.txt`, `Project Type: ${finalType}`);

      // 5. Success Message (Colored)
      spinner.succeed(
        chalk.green(`Successfully created project: ${chalk.bold(finalName)}`)
      );
    } catch (error) {
      spinner.fail(chalk.red("Failed to create project."));
      console.error(error);
      process.exit(1); // Standard error exit code
    }
  });

// 3. Review Command
program
  .command("review")
  .alias("r")
  .description("Review staged changes using AI")
  .action(async () => {
    await review();
  });

// 4. Copy Code Command
program
  .command("copycode")
  .alias("cp")
  .description("Copy codebase context to clipboard for LLMs")
  .option("-o, --output <file>", "Output result to a file instead of clipboard")
  .option("-d, --dry-run", "Dry run: only list files and stats")
  .action(async (options) => {
    await copyCode(process.cwd(), options);
  });

// 6. Parse Arguments
program.parse(process.argv);
