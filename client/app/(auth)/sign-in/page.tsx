"use client";

import LoginForm from "@/components/LoginForm";
import React, { useEffect } from "react";
import { useRouter } from "next/navigation";
import { authClient } from "@/lib/auth-client";
import { Spinner } from "@/components/ui/spinner";


const Page = () =>{

    const router = useRouter();
    const { data: session, isPending } = authClient.useSession();

    useEffect(() => {
        if (!isPending && session?.user) {
            router.replace("/");
        }
    }, [isPending, router, session?.user]);

    if (isPending) {
        return (
            <div className="flex items-center justify-center h-screen bg-black">
                <Spinner />
            </div>
        );
    }

    if (session?.user) {
        return (
            <div className="flex items-center justify-center h-screen bg-black">
                <Spinner />
            </div>
        );
    }

    return(
        <div><LoginForm/></div>
    )
}

export default Page ;