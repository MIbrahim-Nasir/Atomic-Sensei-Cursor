'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { roadmapService } from '@/services/roadmap.service';
import RoadmapDetail from '@/components/roadmap/RoadmapDetail';
import { CheckCircleIcon, ArrowLeftIcon, TrashIcon } from '@heroicons/react/24/solid';

// Define types for the roadmap data structure
interface Subtopic {
  title: string;
  description: string;
  completed?: boolean;
}

interface Topic {
  title: string;
  description: string;
  order: number;
  estimatedTimeMinutes: number;
  completed?: boolean;
  subtopics?: Subtopic[];
}

interface Module {
  title: string;
  description: string;
  order: number;
  topics: Topic[];
  completed?: boolean;
}

interface Roadmap {
  _id: string;
  title: string;
  description: string;
  goal: string;
  modules: Module[];
  progress: number;
  currentModule: number;
  currentTopic: number;
}

interface SelectedTopic extends Topic {
  moduleIndex: number;
  topicIndex: number;
}

interface TopicContent {
  title: string;
  description: string;
  content: string;
  subtopics: Subtopic[];
}

export default function RoadmapPage() {
  const params = useParams();
  const router = useRouter();
  const roadmapId = params.roadmapId as string;
  
  const [roadmap, setRoadmap] = useState<Roadmap | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedTopic, setSelectedTopic] = useState<SelectedTopic | null>(null);
  const [topicContent, setTopicContent] = useState<TopicContent | null>(null);
  const [loadingContent] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    async function fetchRoadmap() {
      try {
        setLoading(true);
        setError('');
        const data = await roadmapService.getRoadmapById(roadmapId);
        setRoadmap(data);
      } catch (err) {
        console.error('Error fetching roadmap:', err);
        setError('Failed to load roadmap. Please try again later.');
      } finally {
        setLoading(false);
      }
    }

    if (roadmapId) {
      fetchRoadmap();
    }
  }, [roadmapId]);

  const handleTopicSelect = async (moduleIndex: number, topicIndex: number, topic: Topic) => {
    setSelectedTopic({ moduleIndex, topicIndex, ...topic });
    
    // If the topic already has content, we can load it
    // Otherwise in a real implementation we would use the contentService to fetch or generate content
    setTopicContent({
      title: topic.title,
      description: topic.description,
      content: `This is placeholder content for "${topic.title}". In the full implementation, this would be AI-generated content about this topic.`,
      subtopics: topic.subtopics || []
    });
  };

  const handleMarkComplete = async () => {
    if (!selectedTopic || !roadmap) return;
    
    try {
      await roadmapService.updateProgress(
        roadmapId, 
        selectedTopic.moduleIndex, 
        selectedTopic.topicIndex, 
        true
      );
      
      // Update the local roadmap state to reflect completion
      setRoadmap(prevRoadmap => {
        if (!prevRoadmap) return null;
        
        const updatedRoadmap = { ...prevRoadmap };
        updatedRoadmap.modules[selectedTopic.moduleIndex].topics[selectedTopic.topicIndex].completed = true;
        
        // Recalculate progress
        const totalTopics = updatedRoadmap.modules.reduce((count, module) => count + module.topics.length, 0);
        const completedTopics = updatedRoadmap.modules.reduce((count, module) => {
          return count + module.topics.filter(topic => topic.completed).length;
        }, 0);
        
        updatedRoadmap.progress = Math.round((completedTopics / totalTopics) * 100);
        
        return updatedRoadmap;
      });
    } catch (err) {
      console.error('Error updating progress:', err);
    }
  };

  const handleBackToRoadmap = () => {
    setSelectedTopic(null);
    setTopicContent(null);
  };

  const handleDeleteRoadmap = async () => {
    if (!roadmap) return;
    
    try {
      setDeleting(true);
      await roadmapService.deleteRoadmap(roadmapId);
      setDeleting(false);
      setShowDeleteModal(false);
      
      // Redirect to dashboard after successful deletion
      router.push('/dashboard');
    } catch (err) {
      console.error('Error deleting roadmap:', err);
      setDeleting(false);
      setError('Failed to delete roadmap. Please try again later.');
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
        <span className="ml-3 text-gray-700">Loading roadmap...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-3xl mx-auto mt-8 p-6 bg-red-50 rounded-lg text-center">
        <h2 className="text-xl font-medium text-red-800 mb-3">Error</h2>
        <p className="text-red-700 mb-4">{error}</p>
        <button
          onClick={() => router.push('/dashboard')}
          className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700"
        >
          Back to Dashboard
        </button>
      </div>
    );
  }

  if (!roadmap) {
    return (
      <div className="max-w-3xl mx-auto mt-8 p-6 bg-yellow-50 rounded-lg text-center">
        <h2 className="text-xl font-medium text-yellow-800 mb-3">Roadmap Not Found</h2>
        <p className="text-yellow-700 mb-4">The roadmap you&apos;re looking for could not be found.</p>
        <button
          onClick={() => router.push('/dashboard')}
          className="px-4 py-2 bg-yellow-600 text-white rounded-md hover:bg-yellow-700"
        >
          Back to Dashboard
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto p-4">
      <div className="mb-4 flex justify-between items-center">
        <button
          onClick={() => router.push('/dashboard')}
          className="flex items-center text-blue-600 hover:text-blue-800"
        >
          <ArrowLeftIcon className="h-4 w-4 mr-1" />
          Back to Dashboard
        </button>
        
        {!selectedTopic && roadmap && (
          <div className="flex space-x-2">
            <button
              onClick={() => router.push(`/roadmaps/${roadmapId}/start`)}
              className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 flex items-center"
            >
              Start Learning
            </button>
            
            <button
              onClick={() => setShowDeleteModal(true)}
              className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 flex items-center"
              aria-label="Delete roadmap"
            >
              <TrashIcon className="h-4 w-4 mr-1" />
              Delete
            </button>
          </div>
        )}
      </div>
      
      {/* Delete Confirmation Modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full m-4">
            <h3 className="text-xl font-medium text-gray-900 mb-4">Delete Roadmap</h3>
            <p className="mb-6 text-gray-700">
              Are you sure you want to delete &ldquo;{roadmap?.title}&rdquo;? This action cannot be undone.
              All associated content and progress will be permanently removed.
            </p>
            <div className="flex justify-end space-x-3">
              <button
                type="button"
                className="px-4 py-2 bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300"
                onClick={() => setShowDeleteModal(false)}
                disabled={deleting}
              >
                Cancel
              </button>
              <button
                type="button"
                className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 flex items-center"
                onClick={handleDeleteRoadmap}
                disabled={deleting}
              >
                {deleting ? (
                  <>
                    <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Deleting...
                  </>
                ) : (
                  <>
                    <TrashIcon className="h-4 w-4 mr-1" />
                    Delete Roadmap
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
      
      {selectedTopic ? (
        <div className="bg-white rounded-lg shadow-md overflow-hidden">
          <div className="p-6 border-b border-gray-200">
            <button
              onClick={handleBackToRoadmap}
              className="flex items-center text-gray-600 hover:text-blue-600 mb-4"
            >
              <ArrowLeftIcon className="h-4 w-4 mr-1" />
              Back to Roadmap
            </button>
            
            <h1 className="text-2xl font-bold text-black">{selectedTopic.title}</h1>
            <p className="mt-1 text-black">{selectedTopic.description}</p>
            
            <div className="mt-4 flex items-center justify-between">
              <span className="text-sm text-black">
                Estimated time: {selectedTopic.estimatedTimeMinutes} minutes
              </span>
              
              <button
                onClick={handleMarkComplete}
                disabled={selectedTopic.completed}
                className={`px-4 py-2 rounded-md flex items-center ${
                  selectedTopic.completed 
                    ? 'bg-green-100 text-green-700 cursor-not-allowed' 
                    : 'bg-blue-600 text-white hover:bg-blue-700'
                }`}
              >
                {selectedTopic.completed ? (
                  <>
                    <CheckCircleIcon className="h-5 w-5 mr-1" />
                    Completed
                  </>
                ) : (
                  'Mark as Complete'
                )}
              </button>
            </div>
          </div>
          
          <div className="p-6">
            {loadingContent ? (
              <div className="text-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500 mx-auto"></div>
                <p className="mt-3 text-black">Loading content...</p>
              </div>
            ) : topicContent ? (
              <div className="prose max-w-none">
                <div className="mb-6">
                  <h2 className="text-xl font-semibold text-black mb-4">Content</h2>
                  <div className="p-4 bg-gray-50 rounded-lg text-black">
                    {topicContent.content}
                  </div>
                </div>
                
                {selectedTopic.subtopics && selectedTopic.subtopics.length > 0 && (
                  <div>
                    <h3 className="text-lg font-medium text-black mb-3">Subtopics</h3>
                    <ul className="space-y-2">
                      {selectedTopic.subtopics.map((subtopic, idx) => (
                        <li key={idx} className="p-3 bg-gray-50 rounded-md">
                          <h4 className="font-medium text-black">{subtopic.title}</h4>
                          <p className="text-sm text-black">{subtopic.description}</p>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            ) : (
              <p className="text-center text-black">No content available for this topic.</p>
            )}
          </div>
        </div>
      ) : (
        <RoadmapDetail roadmap={roadmap} onTopicSelect={handleTopicSelect} />
      )}
    </div>
  );
}