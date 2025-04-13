'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { 
  HomeIcon, 
  BookOpenIcon, 
  AcademicCapIcon, 
  ClockIcon, 
  UserIcon,
  Bars3Icon,
  XMarkIcon
} from '@heroicons/react/24/outline';

export default function Sidebar() {
  const pathname = usePathname();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const navigation = [
    { name: 'Dashboard', href: '/dashboard', icon: HomeIcon },
    { name: 'My Roadmaps', href: '/roadmaps', icon: BookOpenIcon },
    { name: 'Content', href: '/content', icon: AcademicCapIcon },
    { name: 'Quizzes', href: '/quizzes', icon: ClockIcon },
    { name: 'Profile', href: '/profile', icon: UserIcon },
  ];

  const isActive = (path) => {
    return pathname.startsWith(path);
  };

  return (
    <>
      {/* Mobile menu button */}
      <div className="lg:hidden fixed top-0 left-0 w-full bg-white border-b border-gray-200 z-50 p-4">
        <button
          type="button"
          className="inline-flex items-center justify-center rounded-md p-2 text-gray-500 hover:bg-gray-100 hover:text-gray-900"
          onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
        >
          <span className="sr-only">Open sidebar</span>
          {isMobileMenuOpen ? (
            <XMarkIcon className="h-6 w-6" aria-hidden="true" />
          ) : (
            <Bars3Icon className="h-6 w-6" aria-hidden="true" />
          )}
        </button>
        <span className="ml-3 text-xl font-bold">Atomic Sensei</span>
      </div>

      {/* Mobile Sidebar */}
      {isMobileMenuOpen && (
        <div className="lg:hidden fixed inset-0 z-40 flex">
          <div className="fixed inset-0 bg-gray-600 bg-opacity-75" onClick={() => setIsMobileMenuOpen(false)}></div>
          <div className="relative flex w-full max-w-xs flex-1 flex-col bg-white pt-16">
            <div className="flex flex-grow flex-col overflow-y-auto border-r border-gray-200 bg-white">
              <div className="flex flex-grow flex-col">
                <nav className="flex-1 space-y-1 p-4">
                  {navigation.map((item) => (
                    <Link
                      key={item.name}
                      href={item.href}
                      className={`
                        group flex items-center px-4 py-3 text-sm font-medium rounded-md
                        ${isActive(item.href) 
                          ? 'bg-blue-50 text-blue-600' 
                          : 'text-gray-700 hover:bg-gray-50 hover:text-gray-900'}
                      `}
                      onClick={() => setIsMobileMenuOpen(false)}
                    >
                      <item.icon className="mr-3 h-5 w-5 flex-shrink-0" aria-hidden="true" />
                      {item.name}
                    </Link>
                  ))}
                </nav>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Desktop Sidebar */}
      <div className="hidden lg:fixed lg:inset-y-0 lg:flex lg:w-64 lg:flex-col">
        <div className="flex flex-grow flex-col overflow-y-auto border-r border-gray-200 bg-white">
          <div className="flex flex-shrink-0 items-center px-6 py-6">
            <h1 className="text-2xl font-bold">Atomic Sensei</h1>
          </div>
          <div className="flex flex-grow flex-col">
            <nav className="flex-1 space-y-1 px-4 py-4">
              {navigation.map((item) => (
                <Link
                  key={item.name}
                  href={item.href}
                  className={`
                    group flex items-center px-4 py-3 text-sm font-medium rounded-md
                    ${isActive(item.href) 
                      ? 'bg-blue-50 text-blue-600' 
                      : 'text-gray-700 hover:bg-gray-50 hover:text-gray-900'}
                  `}
                >
                  <item.icon className="mr-3 h-5 w-5 flex-shrink-0" aria-hidden="true" />
                  {item.name}
                </Link>
              ))}
            </nav>
          </div>
        </div>
      </div>
    </>
  );
}