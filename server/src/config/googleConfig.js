import dotenv from "dotenv";
dotenv.config();

export const config = {
    googleApiKey : process.env.GOOOGLE_GEMINI_API_KEY || "",
    model : process.env.ORBITAL_MODEL || "gemini-2.5-flash"
}