import { Command } from "commander";
import { exec } from "child_process";
import chalk from "chalk";

const searchYoutubeAction = (query) => {
  if (!query) {
    console.log(chalk.red("Please provide a search query."));
    return;
  }

  const encodedQuery = encodeURIComponent(query);  //removes the special characters so that url does not break
  const url = `https://www.youtube.com/results?search_query=${encodedQuery}`;

  console.log(chalk.green(`Searching YouTube for: "${query}"`));
  exec(`start "" "${url}"`);
};

export const search = new Command("search")
  .description("Search videos on YouTube")
  .argument("<query>", "Search term")
  .action(searchYoutubeAction);
