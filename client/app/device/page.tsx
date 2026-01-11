"use client"
import {authClient} from "@/lib/auth-client";
import type React from "react"

import {useRouter} from "next/navigation"
import {useState} from "react"
import {ShieldAlert} from "lucide-react"

const DeviceAuthorizationPage  = ()=>{

    const [userCode , setUserCode] = useState("")
    const [error , setError] = useState<string | null>(null);
    const [isLoading , setIsLoading] = useState(false);
    const router = useRouter();

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setError("")
        setIsLoading(true)

        try{
            const formattedCode = userCode.trim().replace(/-/g, "").toUpperCase()

            const response = await authClient.device({
                query : {user_code: formattedCode}
            })
            if(response.data){
                router.push(`/approve?user_code=${formattedCode}`)
            }
        }
        catch(err){
            setError("Invalid or expired code")
        }
        finally{
            setIsLoading(false);
        }
    }

    const handleCodeChange = (e:React.ChangeEvent<HTMLInputElement>)=>{
        let value = e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, "")
        if(value.length >4){
            value = value.slice(0,4) + "-"  + value.slice(4,8)
        }
        setUserCode(value)
    }

    return(
        <div></div>
    )
}

export default DeviceAuthorizationPage ;