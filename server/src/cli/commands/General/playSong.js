import { Command } from "commander";
import { exec } from "child_process";
import chalk from "chalk";

const playAction = (songParts) => {
  const song = songParts.join(" ");
  const encoded = encodeURIComponent(song);

  console.log(chalk.green(`🎵 Searching "${song}" on Spotify ...`));

  exec(`start /min "" spotify:search:${encoded}`);
};

export const play = new Command("play")
  .description("Search and open Spotify minimized")
  .argument("<song...>", "Song name to search")
  .action(playAction);
