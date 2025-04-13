import React from 'react';
import Link from 'next/link';
import { ArrowRightIcon } from '@heroicons/react/24/outline';

const RoadmapCard = ({ roadmap }) => {
  // Calculate progress percentage
  const progressPercentage = roadmap.progress ? roadmap.progress : 0;
  
  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md overflow-hidden hover:shadow-lg transition-shadow duration-300">
      <div className="p-6">
        <div className="flex justify-between items-start mb-4">
          <h3 className="text-xl font-semibold text-gray-800 dark:text-gray-100">{roadmap.title}</h3>
          <span className="px-3 py-1 text-xs font-medium rounded-full bg-indigo-100 text-indigo-800 dark:bg-indigo-900 dark:text-indigo-200">
            {roadmap.category || 'Learning'}
          </span>
        </div>
        
        <p className="text-gray-600 dark:text-gray-300 mb-6 line-clamp-2">
          {roadmap.description || 'No description available'}
        </p>
        
        {/* Progress bar */}
        <div className="mb-3">
          <div className="flex justify-between items-center mb-1">
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Progress</span>
            <span className="text-sm font-medium text-indigo-600 dark:text-indigo-400">{progressPercentage}%</span>
          </div>
          <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
            <div 
              className="bg-indigo-600 h-2 rounded-full" 
              style={{ width: `${progressPercentage}%` }}
            ></div>
          </div>
        </div>
        
        <div className="flex justify-between items-center mt-6">
          <div className="text-sm text-gray-500 dark:text-gray-400">
            {roadmap.totalModules || 0} modules • {roadmap.totalTopics || 0} topics
          </div>
          
          <Link 
            href={`/roadmaps/${roadmap._id}`}
            className="inline-flex items-center text-indigo-600 dark:text-indigo-400 hover:text-indigo-800 dark:hover:text-indigo-300 font-medium"
          >
            View Roadmap
            <ArrowRightIcon className="ml-1 h-4 w-4" />
          </Link>
        </div>
      </div>
    </div>
  );
};

export default RoadmapCard; 