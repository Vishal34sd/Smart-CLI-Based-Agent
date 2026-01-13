import chalk from "chalk";
import boxen from "boxen";
import {text , isCncel , cancel , intro , outro }from "@clack/prompts";
import yoctoSpinner from "yocto-spinner";
import {marked} from "marked";
import {markedTerminal} from "marked-terminal";
import {AIService} from "../ai/googleService.js";
import {ChatService} from "../../service/chatService.js"
import {getStoredToken} from "../../lib/token.js";
import prisma from "../../lib/db.js"

marked.use(
    markkedTerminal({
        code : chalk.cyan ,
        blockquote : chalk.gray.italic ,
        heading : chalk.green.bold ,
        firstHeading: chalk.magenta.underline.bold ,
        hr : chalk.reset ,
        listitem : chalk.reset ,
        list : chalk.reset ,
        paragraph : chalk.reset ,
        strong : chalk.bold ,
        em : chalk.italic ,
        codespan : chalk.yellow.bgBlack , 
        del : chalk.dim.gray.strikethrough ,
        link : chalk.blue.underline ,
        href : chalk.blue.underline
    })
)

const aiService = new AIService();
const chatService = new ChatService();

const getUserFromToken = async()=>{
    const token = await getStoredToken()
    if(!token?.access_token){
        throw new Error("Not authenticated. Please run 'orbital login' first.");
    }

    const spinner = yoctoSpinner({text: "Authenticating..."}).start();
    const user = await prisma.user.findFirst({
        where : {
            sessions : {
            some : {token : token.access_token} ,
        }}
    });
    if(!user){
        spinner.error("User not found");
            throw new Error("User not found. Please login again");     
    }
    spinner.success(`Welcome back , ${user.name}!`);
    return user;
}

export const startChat = async(mode="chat" , conversationId = null)=>{
    try{
        intro(
            boxen(chalk.bold.cyan("Orbital AI Chat") , {
                padding: 1 ,
                borderStyle : "double",
                borderColor: "cyan"
            })
        )

        const user = await getUserFromToken()
        const conversation = await initConversation(user.id , conversationId , mode);
        await chatLoop(conversation)

        outro(chalk.green("Thanks for chatting"))
    }
    catch(error){
        const errorBox = boxen(chalk.red(`Error: ${error.message}`),{
            padding : 1 ,
            margin : 1 ,
            borderStyle : "round",
            borderColor : "red",
          
        });
        console.log(errorBox);
        process.exit(1);
    }
}