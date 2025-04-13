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
    console.log('LearningPage initialized with params:', {
      roadmapId,
      moduleIndex,
      topicIndex,
      subtopicIndex
    });
    
    async function fetchData() {
      try {
        setLoading(true);
        setError('');
        
        console.log('Fetching roadmap data for ID:', roadmapId);
        const roadmapData = await roadmapService.getRoadmapById(roadmapId);
        console.log('Roadmap data received:', roadmapData);
        
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
        
        // After validation, log this
        console.log('Starting content generation for:', {
          moduleTitle: roadmapData.modules[moduleIndex].title,
          topicTitle: currentTopic.title,
          subtopicTitle: currentSubtopic ? currentSubtopic.title : 'N/A'
        });
        
        // Generate content for the selected topic/subtopic
        await generateContent(roadmapData);
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
      console.log('Generating content with params:', {
        roadmapId,
        moduleIndex,
        topicIndex,
        subtopicIndex
      });
      
      // Check if we have content in local storage
      const cacheKey = subtopicIndex !== null ? 
        `${roadmapId}_${moduleIndex}_${topicIndex}_${subtopicIndex}` : 
        `${roadmapId}_${moduleIndex}_${topicIndex}`;
        
      console.log('Checking local storage with key:', cacheKey);
      let cachedContent = contentService.getLocalContent(cacheKey);
      console.log('Cached content found:', cachedContent ? 'Yes' : 'No');
      
      let generatedContent;
      
      if (cachedContent) {
        console.log('Using cached content');
        generatedContent = cachedContent;
      } else {
        console.log('Attempting to generate fresh content via API');
        
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
        try {
          generatedContent = await contentService.generateContent(roadmapId, moduleIndex, topicIndex);
          
          console.log('Content received from API:', {
            hasContent: !!generatedContent.content,
            contentLength: generatedContent.content ? generatedContent.content.length : 0
          });
        } catch (apiError) {
          console.error('Error generating content from API:', apiError);
          throw apiError;
        }
        
        console.log('Content generated successfully, received object with keys:', Object.keys(generatedContent));
        if (generatedContent.content) {
          console.log('Content preview:', generatedContent.content.substring(0, 100) + '...');
        } else {
          console.warn('Content property missing from generated content');
        }
      }
      
      // Double check for content property and add it if missing
      if (generatedContent && !generatedContent.content) {
        console.warn('Content property missing, checking alternative fields');
        
        // Check for textContent (common backend naming)
        if (generatedContent.textContent) {
          console.log('Found textContent property, using it instead');
          generatedContent.content = generatedContent.textContent;
        }
        // Check for text (another common field name)
        else if (generatedContent.text) {
          console.log('Found text property, using it instead');
          generatedContent.content = generatedContent.text;
        }
      }
      
      console.log('Setting content state:', {
        hasContent: generatedContent && !!generatedContent.content,
        contentLength: generatedContent && generatedContent.content ? generatedContent.content.length : 0
      });
      
      // Use the helper function to ensure valid content
      const validatedContent = ensureValidContent(generatedContent);
      setContent(validatedContent);
      
      // Store in local storage for future use
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
      
      console.log('Generating quiz for topic:', topic.title);
      
      // Call the content service to generate a quiz
      let generatedQuiz;
      try {
        generatedQuiz = await contentService.generateQuiz(
          roadmapId, 
          moduleIndex, 
          topicIndex, 
          subtopicIndex
        );
        
        if (!generatedQuiz) {
          throw new Error('Quiz generation returned no data');
        }
        
        console.log('Quiz generated successfully:', generatedQuiz.title);
      } catch (quizGenError) {
        console.error('Error in quiz API call:', quizGenError);
        throw new Error(`Quiz generation API call failed: ${quizGenError.message}`);
      }
      
      // Normalize quiz data structure to ensure consistency
      const normalizedQuiz = {
        id: generatedQuiz.id || `quiz-${Date.now()}`,
        title: generatedQuiz.title || `Quiz: ${topic.title}`,
        description: generatedQuiz.description || `Test your knowledge of ${topic.title}`,
        questions: Array.isArray(generatedQuiz.questions) ? generatedQuiz.questions.map(q => ({
          id: q.id || Math.random().toString(36).substr(2, 9),
          text: q.text || q.question || q.questionText || 'Question text missing',
          type: (q.type || '').toLowerCase().includes('multiple') ? 'multiple-choice' : 
                (q.type || '').toLowerCase().includes('true') ? 'true-false' : 'multiple-choice',
          options: q.type === 'multipleChoice' || q.type === 'multiple-choice' || 
                   (q.type || '').toLowerCase().includes('multiple') ? 
            (Array.isArray(q.options) ? q.options : []).map((opt, idx) => {
              return typeof opt === 'object' ? opt : { id: String.fromCharCode(97 + idx), text: opt || `Option ${idx + 1}` };
            }) : null,
          correctAnswer: q.correctAnswer || q.answer || 0,
          explanation: q.explanation || 'Explanation not available.'
        })) : []
      };
      
      // Ensure we have at least some questions, even if the API returned none
      if (!normalizedQuiz.questions || normalizedQuiz.questions.length === 0) {
        console.warn('Quiz had no questions. Using fallback questions.');
        normalizedQuiz.questions = createFallbackQuiz(topic.title).questions;
      }
      
      setQuiz(normalizedQuiz);
      setShowQuiz(true);
      
      // Initialize quiz answers
      const initialAnswers = {};
      normalizedQuiz.questions.forEach(q => {
        initialAnswers[q.id] = null;
      });
      setQuizAnswers(initialAnswers);
      
    } catch (err) {
      console.error('Error in quiz generation UI flow:', err);
      setError('Failed to generate quiz questions. Using fallback questions.');
      
      // Create an emergency fallback quiz in case even the service's fallback fails
      const fallbackQuiz = createFallbackQuiz(roadmap.modules[moduleIndex].topics[topicIndex].title);
      setQuiz(fallbackQuiz);
      
      // Initialize answers for fallback quiz
      const initialAnswers = {};
      fallbackQuiz.questions.forEach(q => {
        initialAnswers[q.id] = null;
      });
      setQuizAnswers(initialAnswers);
      
      // Show the quiz even though there was an error
      setShowQuiz(true);
    } finally {
      setGeneratingQuiz(false);
    }
  };
  
  // Emergency fallback quiz generator
  const createFallbackQuiz = (topicTitle) => {
    return {
      id: `emergency-quiz-${Date.now()}`,
      title: `Quiz: ${topicTitle}`,
      description: `Test your knowledge of ${topicTitle}`,
      questions: [
        {
          id: 1,
          text: `What is the most important concept to understand about ${topicTitle}?`,
          type: 'multiple-choice',
          options: [
            { id: 'a', text: 'The fundamental principles' },
            { id: 'b', text: 'The practical applications' },
            { id: 'c', text: 'The historical development' },
            { id: 'd', text: 'The relationship to other topics' }
          ],
          correctAnswer: 'a',
          explanation: 'Understanding the fundamental principles is essential to master any topic.'
        },
        {
          id: 2,
          text: `True or False: ${topicTitle} is an important topic in modern technology.`,
          type: 'true-false',
          correctAnswer: 'true',
          explanation: 'Most topics covered in this learning roadmap are important in modern technology.'
        }
      ],
      timestamp: new Date().toISOString()
    };
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
        
        if (question.type.toLowerCase().includes('multiple')) {
          // For multiple choice, check if selected option is correct
          // Normalize string/number and handle various formats of correctAnswer
          let correctAnswer = question.correctAnswer;
          if (typeof correctAnswer === 'number') {
            // If answer is a number (index), get the option ID at that index
            const option = Array.isArray(question.options) && question.options[correctAnswer];
            correctAnswer = option ? (option.id || option._id || option.text) : correctAnswer;
          }
          
          // Convert all values to strings for consistent comparison
          isCorrect = String(userAnswer) === String(correctAnswer);
        } else if (question.type.toLowerCase().includes('true')) {
          // For true/false, normalize boolean values and strings
          // Convert all to boolean for consistent comparison
          const userBool = userAnswer === 'true' || userAnswer === true;
          const correctBool = question.correctAnswer === 'true' || question.correctAnswer === true;
          isCorrect = userBool === correctBool;
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
          topicIndex,
          completed: true // Mark as completed
        };
        
        if (subtopicIndex !== null) {
          completionData.subtopicIndex = subtopicIndex;
        }
        
        console.log('Updating completion status:', completionData);
        
        // Call API to update progress
        const result = await roadmapService.updateLearningProgress(completionData);
        
        console.log('Progress updated successfully:', result);
        
        // Update local roadmap state to reflect completion
        if (roadmap) {
          const updatedRoadmap = { ...roadmap };
          
          if (subtopicIndex !== null && updatedRoadmap.modules[moduleIndex].topics[topicIndex].subtopics) {
            updatedRoadmap.modules[moduleIndex].topics[topicIndex].subtopics[subtopicIndex].completed = true;
          } else {
            updatedRoadmap.modules[moduleIndex].topics[topicIndex].completed = true;
          }
          
          setRoadmap(updatedRoadmap);
        }
        
        // Show timer setup after completion
        if (results.score >= 60) { // Pass threshold of 60%
          // Wait a bit before showing the timer setup to let user see results
          setTimeout(() => {
            setShowTimerSetup(true);
          }, 3000);
        }
      } catch (progressError) {
        console.error('Failed to update learning progress:', progressError);
        setError('Your quiz was submitted, but we could not update your progress. Please try again later.');
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
  
  const forceDisplayContent = () => {
    console.log('Forcing content display');
    const mockContent = {
      id: `debug-content-${Date.now()}`,
      title: "What is Python?",
      description: "An overview of Python and its applications.",
      content: "# What is Python?\n\nPython is a powerful, high-level programming language created by Guido van Rossum and first released in 1991. It is designed to be readable and simple, with a clean syntax that emphasizes code readability. Python has become one of the most popular programming languages in the world, used in web development, data science, artificial intelligence, scientific computing, and more.\n\n## Key Features\n\n- **Easy to Learn:** Python has a simple, English-like syntax making it accessible to beginners\n- **Interpreted:** Python code is executed line by line, making debugging easier\n- **Dynamically Typed:** Variable types are determined at runtime\n- **Large Standard Library:** Comes with a vast collection of pre-built modules\n- **Cross-platform:** Runs on Windows, macOS, Linux and more\n\n## Applications\n\n- Web Development (Django, Flask)\n- Data Science and Analysis (Pandas, NumPy)\n- Machine Learning (TensorFlow, PyTorch)\n- Automation and Scripting\n- Game Development\n- Software Testing\n\nPython's philosophy emphasizes code readability and a syntax that allows programmers to express concepts in fewer lines of code than would be possible in languages like C++ or Java."
    };
    setContent(mockContent);
  };
  
  // Add this helper function to ensure content is properly formatted
  const ensureValidContent = (contentObj) => {
    if (!contentObj) return null;
    
    // If content object exists but content property is missing, add placeholder content
    if (!contentObj.content) {
      console.log('Content object exists but content property is missing, adding placeholder');
      return {
        ...contentObj,
        content: `# ${contentObj.title || 'Topic Content'}\n\n${contentObj.description || 'No description available.'}\n\nDetailed content for this topic will be available soon.`
      };
    }
    
    return contentObj;
  };
  
  // Add a debug function to extract content from server logs
  const forceDisplayServerContent = () => {
    console.log('Forcing display of server-generated content');
    // This is based on your server console logs - using the Python content as an example
    const serverContent = {
      id: `debug-server-content-${Date.now()}`,
      title: "What is Python?",
      description: "Understanding Python's purpose and applications.",
      content: `# What is Python?

## Introduction

Python is a high-level, general-purpose programming language known for its readability and versatility. It emphasizes code clarity and uses a more concise syntax compared to other languages. Created by Guido van Rossum and first released in 1991, Python has become one of the most popular programming languages in the world.

## Key Features

- **Easy to Learn:** Simple, readable syntax that's beginner-friendly
- **Interpreted Language:** Code executes directly without prior compilation
- **Dynamically Typed:** Variable types are determined at runtime
- **Multiparadigm:** Supports procedural, object-oriented, and functional programming
- **Extensive Standard Library:** "Batteries included" philosophy with many built-in modules
- **Cross-platform:** Runs on Windows, macOS, Linux, and other platforms

## Applications

Python is versatile and widely used in:

- **Web Development:** Using frameworks like Django and Flask
- **Data Science & Analysis:** With libraries like Pandas, NumPy, and Matplotlib
- **Machine Learning & AI:** TensorFlow, PyTorch, scikit-learn
- **Automation & Scripting:** System administration and task automation
- **Scientific Computing:** Used in scientific research and simulations
- **Game Development:** With Pygame and other game engines
- **Network Programming:** Creating server and client applications

Python's simplicity and readability, combined with its powerful features, have made it a favorite among programmers at all skill levels.`
    };
    setContent(serverContent);
  };
  
  // Helper function to find the original question from the quiz
  const findOriginalQuestion = (questions, questionId) => {
    return questions.find(q => q.id === questionId);
  };
  
  // Helper function to format answer based on question type
  const formatAnswer = (answer, question) => {
    if (!question) return answer;
    
    if (question.type.toLowerCase().includes('multiple')) {
      // For multiple choice, find the text of the selected option
      const selectedOption = question.options.find(opt => 
        String(opt.id) === String(answer) || 
        String(opt._id) === String(answer));
      
      if (selectedOption) {
        return selectedOption.text;
      }
      
      // If the answer is a number (index), return the option at that index
      if (typeof answer === 'number' && question.options[answer]) {
        return question.options[answer].text;
      }
    } else if (question.type.toLowerCase().includes('true')) {
      // For true/false, return "True" or "False"
      return answer === true || answer === 'true' ? 'True' : 'False';
    }
    
    return String(answer);
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
        <div className="flex justify-center space-x-4">
          <button
            onClick={handleBackToRoadmap}
            className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700"
          >
            Back to Roadmap
          </button>
          <button
            onClick={forceDisplayContent}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
          >
            Debug: Show Sample Content
          </button>
          <button
            onClick={forceDisplayServerContent}
            className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700"
          >
            Debug: Show Server Content
          </button>
        </div>
      </div>
    );
  }
  
  if (!roadmap || !content) {
    return (
      <div className="max-w-3xl mx-auto mt-8 p-6 bg-yellow-50 rounded-lg text-center">
        <h2 className="text-xl font-medium text-yellow-800 mb-3">Content Not Found</h2>
        <p className="text-yellow-700 mb-4">The learning content could not be loaded.</p>
        <div className="flex justify-center space-x-4">
          <button
            onClick={handleBackToRoadmap}
            className="px-4 py-2 bg-yellow-600 text-white rounded-md hover:bg-yellow-700"
          >
            Back to Roadmap
          </button>
          <button
            onClick={forceDisplayContent}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
          >
            Debug: Show Sample Content
          </button>
          <button
            onClick={forceDisplayServerContent}
            className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700"
          >
            Debug: Show Server Content
          </button>
        </div>
      </div>
    );
  }
  
  // After content is set, log it
  console.log('Content ready for display:', {
    title: content.title,
    descriptionLength: content.description ? content.description.length : 0,
    contentLength: content.content ? content.content.length : 0
  });
  
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
            
            {/* Add a visual completion indicator */}
            <div className="mt-4 flex items-center p-3 bg-green-50 border border-green-200 rounded-lg">
              <CheckCircleIcon className="h-6 w-6 text-green-600 mr-2" />
              <div>
                <p className="font-medium text-green-800">
                  {subtopicIndex !== null ? 'Subtopic' : 'Topic'}: {learningUnitTitle} completed
                </p>
                <p className="text-sm text-green-700 mt-1">
                  Your progress has been updated. Next topic: {
                    roadmap.modules[nextModuleIndex]?.topics[nextTopicIndex]?.title || 'Next available topic'
                  }
                </p>
              </div>
            </div>
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
                <div className={`inline-flex items-center justify-center h-24 w-24 rounded-full ${
                  quizResults.score >= 80 ? 'bg-green-100' : 
                  quizResults.score >= 50 ? 'bg-yellow-100' : 'bg-red-100'
                }`}>
                  <span className={`text-3xl font-bold ${
                    quizResults.score >= 80 ? 'text-green-700' : 
                    quizResults.score >= 50 ? 'text-yellow-700' : 'text-red-700'
                  }`}>
                    {quizResults.score}%
                  </span>
                </div>
                <p className="mt-3 text-black font-medium">
                  You got {quizResults.correctAnswers} out of {quizResults.totalQuestions} questions correct
                </p>
                <p className="text-gray-600 text-sm mt-1">
                  {quizResults.score >= 80 ? 'Great job! You have a solid understanding of this topic.' :
                   quizResults.score >= 50 ? 'Good effort! You understand the basics but might need some review.' :
                   'This topic needs more review. Consider revisiting the content.'}
                </p>
                
                {/* Add completion status indicator */}
                <div className="mt-4 p-3 rounded-lg bg-blue-50 border border-blue-200 inline-flex items-center">
                  <CheckCircleIcon className="h-5 w-5 text-blue-600 mr-2" />
                  <span className="text-blue-800 font-medium">
                    {subtopicIndex !== null ? 'Subtopic' : 'Topic'} marked as completed
                  </span>
                </div>
              </div>
              
              <div>
                <h2 className="text-lg font-medium text-black mb-4">Review Your Answers</h2>
                <div className="space-y-6">
                  {quizResults.questions.map((question, index) => (
                    <div key={question.id} className={`p-4 rounded-lg border ${
                      question.isCorrect ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'
                    }`}>
                      <div className="flex items-start">
                        <div className={`p-1 rounded-full mr-2 ${
                          question.isCorrect ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                        }`}>
                          {question.isCorrect ? (
                            <CheckIcon className="h-5 w-5" />
                          ) : (
                            <XMarkIcon className="h-5 w-5" />
                          )}
                        </div>
                        <div>
                          <p className="text-black font-medium">Question {index + 1}: {question.text}</p>
                          
                          <div className="mt-2">
                            <div className="flex items-center">
                              <span className="text-sm text-gray-700">Your answer:</span>
                              <span className={`ml-2 text-sm font-medium ${question.isCorrect ? 'text-green-700' : 'text-red-700'}`}>
                                {formatAnswer(question.userAnswer, findOriginalQuestion(quiz.questions, question.id))}
                              </span>
                            </div>
                            
                            {!question.isCorrect && (
                              <div className="mt-1 flex items-center">
                                <span className="text-sm text-gray-700">Correct answer:</span>
                                <span className="ml-2 text-sm font-medium text-green-700">
                                  {formatAnswer(question.correctAnswer, findOriginalQuestion(quiz.questions, question.id))}
                                </span>
                              </div>
                            )}
                            
                            {question.explanation && (
                              <div className="mt-2 p-3 bg-white rounded-md border border-gray-100">
                                <p className="text-sm text-gray-700">{question.explanation}</p>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              
              <div className="mt-8 flex justify-end">
                <button
                  onClick={() => setShowTimerSetup(true)}
                  className="px-5 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 flex items-center"
                >
                  <CheckCircleIcon className="h-5 w-5 mr-2" />
                  Continue to Next Topic
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
                      <div key={question.id} className="border border-gray-200 rounded-lg p-4 mb-6 shadow-sm hover:shadow-md transition-shadow">
                        <p className="text-black font-medium mb-3">
                          <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded-full mr-2 text-xs">
                            Question {index + 1}
                          </span>
                          {question.text}
                        </p>
                        
                        {question.type === 'multiple-choice' ? (
                          <div className="space-y-2 ml-6">
                            {Array.isArray(question.options) && question.options.map((option) => {
                              const optionId = option.id || option._id || option.text;
                              return (
                                <div key={optionId} className="flex items-center p-2 rounded hover:bg-gray-50">
                                  <input
                                    id={`q${question.id}-${optionId}`}
                                    type="radio"
                                    name={`question-${question.id}`}
                                    checked={quizAnswers[question.id] === optionId}
                                    onChange={() => handleAnswerSelect(question.id, optionId)}
                                    disabled={quizSubmitted}
                                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300"
                                  />
                                  <label htmlFor={`q${question.id}-${optionId}`} className="ml-3 text-black">
                                    {option.text || option}
                                  </label>
                                </div>
                              );
                            })}
                          </div>
                        ) : question.type === 'true-false' ? (
                          <div className="space-y-2 ml-6">
                            <div className="flex items-center p-2 rounded hover:bg-gray-50">
                              <input
                                id={`q${question.id}-true`}
                                type="radio"
                                name={`question-${question.id}`}
                                checked={quizAnswers[question.id] === true || quizAnswers[question.id] === 'true'}
                                onChange={() => handleAnswerSelect(question.id, true)}
                                disabled={quizSubmitted}
                                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300"
                              />
                              <label htmlFor={`q${question.id}-true`} className="ml-3 text-black">
                                True
                              </label>
                            </div>
                            <div className="flex items-center p-2 rounded hover:bg-gray-50">
                              <input
                                id={`q${question.id}-false`}
                                type="radio"
                                name={`question-${question.id}`}
                                checked={quizAnswers[question.id] === false || quizAnswers[question.id] === 'false'}
                                onChange={() => handleAnswerSelect(question.id, false)}
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
                  {roadmap?.modules?.[moduleIndex]?.topics?.[topicIndex]?.estimatedTimeMinutes || 10} min
                </span>
              </div>
            </div>
          </div>
          
          <div className="p-6">
            <div className="prose max-w-none mb-8">
              {/* Add this debug info */}
              {!content.content && (
                <div className="bg-red-100 p-4 mb-4 rounded-md">
                  <h3 className="text-red-700 font-bold">Debug: Content Missing</h3>
                  <p className="text-red-600">The content property is empty</p>
                  <div className="mt-2 flex space-x-2">
                    <button
                      onClick={forceDisplayContent}
                      className="px-3 py-1 bg-blue-600 text-white text-sm rounded-md hover:bg-blue-700"
                    >
                      Load Sample Content
                    </button>
                    <button
                      onClick={forceDisplayServerContent}
                      className="px-3 py-1 bg-green-600 text-white text-sm rounded-md hover:bg-green-700"
                    >
                      Load Server Content
                    </button>
                  </div>
                </div>
              )}
              
              {/* Format the content properly - use client-side formatting */}
              <div className="text-black">
                {content.content ? (
                  <div 
                    className="markdown-content"
                    dangerouslySetInnerHTML={{ 
                      __html: content.content
                        .replace(/\n\n/g, '<br><br>')
                        .replace(/# (.*?)(\n|$)/g, '<h1 class="text-2xl font-bold mt-4 mb-2">$1</h1>')
                        .replace(/## (.*?)(\n|$)/g, '<h2 class="text-xl font-bold mt-4 mb-2">$1</h2>')
                        .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
                        .replace(/\*(.*?)\*/g, '<em>$1</em>')
                        .replace(/- (.*?)(\n|$)/g, '<ul><li>$1</li></ul>')
                    }} 
                  />
                ) : (
                  <p>No content available. Please try regenerating the content.</p>
                )}
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