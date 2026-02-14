import Link from "next/link";

export default function HomePage() {
  return (
    <div className="min-h-screen bg-discord-brand flex flex-col">
      <header className="flex items-center justify-between px-8 py-4">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-white rounded-full flex items-center justify-center">
            <span className="text-discord-brand font-bold text-lg">R</span>
          </div>
          <span className="text-white font-bold text-xl">Ricord</span>
        </div>
        <nav className="flex items-center gap-4">
          <Link
            href="/auth/login"
            className="bg-white text-discord-dark px-4 py-2 rounded-full text-sm font-medium hover:shadow-lg transition-shadow"
          >
            Login
          </Link>
        </nav>
      </header>

      <main className="flex-1 flex flex-col items-center justify-center px-4 text-center">
        <h1 className="text-5xl md:text-7xl font-extrabold text-white mb-6">
          IMAGINE A PLACE...
        </h1>
        <p className="text-lg md:text-xl text-white/80 max-w-2xl mb-10">
          ...where you can belong to a school club, a gaming group, or a worldwide art community.
          Where just you and a handful of friends can spend time together. A place that makes it
          easy to talk every day and hang out more often.
        </p>
        <div className="flex gap-4">
          <Link
            href="/auth/register"
            className="bg-white text-discord-dark px-8 py-4 rounded-full text-lg font-medium hover:shadow-lg transition-all hover:scale-105"
          >
            Get Started
          </Link>
          <Link
            href="/auth/login"
            className="bg-discord-darker text-white px-8 py-4 rounded-full text-lg font-medium hover:bg-discord-dark transition-all hover:scale-105"
          >
            Open Ricord
          </Link>
        </div>
      </main>
    </div>
  );
}
