'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { roadmapService } from '@/services/roadmap.service';
import { authService } from '@/services/auth.service';
import RoadmapCard from './RoadmapCard';

export default function Dashboard() {
  const [roadmaps, setRoadmaps] = useState([]);
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setUser(authService.getCurrentUser());
        const data = await roadmapService.getRoadmaps();
        setRoadmaps(data);
      } catch (error) {
        console.error('Error fetching roadmaps:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">
          Welcome back, {user?.name || 'Learner'}!
        </h1>
        <p className="mt-1 text-sm text-gray-500">
          Track your learning progress and continue your journey
        </p>
      </div>

      {loading ? (
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading your roadmaps...</p>
        </div>
      ) : roadmaps.length > 0 ? (
        <div>
          <h2 className="text-lg font-medium text-gray-900 mb-4">Your Learning Roadmaps</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {roadmaps.map((roadmap) => (
              <RoadmapCard key={roadmap._id} roadmap={roadmap} />
            ))}
          </div>
        </div>
      ) : (
        <div className="text-center py-12 bg-white rounded-lg shadow">
          <h3 className="text-lg font-medium text-gray-900 mb-2">You don't have any roadmaps yet</h3>
          <p className="text-gray-500 mb-6">Create your first learning roadmap to get started</p>
          <Link
            href="/roadmaps/create"
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700"
          >
            Create Roadmap
          </Link>
        </div>
      )}
    </div>
  );
}