# 🎮 Ricord

A feature-rich, full-stack Discord clone built with modern web technologies. Ricord delivers a real-time communication experience with servers, channels, direct messages, friends, themes, and a full admin dashboard.

![Next.js](https://img.shields.io/badge/Next.js-14-black?logo=next.js)
![Supabase](https://img.shields.io/badge/Supabase-PostgreSQL-3ECF8E?logo=supabase)
![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6?logo=typescript)
![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-3-38B2AC?logo=tailwindcss)

---

## 📑 Table of Contents

- [Tech Stack](#-tech-stack)
- [Features](#-features)
- [Project Structure](#-project-structure)
- [Getting Started](#-getting-started)
- [Environment Variables](#-environment-variables)
- [Database Schema](#-database-schema)
- [Themes](#-themes)
- [Architecture](#-architecture)

---

## 🛠 Tech Stack

| Layer        | Technology                                      |
| ------------ | ----------------------------------------------- |
| Framework    | **Next.js 14** (App Router)                     |
| Language     | **TypeScript**                                  |
| Database     | **Supabase** (PostgreSQL + Auth + Storage + Realtime) |
| State        | **Zustand v5** (with persist middleware)         |
| Styling      | **Tailwind CSS** + CSS custom properties        |
| UI Library   | **Radix UI** (Dialog, Tabs, Tooltip, Select, Popover, etc.) |
| Icons        | **Lucide React**                                |
| Realtime     | **Supabase Realtime** (Channels + Presence)     |

---

## ✨ Features

### 🔐 Authentication
- Email/password registration and login via Supabase Auth
- Middleware-protected routes with automatic session refresh
- Account management: change email, change password, delete account
- Auth state persisted and initialized on app load

### 💬 Servers & Channels
- **Create servers** with custom names and icons
- **Join servers** via invite codes (with configurable expiry: 1/7/14/30 days or never)
- **Text channels** for messaging within servers
- **Voice channels** (UI placeholder with join button)
- **Categories** to organize channels into collapsible groups
- Server settings (rename, manage) for server owners
- **Invite system** with themed dialog — generate, copy, set expiry, regenerate

### 📨 Messaging
- Real-time message sending and receiving via Supabase Realtime
- **Optimistic message insertion** — messages appear instantly before server confirmation
- **Message deduplication** — prevents duplicate messages from realtime + optimistic updates
- **Edit messages** inline with Enter to save, Escape to cancel
- **Delete messages** with confirmation dialog showing message preview
- **File attachments** — upload images and files (max 25MB) via Supabase Storage
- Image attachments render inline; other files show as download links
- **Typing indicators** — see who's typing with animated dots
- **Infinite scroll** — loads older messages as you scroll up (50 per page)
- **Auto-scroll** — stays at bottom for new messages, preserves position when scrolling up

### 💡 @ Mentions
- Type `@` in the chat to open a **mention picker** with all server members
- **`@everyone`** and **`@here`** special mentions for server-wide pings
- Filter members by typing after `@` — searches display name and username
- Navigate with Arrow keys, select with Tab/Enter, dismiss with Escape
- Mentions render as **highlighted blue pills** in messages

### 👥 Direct Messages
- **DM sidebar** listing all active conversations with avatars and status indicators
- **New conversation button** (+ icon) — opens a friend picker dialog with search
- Create or resume DM conversations with any friend
- Full messaging features (send, edit, delete, attachments, typing indicators)

### 🤝 Friends System
- **Send friend requests** by username
- **Accept/reject** incoming requests
- View **online**, **all**, and **pending** friends in tabbed interface
- **Message button** on friends to jump directly into a DM
- Friend count badges on pending tab

### 👤 User Profiles
- **Profile card popover** — click any user's avatar or name to see their profile
- Shows: banner (profile color), avatar with status indicator, display name, BOT badge, @username, inline badges with tooltips, status, about me, member since date
- Profile cards accessible from: messages, member sidebar, DM sidebar, friends list

### ⚙️ User Settings
- **My Account tab:**
  - Avatar upload (auto-saves on file select)
  - Display name (auto-saves on blur)
  - About me / bio (auto-saves on blur, 190 char limit)
  - Profile color picker — 15 presets + custom color wheel + hex input (auto-saves on selection/blur)
  - Username, email, role display
  - **Badges & Awards** section — shows all earned badges with icon, name, description, award date
  - Account management: change email, change password, delete account (with "DELETE" confirmation)
- **Standing tab:**
  - Account standing level (0–4) with colored indicator and visual bar
  - Standing levels: Perfect → Good → In Danger → Critical → Suspended
  - Suspension notice with reason and expiry date
  - Full **punishment history** — warns, suspensions, bans with status, reason, issuer, dates
- **Behaviour tab:**
  - Send mode: Button Only / Enter to Send / Shift+Enter to Send (auto-saves on selection)
- **Appearance tab:**
  - 6 theme cards with live preview colors — click to switch instantly

### 🎨 Themes
Six fully-implemented themes with CSS custom properties:

| Theme    | Style                              |
| -------- | ---------------------------------- |
| Dark     | Classic Discord dark (default)     |
| Light    | Clean, bright interface            |
| Sepia    | Warm, paper-like tones             |
| Gray     | Neutral and understated            |
| Blue     | Cool, deep blue tones              |
| Purple   | Rich, royal purple vibes           |

Themes are persisted in localStorage and applied instantly across the entire app. Theme-aware CSS overrides ensure consistent text/border colors regardless of Tailwind's hardcoded classes.

### 🛡️ Admin Dashboard
- Accessible at `/adminidash` for users with the `admin` role
- **Dashboard overview** with stats
- **User management** — view all users, user details, assign badges, issue punishments (warn/suspend/ban)
- **Server management** — view all servers, server details
- **Bot management** — create and manage bot accounts with tokens
- **Site management** — system-wide settings and controls

### ⚡ Loading & Performance
- **Reusable loading spinner** component with configurable size (sm/md/lg/xl)
- Loading spinners on: initial app load, server navigation, channel switching, DM conversations, message loading, friends list
- Optimistic updates for messages (instant send) and settings (instant save)
- Server details (channels, members, roles) fetched in parallel via `Promise.all`
- Auto-save on settings eliminates manual save/confirm bar — changes apply immediately

### 🔔 Punishment System
- Admin-issued punishments: **warn**, **suspend**, **ban**
- Popup notification shown to users for unseen punishments
- Standing level automatically tracks punishment severity
- Punishment history visible in user settings Standing tab

---

## 📁 Project Structure

```
src/
├── app/
│   ├── globals.css                          # Theme CSS variables & global styles
│   ├── layout.tsx                           # Root layout with Providers
│   ├── page.tsx                             # Landing page (redirects to auth)
│   ├── auth/
│   │   ├── login/page.tsx                   # Login page
│   │   ├── register/page.tsx                # Registration page
│   │   └── callback/route.ts                # Supabase auth callback
│   ├── channels/
│   │   ├── layout.tsx                       # App shell (server sidebar + realtime)
│   │   ├── me/
│   │   │   ├── layout.tsx                   # DM layout (DM sidebar + user panel)
│   │   │   ├── page.tsx                     # Friends list page
│   │   │   ├── [channelId]/page.tsx         # DM conversation page
│   │   │   └── settings/page.tsx            # User settings page
│   │   └── [serverId]/
│   │       ├── layout.tsx                   # Server layout (channel sidebar + settings)
│   │       ├── page.tsx                     # Server home (auto-redirects to channel)
│   │       └── [channelId]/page.tsx         # Server channel page
│   └── adminidash/
│       ├── page.tsx                         # Admin login gate
│       └── dashboard/
│           ├── layout.tsx                   # Admin dashboard layout
│           ├── page.tsx                     # Admin overview
│           ├── users/page.tsx               # User management
│           ├── servers/page.tsx             # Server management
│           ├── bots/page.tsx                # Bot management
│           └── management/page.tsx          # Site management
├── components/
│   ├── providers.tsx                        # Auth init + theme + tooltip provider
│   ├── realtime-provider.tsx                # Supabase realtime subscriptions
│   ├── user-profile-card.tsx                # Popover profile card component
│   ├── chat/
│   │   ├── chat-area.tsx                    # Message list + scroll + typing indicator
│   │   ├── chat-input.tsx                   # Message input with @ mentions
│   │   ├── message-item.tsx                 # Single message with actions
│   │   ├── emoji-picker.tsx                 # Emoji selector popup
│   │   └── file-upload.tsx                  # File upload component
│   ├── friends/
│   │   └── friends-list.tsx                 # Friends management (add/accept/reject/message)
│   ├── layout/
│   │   ├── server-sidebar.tsx               # Left server icon bar
│   │   ├── channel-sidebar.tsx              # Channel list + create/invite dialogs
│   │   ├── dm-sidebar.tsx                   # DM list + new conversation dialog
│   │   ├── member-sidebar.tsx               # Server member list (online/offline)
│   │   └── user-panel.tsx                   # Bottom user info bar
│   ├── modals/
│   │   └── punishment-popup.tsx             # Punishment notification modal
│   └── ui/                                  # Radix UI primitives (shadcn/ui)
│       ├── loading-spinner.tsx              # Reusable loading spinner
│       ├── avatar.tsx, button.tsx, dialog.tsx, input.tsx, ...
│       └── tooltip.tsx, tabs.tsx, select.tsx, separator.tsx, ...
├── stores/
│   ├── auth-store.ts                        # User auth, profile, settings
│   ├── server-store.ts                      # Servers, channels, categories, members, roles
│   ├── message-store.ts                     # Messages, DMs, typing indicators
│   ├── admin-store.ts                       # Admin dashboard state
│   └── theme-store.ts                       # Theme selection with localStorage persist
├── lib/
│   ├── utils.ts                             # Helpers (standing info, status colors, etc.)
│   └── supabase/
│       ├── client.ts                        # Browser Supabase client
│       ├── server.ts                        # Server-side Supabase client
│       └── middleware.ts                    # Auth middleware helper
└── types/
    └── index.ts                             # All TypeScript interfaces
```

---

## 🚀 Getting Started

### Prerequisites

- **Node.js** 18+ and npm
- A **Supabase** project (free tier works)

### Installation

```bash
# Clone the repository
git clone https://github.com/your-username/ricord.git
cd ricord

# Install dependencies
npm install

# Set up environment variables (see below)
cp .env.example .env.local

# Run database migrations
# Apply src/migrations/001_initial_schema.sql in Supabase SQL Editor
# Apply src/migrations/002_fix_badges_and_themes.sql in Supabase SQL Editor

# Start development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to access the app.

### Production Build

```bash
npm run build
npm start
```

---

## 🔑 Environment Variables

Create a `.env.local` file in the project root:

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

- **`NEXT_PUBLIC_SUPABASE_URL`** — Your Supabase project URL
- **`NEXT_PUBLIC_SUPABASE_ANON_KEY`** — Public anon key (safe for client-side)
- **`SUPABASE_SERVICE_ROLE_KEY`** — Service role key (server-side only, for admin operations)

---

## 🗄 Database Schema

The database is managed through SQL migrations in `src/migrations/`:

### Core Tables

| Table              | Purpose                                    |
| ------------------ | ------------------------------------------ |
| `users`            | User profiles (extends Supabase Auth)      |
| `user_settings`    | Per-user settings (send mode, etc.)        |
| `servers`          | Server/guild data                          |
| `channels`         | Text and voice channels within servers     |
| `categories`       | Channel grouping categories                |
| `server_members`   | User-server membership associations        |
| `server_roles`     | Roles within a server                      |
| `server_invites`   | Invite codes with expiry and usage tracking|
| `messages`         | Chat messages (server channels + DMs)      |
| `attachments`      | File attachments linked to messages        |
| `dm_channels`      | Direct message channel pairs               |
| `friend_requests`  | Friend request state machine               |
| `badges`           | Badge definitions (name, icon, type)       |
| `user_badges`      | Badge assignments to users                 |
| `server_badges`    | Badge assignments to servers               |
| `user_punishments` | Punishment records (warn/suspend/ban)      |

---

## 🎨 Themes

Themes are implemented via CSS custom properties scoped to theme classes on `<html>`. Each theme defines 20+ CSS variables covering backgrounds, text colors, borders, inputs, scrollbars, and more.

### Adding a New Theme

1. Add the theme type to `src/stores/theme-store.ts`:
   ```typescript
   export type Theme = "dark" | "light" | ... | "your-theme";
   ```

2. Add CSS variables in `src/app/globals.css`:
   ```css
   .theme-your-theme {
     --background: #...;
     --foreground: #...;
     --rc-dark: #...;
     /* ... all 20+ variables */
   }
   ```

3. Update the `applyTheme` function's `classList.remove()` to include your new class.

4. Add a preview card in `src/app/channels/me/settings/page.tsx` `THEME_OPTIONS` array.

---

## 🏗 Architecture

### State Management (Zustand)

The app uses 5 Zustand stores, each responsible for a single domain:

- **`auth-store`** — User authentication, profile data, settings, login/logout
- **`server-store`** — Server list, current server details (channels, categories, members, roles)
- **`message-store`** — Messages, DM channels, typing indicators, pagination
- **`admin-store`** — Admin dashboard data (users, servers, bots, punishments)
- **`theme-store`** — Theme selection with localStorage persistence

### Realtime

Supabase Realtime subscriptions are managed in `realtime-provider.tsx`:
- Subscribes to message inserts/updates/deletes for the current channel
- Broadcasts and listens for typing events
- Automatically reconnects on channel changes

### Data Flow

```
User Action → Zustand Store → Supabase Client → PostgreSQL
                    ↓                                ↓
              Local State Update              Realtime Broadcast
                    ↓                                ↓
              React Re-render ← ← ← ← ← Realtime Subscription
```

For messages, the flow includes **optimistic updates**: the message is added to local state immediately after the DB insert succeeds, and the realtime subscription deduplicates to prevent double-rendering.

---

## 📄 License

This project is for educational purposes.
