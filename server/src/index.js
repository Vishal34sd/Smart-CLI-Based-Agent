import express from "express";
import { toNodeHandler } from "better-auth/node";
import cors from "cors";
import {auth} from "./lib/auth.js";
import dotenv from "dotenv" ;
dotenv.config();


const app = express();
const PORT = process.env.PORT;

app.use(
  cors({
    origin: "http://localhost:3000", 
    methods: ["GET", "POST", "PUT", "DELETE"],
    credentials: true, 
  })
);


app.all("/api/auth/*splat", toNodeHandler(auth));

app.use(express.json());

app.get("/api/me" , async (req, res)=>{
    const session = await auth.api.getSession({
    headers : fromNodeHeaders (req.headers),
    });
    return res.status(session);
})

app.listen(PORT , ()=>{
    console.log(`Server is running on ${PORT}`);
})