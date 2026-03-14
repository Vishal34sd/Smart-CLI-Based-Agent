
import chalk from "chalk";
import { ORBITAL_CONFIG_FILE, readOrbitalConfig, updateOrbitalConfig } from "./orbitalConfig.js";

export const TOKEN_FILE = ORBITAL_CONFIG_FILE;

export const getStoredToken = async ()=>{
    try{
        const config = await readOrbitalConfig();
        const token = config?.auth;
        return token || null;
    }
    catch(error){
        return null ;
    }
}


export const storeToken = async(token)=>{
    try{
        const tokenData = {
            access_token : token.access_token,
            refresh_token : token.refresh_token ,
            token_type : token.token_type ,
            scope : token.scope ,
            expires_at : token.expires_in
            ? new Date(Date.now() + token.expires_in*1000).toISOString()
            : null ,
            created_at : new Date().toISOString() ,
        };

        await updateOrbitalConfig({ auth: tokenData });
        return true ;
    }
    catch(err){
        console.log(chalk.red("Failed to store token: " ) , err.message);
        return false ;
    }
}

export const clearStoredToken = async ()=>{
    try{
        await updateOrbitalConfig({ auth: null });
        return true ;
    }
    catch(err){
        return false ;
    }
}

export const isTokenExpired = async()=>{
    const token = await getStoredToken();
    if(!token || !token.expires_at){
        return true ;
    }

    const expiresAt = new Date(token.expires_at);
    const now  = new Date();

    return expiresAt.getTime() - now.getTime() < 5*60*1000 ;
}

export const requireAuth = async()=>{
    const token = await getStoredToken();

    if(!token){
        console.log(
            chalk.red("Not authenticated . PLease run 'orbital login' first")
        )
        process.exit(1);
    }
    if(await isTokenExpired()){
        console.log(
            chalk.yellow("Your session has expired. Please login again.")
        );
        console.log(chalk.gray("Run: orbital login \n"));
        process.exit(1);
    }
    return token ;
}