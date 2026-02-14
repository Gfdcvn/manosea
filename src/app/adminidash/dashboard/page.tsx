"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Users, Server, MessageSquare, AlertTriangle } from "lucide-react";

export default function AdminOverview() {
  const [stats, setStats] = useState({
    totalUsers: 0,
    totalServers: 0,
    totalMessages: 0,
    activePunishments: 0,
  });

  useEffect(() => {
    const fetchStats = async () => {
      const supabase = createClient();

      const [
        { count: users },
        { count: servers },
        { count: messages },
        { count: punishments },
      ] = await Promise.all([
        supabase.from("users").select("*", { count: "exact", head: true }),
        supabase.from("servers").select("*", { count: "exact", head: true }),
        supabase.from("messages").select("*", { count: "exact", head: true }),
        supabase
          .from("user_punishments")
          .select("*", { count: "exact", head: true })
          .eq("is_active", true),
      ]);

      setStats({
        totalUsers: users || 0,
        totalServers: servers || 0,
        totalMessages: messages || 0,
        activePunishments: punishments || 0,
      });
    };

    fetchStats();
  }, []);

  const cards = [
    {
      title: "Total Users",
      value: stats.totalUsers,
      icon: Users,
      color: "text-blue-400",
      bg: "bg-blue-400/10",
    },
    {
      title: "Total Servers",
      value: stats.totalServers,
      icon: Server,
      color: "text-green-400",
      bg: "bg-green-400/10",
    },
    {
      title: "Total Messages",
      value: stats.totalMessages,
      icon: MessageSquare,
      color: "text-purple-400",
      bg: "bg-purple-400/10",
    },
    {
      title: "Active Punishments",
      value: stats.activePunishments,
      icon: AlertTriangle,
      color: "text-yellow-400",
      bg: "bg-yellow-400/10",
    },
  ];

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold text-white mb-6">Dashboard Overview</h1>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {cards.map((card) => (
          <div key={card.title} className="bg-discord-dark rounded-lg p-6 border border-gray-800">
            <div className="flex items-center gap-3 mb-3">
              <div className={`p-2 rounded-lg ${card.bg}`}>
                <card.icon className={`w-5 h-5 ${card.color}`} />
              </div>
              <span className="text-sm text-gray-400">{card.title}</span>
            </div>
            <p className="text-3xl font-bold text-white">{card.value.toLocaleString()}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
