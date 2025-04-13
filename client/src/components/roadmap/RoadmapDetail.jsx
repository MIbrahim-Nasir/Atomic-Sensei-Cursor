'use client';

import { useState } from 'react';
import { CheckCircleIcon, ChevronDownIcon, ChevronRightIcon } from '@heroicons/react/24/solid';
import { roadmapService } from '@/services/roadmap.service';

export default function RoadmapDetail({ roadmap, onTopicSelect }) {
  const [expandedModules, setExpandedModules] = useState(
    // Initialize with the current module expanded
    roadmap?.modules ? 
    { [roadmap.currentModule]: true } : 
    {}
  );
  
  // Track expanded topics for subtopics
  const [expandedTopics, setExpandedTopics] = useState({});

  const toggleModule = (moduleIndex) => {
    setExpandedModules(prev => ({
      ...prev,
      [moduleIndex]: !prev[moduleIndex]
    }));
  };
  
  const toggleTopic = (moduleIndex, topicIndex) => {
    const topicKey = `${moduleIndex}-${topicIndex}`;
    setExpandedTopics(prev => ({
      ...prev,
      [topicKey]: !prev[topicKey]
    }));
  };

  const handleTopicClick = (moduleIndex, topicIndex, topic) => {
    // Allow access to all topics - removed accessibility check
    onTopicSelect(moduleIndex, topicIndex, topic);
  };
  
  const handleSubtopicClick = (moduleIndex, topicIndex, subtopicIndex, subtopic) => {
    // Allow access to all subtopics - removed accessibility check
    onTopicSelect(moduleIndex, topicIndex, {
      ...roadmap.modules[moduleIndex].topics[topicIndex],
      currentSubtopic: subtopicIndex,
      subtopicTitle: subtopic.title
    });
  };

  // Keeping the function for UI highlighting but not using it for access control
  const isCurrentTopic = (moduleIndex, topicIndex) => {
    return moduleIndex === roadmap.currentModule && topicIndex === roadmap.currentTopic;
  };

  if (!roadmap || !roadmap.modules) {
    return (
      <div className="p-6 bg-white rounded-lg shadow">
        <div className="animate-pulse">
          <div className="h-6 bg-gray-200 rounded w-1/4 mb-4"></div>
          <div className="h-4 bg-gray-200 rounded w-3/4 mb-6"></div>
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="space-y-2">
                <div className="h-5 bg-gray-200 rounded w-1/3"></div>
                <div className="h-4 bg-gray-200 rounded w-full"></div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow overflow-hidden">
      <div className="p-6 border-b border-gray-200">
        <h1 className="text-2xl font-bold text-black">{roadmap.title}</h1>
        <p className="mt-1 text-black">{roadmap.description}</p>
        <div className="mt-4">
          <div className="relative pt-1">
            <div className="flex mb-2 items-center justify-between">
              <div>
                <span className="text-xs font-semibold inline-block py-1 px-2 uppercase rounded-full text-blue-600 bg-blue-200">
                  Overall Progress
                </span>
              </div>
              <div className="text-right">
                <span className="text-xs font-semibold inline-block text-blue-600">
                  {roadmap.progress}%
                </span>
              </div>
            </div>
            <div className="overflow-hidden h-2 mb-4 text-xs flex rounded bg-blue-100">
              <div
                style={{ width: `${roadmap.progress}%` }}
                className="shadow-none flex flex-col text-center whitespace-nowrap text-white justify-center bg-blue-500"
              ></div>
            </div>
          </div>
        </div>
      </div>

      <div className="px-6 py-4">
        <h2 className="text-lg font-medium text-black mb-4">Learning Modules</h2>
        <div className="space-y-4">
          {roadmap.modules.map((module, moduleIndex) => (
            <div key={moduleIndex} className="border border-gray-200 rounded-md overflow-hidden">
              <button
                className={`w-full text-left px-4 py-3 flex justify-between items-center focus:outline-none ${
                  moduleIndex <= roadmap.currentModule ? 'bg-blue-50' : 'bg-gray-50'
                }`}
                onClick={() => toggleModule(moduleIndex)}
              >
                <div className="flex items-center">
                  <span className="font-medium text-black">{module.title}</span>
                  {module.completed && (
                    <CheckCircleIcon className="ml-2 h-5 w-5 text-green-500" />
                  )}
                </div>
                {expandedModules[moduleIndex] ? (
                  <ChevronDownIcon className="h-5 w-5 text-gray-500" />
                ) : (
                  <ChevronRightIcon className="h-5 w-5 text-gray-500" />
                )}
              </button>

              {expandedModules[moduleIndex] && (
                <div className="border-t border-gray-200">
                  <ul className="divide-y divide-gray-200">
                    {module.topics.map((topic, topicIndex) => {
                      const isCurrent = isCurrentTopic(moduleIndex, topicIndex);
                      const topicKey = `${moduleIndex}-${topicIndex}`;
                      const hasSubtopics = topic.subtopics && topic.subtopics.length > 0;

                      return (
                        <li key={topicIndex}>
                          <div className="border-b border-gray-100 last:border-b-0">
                            <div 
                              className={`w-full text-left px-4 py-3 flex justify-between items-center hover:bg-gray-50 cursor-pointer ${
                                isCurrent ? 'bg-blue-50' : ''
                              }`}
                            >
                              <div className="flex items-center" onClick={() => handleTopicClick(moduleIndex, topicIndex, topic)}>
                                <span className="text-sm text-black">
                                  {topicIndex + 1}. {topic.title}
                                </span>
                                {topic.completed && (
                                  <CheckCircleIcon className="ml-2 h-4 w-4 text-green-500" />
                                )}
                              </div>
                              <div className="flex items-center">
                                <span className="text-xs text-black mr-3">{topic.estimatedTimeMinutes} min</span>
                                {hasSubtopics && (
                                  <button 
                                    onClick={() => toggleTopic(moduleIndex, topicIndex)}
                                    className="focus:outline-none"
                                  >
                                    {expandedTopics[topicKey] ? (
                                      <ChevronDownIcon className="h-4 w-4 text-gray-500" />
                                    ) : (
                                      <ChevronRightIcon className="h-4 w-4 text-gray-500" />
                                    )}
                                  </button>
                                )}
                              </div>
                            </div>
                            
                            {/* Subtopics section */}
                            {hasSubtopics && expandedTopics[topicKey] && (
                              <ul className="pl-8 pb-2 divide-y divide-gray-100 bg-gray-50">
                                {topic.subtopics.map((subtopic, subtopicIndex) => (
                                  <li key={subtopicIndex}>
                                    <button
                                      onClick={() => handleSubtopicClick(moduleIndex, topicIndex, subtopicIndex, subtopic)}
                                      className="w-full text-left px-4 py-2 flex items-center hover:bg-gray-100 cursor-pointer"
                                    >
                                      <div className="w-1 h-1 rounded-full bg-gray-400 mr-2"></div>
                                      <span className="text-sm text-black">
                                        {subtopic.title}
                                      </span>
                                    </button>
                                  </li>
                                ))}
                              </ul>
                            )}
                          </div>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
} 