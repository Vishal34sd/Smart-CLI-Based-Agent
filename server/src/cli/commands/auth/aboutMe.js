import chalk from "chalk";
import { cancel, confirm, intro, outro, isCancel } from "@clack/prompts";
import { Command } from "commander";

export const whoAmIAction = async()=>{
    const token = await requiredAuth();
    if(!token?.access_token){
        console.log("No access token found . Please login.");
        process.exit(1);
    }

    const user = await prisma.user.findFirst({
        where: {
            sessions : {
                some: {
                    token: token.access_token,
                },
            }
        },
        select : {
            id: true ,
            name : true ,
            email: true ,
            
        }
    })
}