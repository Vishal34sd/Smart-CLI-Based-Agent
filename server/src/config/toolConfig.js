import { google } from "@ai-sdk/google";
import chalk from "chalk";

export const availableTools = [
    {
        id: "google_search",
        name: "Google Search",
        description: "Acess the latest information using Google Search . Useful for current events , news , and real -time information
        , getTool: () => google.tools.googleSearch({}),
        enabled: false
    },
    {
        id: "code_execution",
        name: "Code Execution",
        description: " Generate and execute Python code to perform calculations , solve problems or provide accurate information "
        , getTool: () => google.tools.codeExecution({}),
        enabled: false
    },
    {
        id: "url_context",
        name: "URL Context",
        description: "Provide specific URLs that you want the model to analyse directly from the prompt. Supports up to 20 URLs per request. "
        , getTool: () => google.tools.urlContext({}),
        enabled: false
    }

]

export const getEnabledTools = ()=>{
    const tools = {};

    try{
        for(const toolConfig of availableTools){
            if(toolConfig.enabled){
                tools[toolConfig.id] = toolConfig.getTool()
            }
        }

        if(Object.keys(tools).length > 0){
            console.log(chalk.gray(`[DEBUG] Enabled tools: ${Object.keys(tools).join(',')}`));
        }
        else{
            console.log(chalk.yellow(`[DEBUG] No tools enabled`))
        }

        return Object.keys(tools).length > 0 ? tools : undefined ;

    }
    catch(error){
        console.error(chalk.red(`[ERROR] Failed to initialize tools: `), error.message);
        console.error(chalk.yellow(`Make sure you have @ai-sdk/google version 2.0+ installed`));
        console.error(chalk.yellow(`Run: npm install @ai-sdk/google@latest`));
        return undefined ;
    }
}

export const toogleTool = (toolId)=>{
    const tool = availableTools.find(t=>t.id === toolId)

    if(tool){
        tool.enabled = !tool.enabled
    }
}