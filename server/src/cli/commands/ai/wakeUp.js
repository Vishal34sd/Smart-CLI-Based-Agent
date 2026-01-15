import chalk from "chalk";
import {Command} from "commander";
import yoctoSpinner  from "yocto-spinner";
import {getStoredToken} from "../../../lib/token.js"
import prisma from "../../../lib/db.js"
import { ensureDbConnection } from "../../../lib/dbHealth.js";
import {select} from "@clack/prompts";
import {startChat} from "../../../cli/chat/chat-with-ai.js";
import {startToolChat} from "../../../cli/chat/chat-with-ai-tools.js";


const wakeUpAction = async()=>{
    const token = await getStoredToken();
     if(!token?.access_token){
        console.log(chalk.red("Not Authenticated. please login"))
        return ;
     }

      const dbOk = await ensureDbConnection();
      if(!dbOk){
          return;
      }

     const spinner = yoctoSpinner({text: "Fetching user information ..."})
     spinner.start()

     let user;
     try{
        user = await prisma.user.findFirst({
            where : {
                sessions : {
                    some : {
                        token : token.access_token
                    }
                }
            },
            select : {
                id : true ,
                name : true ,
                email : true ,
                image : true 
            }
        });
     }
     finally{
        spinner.stop();
     }

     if(!user){
        console.log(chalk.red("User not found."))
        return ;
     }

     console.log(chalk.green(`Welcome back, ${user.name}! \n`));

     const choice = await select({
        message : "Select an Option",
        options : [
            {
                value : "chat",
                label: "Chat",
                hint : "Simple chat with AI"
            },
            {
                value : "tool",
                label: "Tool Calling",
                hint : "Chat with tools (Google Search , Code Execution"
            },
            {
                value : "agent",
                label: "Agentic Mode",
                hint : "Advanced AI Agent"
            },
        ]
     });

     switch(choice){
        case "chat":
            await startChat("chat");
            break ;
        case "tool":
            await startToolChat();
            break ;
        case "agent":
            console.log(chalk.green("Agentic mode  is selected"))
            break ;
     }
}

export const wakeUp = new Command("wakeup").
description("Wake up the AI").
alias("wake-up").
alias("wakup").
action(wakeUpAction)