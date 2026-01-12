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

    
        return (
  <div className="min-h-screen w-full bg-[#0b0c10] flex items-center justify-center px-4 py-10">
    <div className="w-full max-w-xl text-center">
      {/* Top icon */}
      <div className="flex justify-center mb-5">
        <div className="h-14 w-14 rounded-2xl border border-dashed border-white/20 bg-white/5 flex items-center justify-center">
          <ShieldAlert className="h-7 w-7 text-yellow-400" />
        </div>
      </div>

      {/* Title */}
      <h1 className="text-3xl md:text-4xl font-semibold tracking-tight text-white">
        Device Authorization
      </h1>
      <p className="mt-2 text-sm md:text-base text-white/60">
        Enter your device code to continue
      </p>

      {/* Outer dashed container */}
      <div className="mt-8 rounded-3xl border border-dashed border-white/15 p-6 md:p-8">
        {/* Inner card */}
        <div className="rounded-2xl bg-white/[0.04] border border-white/10 p-6 md:p-7 text-left shadow-[0_0_0_1px_rgba(255,255,255,0.04)]">
          {/* Label */}
          <label className="block text-sm font-medium text-white/80 mb-3">
            Device Code
          </label>

          {/* Input */}
          <input
            value={userCode}
            onChange={handleCodeChange}
            placeholder="XXXX-XXXX"
            inputMode="text"
            autoComplete="off"
            maxLength={9}
            className="w-full h-14 rounded-xl bg-white/10 border border-white/10 px-4 text-center tracking-[0.35em] font-semibold text-yellow-400 placeholder:text-white/30 outline-none focus:ring-2 focus:ring-yellow-500/40 focus:border-yellow-500/30 transition"
          />

          <p className="mt-3 text-xs text-white/50">
            Find this code on the device you want to authorize
          </p>

          {/* Error */}
          {error && (
            <div className="mt-4 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">
              {error}
            </div>
          )}

          {/* Button */}
          <button
            onClick={handleSubmit}
            disabled={isLoading || userCode.trim().length < 9}
            className="mt-6 w-full h-14 rounded-xl font-semibold transition
            bg-white/20 text-white/80
            hover:bg-white/35
            disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-white/20"
          >
            {isLoading ? "Verifying..." : "Continue"}
          </button>

          {/* Disclaimer box */}
          <div className="mt-6 rounded-2xl border border-dashed border-white/15 bg-white/[0.03] px-5 py-4">
            <p className="text-xs leading-relaxed text-white/55">
              This code is unique to your device and will expire shortly.
              Keep it confidential and never share it with anyone.
            </p>
          </div>
        </div>
      </div>
    </div>
  </div>
)
}

export default DeviceAuthorizationPage ;