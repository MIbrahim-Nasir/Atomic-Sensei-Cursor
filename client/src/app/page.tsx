import Link from "next/link";
import Image from "next/image";

export default function Home() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-white to-blue-50 dark:from-gray-900 dark:to-gray-800">
      <div className="container mx-auto px-4 py-16">
        {/* Hero Section */}
        <div className="flex flex-col items-center text-center mb-20">
          <h1 className="text-4xl md:text-6xl font-bold mb-6 bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-indigo-700">
            Atomic Sensei
          </h1>
          <p className="text-xl md:text-2xl mb-8 text-gray-700 dark:text-gray-300">
            Atomize your learning
          </p>
          <p className="text-md md:text-lg mb-12 max-w-2xl text-gray-600 dark:text-gray-400">
            An AI-powered education platform that delivers personalized, bite-sized learning content.
            Create your learning roadmap, master new skills, and track your progress with our
            intelligent learning system.
          </p>
          <div className="flex space-x-4">
            <Link
              href="/auth/login"
              className="rounded-full bg-indigo-600 px-8 py-3 text-white font-medium hover:bg-indigo-700 transition-colors"
            >
              Login
            </Link>
            <Link
              href="/auth/register"
              className="rounded-full border border-indigo-600 px-8 py-3 text-indigo-600 dark:text-indigo-400 font-medium hover:bg-indigo-50 dark:hover:bg-indigo-950 transition-colors"
            >
              Register
            </Link>
          </div>
        </div>

        {/* Feature Section */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-10 mb-20">
          <div className="bg-white dark:bg-gray-800 p-8 rounded-xl shadow-md">
            <h3 className="text-xl font-bold mb-4 text-indigo-600 dark:text-indigo-400">Personalized Roadmaps</h3>
            <p className="text-gray-600 dark:text-gray-300">
              Get a customized learning plan built around your goals and preferences.
            </p>
          </div>
          <div className="bg-white dark:bg-gray-800 p-8 rounded-xl shadow-md">
            <h3 className="text-xl font-bold mb-4 text-indigo-600 dark:text-indigo-400">Bite-sized Content</h3>
            <p className="text-gray-600 dark:text-gray-300">
              Learn complex topics through short, digestible lessons delivered at the right time.
            </p>
          </div>
          <div className="bg-white dark:bg-gray-800 p-8 rounded-xl shadow-md">
            <h3 className="text-xl font-bold mb-4 text-indigo-600 dark:text-indigo-400">Interactive Quizzes</h3>
            <p className="text-gray-600 dark:text-gray-300">
              Reinforce your knowledge with smart quizzes that adapt to your progress.
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="text-center text-gray-600 dark:text-gray-400 text-sm">
          <p>© 2024 Atomic Sensei. All rights reserved.</p>
        </div>
      </div>
    </div>
  );
}
