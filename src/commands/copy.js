import { getValidFiles } from "../utils/file-reader.js";
import clipboardy from "clipboardy";
import fs from "fs";
import path from "path";
import ora from "ora";
import chalk from "chalk";
import inquirer from "inquirer";

export async function copyCode(dir = process.cwd(), options = {}) {
  const spinner = ora("Scanning directory...").start();

  try {
    const files = await getValidFiles(dir);

    if (files.length === 0) {
      spinner.fail("No valid files found to copy.");
      return;
    }

    spinner.text = `Processing ${files.length} files...`;

    let output = "";
    let tokenCount = 0;

    // Generate Tree Structure for context
    const tree = files.join("\n");

    for (const file of files) {
      const content = fs.readFileSync(path.join(dir, file), "utf-8");
      // Wrap in Markdown code blocks with filename
      if (!options.dryRun) {
        output += `\n\n# File: ${file}\n\`\`\`\n${content}\n\`\`\``;
      }
      tokenCount += content.length / 4; // Rough estimate (1 token ~= 4 chars)
    }

    if (options.dryRun) {
      spinner.succeed(chalk.green("Dry run complete."));
      console.log(chalk.bold("\nFile Structure:"));
      console.log(tree);
    } else {
      // Final Payload
      const finalOutput = `# Project Context\n\n## File Structure\n\`\`\`\n${tree}\n\`\`\`\n${output}`;

      if (options.output) {
        fs.writeFileSync(path.join(dir, options.output), finalOutput);
        spinner.succeed(chalk.green(`Context saved to ${options.output} 📝`));
      } else {
        const LARGE_FILE_LIMIT = 500000; // ~500KB
        if (finalOutput.length > LARGE_FILE_LIMIT) {
          spinner.stop();
          console.log(
            chalk.yellow(
              `\n⚠️  Warning: Output is large (${Math.round(
                finalOutput.length / 1024
              )}KB).`
            )
          );

          const { proceed } = await inquirer.prompt([
            {
              type: "confirm",
              name: "proceed",
              message: "Copying this might freeze your clipboard. Proceed?",
              default: false,
            },
          ]);

          if (!proceed)
            return console.log(
              chalk.blue("Aborted. Try using --output <file> instead.")
            );
          spinner.start("Copying to clipboard...");
        }

        await clipboardy.write(finalOutput);
        spinner.succeed(chalk.green("Context copied to clipboard! 📋"));
      }
    }
    console.log(chalk.dim(`\nStats:`));
    console.log(chalk.dim(`- Files: ${files.length}`));
    console.log(chalk.dim(`- Est. Tokens: ~${Math.round(tokenCount)}`));
  } catch (error) {
    spinner.fail("Failed to copy context.");
    console.error(error);
  }
}
