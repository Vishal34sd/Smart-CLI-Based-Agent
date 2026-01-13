import chalk from "chalk";
import { Command } from "commander";
import { requireAuth } from "../../../lib/token.js";

export const whoAmIAction = async()=>{
    const token = await requireAuth();
    if(!token?.access_token){
        console.log("No access token found . Please login.");
        process.exit(1);
    }

    const baseUrl = process.env.BETTER_AUTH_BASE_URL || "http://localhost:8080";
    const authHeaderValue = token.token_type
        ? `${token.token_type} ${token.access_token}`
        : `Bearer ${token.access_token}`;

    const res = await fetch(`${baseUrl}/api/me`, {
        method: "GET",
        headers: {
            Authorization: authHeaderValue,
        },
    });

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
  .action(whoAmIAction);
