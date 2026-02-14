import { exec } from "child_process";
import chalk from "chalk";

const openApp = (url, name) => {
  console.log(chalk.green(`Opening ${name}...`));
  exec(`start "" "${url}"`);
};

export const openGithub = () => openApp("https://github.com", "GitHub");
export const openGmail = () => openApp("https://gmail.com", "Gmail");
export const openLeetcode = () => openApp("https://leetcode.com", "LeetCode");
export const openLinkedin = () => openApp("https://linkedin.com", "LinkedIn");

export const openWhatsApp = () => {
  exec("start whatsapp:", (err) => {
    if (err) {
      exec('start "" "https://web.whatsapp.com"');
    }
  });
};

