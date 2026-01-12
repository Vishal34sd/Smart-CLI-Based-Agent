"use client";

import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { authClient } from "@/lib/auth-client";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { CheckCircle, XCircle, Smartphone } from "lucide-react";
import { toast } from "sonner";

import React from "react";

const DeviceApprovalPage = () => {
  const { data, isPending } = authClient.useSession();

  const router = useRouter();
  const searchParams = useSearchParams();
  const userCode = searchParams.get("user_code");

  const [isProcessing, setIsProcessing] = useState({
    approve: false,
    deny: false,
  });

  if (isPending) {
    return (
      <div className="flex flex-col items-center justify-center h-screen bg-black">
        <Spinner />
      </div>
    );
  }

  if (!data?.session && !data?.user) {
    router.push("/sign-in");
  }

  const handleApprove = async () => {
    setIsProcessing({
      approve: true,
      deny: false,
    });
    try {
      toast.loading("Approving device...", { id: "loading" });
      await authClient.device.approve({
        userCode: userCode!,
      });

      toast.dismiss("loading");
      toast.success("Device approved successfully");
      router.push("/");
    } catch (error) {
      toast.error("Failed to approve");
    } finally {
      setIsProcessing({
        approve: false,
        deny: false,
      });
    }
  };

  const handleDeny = async () => {
    setIsProcessing({
      approve: false,
      deny: true,
    });
    try {
      toast.loading("Denying device...", { id: "deny" });
      await authClient.device.deny({
        userCode: userCode!,
      });

      toast.dismiss("deny");
      toast.success("Oops! Device denied to approval");
      router.push("/");
    } catch (error) {
      toast.error("Failed to deny device");
    } finally {
      setIsProcessing({
        approve: false,
        deny: false,
      });
    }
  };

  
  const prettyCode = userCode
    ? userCode.replaceAll("-", "").slice(0, 6).toUpperCase()
    : "---";

  return (
    <div className="min-h-screen bg-black flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-[560px] space-y-6">
        {/* CARD 1: Header */}
        <div className="rounded-2xl border border-dashed border-white/20 bg-[#0B0B0D] shadow-[0px_0px_0px_1px_rgba(255,255,255,0.04)] p-8">
          <div className="flex flex-col items-center text-center">
            {/* Icon */}
            <div className="relative mb-5">
              <div className="h-[74px] w-[74px] rounded-2xl bg-[#1B1B1F] border border-white/10 flex items-center justify-center">
                <Smartphone className="h-9 w-9 text-cyan-400" />
              </div>

              {/* orange badge */}
              <div className="absolute -top-1 -right-1 h-6 w-6 rounded-full bg-orange-500 flex items-center justify-center text-xs font-bold text-white shadow">
                !
              </div>
            </div>

            <h1 className="text-[30px] font-bold tracking-tight text-white">
              Device Authorization
            </h1>
            <p className="mt-2 text-sm text-white/60">
              A new device is requesting access to your account
            </p>
          </div>
        </div>

        {/* CARD 2: Authorization Code */}
        <div className="rounded-2xl border border-dashed border-white/20 bg-[#0B0B0D] shadow-[0px_0px_0px_1px_rgba(255,255,255,0.04)] p-6">
          <p className="text-[11px] font-semibold tracking-[0.25em] text-white/45 mb-3">
            AUTHORIZATION CODE
          </p>

          <div className="rounded-xl bg-[#1B1B1F] border border-white/10 px-4 py-5 flex items-center justify-center">
            <span className="text-[34px] font-bold tracking-[0.35em] text-cyan-300">
              {prettyCode}
            </span>
          </div>

          <p className="mt-3 text-xs text-white/45 text-center">
            Enter this code on the requesting device
          </p>
        </div>

        {/* CARD 3: Account Info */}
        <div className="rounded-2xl border border-dashed border-white/20 bg-[#0B0B0D] shadow-[0px_0px_0px_1px_rgba(255,255,255,0.04)] p-6">
          <p className="text-[11px] font-semibold tracking-[0.25em] text-white/45 mb-3">
            ACCOUNT: {data?.user?.email?.toUpperCase()}
          </p>

          <div className="rounded-xl bg-[#1B1B1F] border border-white/10 px-4 py-4">
            <p className="text-sm text-white/65 leading-relaxed">
              Only approve this request if you initiated it. For security, never
              share this code with others.
            </p>
          </div>
        </div>

        {/* Buttons */}
        <div className="space-y-4">
          <Button
            onClick={handleApprove}
            disabled={isProcessing.approve || isProcessing.deny}
            className="w-full h-[54px] rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-[15px]
            shadow-[0px_10px_30px_rgba(0,0,0,0.35)]"
          >
            {isProcessing.approve ? (
              <span className="flex items-center gap-2">
                <Spinner className="h-4 w-4" />
                Approving...
              </span>
            ) : (
              <span className="flex items-center gap-2">
                <CheckCircle className="h-5 w-5" />
                Approve Device
              </span>
            )}
          </Button>

          <Button
            onClick={handleDeny}
            disabled={isProcessing.approve || isProcessing.deny}
            className="w-full h-[54px] rounded-xl bg-red-600 hover:bg-red-700 text-white font-semibold text-[15px]
            shadow-[0px_10px_30px_rgba(0,0,0,0.35)]"
          >
            {isProcessing.deny ? (
              <span className="flex items-center gap-2">
                <Spinner className="h-4 w-4" />
                Denying...
              </span>
            ) : (
              <span className="flex items-center gap-2">
                <XCircle className="h-5 w-5" />
                Deny Device
              </span>
            )}
          </Button>

          
          <div className="pt-1 text-center">
            <p className="text-[11px] tracking-[0.25em] text-white/30">
              DEVICE ID
            </p>
            <p className="mt-1 text-xs font-mono text-white/40">
              {data?.session?.id ?? "—"}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DeviceApprovalPage;
