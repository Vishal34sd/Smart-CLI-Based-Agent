import "dotenv/config";
import express from "express";
import { fromNodeHeaders, toNodeHandler } from "better-auth/node";
import cors from "cors";
import { auth } from "./lib/auth.js";


const app = express();
const PORT = process.env.PORT || 8080;

app.use(express.json());

app.use(
  cors({
    origin: "http://localhost:3000", 
    methods: ["GET", "POST", "PUT", "DELETE"],
    credentials: true, 
  })
);


app.all("/api/auth/*splat", toNodeHandler(auth));

app.get("/api/me" , async (req, res)=>{
    const session = await auth.api.getSession({
    headers : fromNodeHeaders (req.headers),
    });
  return res.json(session);
});

app.get("/device" , async(req , res)=>{
  const {user_code} = req.query
  res.redirect(`http://localhost:3000/device?user_code=${user_code}`)
});

app.listen(PORT , ()=>{
    console.log(`Server is running on ${PORT}`);
})