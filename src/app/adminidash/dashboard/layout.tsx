"use client";

import { useState, useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import {
  Users,
  Server,
  Shield,
  Bot,
  LayoutDashboard,
  LogOut,
} from "lucide-react";

export default function AdminDashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const [userRole, setUserRole] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkAuth = async () => {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();

      if (!user) {
        router.push("/adminidash");
        return;
      }

      const { data: profile } = await supabase
        .from("users")
        .select("role")
        .eq("id", user.id)
        .single();

      if (profile?.role !== "admin" && profile?.role !== "superadmin") {
        router.push("/adminidash");
        return;
      }

      setUserRole(profile.role);
      setLoading(false);
    };

    checkAuth();
  }, [router]);

  const handleLogout = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/adminidash");
  };

  const navItems = [
    { label: "Overview", icon: LayoutDashboard, href: "/adminidash/dashboard", roles: ["admin", "superadmin"] },
    { label: "Users", icon: Users, href: "/adminidash/dashboard/users", roles: ["admin", "superadmin"] },
    { label: "Servers", icon: Server, href: "/adminidash/dashboard/servers", roles: ["admin", "superadmin"] },
    { label: "Management", icon: Shield, href: "/adminidash/dashboard/management", roles: ["superadmin"] },
    { label: "Bots", icon: Bot, href: "/adminidash/dashboard/bots", roles: ["superadmin"] },
  ];

  if (loading) {
    return (
      <div className="min-h-screen bg-discord-darker flex items-center justify-center">
        <div className="animate-pulse text-white">Loading admin panel...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-discord-darker flex">
      {/* Sidebar */}
      <div className="w-60 bg-discord-dark border-r border-gray-800 flex flex-col">
        <div className="h-14 flex items-center px-4 border-b border-gray-800">
          <h1 className="text-white font-bold text-lg">
            <span className="text-discord-brand">Ricord</span> Admin
          </h1>
        </div>

        <ScrollArea className="flex-1 py-2">
          <div className="space-y-0.5 px-2">
            {navItems
              .filter((item) => item.roles.includes(userRole || ""))
              .map((item) => (
                <button
                  key={item.href}
                  onClick={() => router.push(item.href)}
                  className={cn(
                    "w-full flex items-center gap-3 px-3 py-2 rounded-md text-sm transition-colors",
                    pathname === item.href
                      ? "bg-discord-brand text-white"
                      : "text-gray-400 hover:bg-discord-hover hover:text-white"
                  )}
                >
                  <item.icon className="w-4 h-4" />
                  {item.label}
                </button>
              ))}
          </div>
        </ScrollArea>

        <div className="p-3 border-t border-gray-800">
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-3 py-2 rounded-md text-sm text-gray-400 hover:bg-discord-hover hover:text-white"
          >
            <LogOut className="w-4 h-4" />
            Sign Out
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto">{children}</div>
    </div>
  );
}
