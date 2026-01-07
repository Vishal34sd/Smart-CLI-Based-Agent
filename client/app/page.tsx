"use client";

import { Button } from "@/components/ui/button";
import { authClient } from "@/lib/auth-client";
import Image from "next/image";
import { useRouter } from "next/navigation";
import {Spinner} from "@/components/ui/spinner"

export default function Home() {
  const { data: session, isPending } = authClient.useSession();
  const router = useRouter();

  if (isPending) {
    return (
      <div className="flex items-center justify-center h-screen bg-black">
        <Spinner/>
      </div>
    );
  }

  if (!session?.user) {
    return (
      <div className="flex items-center justify-center h-screen bg-black">
        <p className="text-lg text-gray-400">Not logged in</p>
      </div>
    );
  }

  const { name, email, image } = session.user;

  return (
    <div className="flex items-center justify-center h-screen bg-gradient-to-br from-black via-zinc-900 to-black">
      <div className="w-full max-w-md rounded-2xl border border-zinc-800 bg-zinc-900 p-8 shadow-xl flex flex-col items-center gap-4">
        
        {image && (
          <div className="w-24 h-24 rounded-full border-4 border-purple-600 overflow-hidden">
            <Image
              src={image}
              alt="User profile"
              width={96}
              height={96}
              className="object-cover"
            />
          </div>
        )}

        <h1 className="text-2xl font-semibold text-center text-white">
          Welcome, <span className="text-purple-500">{name}</span>
        </h1>

        <p className="text-gray-400">{email}</p>

        <Button
          variant="destructive"
          className="w-full mt-4 bg-red-600 hover:bg-red-700 hover:cursor-pointer"
          onClick={async () => {
            await authClient.signOut();
            router.replace("/sign-in"); 
          }}
        >
          Logout
        </Button>
      </div>
    </div>
  );
}
