import api from './api';
import roadmapService from './roadmap.service';

const contentService = {
  // Generate content for a specific topic
  generateContent: async (roadmapId, moduleIndex, topicIndex, subtopicIndex = null) => {
    try {
      console.log('[ContentService] Generating content via API for:', { roadmapId, moduleIndex, topicIndex, subtopicIndex });
      
      // Prepare request data
      const requestData = {
        roadmapId,
        moduleIndex,
        topicIndex
      };
      
      // Include subtopic if provided
      if (subtopicIndex !== null) {
        requestData.subtopicIndex = subtopicIndex;
      }
      
      // Call the API
      console.log('[ContentService] Making API request with data:', requestData);
      const response = await api.post('/content/generate', requestData);
      console.log('[ContentService] API response received with status:', response.status);
      console.log('[ContentService] Content data preview:', {
        id: response.data._id || response.data.id,
        title: response.data.title,
        contentLength: response.data.content ? response.data.content.length : 0,
        contentPreview: response.data.content ? response.data.content.substring(0, 100) + '...' : 'No content'
      });
      
      // Ensure we have the content field even if it's named textContent in the response
      let processedResponse = { ...response.data };
      
      // If the API returns textContent instead of content (common backend naming convention)
      if (!processedResponse.content && processedResponse.textContent) {
        console.log('[ContentService] Converting textContent to content field');
        processedResponse.content = processedResponse.textContent;
      }
      
      // Log what we're returning
      console.log('[ContentService] Returning content with field availability: ', {
        hasTitle: !!processedResponse.title,
        hasDescription: !!processedResponse.description,
        hasContent: !!processedResponse.content,
        contentLength: processedResponse.content ? processedResponse.content.length : 0
      });
      
      return processedResponse;
    } catch (error) {
      console.error('[ContentService] Error generating content:', error);
      
      // Fall back to mock content in case of API error
      console.log('[ContentService] Falling back to mock content generation');
      const mockContent = contentService.mockGenerateContent(
        roadmapId, 
        moduleIndex, 
        topicIndex, 
        { 
          title: `Topic ${topicIndex} of Module ${moduleIndex}`,
          description: 'No description available'
        }
      );
      return mockContent;
    }
  },
  
  // Generate quiz for a topic
  generateQuiz: async (roadmapId, moduleIndex, topicIndex, subtopicIndex = null) => {
    try {
      console.log(`[ContentService] Generating quiz for roadmap: ${roadmapId}, module: ${moduleIndex}, topic: ${topicIndex}${subtopicIndex !== null ? `, subtopic: ${subtopicIndex}` : ''}`);
      
      // First, get the roadmap to access the topic details
      const roadmap = await roadmapService.getRoadmapById(roadmapId);
      if (!roadmap) {
        console.error('[ContentService] Cannot generate quiz - roadmap not found');
        throw new Error('Roadmap not found');
      }

      const moduleData = roadmap.modules[moduleIndex];
      if (!moduleData) {
        console.error('[ContentService] Cannot generate quiz - module not found');
        throw new Error('Module not found');
      }

      const topic = moduleData.topics[topicIndex];
      if (!topic) {
        console.error('[ContentService] Cannot generate quiz - topic not found');
        throw new Error('Topic not found');
      }

      // Get the content for this topic to use in quiz generation
      let content;
      try {
        // Get the content using the existing API
        content = await contentService.getContentForTopic(roadmapId, moduleIndex, topicIndex, subtopicIndex);
        console.log('[ContentService] Retrieved content for quiz generation');
      } catch (contentError) {
        console.error('[ContentService] Could not retrieve content, generating quiz without content:', contentError);
        content = { content: topic.description || 'No description available', textContent: topic.description || 'No description available' };
      }

      // Prepare the request to the backend's quiz generation endpoint
      const requestData = {
        roadmapId,
        moduleIndex,
        topicIndex,
        subtopicIndex,
        contentText: content.textContent || content.content || topic.description || 'No description available',
        topicTitle: topic.title,
        topicDescription: topic.description || 'No description available',
        moduleTitle: moduleData.title,
        moduleDescription: moduleData.description || 'No description available',
        subtopicTitle: subtopicIndex !== null && topic.subtopics ? topic.subtopics[subtopicIndex].title : null,
        subtopicDescription: subtopicIndex !== null && topic.subtopics ? topic.subtopics[subtopicIndex].description : null
      };

      console.log('[ContentService] Sending quiz generation request with data');
      
      try {
        // Call the backend API to generate the quiz using Gemini
        const response = await api.post('/quizzes/generate', requestData);
        
        if (!response.data || !response.data.questions || !Array.isArray(response.data.questions)) {
          console.error('[ContentService] Invalid quiz structure received from API:', response.data);
          throw new Error('Invalid quiz structure received from the server');
        }
        
        console.log('[ContentService] Quiz generation successful:', response.data.title);
        
        // Process the received quiz to ensure consistent structure
        return {
          id: response.data._id || response.data.id || `quiz-${Date.now()}`,
          title: response.data.title || `Quiz: ${topic.title}`,
          description: response.data.description || `Test your knowledge of ${topic.title}`,
          questions: response.data.questions.map(q => ({
            id: q._id || q.id || Math.random().toString(36).substring(2, 9),
            text: q.question || q.questionText || q.text || 'Missing question text',
            type: (q.type || '').toLowerCase().includes('multiple') ? 'multiple-choice' : 
                  (q.type || '').toLowerCase().includes('true') ? 'true-false' : 'multiple-choice',
            options: (q.type || '').toLowerCase().includes('multiple') || (q.type || '').toLowerCase().includes('choice')
              ? (Array.isArray(q.options) ? q.options.map((opt, idx) => {
                  return typeof opt === 'object' ? opt : { id: String.fromCharCode(97 + idx), text: opt || `Option ${idx + 1}` };
                }) 
                : ['Option A', 'Option B', 'Option C', 'Option D'].map((text, idx) => ({
                  id: String.fromCharCode(97 + idx),
                  text
                })))
              : null,
            correctAnswer: q.answer !== undefined ? q.answer : (q.correctAnswer !== undefined ? q.correctAnswer : 0),
            explanation: q.explanation || 'Explanation not available.'
          })),
          timestamp: response.data.createdAt || new Date().toISOString()
        };
      } catch (apiError) {
        console.error('[ContentService] API quiz generation failed:', apiError);
        console.log('[ContentService] API Error details:', apiError.response ? apiError.response.data : 'No response data');
        
        // Fall back to mock quiz generation
        console.log('[ContentService] Falling back to mock quiz generation');
        return contentService.mockGenerateQuiz(roadmapId, moduleIndex, topicIndex, {
          title: topic.title || `Topic ${topicIndex}`,
          description: topic.description || 'No description available'
        });
      }
    } catch (error) {
      console.error('[ContentService] Error in quiz generation:', error);
      
      // Make sure roadmap is defined here to prevent the undefined error
      // Fall back to mock quiz generation as a last resort
      console.log('[ContentService] Falling back to mock quiz generation due to error');
      
      try {
        // Try to get the roadmap data again in case it wasn't fetched earlier
        const roadmap = await roadmapService.getRoadmapById(roadmapId);
        const topicTitle = roadmap?.modules[moduleIndex]?.topics[topicIndex]?.title || `Topic ${topicIndex}`;
        const topicDescription = roadmap?.modules[moduleIndex]?.topics[topicIndex]?.description || 'No description available';
        
        return contentService.mockGenerateQuiz(roadmapId, moduleIndex, topicIndex, {
          title: topicTitle,
          description: topicDescription
        });
      } catch (fallbackError) {
        console.error('[ContentService] Failed to generate fallback quiz with roadmap data:', fallbackError);
        // Final fallback with minimal data
        return contentService.mockGenerateQuiz(roadmapId, moduleIndex, topicIndex, {
          title: `Topic ${topicIndex} of Module ${moduleIndex}`,
          description: 'No description available'
        });
      }
    }
  },
  
  // Submit quiz answers
  submitQuizAnswers: async (quizId, answers, completionTime = 0) => {
    try {
      const response = await api.post(`/quizzes/${quizId}/submit`, { 
        answers,
        completionTime
      });
      return response.data;
    } catch (error) {
      console.error('Error submitting quiz answers:', error);
      throw error;
    }
  },
  
  // Generate next timer suggestion using Gemini
  generateTimerSuggestion: async (userData) => {
    try {
      const response = await api.post('/timers/suggest', userData);
      return response.data;
    } catch (error) {
      console.error('Error generating timer suggestion:', error);
      throw error;
    }
  },
  
  // Fetch content by ID
  getContentById: async (contentId) => {
    try {
      const response = await api.get(`/content/${contentId}`);
      return response.data;
    } catch (error) {
      console.error('Error fetching content:', error);
      throw error;
    }
  },
  
  // Fetch content for a specific topic
  getContentForTopic: async (roadmapId, moduleIndex, topicIndex, subtopicIndex = null) => {
    try {
      let url = `/content/roadmap/${roadmapId}/module/${moduleIndex}/topic/${topicIndex}`;
      
      if (subtopicIndex !== null) {
        url += `/subtopic/${subtopicIndex}`;
      }
      
      const response = await api.get(url);
      return response.data;
    } catch (error) {
      console.error('Error fetching content for topic:', error);
      throw error;
    }
  },
  
  // Fetch quiz by ID
  getQuizById: async (quizId) => {
    try {
      const response = await api.get(`/quizzes/${quizId}`);
      return response.data;
    } catch (error) {
      console.error('Error fetching quiz:', error);
      throw error;
    }
  },
  
  // Get quiz for a specific topic
  getQuizForTopic: async (roadmapId, moduleIndex, topicIndex, subtopicIndex = null) => {
    try {
      let url = `/quizzes/roadmap/${roadmapId}/module/${moduleIndex}/topic/${topicIndex}`;
      
      if (subtopicIndex !== null) {
        url += `/subtopic/${subtopicIndex}`;
      }
      
      const response = await api.get(url);
      return response.data;
    } catch (error) {
      console.error('Error fetching quiz for topic:', error);
      throw error;
    }
  },
  
  // Get quiz results
  getQuizResults: async (quizId) => {
    try {
      const response = await api.get(`/quizzes/results/${quizId}`);
      return response.data;
    } catch (error) {
      console.error('Error fetching quiz results:', error);
      throw error;
    }
  },
  
  // Cache content locally for offline access
  cacheContentLocally: (cacheKey, content) => {
    if (typeof window !== 'undefined') {
      try {
        console.log('[ContentService] Caching content locally with key:', cacheKey);
        localStorage.setItem(`content_${cacheKey}`, JSON.stringify(content));
        return true;
      } catch (error) {
        console.error('[ContentService] Error caching content locally:', error);
        return false;
      }
    }
    return false;
  },
  
  // Get locally cached content
  getLocalContent: (cacheKey) => {
    if (typeof window !== 'undefined') {
      try {
        console.log('[ContentService] Attempting to get local content with key:', cacheKey);
        const contentStr = localStorage.getItem(`content_${cacheKey}`);
        
        if (!contentStr) {
          console.log('[ContentService] No content found in local storage');
          return null;
        }
        
        const parsedContent = JSON.parse(contentStr);
        console.log('[ContentService] Content found in local storage:', parsedContent ? 'Yes (has data)' : 'No (null after parsing)');
        
        if (!parsedContent || !parsedContent.content) {
          console.log('[ContentService] Retrieved content appears invalid');
          return null;
        }
        
        return parsedContent;
      } catch (error) {
        console.error('[ContentService] Error getting local content:', error);
        return null;
      }
    }
    return null;
  },
  
  // Clear locally cached content
  clearLocalContent: (cacheKey) => {
    if (typeof window !== 'undefined') {
      try {
        console.log('[ContentService] Clearing local content with key:', cacheKey);
        localStorage.removeItem(`content_${cacheKey}`);
        return true;
      } catch (error) {
        console.error('[ContentService] Error clearing local content:', error);
        return false;
      }
    }
    return false;
  },
  
  // Mock content generation (for development/testing)
  mockGenerateContent: (roadmapId, moduleIndex, topicIndex, topic) => {
    console.log('[ContentService] Generating mock content for:', { 
      roadmapId, moduleIndex, topicIndex, topicTitle: topic.title 
    });
    
    const mockContent = {
      id: `content-${Date.now()}`,
      roadmapId,
      moduleIndex,
      topicIndex,
      title: topic.title || `Topic ${topicIndex}`,
      description: topic.description || `Description for topic ${topicIndex} of module ${moduleIndex}`,
      content: `# ${topic.title || `Topic ${topicIndex}`}\n\nThis is mock content for the topic "${topic.title || `Topic ${topicIndex}`}". In a real implementation, this would be AI-generated content from Gemini about this topic, explaining the concepts in detail and providing examples.\n\nThe content would be formatted with proper headings, paragraphs, and possibly code snippets or mathematical formulas depending on the subject matter.\n\nThis is a placeholder used for development and testing purposes.`,
      timestamp: new Date().toISOString()
    };
    
    console.log('[ContentService] Mock content generated:', mockContent);
    return mockContent;
  },
  
  // Mock quiz generation (for development/testing)
  mockGenerateQuiz: (roadmapId, moduleIndex, topicIndex, topic = {}) => {
    // Ensure topic has default values if undefined
    const topicTitle = topic?.title || `Topic ${topicIndex}`;
    
    // Special case for Python topics
    if (topicTitle && topicTitle.toLowerCase().includes('python')) {
      return {
        id: `quiz-${Date.now()}`,
        roadmapId,
        moduleIndex,
        topicIndex,
        title: `Quiz: ${topicTitle}`,
        description: `Test your knowledge of ${topicTitle}`,
        questions: [
          {
            id: 1,
            text: "What makes Python particularly suitable for beginners?",
            type: 'multiple-choice',
            options: [
              { id: 'a', text: 'Its readable and clean syntax' },
              { id: 'b', text: 'Its powerful performance capabilities' },
              { id: 'c', text: 'Its strict typing system' },
              { id: 'd', text: 'Its complex but powerful control structures' }
            ],
            correctAnswer: 'a',
            explanation: 'Python is known for its clean, readable syntax that emphasizes code readability, making it an excellent language for beginners.'
          },
          {
            id: 2,
            text: "True or False: Python is a compiled language.",
            type: 'true-false',
            correctAnswer: 'false',
            explanation: 'Python is an interpreted language, not a compiled language. Python code is executed line by line by the Python interpreter.'
          },
          {
            id: 3,
            text: "Which of the following is NOT a common application of Python?",
            type: 'multiple-choice',
            options: [
              { id: 'a', text: 'Data Science and Analysis' },
              { id: 'b', text: 'Web Development' },
              { id: 'c', text: 'Mobile App Development' },
              { id: 'd', text: 'Machine Learning' }
            ],
            correctAnswer: 'c',
            explanation: 'While Python can be used for mobile app development with frameworks like Kivy or BeeWare, it is not as commonly used for this purpose as it is for data science, web development, and machine learning.'
          },
          {
            id: 4,
            text: "What symbol is used for comments in Python?",
            type: 'multiple-choice',
            options: [
              { id: 'a', text: '//' },
              { id: 'b', text: '/* */' },
              { id: 'c', text: '#' },
              { id: 'd', text: '--' }
            ],
            correctAnswer: 'c',
            explanation: 'In Python, the hash symbol (#) is used to start a comment. Everything after the # on the same line is considered a comment and is ignored by the interpreter.'
          },
          {
            id: 5,
            text: "Which of these statements about Python is true?",
            type: 'multiple-choice',
            options: [
              { id: 'a', text: 'Python requires variable type declarations' },
              { id: 'b', text: 'Python uses curly braces {} for code blocks' },
              { id: 'c', text: 'Python uses indentation for code blocks' },
              { id: 'd', text: 'Python is primarily used for low-level system programming' }
            ],
            correctAnswer: 'c',
            explanation: 'Python uses indentation (whitespace) to define code blocks, rather than curly braces or keywords. This enforces readable code by making proper indentation a requirement.'
          }
        ],
        timestamp: new Date().toISOString()
      };
    }
    
    // For other topics, use the general questions
    return {
      id: `quiz-${Date.now()}`,
      roadmapId,
      moduleIndex,
      topicIndex,
      title: `Quiz: ${topicTitle}`,
      description: `Test your knowledge of ${topicTitle}`,
      questions: [
        {
          id: 1,
          text: `What is the main purpose of ${topicTitle}?`,
          type: 'multiple-choice',
          options: [
            { id: 'a', text: 'To simplify complex processes' },
            { id: 'b', text: 'To organize data efficiently' },
            { id: 'c', text: 'To improve system performance' },
            { id: 'd', text: 'To enhance user experience' }
          ],
          correctAnswer: 'a',
          explanation: 'The main purpose is to simplify complex processes, making them more understandable and manageable.'
        },
        {
          id: 2,
          text: `True or False: ${topicTitle} is primarily used in backend development.`,
          type: 'true-false',
          correctAnswer: 'true',
          explanation: 'This concept is indeed primarily used in backend development for handling data processing and business logic.'
        },
        {
          id: 3,
          text: `What is a key benefit of using ${topicTitle}?`,
          type: 'multiple-choice',
          options: [
            { id: 'a', text: 'Reduced code complexity' },
            { id: 'b', text: 'Faster execution time' },
            { id: 'c', text: 'Lower memory usage' },
            { id: 'd', text: 'All of the above' }
          ],
          correctAnswer: 'd',
          explanation: 'All of these are benefits of using this approach or concept in software development.'
        },
        {
          id: 4,
          text: `Which of the following is NOT related to ${topicTitle}?`,
          type: 'multiple-choice',
          options: [
            { id: 'a', text: 'Data structures' },
            { id: 'b', text: 'Algorithms' },
            { id: 'c', text: 'User interface design' },
            { id: 'd', text: 'Performance optimization' }
          ],
          correctAnswer: 'c',
          explanation: 'User interface design is typically not directly related to this concept, which is more focused on data and logic handling.'
        },
        {
          id: 5,
          text: `When implementing ${topicTitle}, what should you be most careful about?`,
          type: 'multiple-choice',
          options: [
            { id: 'a', text: 'Error handling' },
            { id: 'b', text: 'Optimization' },
            { id: 'c', text: 'Documentation' },
            { id: 'd', text: 'Testing' }
          ],
          correctAnswer: 'a',
          explanation: 'Proper error handling is crucial when implementing this concept to ensure stability and reliability.'
        }
      ],
      timestamp: new Date().toISOString()
    };
  }
};

export default contentService;
