#!/usr/bin/env node

import "../config/env.js";
import chalk from "chalk";
import figlet from "figlet";
import {Command} from "commander";
import {login} from "./commands/auth/login.js"
import {logout} from "./commands/auth/logout.js"
import {whoAmI} from "./commands/auth/aboutMe.js"
import {wakeUp} from "./commands/ai/wakeUp.js"

const main = async()=>{

    console.log(
        chalk.cyan(
            figlet.textSync("Orbital CLI", {
                font: "Standard",
                horizontallyLayout : "default"})
        )
    )

    console.log(chalk.red(" A CLI Based AI Tool \n"));

    const program = new Command("orbital");

    program.version("0.0.1").
    description("Orbital CLI - A CLI Based AI Tool").
    addCommand(login).
    addCommand(logout).
    addCommand(whoAmI).
    addCommand(wakeUp)

    program.action(()=>{
        program.help();
    });

    program.parse();
}

main().catch((err)=>{
    console.log(chalk.red("Error running orbital CLI : " , err));
    process.exit(1);
})
