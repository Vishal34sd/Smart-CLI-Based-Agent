const openGithub = async () => {
  await open("https://github.com");
  console.log(chalk.green("Opening GitHub..."));
};

const openYoutube = async () => {
  await open("https://youtube.com");
  console.log(chalk.green("Opening YouTube..."));
};

const openLeetcode = async () => {
  await open("https://leetcode.com");
  console.log(chalk.green("Opening LeetCode..."));
};

const openLinkedin = async () => {
  await open("https://linkedin.com");
  console.log(chalk.green("Opening LinkedIn..."));
};
