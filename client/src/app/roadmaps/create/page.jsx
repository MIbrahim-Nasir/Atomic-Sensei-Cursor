'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { roadmapService } from '@/services/roadmap.service';

export default function CreateRoadmap() {
  const [goal, setGoal] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const router = useRouter();

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!goal) {
      setError('Please enter your learning goal');
      return;
    }

    try {
      setLoading(true);
      setError('');
      const roadmap = await roadmapService.generateRoadmap(goal);
      router.push(`/roadmaps/${roadmap._id}`);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to create roadmap. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Create Learning Roadmap</h1>
      
      <div className="bg-white shadow rounded-lg p-6">
        <div className="mb-6">
          <h2 className="text-lg font-medium text-gray-900 mb-2">What do you want to learn?</h2>
          <p className="text-gray-500 mb-4">
            Enter your learning goal, and we'll create a personalized roadmap for you using AI.
            Be specific about what you want to learn to get the best results.
          </p>
          
          {error && (
            <div className="mb-4 p-3 bg-red-50 text-red-500 rounded-md">{error}</div>
          )}
          
          <form onSubmit={handleSubmit}>
            <div className="mb-4">
              <label htmlFor="goal" className="block text-sm font-medium text-gray-700 mb-1">
                Learning Goal
              </label>
              <textarea
                id="goal"
                name="goal"
                rows={3}
                className="block w-full rounded-md border border-gray-300 shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                placeholder="e.g., Learn Python programming for data science, Prepare for GATE exam, Master web development with React"
                value={goal}
                onChange={(e) => setGoal(e.target.value)}
              />
            </div>
            
            <div className="flex justify-end">
              <button
                type="submit"
                disabled={loading}
                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
              >
                {loading ? (
                  <>
                    <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Generating Roadmap...
                  </>
                ) : (
                  'Generate Roadmap'
                )}
              </button>
            </div>
          </form>
        </div>
        
        <div className="border-t border-gray-200 pt-4">
          <h3 className="text-sm font-medium text-gray-500 mb-2">Example learning goals:</h3>
          <ul className="list-disc pl-5 text-sm text-gray-500 space-y-1">
            <li>Learn JavaScript from scratch to build interactive websites</li>
            <li>Prepare for the JEE exam focusing on Physics and Mathematics</li>
            <li>Master machine learning concepts for natural language processing</li>
            <li>Learn digital marketing skills to promote my small business</li>
          </ul>
        </div>
      </div>
    </div>
  );
}