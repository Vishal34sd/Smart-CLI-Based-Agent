import chalk from "chalk";
import { cancel, confirm, intro, outro, isCancel } from "@clack/prompts";
import { Command } from "commander";
import { clearStoredToken, getStoredToken } from "../../../lib/token.js";

export const logoutAction = async()=>{
    intro(chalk.bold("Logout"));

    const token = await getStoredToken();

    if(!token){
        console.log(chalk.yellow("You are not logged in."));
        process.exit(0);
    }

    const shouldLogout = await confirm({
        message : "Are you want to logout?" ,
        initialValue : false 
    });

    if(isCancel(shouldLogout) || !shouldLogout){
        cancel("Logout cancelled");
        process.exit(0);
    }

    const cleared = await clearStoredToken();

    if(cleared){
        outro(chalk.green("Successfully logged out!"));
    }
    else{
        console.log(chalk.yellow("Could not clear token file. "))
    }
}

export const logout = new Command("logout")
  .description("Logout from Better Auth")
  .action(logoutAction);
