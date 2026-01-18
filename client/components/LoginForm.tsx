"use client";
import Image from "next/image";
import {useRouter} from "next/navigation";
import {Button} from "./ui/button";
import {Card , CardContent} from "./ui/card";
import {authClient} from "@/lib/auth-client";
import {useState} from "react" ;

const LoginForm = ()=>{

    const router = useRouter();
    const [isLoading , setLoading] = useState(false);

    return(
        <div className ="flex flex-col gap-6 justify-center items-center bg-gradient-to-b from-black via-indigo-950 to-black h-screen w-screen">
            <div className = "flex flex-col items-center justify-center space-y-4">
                <Image src ={"/space.png"} alt = "Login" height ={600} width ={600}/>
                <h1 className ="text-6xl font-extrabold text-white">
                    Welcome Back! to Orbital CLI
                </h1>
                <p className = "text-base font-medium text-zinc-400">
                    Login to your account for allowing device flow
                </p>
            </div>

            <Card className ="border-dashed border-2">
                <CardContent>
                    <div className ="grid gap-6">
                        <div className ="flex flex-col gap-4">
                            <Button 
                                variant ={"outline"}
                                className ="w-full h-full hover:cursor-pointer"
                                type= "button" 
                                onClick ={()=> authClient.signIn.social({
                                    provider : "github" ,
                                    callbackURL:"http://localhost:3000"
                                })} >
                                <Image src ={"/github.png"} alt ="github" height ={18 } width ={18}
                                className = "size-4 dark:invert hover:cursor-pointer" />
                                Continue With Github </Button>
                        </div>
                    </div>
                </CardContent>
            </Card>
            </div>
    )
}

export default LoginForm ;
