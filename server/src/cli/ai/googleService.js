import {google} from "@ai-sdk/google";
import {streamText} from "ai";
import {config} from "../../config/googleConfig.js";
import chalk from "chalk"



export class AIService{
    constructor(){
        if(!config.googleApiKey){
            throw new Error("GOOGLE_API_KEY is not set in env")
        }

        this.model = google(config.model , {
            apiKey : config.googleApiKey,
        })
    }

    /**
     * Send a message and get streaming responses
     * @params {Array} messages
     * @params {Functions} onChunk
     * @params {Object} tools
     * @params {Functions} onToolCall
     * @return {Promise<Object>}
     */

    async sendMessage(messages , onChunk , tools = undefined , onToolCall = null ){
        try{
            const streamConfig = {
                model : this.model ,
                messages: messages , 
                temperature : config.temperature
            }

            if(tools && Object.keys(tool).length > 0){
                streamConfig.tools = tools ;
                streamConfig.maxStep = 5 ;

                console.log(chalk.gray(`[DEBUG] Tools enabled : ${Obkect.keys(tools).join(',')}`));
            }

            const result = streamText(streamConfig);

            let fullResponse = "" ;

            for await (const chunk of result.textStream){
                fullResponse += chunk;
                if(onChunk){
                    onChunk(chunk)
                }
            }
            const toolsCalls = [];
            const toolResults = [];

            if(fullResult.steps && Array.isArray(fullResult.steps)){
                for(const step of fullResult.steps){
                    if(step.toolCalls && step.toolCalls.length >0){
                        for(const toolCall of step.toolCalls){
                            toolCalls/push(toolCall);

                            if(onToolCall){
                                onToolCall(toolCall)
                            }
                        }
                    }
                    if(step.toolResults && step.toolResults.length > 0){
                        toolResult.push(...step.toolResults)
                    }
                }
            }
             
             return {
                content : fullResponse ,
                finishResponse: result.finishReason,
                usage : result.usage,
                toolCalls ,
                toolResults,
                steps: fullResult.steps
             };
        }
        catch(error){
            console.error(chalk.red("AI Service Error:"), error.message);
            throw error ;
        }
    }

    /**
     *  Get a non-streaming response 
     * @params {Array} messages - Array of message objects 
     * @params {Objects} tools - Optional tools 
     * @return {Promise<String>} response Text
     */

    async getMessage(messages , tools = undefined){
        let fullResponse = "";
       const result = await this.sendMessage(messages , (chunks)=>{
            fullResponse += chunks;
        } , tools)

        return result.content ;
    }
}