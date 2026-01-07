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

    console.log(chalk.red(" A CLI Based AI Tool \n"))
}

main();
