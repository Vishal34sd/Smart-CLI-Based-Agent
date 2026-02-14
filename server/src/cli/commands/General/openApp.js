import chalk from "chalk";
import { Command } from "commander";
import yoctoSpinner from "yocto-spinner";
import { getStoredToken } from "../../../lib/token.js";
import prisma from "../../../lib/db.js";
import { ensureDbConnection } from "../../../lib/dbHealth.js";
import { select } from "@clack/prompts";
import {openGithub , openLinkedin ,  openLeetcode , openGmail} from "../../../cli/generalApp/Apps.js"

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

  const choice = await select({
    message: "Select the app to open",
    options: [
      {
        value: "github",
        label: "GitHub",
        hint: "View repositories, profile & open projects",
      },
      {
        value: "gmail",
        label: "Gmail",
        hint: "Check emails and manage inbox quickly",
      },
      {
        value: "leetcode",
        label: "LeetCode",
        hint: "Practice coding problems and contests",
      },
      {
        value: "linkedin",
        label: "LinkedIn",
        hint: "View connections and job updates",
      },
    ],
  });

  switch (choice) {
  case "github":
    await openGithub();
    break;

  case "gmail":
    await openGmail();
    break;

  case "leetcode":
    await openLeetcode();
    break;

  case "linkedin":
    await openLinkedin();
    break;

  default:
    console.log(chalk.red("Invalid choice."));
}
}

export const launch = new Command("launch")
  .description("Open external apps like GitHub, YouTube, etc.")
  .alias("open")
  .action(openAppAction);
