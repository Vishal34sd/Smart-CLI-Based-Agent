import chalk from "chalk";
import { Command } from "commander";
import { requireAuth } from "../../../lib/token.js";

const DEFAULT_SERVER_URL = "https://smart-cli-based-agent.onrender.com";

export const whoAmIAction = async (cmdOptions = {})=>{
    const token = await requireAuth();
    if(!token?.access_token){
        console.log("No access token found . Please login.");
        process.exit(1);
    }

    const baseUrl =
        cmdOptions.serverUrl ||
        process.env.ORBITAL_SERVER_URL ||
        process.env.BACKEND_URL ||
        process.env.SERVER_URL ||
        DEFAULT_SERVER_URL;
    const authHeaderValue = token.token_type
        ? `${token.token_type} ${token.access_token}`
        : `Bearer ${token.access_token}`;

    let res;
    try {
        res = await fetch(`${baseUrl}/api/me`, {
            method: "GET",
            headers: {
                Authorization: authHeaderValue,
            },
        });
    } catch (err) {
        console.error(chalk.red(`Failed to reach server: ${baseUrl}`));
        console.error(
            chalk.gray(
                "Set `ORBITAL_SERVER_URL` (or pass `--server-url`) to your deployed backend, or start your local server.",
            ),
        );
        process.exit(1);
    }

    if (!res.ok) {
        const bodyText = await res.text().catch(() => "");
        console.error(
            chalk.red(
                `Failed to fetch session (${res.status} ${res.statusText}). ${bodyText}`.trim(),
            ),
        );
        process.exit(1);
    }

    const session = await res.json();
    const user = session?.user;

    if (!user) {
        console.log(chalk.yellow("No active session found on server."));
        process.exit(1);
    }

    console.log(chalk.green("Logged in as:"));
    console.log(chalk.gray(`id: ${user.id ?? "(unknown)"}`));
    if (user.name) console.log(chalk.gray(`name: ${user.name}`));
    if (user.email) console.log(chalk.gray(`email: ${user.email}`));
}

export const whoAmI = new Command("whoami")
  .description("Show the currently logged-in user")
    .option(
        "--server-url <url>",
        "Orbital server base URL (e.g. https://smart-cli-based-agent.onrender.com)",
        process.env.ORBITAL_SERVER_URL ||
            process.env.BACKEND_URL ||
            process.env.SERVER_URL ||
            DEFAULT_SERVER_URL,
    )
    .action(whoAmIAction);
