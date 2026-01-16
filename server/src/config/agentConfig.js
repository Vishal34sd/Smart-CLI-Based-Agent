import { promises as fs } from "fs";
import path from "path";
import chalk from "chalk";
import { generateObject } from "ai";
import { z } from "zod";


const applicationSchema = z.object({
  folderName: z.string().describe("Kebab-Case folder name for the application"),
  description: z.string().describe("Brief description of what was created"),
  files: z.array(
    z.object({
      path: z.string().describe("Relative file path (e.g src/App.jsx)"),
      content: z.string().describe("Complete File Content")
    }).describe("All files needed for the application")
  ),
  setupCommands: z.array(
    z.string().describe("Bash commands to setup and run (e.g: npm install , npm run dev")
  ),
  dependencies: z.record(z.string()).optional().describe("NPM dependecies with versions")
});

const printSystem = (message) => {
  console.log(message);
}

const displayFileTree = (files, folderName) => {
  printSystem(chalk.cyan("📂 Project Structure:"));
  printSystem(chalk.white(`${folderName}/`));

  // Build a tree structure
  const tree = {};

  files.forEach((file) => {
    const parts = file.path.split("/");
    let current = tree;

    parts.forEach((part, index) => {
      if (!current[part]) {
        current[part] = index === parts.length - 1 ? null : {};
      }
      current = current[part];
    });
  });

  // Recursive print function
  function printTree(node, prefix = "") {
    const entries = Object.keys(node || {}).sort();

    entries.forEach((key, index) => {
      const isLast = index === entries.length - 1;
      const connector = isLast ? "└── " : "├── ";

      if (node[key] === null) {
        // file
        printSystem(chalk.white(`${prefix}${connector}${key}`));
      } else {
        // folder
        printSystem(chalk.gray(`${prefix}${connector}${key}/`));
        const newPrefix = prefix + (isLast ? "    " : "│   ");
        printTree(node[key], newPrefix);
      }
    });
  }

  printTree(tree, "  ");
}


export const generateApplication = async (description, aiService, cwd = process.cwd()) => {
  try {
    printSystem(chalk.cyan(`\n Agent Mode: Genrating your application...\n`));
    printSystem(chalk.gray(`Request: ${description}\n`));

    printSystem(chalk.magenta("Agent Response: \n"));

    const { object: application } = await genenateObject({
      model: aiService.model,
      schema: applicationSchema,
      prompt: `Create a complete, production-ready application for: {description}

CRITICAL REQUIREMENTS:
1. Generate ALL files needed for the application to run
2. Include package.json with ALL dependencies and correct versions
3. Include README.md with setup instructions
4. Include configuration files (.gitignore, etc.)
5. Write clean, well-commented, production-ready code
6. Include error handling and input validation
7. Use modern JavaScript/TypeScript best practices
8. Make sure all imports and paths are correct
9. NO PLACEHOLDERS - everything must be complete and working

Provide:
- A meaningful kebab-case folder name
- All necessary files with complete content
- Setup commands (cd folder, npm install, npm run dev, etc.)
- All dependencies with versions`

    });

    printSystem(chalk.green(`\n Generated: ${application.folderName}`));
    printSystem(chalk.green(`\n Description: ${application.description}`));

    if (application.files.length === 0) {
      throw new Error("No files were generated");
    }
    displayFileTree(application.files, application.folderName);

    printSystem(chalk.cyan("\n Creating files...\n"));
    
    const appDir  = await createApplicationFiles(
      cwd , 
      application.folderName ,
      application.files
    );

    printSystem(chalk.green.bold(`\n Application created successfully!`));
    printSystem(chalk.cyan(`Location: ${chalk.bold(appDir)}\n`));

    if(application.setupCommands.length > 0){
        printSystem(chalk.cyan(`Next Steps: \n`));
      printSystem(chalk.white("```bash"));
      application.setupCommands.forEach(cmd =>{
        printSystem(chalk.white(cmd))
      });

      printSystem(chalk.white("```\n"));
    }
  }
  catch (error) {

  }
}