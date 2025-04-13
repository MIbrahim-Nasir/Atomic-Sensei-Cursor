'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { roadmapService } from '@/services/roadmap.service';
import timerService from '@/services/timer.service';
import { ClockIcon, ArrowRightIcon, ArrowLeftIcon, SparklesIcon } from '@heroicons/react/24/outline';
import { CheckCircleIcon } from '@heroicons/react/24/solid';
import notificationService from '@/services/notification.service';

export default function StartLearningPage() {
  const params = useParams();
  const router = useRouter();
  const roadmapId = params.roadmapId;
  
  const [roadmap, setRoadmap] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [timerMinutes, setTimerMinutes] = useState(20);
  const [timerType, setTimerType] = useState('manual');
  const [generatingTimer, setGeneratingTimer] = useState(false);
  const [aiTimerMinutes, setAiTimerMinutes] = useState(null);
  const [notificationGranted, setNotificationGranted] = useState(false);
  
  useEffect(() => {
    async function fetchData() {
      try {
        setLoading(true);
        setError('');
        
        // Fetch roadmap
        const roadmapData = await roadmapService.getRoadmapById(roadmapId);
        setRoadmap(roadmapData);
        
        // Check notification permission
        const permissionGranted = await notificationService.requestPermission();
        setNotificationGranted(permissionGranted);
        
        // Check if there's already an active timer
        const activeTimer = timerService.getCurrentTimer();
        if (activeTimer && activeTimer.roadmapId === roadmapId) {
          // Redirect to learning page if timer already exists
          router.push(`/roadmaps/${roadmapId}/learning?module=${activeTimer.moduleIndex}&topic=${activeTimer.topicIndex}`);
        }
      } catch (err) {
        console.error('Error fetching data:', err);
        setError('Failed to load roadmap. Please try again later.');
      } finally {
        setLoading(false);
      }
    }
    
    fetchData();
  }, [roadmapId, router]);
  
  const handleInputChange = (e) => {
    const value = parseInt(e.target.value);
    if (!isNaN(value) && value > 0) {
      setTimerMinutes(value);
    }
  };
  
  const handleTimerTypeChange = (type) => {
    setTimerType(type);
    if (type === 'ai' && !aiTimerMinutes) {
      generateAiTimerSuggestion();
    }
  };
  
  const generateAiTimerSuggestion = async () => {
    setGeneratingTimer(true);
    
    try {
      // In a real implementation, we'd call the API to get a suggestion from Gemini
      // For now, we'll simulate with a random value between 15-45 minutes
      const randomMinutes = Math.floor(Math.random() * 31) + 15;
      
      // Simulating API delay
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      setAiTimerMinutes(randomMinutes);
    } catch (err) {
      console.error('Error generating timer suggestion:', err);
      // Fallback to a default value
      setAiTimerMinutes(25);
    } finally {
      setGeneratingTimer(false);
    }
  };
  
  const startLearning = () => {
    if (!roadmap || !roadmap.modules || roadmap.modules.length === 0) {
      setError('Cannot start learning with an empty roadmap');
      return;
    }
    
    // Find the first incomplete topic
    let moduleIndex = 0;
    let topicIndex = 0;
    
    if (roadmap.currentModule !== undefined && roadmap.currentTopic !== undefined) {
      moduleIndex = roadmap.currentModule;
      topicIndex = roadmap.currentTopic;
    }
    
    // Set the timer
    const minutes = timerType === 'ai' && aiTimerMinutes ? aiTimerMinutes : timerMinutes;
    timerService.setLearningTimer(roadmapId, moduleIndex, topicIndex, minutes, timerType);
    
    // Show notification about timer start
    notificationService.storeNotification({
      title: 'Learning Timer Started',
      message: `Your timer has been set for ${minutes} minutes. You'll be notified when it's time to learn.`,
      type: 'info'
    });
    
    // Redirect back to roadmap page
    router.push(`/roadmaps/${roadmapId}`);
  };
  
  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
        <span className="ml-3 text-black">Loading roadmap...</span>
      </div>
    );
  }
  
  if (error) {
    return (
      <div className="max-w-3xl mx-auto mt-8 p-6 bg-red-50 rounded-lg text-center">
        <h2 className="text-xl font-medium text-red-800 mb-3">Error</h2>
        <p className="text-red-700 mb-4">{error}</p>
        <button
          onClick={() => router.push(`/roadmaps/${roadmapId}`)}
          className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700"
        >
          Back to Roadmap
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
    <div className="max-w-3xl mx-auto p-4">
      <button
        onClick={() => router.push(`/roadmaps/${roadmapId}`)}
        className="flex items-center text-blue-600 hover:text-blue-800 mb-6"
      >
        <ArrowLeftIcon className="h-4 w-4 mr-1" />
        Back to Roadmap
      </button>
      
      <div className="bg-white rounded-lg shadow-md overflow-hidden">
        <div className="p-6 border-b border-gray-200">
          <h1 className="text-2xl font-bold text-black">Start Learning</h1>
          <p className="mt-1 text-black">{roadmap.title}</p>
          
          {!notificationGranted && (
            <div className="mt-4 p-4 bg-yellow-50 rounded-md">
              <p className="text-sm text-yellow-800">
                <strong>Important:</strong> Please allow notifications to receive learning reminders when your timer expires.
              </p>
              <button
                onClick={() => notificationService.requestPermission().then(setNotificationGranted)}
                className="mt-2 px-3 py-1 bg-yellow-600 text-white text-sm rounded hover:bg-yellow-700"
              >
                Enable Notifications
              </button>
            </div>
          )}
        </div>
        
        <div className="p-6">
          <h2 className="text-lg font-medium text-black mb-4">Set Your Learning Timer</h2>
          
          <div className="mb-6">
            <p className="text-black mb-2">
              Choose how you want to schedule your learning:
            </p>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
              <div 
                className={`p-4 border rounded-lg cursor-pointer ${
                  timerType === 'manual' ? 'border-blue-500 bg-blue-50' : 'border-gray-200'
                }`}
                onClick={() => handleTimerTypeChange('manual')}
              >
                <div className="flex items-center">
                  <ClockIcon className="h-5 w-5 text-blue-600 mr-2" />
                  <h3 className="font-medium text-black">Manual Timer</h3>
                  {timerType === 'manual' && (
                    <CheckCircleIcon className="h-5 w-5 text-blue-600 ml-auto" />
                  )}
                </div>
                <p className="mt-2 text-sm text-black">
                  Set your own timer for when you want to receive your next lesson.
                </p>
                
                {timerType === 'manual' && (
                  <div className="mt-4">
                    <label htmlFor="minutes" className="block text-sm font-medium text-black mb-1">
                      Minutes until next lesson:
                    </label>
                    <input
                      type="number"
                      id="minutes"
                      min="1"
                      value={timerMinutes}
                      onChange={handleInputChange}
                      className="block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                    />
                  </div>
                )}
              </div>
              
              <div 
                className={`p-4 border rounded-lg cursor-pointer ${
                  timerType === 'ai' ? 'border-indigo-500 bg-indigo-50' : 'border-gray-200'
                }`}
                onClick={() => handleTimerTypeChange('ai')}
              >
                <div className="flex items-center">
                  <SparklesIcon className="h-5 w-5 text-indigo-600 mr-2" />
                  <h3 className="font-medium text-black">AI Suggestion</h3>
                  {timerType === 'ai' && (
                    <CheckCircleIcon className="h-5 w-5 text-indigo-600 ml-auto" />
                  )}
                </div>
                <p className="mt-2 text-sm text-black">
                  Let AI suggest an optimal time for your next learning session.
                </p>
                
                {timerType === 'ai' && (
                  <div className="mt-4">
                    {generatingTimer ? (
                      <div className="flex items-center">
                        <div className="animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-indigo-500 mr-2"></div>
                        <span className="text-sm text-black">Generating suggestion...</span>
                      </div>
                    ) : aiTimerMinutes ? (
                      <div>
                        <p className="text-sm text-black">
                          <span className="font-medium">AI suggestion:</span> {aiTimerMinutes} minutes
                        </p>
                        <button
                          onClick={generateAiTimerSuggestion}
                          className="mt-2 text-xs text-indigo-600 hover:text-indigo-800"
                        >
                          Generate another suggestion
                        </button>
                      </div>
                    ) : (
                      <div className="flex items-center">
                        <div className="animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-indigo-500 mr-2"></div>
                        <span className="text-sm text-black">Generating suggestion...</span>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
          
          <div className="mt-6 flex justify-end">
            <button
              onClick={startLearning}
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              Start Learning Timer
              <ArrowRightIcon className="ml-2 h-4 w-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
} 