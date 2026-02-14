"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { registerSchema, RegisterInput } from "@/lib/validations";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function RegisterPage() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<RegisterInput>({
    resolver: zodResolver(registerSchema),
  });

  const onSubmit = async (data: RegisterInput) => {
    setIsLoading(true);
    setError(null);
    const supabase = createClient();

    // Check username availability
    const { data: existingUser } = await supabase
      .from("users")
      .select("id")
      .eq("username", data.username)
      .single();

    if (existingUser) {
      setError("Username is already taken");
      setIsLoading(false);
      return;
    }

    const { data: authData, error: authError } = await supabase.auth.signUp({
      email: data.email,
      password: data.password,
    });

    if (authError) {
      setError(authError.message);
      setIsLoading(false);
      return;
    }

    if (authData.user) {
      // Create user profile
      const { error: profileError } = await supabase.from("users").insert({
        id: authData.user.id,
        email: data.email,
        username: data.username,
        display_name: data.displayName,
      });

      if (profileError) {
        setError("Failed to create profile. Please try again.");
        setIsLoading(false);
        return;
      }

      // Create default settings
      await supabase.from("user_settings").insert({
        user_id: authData.user.id,
        send_mode: "button_or_enter",
        theme: "dark",
      });
    }

    router.push("/channels/me");
  };

  return (
    <div className="min-h-screen bg-discord-dark flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-discord-channel rounded-lg shadow-2xl p-8">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-white">Create an account</h1>
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
            <Input id="email" type="email" {...register("email")} placeholder="Enter your email" />
            {errors.email && <p className="text-discord-red text-xs">{errors.email.message}</p>}
          </div>

          <div className="space-y-2">
            <Label htmlFor="displayName">
              Display Name <span className="text-discord-red">*</span>
            </Label>
            <Input id="displayName" {...register("displayName")} placeholder="Enter your display name" />
            {errors.displayName && <p className="text-discord-red text-xs">{errors.displayName.message}</p>}
          </div>

          <div className="space-y-2">
            <Label htmlFor="username">
              Username <span className="text-discord-red">*</span>
            </Label>
            <Input id="username" {...register("username")} placeholder="Enter your username" />
            {errors.username && <p className="text-discord-red text-xs">{errors.username.message}</p>}
          </div>

          <div className="space-y-2">
            <Label htmlFor="password">
              Password <span className="text-discord-red">*</span>
            </Label>
            <Input id="password" type="password" {...register("password")} placeholder="Enter your password" />
            {errors.password && <p className="text-discord-red text-xs">{errors.password.message}</p>}
          </div>

          <div className="space-y-2">
            <Label htmlFor="confirmPassword">
              Confirm Password <span className="text-discord-red">*</span>
            </Label>
            <Input
              id="confirmPassword"
              type="password"
              {...register("confirmPassword")}
              placeholder="Confirm your password"
            />
            {errors.confirmPassword && (
              <p className="text-discord-red text-xs">{errors.confirmPassword.message}</p>
            )}
          </div>

          <Button type="submit" className="w-full" disabled={isLoading}>
            {isLoading ? "Creating account..." : "Continue"}
          </Button>

          <p className="text-sm text-gray-400">
            Already have an account?{" "}
            <Link href="/auth/login" className="text-discord-brand hover:underline">
              Log In
            </Link>
          </p>
        </form>
      </div>
    </div>
  );
}
