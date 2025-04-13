'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { BellIcon } from '@heroicons/react/24/outline';
import { authService } from '@/services/auth.service';
import NotificationCenter from '@/components/notifications/NotificationCenter';
import Link from 'next/link';

export default function Header() {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);

  useEffect(() => {
    setUser(authService.getCurrentUser());
  }, []);

  const handleLogout = () => {
    authService.logout();
    router.push('/auth/login');
  };

  return (
    <header className="sticky top-0 z-10 bg-white border-b border-gray-200 lg:pl-64">
      <div className="flex h-16 items-center justify-between px-4 sm:px-6 lg:px-8">
        <div className="flex items-center">
          <div className="lg:hidden">
            {/* Empty div for spacing on mobile with fixed header */}
          </div>
        </div>

        <div className="flex items-center space-x-4">
          <NotificationCenter />

          {/* Profile dropdown */}
          <div className="relative ml-3">
            <div>
              <button
                type="button"
                className="flex max-w-xs items-center rounded-full bg-white text-sm focus:outline-none"
                id="user-menu-button"
                onClick={() => setIsDropdownOpen(!isDropdownOpen)}
              >
                <span className="sr-only">Open user menu</span>
                <span className="h-8 w-8 rounded-full bg-blue-600 flex items-center justify-center text-white">
                  {user?.name?.charAt(0) || 'U'}
                </span>
              </button>
            </div>

            {isDropdownOpen && (
              <div
                className="absolute right-0 z-10 mt-2 w-48 origin-top-right rounded-md bg-white py-1 shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none"
                role="menu"
                aria-orientation="vertical"
                aria-labelledby="user-menu-button"
                tabIndex="-1"
              >
                <Link
                  href="/profile"
                  className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                  role="menuitem"
                >
                  Your Profile
                </Link>
                <a
                  href="#"
                  className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                  role="menuitem"
                  onClick={handleLogout}
                >
                  Sign out
                </a>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}