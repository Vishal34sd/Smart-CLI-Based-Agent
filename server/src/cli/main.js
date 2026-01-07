#!/usr/bin/env node

import dotenv from "dotenv" ;
import chalk from "chalk";
import figlet from "figlet";
import {Command} from "commander";

dotenv.config();

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
    description("Orbital CLI - A CLI Based AI Tool");

    program.action(()=>{
        program.help();
    });

    program.parse();
}

main().catch((err)=>{
    console.log(chalk.red("Error running orbital CLI : " , err));
    process.exit(1);
})
