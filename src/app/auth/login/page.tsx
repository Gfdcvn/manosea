"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { loginSchema, LoginInput } from "@/lib/validations";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function LoginPage() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginInput>({
    resolver: zodResolver(loginSchema),
  });

  const onSubmit = async (data: LoginInput) => {
    setIsLoading(true);
    setError(null);
    const supabase = createClient();

    const { error: authError } = await supabase.auth.signInWithPassword({
      email: data.email,
      password: data.password,
    });

    if (authError) {
      setError(authError.message);
      setIsLoading(false);
      return;
    }

    // Update status to online
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      await supabase.from("users").update({ status: "online" }).eq("id", user.id);
    }

    router.push("/channels/me");
  };

  return (
    <div className="min-h-screen bg-discord-dark flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-discord-channel rounded-lg shadow-2xl p-8">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-white">Welcome back!</h1>
          <p className="text-gray-400 mt-1">We&apos;re so excited to see you again!</p>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          {error && (
            <div className="bg-discord-red/10 border border-discord-red/20 rounded p-3 text-discord-red text-sm">
              {error}
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="email">
              Email <span className="text-discord-red">*</span>
            </Label>
            <Input
              id="email"
              type="email"
              {...register("email")}
              placeholder="Enter your email"
            />
            {errors.email && (
              <p className="text-discord-red text-xs">{errors.email.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="password">
              Password <span className="text-discord-red">*</span>
            </Label>
            <Input
              id="password"
              type="password"
              {...register("password")}
              placeholder="Enter your password"
            />
            {errors.password && (
              <p className="text-discord-red text-xs">{errors.password.message}</p>
            )}
          </div>

          <Button type="submit" className="w-full" disabled={isLoading}>
            {isLoading ? "Logging in..." : "Log In"}
          </Button>

          <p className="text-sm text-gray-400">
            Need an account?{" "}
            <Link href="/auth/register" className="text-discord-brand hover:underline">
              Register
            </Link>
          </p>
        </form>
      </div>
    </div>
  );
}
