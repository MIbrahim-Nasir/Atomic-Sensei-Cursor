'use client';

import { useState, useEffect } from 'react';
import { useParams, useSearchParams, useRouter } from 'next/navigation';
import { roadmapService } from '@/services/roadmap.service';
import contentService from '@/services/content.service';
import timerService from '@/services/timer.service';
import { ArrowLeftIcon, CheckIcon, XMarkIcon, ClockIcon } from '@heroicons/react/24/outline';
import { CheckCircleIcon } from '@heroicons/react/24/solid';

export default function LearningPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const router = useRouter();
  
  const roadmapId = params.roadmapId;
  const moduleIndexParam = searchParams.get('module');
  const topicIndexParam = searchParams.get('topic');
  const subtopicIndexParam = searchParams.get('subtopic');
  
  const moduleIndex = moduleIndexParam ? parseInt(moduleIndexParam) : 0;
  const topicIndex = topicIndexParam ? parseInt(topicIndexParam) : 0;
  const subtopicIndex = subtopicIndexParam ? parseInt(subtopicIndexParam) : null;
  
  const [roadmap, setRoadmap] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [content, setContent] = useState(null);
  const [quiz, setQuiz] = useState(null);
  const [showQuiz, setShowQuiz] = useState(false);
  const [generatingContent, setGeneratingContent] = useState(false);
  const [generatingQuiz, setGeneratingQuiz] = useState(false);
  const [quizAnswers, setQuizAnswers] = useState({});
  const [quizSubmitted, setQuizSubmitted] = useState(false);
  const [quizResults, setQuizResults] = useState(null);
  const [showTimerSetup, setShowTimerSetup] = useState(false);
  const [nextTimerMinutes, setNextTimerMinutes] = useState(20);
  const [timerType, setTimerType] = useState('manual');
  const [aiTimerMinutes, setAiTimerMinutes] = useState(null);
  const [nextModuleIndex, setNextModuleIndex] = useState(0);
  const [nextTopicIndex, setNextTopicIndex] = useState(0);
  const [nextSubtopicIndex, setNextSubtopicIndex] = useState(0);
  const [currentSubtopic, setCurrentSubtopic] = useState(null);
  
  useEffect(() => {
    async function fetchData() {
      try {
        setLoading(true);
        setError('');
        
        // Fetch roadmap
        const roadmapData = await roadmapService.getRoadmapById(roadmapId);
        setRoadmap(roadmapData);
        
        // Check if the indices are valid
        if (!roadmapData.modules || 
            moduleIndex >= roadmapData.modules.length || 
            !roadmapData.modules[moduleIndex].topics || 
            topicIndex >= roadmapData.modules[moduleIndex].topics.length) {
          setError('Invalid module or topic index');
          return;
        }
        
        // Get current topic
        const currentTopic = roadmapData.modules[moduleIndex].topics[topicIndex];
        
        // Handle subtopic logic
        if (subtopicIndex !== null && 
            currentTopic.subtopics && 
            subtopicIndex < currentTopic.subtopics.length) {
          setCurrentSubtopic(currentTopic.subtopics[subtopicIndex]);
        }
        
        // Determine next topic/subtopic for later use
        calculateNextLearningUnit(roadmapData, moduleIndex, topicIndex, subtopicIndex);
        
        // Try to get content from cache first
        const cacheKey = subtopicIndex !== null ? 
          `${roadmapId}_${moduleIndex}_${topicIndex}_${subtopicIndex}` : 
          `${roadmapId}_${moduleIndex}_${topicIndex}`;
          
        const cachedContent = localStorage.getItem(`content_${cacheKey}`);
        
        if (cachedContent) {
          setContent(JSON.parse(cachedContent));
        } else {
          // Generate real content from API
          await generateContent(roadmapData);
        }
      } catch (err) {
        console.error('Error loading data:', err);
        setError('Failed to load learning content. Please try again later.');
      } finally {
        setLoading(false);
      }
    }
    
    fetchData();
  }, [roadmapId, moduleIndex, topicIndex, subtopicIndex]);
  
  const calculateNextLearningUnit = (roadmap, currentModuleIndex, currentTopicIndex, currentSubtopicIndex) => {
    if (!roadmap || !roadmap.modules) return;
    
    let nextModule = currentModuleIndex;
    let nextTopic = currentTopicIndex;
    let nextSubtopic = currentSubtopicIndex !== null ? currentSubtopicIndex + 1 : null;
    
    const currentTopic = roadmap.modules[currentModuleIndex].topics[currentTopicIndex];
    
    // If we're dealing with subtopics
    if (currentSubtopicIndex !== null && currentTopic.subtopics) {
      // Check if we need to move to the next topic
      if (nextSubtopic >= currentTopic.subtopics.length) {
        nextTopic++;
        nextSubtopic = 0;
        
        // Check if we need to move to the next module
        if (nextTopic >= roadmap.modules[nextModule].topics.length) {
          nextModule++;
          nextTopic = 0;
          
          // Check if we've reached the end of the roadmap
          if (nextModule >= roadmap.modules.length) {
            nextModule = 0;
            nextTopic = 0;
          }
        }
        
        // Check if the next topic has subtopics
        const nextTopicObj = roadmap.modules[nextModule].topics[nextTopic];
        if (!nextTopicObj.subtopics || nextTopicObj.subtopics.length === 0) {
          nextSubtopic = null;
        }
      }
    } else {
      // We're dealing with topics directly
      nextTopic++;
      
      // Check if we need to move to the next module
      if (nextTopic >= roadmap.modules[nextModule].topics.length) {
        nextModule++;
        nextTopic = 0;
        
        // Check if we've reached the end of the roadmap
        if (nextModule >= roadmap.modules.length) {
          nextModule = 0;
          nextTopic = 0;
        }
      }
      
      // Check if the next topic has subtopics
      const nextTopicObj = roadmap.modules[nextModule].topics[nextTopic];
      if (nextTopicObj.subtopics && nextTopicObj.subtopics.length > 0) {
        nextSubtopic = 0;
      } else {
        nextSubtopic = null;
      }
    }
    
    setNextModuleIndex(nextModule);
    setNextTopicIndex(nextTopic);
    setNextSubtopicIndex(nextSubtopic);
  };
  
  const generateContent = async (roadmapData) => {
    try {
      setGeneratingContent(true);
      
      const module = roadmapData.modules[moduleIndex];
      const topic = module.topics[topicIndex];
      
      // Prepare the content request data
      const contentRequestData = {
        roadmapId,
        moduleIndex,
        topicIndex,
        subtopicIndex,
        moduleTitle: module.title,
        moduleDescription: module.description,
        topicTitle: topic.title,
        topicDescription: topic.description,
        subtopicTitle: currentSubtopic ? currentSubtopic.title : null,
        subtopicDescription: currentSubtopic ? currentSubtopic.description : null,
        estimatedTimeMinutes: topic.estimatedTimeMinutes || 10
      };
      
      // Call the actual API to generate content
      let generatedContent;
      try {
        // Try to use the real API first
        generatedContent = await contentService.generateContent(roadmapId, moduleIndex, topicIndex);
      } catch (apiError) {
        console.warn('API call failed, using local generation:', apiError);
        
        // Fallback to generating content from the title and description
        const contentTitle = currentSubtopic ? currentSubtopic.title : topic.title;
        const contentDescription = currentSubtopic ? currentSubtopic.description : topic.description;
        
        generatedContent = {
          id: `content-${Date.now()}`,
          title: contentTitle,
          description: contentDescription,
          content: `# ${contentTitle}\n\n${contentDescription}\n\nPlease set up your API key in the .env file to generate real content from Gemini.`,
          timestamp: new Date().toISOString()
        };
      }
      
      setContent(generatedContent);
      
      // Store in local storage for future use
      const cacheKey = subtopicIndex !== null ? 
        `${roadmapId}_${moduleIndex}_${topicIndex}_${subtopicIndex}` : 
        `${roadmapId}_${moduleIndex}_${topicIndex}`;
        
      localStorage.setItem(`content_${cacheKey}`, JSON.stringify(generatedContent));
      
    } catch (err) {
      console.error('Error generating content:', err);
      setError('Failed to generate learning content');
    } finally {
      setGeneratingContent(false);
    }
  };
  
  const handleStartQuiz = async () => {
    if (quiz) {
      setShowQuiz(true);
      return;
    }
    
    try {
      setGeneratingQuiz(true);
      setError('');
      
      const module = roadmap.modules[moduleIndex];
      const topic = module.topics[topicIndex];
      
      // Prepare the quiz request data
      const quizRequestData = {
        roadmapId,
        moduleIndex,
        topicIndex,
        subtopicIndex,
        moduleTitle: module.title,
        topicTitle: topic.title,
        subtopicTitle: currentSubtopic ? currentSubtopic.title : null,
        content: content.content // Send the content to generate relevant questions
      };
      
      // Call the actual API to generate quiz
      let generatedQuiz;
      try {
        // Try to use the real API first
        generatedQuiz = await contentService.generateQuiz(roadmapId, moduleIndex, topicIndex);
      } catch (apiError) {
        console.warn('API call failed, using local quiz generation:', apiError);
        
        // Generate a basic quiz based on the topic/subtopic
        const quizTitle = currentSubtopic ? currentSubtopic.title : topic.title;
        
        generatedQuiz = {
          id: `quiz-${Date.now()}`,
          title: `Quiz: ${quizTitle}`,
          description: `Test your knowledge of ${quizTitle}`,
          questions: [
            {
              id: 1,
              text: `What is the main concept covered in ${quizTitle}?`,
              type: 'multiple-choice',
              options: [
                { id: 'a', text: 'Option A - Please set up Gemini API for real questions' },
                { id: 'b', text: 'Option B - Configure your API key in .env file' },
                { id: 'c', text: 'Option C - This is a placeholder question' },
                { id: 'd', text: 'Option D - Check the README for setup instructions' }
              ],
              correctAnswer: 'a',
              explanation: 'This is a placeholder question. Please set up your Gemini API key for real quiz generation.'
            },
            {
              id: 2,
              text: `True or False: ${quizTitle} is a fundamental concept in this subject.`,
              type: 'true-false',
              correctAnswer: 'true',
              explanation: 'This is a placeholder question. With a functioning API, you would get relevant questions about the topic.'
            }
          ],
          timestamp: new Date().toISOString()
        };
      }
      
      setQuiz(generatedQuiz);
      setShowQuiz(true);
      
      // Initialize quiz answers
      const initialAnswers = {};
      generatedQuiz.questions.forEach(q => {
        initialAnswers[q.id] = null;
      });
      setQuizAnswers(initialAnswers);
      
    } catch (err) {
      console.error('Error generating quiz:', err);
      setError('Failed to generate quiz questions');
    } finally {
      setGeneratingQuiz(false);
    }
  };
  
  const handleAnswerSelect = (questionId, answerId) => {
    if (quizSubmitted) return; // Don't allow changes after submission
    
    setQuizAnswers(prev => ({
      ...prev,
      [questionId]: answerId
    }));
  };
  
  const handleQuizSubmit = async () => {
    // Check if all questions are answered
    const unanswered = Object.values(quizAnswers).filter(a => a === null).length;
    if (unanswered > 0) {
      alert(`You have ${unanswered} unanswered questions. Please complete all questions before submitting.`);
      return;
    }
    
    try {
      setQuizSubmitted(true);
      
      // In a real implementation with API access, we would submit to the backend
      // For now, we'll simulate results calculation
      const results = {
        score: 0,
        totalQuestions: quiz.questions.length,
        correctAnswers: 0,
        questions: []
      };
      
      // Process each question
      quiz.questions.forEach(question => {
        const userAnswer = quizAnswers[question.id];
        let isCorrect = false;
        
        if (question.type === 'multiple-choice') {
          // For multiple choice, check if selected option is correct
          isCorrect = userAnswer === question.correctAnswer;
        } else if (question.type === 'true-false') {
          // For true/false, direct comparison
          isCorrect = userAnswer === question.correctAnswer;
        }
        
        results.questions.push({
          id: question.id,
          text: question.text,
          userAnswer: userAnswer,
          correctAnswer: question.correctAnswer,
          isCorrect,
          explanation: question.explanation
        });
        
        if (isCorrect) {
          results.correctAnswers++;
        }
      });
      
      // Calculate score
      results.score = Math.round((results.correctAnswers / results.totalQuestions) * 100);
      
      setQuizResults(results);
      
      // Update the completion status of the subtopic or topic in the backend
      try {
        // Track which unit we just completed - topic or subtopic
        const completionData = {
          roadmapId,
          moduleIndex,
          topicIndex
        };
        
        if (subtopicIndex !== null) {
          completionData.subtopicIndex = subtopicIndex;
        }
        
        // In a real implementation, call API to update progress
        // await roadmapService.updateLearningProgress(completionData);
      } catch (progressError) {
        console.error('Failed to update learning progress:', progressError);
      }
      
    } catch (err) {
      console.error('Error submitting quiz:', err);
      setError('Failed to submit quiz answers');
    }
  };
  
  const generateAiTimerSuggestion = async () => {
    try {
      // In a real implementation, call the API to get AI suggestion
      // For now, simulate a response
      setTimeout(() => {
        // Generate a random number between 15 and 45
        const minutes = Math.floor(Math.random() * 31) + 15;
        setAiTimerMinutes(minutes);
      }, 1500);
    } catch (err) {
      console.error('Error generating timer suggestion:', err);
      // Fallback to a default value
      setAiTimerMinutes(30);
    }
  };
  
  const handleSetNextTimer = () => {
    // Get the minutes based on timer type
    const minutes = timerType === 'manual' ? nextTimerMinutes : aiTimerMinutes;
    
    // Set the timer
    timerService.setLearningTimer(
      roadmapId,
      nextModuleIndex,
      nextTopicIndex,
      minutes,
      timerType
    );
    
    // Navigate back to the roadmap
    router.push(`/roadmaps/${roadmapId}`);
  };
  
  const handleBackToRoadmap = () => {
    router.push(`/roadmaps/${roadmapId}`);
  };
  
  if (loading || generatingContent) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
        <span className="ml-3 text-black">
          {generatingContent ? 'Generating learning content...' : 'Loading...'}
        </span>
      </div>
    );
  }
  
  if (error) {
    return (
      <div className="max-w-3xl mx-auto mt-8 p-6 bg-red-50 rounded-lg text-center">
        <h2 className="text-xl font-medium text-red-800 mb-3">Error</h2>
        <p className="text-red-700 mb-4">{error}</p>
        <button
          onClick={handleBackToRoadmap}
          className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700"
        >
          Back to Roadmap
        </button>
      </div>
    );
  }
  
  if (!roadmap || !content) {
    return (
      <div className="max-w-3xl mx-auto mt-8 p-6 bg-yellow-50 rounded-lg text-center">
        <h2 className="text-xl font-medium text-yellow-800 mb-3">Content Not Found</h2>
        <p className="text-yellow-700 mb-4">The learning content could not be loaded.</p>
        <button
          onClick={handleBackToRoadmap}
          className="px-4 py-2 bg-yellow-600 text-white rounded-md hover:bg-yellow-700"
        >
          Back to Roadmap
        </button>
      </div>
    );
  }
  
  // Get the current topic or subtopic title for display
  const learningUnitTitle = currentSubtopic ? currentSubtopic.title : roadmap.modules[moduleIndex].topics[topicIndex].title;
  
  return (
    <div className="max-w-4xl mx-auto p-4">
      <button
        onClick={handleBackToRoadmap}
        className="flex items-center text-blue-600 hover:text-blue-800 mb-6"
      >
        <ArrowLeftIcon className="h-4 w-4 mr-1" />
        Back to Roadmap
      </button>
      
      {/* Timer Setup Screen */}
      {showTimerSetup ? (
        <div className="bg-white rounded-lg shadow-md overflow-hidden">
          <div className="p-6 border-b border-gray-200">
            <h1 className="text-2xl font-bold text-black">Great Job! 🎉</h1>
            <p className="mt-1 text-black">
              You've completed this learning topic. Set a timer for your next lesson?
            </p>
          </div>
          
          <div className="p-6">
            <div className="mb-6">
              <p className="text-black mb-4">
                Choose when you would like to receive your next lesson:
              </p>
              
              <div className="space-y-4">
                <div className="flex items-center">
                  <input
                    id="manual-timer"
                    type="radio"
                    name="timer-type"
                    checked={timerType === 'manual'}
                    onChange={() => setTimerType('manual')}
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300"
                  />
                  <label htmlFor="manual-timer" className="ml-2 block text-black">
                    Set your own timer
                  </label>
                  
                  {timerType === 'manual' && (
                    <div className="ml-6">
                      <input
                        type="number"
                        min="1"
                        value={nextTimerMinutes}
                        onChange={(e) => setNextTimerMinutes(parseInt(e.target.value) || 20)}
                        className="block w-20 border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                      />
                      <span className="ml-2 text-sm text-black">minutes</span>
                    </div>
                  )}
                </div>
                
                <div className="flex items-center">
                  <input
                    id="ai-timer"
                    type="radio"
                    name="timer-type"
                    checked={timerType === 'ai'}
                    onChange={() => {
                      setTimerType('ai');
                      if (!aiTimerMinutes) generateAiTimerSuggestion();
                    }}
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300"
                  />
                  <label htmlFor="ai-timer" className="ml-2 block text-black">
                    AI suggested timer
                  </label>
                  
                  {timerType === 'ai' && (
                    <div className="ml-6 flex items-center">
                      {aiTimerMinutes ? (
                        <span className="text-sm text-black">{aiTimerMinutes} minutes</span>
                      ) : (
                        <div className="flex items-center">
                          <div className="animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-blue-500 mr-2"></div>
                          <span className="text-sm text-black">Generating...</span>
                        </div>
                      )}
                      
                      {aiTimerMinutes && (
                        <button
                          onClick={generateAiTimerSuggestion}
                          className="ml-3 text-xs text-blue-600 hover:text-blue-800"
                        >
                          Regenerate
                        </button>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>
            
            <div className="flex justify-end space-x-4">
              <button
                onClick={handleBackToRoadmap}
                className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
              >
                Skip Timer
              </button>
              
              <button
                onClick={handleSetNextTimer}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
              >
                Set Timer & Continue
              </button>
            </div>
          </div>
        </div>
      ) : showQuiz ? (
        /* Quiz Screen */
        <div className="bg-white rounded-lg shadow-md overflow-hidden">
          <div className="p-6 border-b border-gray-200">
            <h1 className="text-2xl font-bold text-black">{quiz.title}</h1>
            <p className="mt-1 text-black">{quiz.description}</p>
          </div>
          
          {quizSubmitted && quizResults ? (
            /* Quiz Results */
            <div className="p-6">
              <div className="mb-6 text-center">
                <div className={`inline-flex items-center justify-center h-20 w-20 rounded-full ${
                  quizResults.score >= 80 ? 'bg-green-100' : 
                  quizResults.score >= 50 ? 'bg-yellow-100' : 'bg-red-100'
                }`}>
                  <span className={`text-2xl font-bold ${
                    quizResults.score >= 80 ? 'text-green-700' : 
                    quizResults.score >= 50 ? 'text-yellow-700' : 'text-red-700'
                  }`}>
                    {quizResults.score}%
                  </span>
                </div>
                <p className="mt-2 text-black font-medium">
                  You got {quizResults.correctAnswers} out of {quizResults.totalQuestions} questions correct
                </p>
              </div>
              
              <div>
                <h2 className="text-lg font-medium text-black mb-4">Review</h2>
                <div className="space-y-6">
                  {quizResults.questions.map((question, index) => (
                    <div key={question.id} className={`p-4 rounded-lg ${
                      question.isCorrect ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'
                    }`}>
                      <p className="text-black font-medium">Question {index + 1}: {question.text}</p>
                      
                      <div className="mt-2 flex items-center">
                        <span className="text-sm text-black">Your answer: </span>
                        <span className={`ml-2 text-sm font-medium ${question.isCorrect ? 'text-green-700' : 'text-red-700'}`}>
                          {question.userAnswer}
                        </span>
                        {question.isCorrect ? (
                          <CheckIcon className="ml-2 h-5 w-5 text-green-500" />
                        ) : (
                          <XMarkIcon className="ml-2 h-5 w-5 text-red-500" />
                        )}
                      </div>
                      
                      {!question.isCorrect && (
                        <div className="mt-1 flex items-center">
                          <span className="text-sm text-black">Correct answer:</span>
                          <span className="ml-2 text-sm font-medium text-green-700">
                            {question.correctAnswer}
                          </span>
                        </div>
                      )}
                      
                      <p className="mt-2 text-sm text-gray-700">{question.explanation}</p>
                    </div>
                  ))}
                </div>
              </div>
              
              <div className="mt-6 flex justify-end">
                <button
                  onClick={() => setShowTimerSetup(true)}
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                >
                  Continue
                </button>
              </div>
            </div>
          ) : (
            /* Quiz Questions */
            <div className="p-6">
              {generatingQuiz ? (
                <div className="flex justify-center items-center py-12">
                  <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500 mr-2"></div>
                  <span className="text-black">Generating quiz questions...</span>
                </div>
              ) : (
                <>
                  <div className="space-y-6">
                    {quiz.questions.map((question, index) => (
                      <div key={question.id} className="border border-gray-200 rounded-lg p-4">
                        <p className="text-black font-medium mb-3">Question {index + 1}: {question.text}</p>
                        
                        {question.type === 'multiple-choice' ? (
                          <div className="space-y-2">
                            {question.options.map((option) => (
                              <div key={option.id} className="flex items-center">
                                <input
                                  id={`q${question.id}-${option.id}`}
                                  type="radio"
                                  name={`question-${question.id}`}
                                  checked={quizAnswers[question.id] === option.id}
                                  onChange={() => handleAnswerSelect(question.id, option.id)}
                                  disabled={quizSubmitted}
                                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300"
                                />
                                <label htmlFor={`q${question.id}-${option.id}`} className="ml-3 text-black">
                                  {option.text}
                                </label>
                              </div>
                            ))}
                          </div>
                        ) : question.type === 'true-false' ? (
                          <div className="space-y-2">
                            <div className="flex items-center">
                              <input
                                id={`q${question.id}-true`}
                                type="radio"
                                name={`question-${question.id}`}
                                checked={quizAnswers[question.id] === 'true'}
                                onChange={() => handleAnswerSelect(question.id, 'true')}
                                disabled={quizSubmitted}
                                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300"
                              />
                              <label htmlFor={`q${question.id}-true`} className="ml-3 text-black">
                                True
                              </label>
                            </div>
                            <div className="flex items-center">
                              <input
                                id={`q${question.id}-false`}
                                type="radio"
                                name={`question-${question.id}`}
                                checked={quizAnswers[question.id] === 'false'}
                                onChange={() => handleAnswerSelect(question.id, 'false')}
                                disabled={quizSubmitted}
                                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300"
                              />
                              <label htmlFor={`q${question.id}-false`} className="ml-3 text-black">
                                False
                              </label>
                            </div>
                          </div>
                        ) : null}
                      </div>
                    ))}
                  </div>
                  
                  <div className="mt-6 flex justify-end">
                    <button
                      onClick={handleQuizSubmit}
                      className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                      disabled={quizSubmitted}
                    >
                      Submit Answers
                    </button>
                  </div>
                </>
              )}
            </div>
          )}
        </div>
      ) : (
        /* Content Screen */
        <div className="bg-white rounded-lg shadow-md overflow-hidden">
          <div className="p-6 border-b border-gray-200">
            <div className="flex justify-between items-start">
              <div>
                <h1 className="text-2xl font-bold text-black">{content.title}</h1>
                <p className="mt-1 text-black">{content.description}</p>
              </div>
              
              <div className="flex items-center text-sm">
                <ClockIcon className="h-4 w-4 text-gray-500 mr-1" />
                <span className="text-black">
                  {roadmap.modules[moduleIndex].topics[topicIndex].estimatedTimeMinutes || 10} min
                </span>
              </div>
            </div>
          </div>
          
          <div className="p-6">
            <div className="prose max-w-none mb-8">
              <div className="text-black whitespace-pre-line">
                {content.content}
              </div>
            </div>
            
            <div className="mt-6 flex justify-end">
              <button
                onClick={handleStartQuiz}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
              >
                {generatingQuiz ? (
                  <div className="flex items-center">
                    <div className="animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-white mr-2"></div>
                    <span>Preparing Quiz...</span>
                  </div>
                ) : 'Take Quiz'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
} 