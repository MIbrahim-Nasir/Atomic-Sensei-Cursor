import api from './api';

const contentService = {
  // Generate content for a specific topic
  generateContent: async (roadmapId, moduleIndex, topicIndex, subtopicIndex = null) => {
    try {
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
      const response = await api.post('/content/generate', requestData);
      return response.data;
    } catch (error) {
      console.error('Error generating content:', error);
      throw error;
    }
  },
  
  // Generate quiz for a topic
  generateQuiz: async (roadmapId, moduleIndex, topicIndex, subtopicIndex = null) => {
    try {
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
      const response = await api.post('/quizzes/generate', requestData);
      return response.data;
    } catch (error) {
      console.error('Error generating quiz:', error);
      throw error;
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
        localStorage.setItem(`content_${cacheKey}`, JSON.stringify(content));
        return true;
      } catch (error) {
        console.error('Error caching content locally:', error);
        return false;
      }
    }
    return false;
  },
  
  // Get locally cached content
  getLocalContent: (cacheKey) => {
    if (typeof window !== 'undefined') {
      try {
        const contentStr = localStorage.getItem(`content_${cacheKey}`);
        return contentStr ? JSON.parse(contentStr) : null;
      } catch (error) {
        console.error('Error getting local content:', error);
        return null;
      }
    }
    return null;
  },
  
  // Clear locally cached content
  clearLocalContent: (cacheKey) => {
    if (typeof window !== 'undefined') {
      try {
        localStorage.removeItem(`content_${cacheKey}`);
        return true;
      } catch (error) {
        console.error('Error clearing local content:', error);
        return false;
      }
    }
    return false;
  },
  
  // Mock content generation (for development/testing)
  mockGenerateContent: (roadmapId, moduleIndex, topicIndex, topic) => {
    return {
      id: `content-${Date.now()}`,
      roadmapId,
      moduleIndex,
      topicIndex,
      title: topic.title,
      description: topic.description,
      content: `This is mock content for the topic "${topic.title}". In a real implementation, this would be AI-generated content from Gemini about this topic, explaining the concepts in detail and providing examples.
      
The content would be formatted with proper headings, paragraphs, and possibly code snippets or mathematical formulas depending on the subject matter.

This is a placeholder used for development and testing purposes.`,
      timestamp: new Date().toISOString()
    };
  },
  
  // Mock quiz generation (for development/testing)
  mockGenerateQuiz: (roadmapId, moduleIndex, topicIndex, topic) => {
    return {
      id: `quiz-${Date.now()}`,
      roadmapId,
      moduleIndex,
      topicIndex,
      title: `Quiz: ${topic.title}`,
      description: `Test your knowledge of ${topic.title}`,
      questions: [
        {
          id: 1,
          text: `What is the main purpose of ${topic.title}?`,
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
          text: `True or False: ${topic.title} is primarily used in backend development.`,
          type: 'true-false',
          correctAnswer: 'true',
          explanation: 'This concept is indeed primarily used in backend development for handling data processing and business logic.'
        },
        {
          id: 3,
          text: `What is a key benefit of using ${topic.title}?`,
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
          text: `Which of the following is NOT related to ${topic.title}?`,
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
          text: `When implementing ${topic.title}, what should you be most careful about?`,
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
