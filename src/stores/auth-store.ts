import { create } from "zustand";
import { User, UserSettings } from "@/types";
import { createClient } from "@/lib/supabase/client";

interface AuthState {
  user: User | null;
  settings: UserSettings | null;
  isLoading: boolean;
  isInitialized: boolean;
  setUser: (user: User | null) => void;
  setSettings: (settings: UserSettings | null) => void;
  setLoading: (loading: boolean) => void;
  initialize: () => Promise<void>;
  updateProfile: (data: Partial<User>) => Promise<void>;
  updateSettings: (data: Partial<UserSettings>) => Promise<void>;
  logout: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  settings: null,
  isLoading: true,
  isInitialized: false,

  setUser: (user) => set({ user }),
  setSettings: (settings) => set({ settings }),
  setLoading: (isLoading) => set({ isLoading }),

  initialize: async () => {
    const supabase = createClient();
    try {
      const { data: { user: authUser } } = await supabase.auth.getUser();
      if (authUser) {
        const { data: profile } = await supabase
          .from("users")
          .select("*")
          .eq("id", authUser.id)
          .single();

        const { data: settings } = await supabase
          .from("user_settings")
          .select("*")
          .eq("user_id", authUser.id)
          .single();

        set({ user: profile, settings, isLoading: false, isInitialized: true });
      } else {
        set({ user: null, settings: null, isLoading: false, isInitialized: true });
      }
    } catch {
      set({ user: null, settings: null, isLoading: false, isInitialized: true });
    }
  },

  updateProfile: async (data) => {
    const supabase = createClient();
    const user = get().user;
    if (!user) return;

    const { error } = await supabase
      .from("users")
      .update(data)
      .eq("id", user.id);

    if (!error) {
      set({ user: { ...user, ...data } });
    }
  },

  updateSettings: async (data) => {
    const supabase = createClient();
    const user = get().user;
    const settings = get().settings;
    if (!user) return;

    const { error } = await supabase
      .from("user_settings")
      .upsert({ user_id: user.id, ...data })
      .eq("user_id", user.id);

    if (!error && settings) {
      set({ settings: { ...settings, ...data } as UserSettings });
    }
  },

  logout: async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    set({ user: null, settings: null, isInitialized: false });
  },
}));
