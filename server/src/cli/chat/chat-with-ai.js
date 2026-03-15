import chalk from "chalk";
import boxen from "boxen";
import {text , isCancel , cancel , intro , outro }from "@clack/prompts";
import yoctoSpinner from "yocto-spinner";
import {marked} from "marked";
import {markedTerminal} from "marked-terminal";
import {getStoredToken} from "../../lib/token.js";
import { apiRequestSafe } from "../utils/apiClient.js";
import { AIService } from "../ai/googleService.js";
import { requireGeminiApiKey } from "../../lib/orbitalConfig.js";

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
)

const getUserFromToken = async()=>{
    const token = await getStoredToken()
    if(!token?.access_token){
        throw new Error("Not authenticated. Please run 'orbital login' first.");
    }

    const spinner = yoctoSpinner({text: "Authenticating..."}).start();
    try {
        const result = await apiRequestSafe("/api/cli/me");
        const user = result?.user;
        if(!user){
            spinner.error("User not found");
            throw new Error("User not found. Please login again");
        }
        spinner.success(`Welcome back , ${user.name}!`);
        return user;
    } finally {
        spinner.stop();
    }
}

const initConversation = async(userId , conversationId = null , mode = "chat")=>{
    const spinner = yoctoSpinner({text : "Loading conservation ..."}).start();

    const result = await apiRequestSafe("/api/cli/conversations/init", {
        method: "POST",
        body: { conversationId, mode },
    });
    const conversation = result?.conversation;
    const messages = result?.messages || [];
    spinner.success("Conversation Loaded");

    const conversationInfo = boxen(
        `${chalk.bold("Conversation")} : ${conversation.title}\n ${chalk.gray("ID: " + conversation.id)} \n ${chalk.gray("Mode: " + conversation.mode)}`,
        {
            padding : 1 ,
            margin : {top: 1 , bottom : 1} ,
            borderStyle : "round" ,
            borderColor : "cyan" ,
            title : "Chat Settion",
            titleAlignment : "center"
        }
    );
    console.log(conversationInfo);

    if(messages.length > 0){
        console.log(chalk.yellow("Previous Messsages: \n"));
        displayMessages(messages);
    }

    return conversation ;
}

const displayMessages = (messages) => {
  messages.forEach((msg) => {
    if (msg.role === "user") {
      const userBox = boxen(chalk.white(msg.content), {
        padding: 1,
        margin: { left: 2, bottom: 1 },
        borderStyle: "round",
        borderColor: "blue",
        title: "You",
        titleAlignment: "left",
      });
      console.log(userBox);
    } else {
      const renderedContent = marked.parse(msg.content);
      const assistantBox = boxen(renderedContent.trim(), {
        padding: 1,
        margin: { left: 2, bottom: 1 },
        borderStyle: "round",
        borderColor: "green",
        title: "Assistant",
        titleAlignment: "left",
      });
      console.log(assistantBox);
    }
  });
};

const saveMessage = async(conversationId , role , content) =>{
    return await apiRequestSafe("/api/cli/messages", {
        method: "POST",
        body: { conversationId, role, content },
    });
}

const getAIResponse  = async(conversationId)=>{
    const spinner = yoctoSpinner({
        text : "AI is thinking...",
        color: "cyan"
    }).start();

    let fullResponse = "";
     try{
        const messageResult = await apiRequestSafe(
            `/api/cli/messages?conversationId=${encodeURIComponent(conversationId)}`,
            { method: "GET" }
        );

        const messages = Array.isArray(messageResult?.messages) ? messageResult.messages : [];
        const aiMessages = messages.map((m) => ({ role: m.role, content: m.content }));

        await requireGeminiApiKey();
        const aiService = new AIService();
        const result = await aiService.sendMessage(aiMessages);

        spinner.stop();
        console.log("\n");
        const header = chalk.green.bold("Assistent: ");
        console.log(header);
        console.log(chalk.gray("-".repeat(60)));

        fullResponse = result?.content || "";
        console.log("\n");
        const renderMarkdown = marked.parse(fullResponse);
        console.log(renderMarkdown);
        console.log(chalk.gray("-".repeat(60)));
        console.log("\n");

        return fullResponse ;
     }
     catch(error){
        spinner.error("Failed to get AI response");
        throw error ;
     }
}

const updateConversationTitle = async(conversationId , userInput , messageCount)=>{
    if(messageCount ===1){
        const title = userInput.slice(0,50) + (userInput.length > 50 ? "..." : "");
        await apiRequestSafe(`/api/cli/conversations/${conversationId}/title`, {
            method: "PATCH",
            body: { title },
        });
    }
}

const chatLoop = async(conversation)=>{
    const helpBox = boxen(
        `${chalk.gray(`* Type your message and press Enter`)}\n ${chalk.gray(`* Markdown formatting is supported in response`)}
        \n${chalk.gray(`*Type "exit" to end conversation`)}\n ${chalk.gray(`*Please ctrl + C to quit anytime`)}`,
        {
            padding : 1 ,
            margin : {bottom : 1},
            borderStyle : "round" ,
            borderColor : "gray" ,
            dimBorder : true
        }
    );
    console.log(helpBox);

    while(true){
        const userInput = await text({
            message: chalk.blue("Your message"),
            placeholder : "Type your message...",
            validate(value){
                if(!value || value.trim().length ===0){
                    return "Message cannot be empty";
                }
            },
        });

        if(isCancel(userInput)){
            const exitBox = boxen(chalk.yellow("Chat session ended. GoodBye! "),{
            padding : 1 ,
            margin : 1,
            borderStyle : "round" ,
            borderColor : "yellow" ,
            });
            console.log(exitBox);
            process.exit(0);
        }
        if(userInput.trim().toLowerCase() === "exit"){
            const exitBox = boxen(chalk.yellow("Chat session ended. GoodBye! "),{
            padding : 1 ,
            margin : 1,
            borderStyle : "round" ,
            borderColor : "yellow" ,
            });
            console.log(exitBox);
            break ;
        }
        await saveMessage(conversation.id ,  "user" , userInput);
        const messageResult = await apiRequestSafe(
            `/api/cli/messages?conversationId=${encodeURIComponent(conversation.id)}`,
            { method: "GET" }
        );

        const aiResponse = await getAIResponse(conversation.id);
        await saveMessage(conversation.id ,  "assistant" , aiResponse);

        await updateConversationTitle(
            conversation.id ,
            userInput ,
            messageResult?.messages?.length || 0
        )
    }
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