import chalk from "chalk";
import boxen from "boxen";
import {text , isCancel , cancel , intro , outro , multiselect} from "@clack/prompts";
import yoctoSpinner from "yocto-spinner";
import {marked} from "marked";
import {markedTerminal} from "marked-terminal";
import {AIService} from "../ai/googleService.js";
import {chatService} from "../../service/chatService.js";
import {getStoredToken} from "../../lib/token.js";
import prisma from "../../lib/db.js";
import {
    availableTools ,
    getEnabledTools ,
    enableTools ,
    getEnabledToolNames ,
    resetTools
} from "../../config/toolConfig.js";
import {initConversation , chatLoop} from "../../cli/chat/chat-with-ai.js" 

marked.use(
    markedTerminal({
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
);

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

const selectTools = async()=>{
    const toolOptions = availableTools.map(tool =>({
        value : tool.id ,
        label : tool.name ,
        hint : tool.description
    }));

    const selectedTools = await multiselect({
        message : chalk.cyan("Select tools to enable (Space to select , Enter to confirm):"),
        options : toolOptions ,
        required : false ,
    });

    if(isCancel(selectTools)){
        cancel(chalk.yellow("Tool selection cancelled"))
        process.exit(0);
    }

    enableTools(selectedTools);
    if(selectTools.length === 0){
        console.log(chalk.yellow("\n No tools selected. AI will work without tools.\n"));

    }
    else{
        const toolBox = boxen(
            chalk.green(`Enabled tools: \n ${selectedTools.map(id =>{
                const tool = availableTools.find(t => t.id === id);
                return ` * ${tool.name}`;
            }).join(`\n`)}`),
            {
                padding : 1 ,
                margin : {top:1 , bottom : 1},
                borderStyle : "round",
                borderColor : "green",
                title : "Active Tools",
                titleAlignment : "center"
            }
        );
        console.log(toolBox);
    }
}

export const startToolChat = async (conversationId)=>{
    try{
        intro(
            boxen(chalk.bold.cyan("Orbital AI - Tool Calling Mode"), {
                padding : 1 ,
                borderStyle : "double",
                borderColor : "cyan"
            })
        );

        const user = await getUserFromToken();

        await selectTools();

        const conversation = await initConversation(user.id , conversation , "tool");
        await chatLoop(conversation);

        resetTools()

        outro(chalk.green("Thanks for using tools"));
    }
    catch(error){
        const errorBox = boxen(chalk.red(`Error: ${error.message}`), {
            padding : 1 ,
            margin : 1 ,
            borderStyle : "round",
            borderColor : "red"
        });
        console.log(errorBox);
        resetTools();
        process.exit(1);
    }
}


