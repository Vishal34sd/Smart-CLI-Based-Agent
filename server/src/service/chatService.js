import prisma from "../lib/db.js";

export class ChatService{

    /**
     * Create a new conversation
     * @param {string} userId - user id 
     * @param {string} mode - chat tool , or agent
     * @param {string} title - Optional conversation title
     */

    async createConversation(userId , mode ="chat" , title=null){
        return prisma.conversation.create({
            data : {
                userId ,
                mode ,
                title : title || `New ${mode} conversation`
            }
        });
    }

    /**
     * get or create a new conversation for user
     * @param {string} userId - user id 
     * @param {string} conversationalId - Optional conversation id
     * @param {string} mode - chat , tool or agent
     */

    async getOrCreateConversation(userId , conversationId =null , mode="chat"){
        if(conversationId){
            const conversation  = await prisma.conversation.findFirst({
                where : {
                    id: conversationId ,
                    userId
                },
                include : {
                    messages : {
                        orderBy :{
                            createdAt : "asc"
                        }
                    }
                }
            });

            if(conversation){
                return conversation ;
            }
        }
        return await this.createConversation(userId , mode)
    }

    /**
     * Add a  new message to conversation
     * @param {string} conversationalId - conversation id 
     * @param {string} role - user , assistant , system  ,tool
     * @param {string | object} content - message content
     */

    async addMessage(conversationId , role , content){

        const contentStr = typeof content === "string" ? content :
        JSON.stringify(content);

        return await prisma.message.create({
            data :{
                conversationId ,
                role ,
                content : contentStr
            }
    })
    }

    /**
     * Get conversion messages
     * @param {string} conversationId - conversational -id
     */

    async getMessages(conversationId){
        const messages = await prisma.message.findMany({
            where : {conversationId},
            orderBy : {createdAt : "asc"}
        });

        return messages.map((msg) => ({
            ...msg,
            content: this.parseContent(msg.content),
        }));
    }

    /**
     * @param {string} userI - user id
     */

    async getUserConversation(userId){
        return await prisma.conversation.findMany({
            where : {userId} ,
            orderBy :{updatedAt : "desc"},
            include :{
                messages : {
                    take : 1,
                    orderBy : {createdAt : "desc"}
                },
            },
        });
    }

    /**
     * @param {string} conversationId - Conversation ID
     * @param {string} userId - User ID 
     */

    async deleteConversation(conversationId , userId){
        return await prisma.conversation.deleteMany({
            where : {
                id : conversationId ,
                userId
            },
        });
    }

    /**
     * @param {string} conversationId - Conversation ID
     * @param {string} title - User ID 
     */

    async updateTitle(conversationId , title){
        return await prisma.conversation.update({
            where : {id : conversationId},
            data : {title}
        });
    }

    /**
     * Helper to parse content ( json to string)
     */

    parseContent(content){
        try{
            return JSON.parse(content);
        }
        catch{
            return content
        }
    }

    /**
     * @param {Array} messages - database messages
     */

    formatMessageForAI(messages){
        return messages.map((msg)=>({
            role : msg.role ,
            content : typeof msg.content === "string" ? msg.content : JSON.stringify(msg.content),
        }));
    }
}