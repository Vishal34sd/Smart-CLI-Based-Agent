import chalk from "chalk";
import { Command } from "commander";
import yoctoSpinner from "yocto-spinner";
import { getStoredToken } from "../../../lib/token.js";
import prisma from "../../../lib/db.js";
import { ensureDbConnection } from "../../../lib/dbHealth.js";
import { select } from "@clack/prompts";
import {openGithub , openLinkedin ,  openLeetcode , openGmail , openWhatsApp} from "../../../cli/generalApp/Apps.js"

const openAppAction = async () => {
  const token = await getStoredToken();

  if (!token?.access_token) {
    console.log(chalk.red("Not Authenticated. Please login."));
    return;
  }

  const dbOk = await ensureDbConnection();
  if (!dbOk) return;

  const spinner = yoctoSpinner({ text: "Fetching user information..." });
  spinner.start();

  let user;
  try {
    user = await prisma.user.findFirst({
      where: {
        sessions: {
          some: {
            token: token.access_token,
          },
        },
      },
      select: {
        id: true,
        name: true,
        email: true,
        image: true,
      },
    });
  } finally {
    spinner.stop();
  }

  if (!user) {
    console.log(chalk.red("User not found."));
    return;
  }

  console.log(chalk.green(`Welcome back, ${user.name}!\n`));

  while (true) {
  const choice = await select({
    message: chalk.yellow("Select the app to open"),
    options: [
      { value: "github", label: "GitHub", hint: "View repositories & projects" },
      { value: "whatsapp", label: "WhatsApp", hint: "Open messaging app" },
      { value: "gmail", label: "Gmail", hint: "Check emails quickly" },
      { value: "linkedin", label: "LinkedIn", hint: "View connections & jobs" },
      { value: "leetcode", label: "LeetCode", hint: "Practice coding problems" },
      { value: "exit", label: "Exit", hint: "Close launcher" },
    ],
  });

  if (choice === "exit") {
    console.log(" Exiting launcher...");
    break;
  }

  switch (choice) {
    case "github":
      openGithub();
      break;
    case "gmail":
      openGmail();
      break;
    case "leetcode":
      openLeetcode();
      break;
    case "linkedin":
      openLinkedin();
      break;
    case "whatsapp":
      openWhatsApp();
      break;
  }
}
}

export const launch = new Command("launch")
  .description("Open external apps like GitHub, WhatsApp, etc.")
  .alias("open")
  .action(openAppAction);
