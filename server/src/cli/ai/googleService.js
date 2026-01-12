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

            const result = streamText(streamConfig);

            let fullResponse = "" ;

            for await (const chunk of result.textStream){
                fullResponse += chunk;
                if(onChunk){
                    onChunk(chunk)
                }
            }

             
             return {
                content : fullResponse ,
                finishResponse: result.finishReason,
                usage : result.usage
             }
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
        await this.sendMessage(messages , (chunks)=>{
            fullResponse += chunks
        })

        return fullResponse ;
    }
}