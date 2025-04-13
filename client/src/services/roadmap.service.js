import api from './api';

export const roadmapService = {
  // Generate a new roadmap based on a learning goal
  generateRoadmap: async (goal) => {
    try {
      const response = await api.post('/roadmaps', { goal });
      return response.data;
    } catch (error) {
      console.error('Error generating roadmap:', error);
      throw error;
    }
  },
  
  // Get all roadmaps for the current user
  getRoadmaps: async () => {
    try {
      const response = await api.get('/roadmaps');
      return response.data;
    } catch (error) {
      console.error('Error fetching roadmaps:', error);
      throw error;
    }
  },
  
  // Get a specific roadmap by ID
  getRoadmapById: async (roadmapId) => {
    try {
      const response = await api.get(`/roadmaps/${roadmapId}`);
      return response.data;
    } catch (error) {
      console.error('Error fetching roadmap:', error);
      throw error;
    }
  },
  
  // Update progress for a topic
  updateProgress: async (roadmapId, moduleIndex, topicIndex, completed) => {
    try {
      const response = await api.put(`/roadmaps/${roadmapId}/progress`, {
        moduleIndex,
        topicIndex,
        completed
      });
      return response.data;
    } catch (error) {
      console.error('Error updating progress:', error);
      throw error;
    }
  },
  
  // Update progress for a subtopic
  updateSubtopicProgress: async (roadmapId, moduleIndex, topicIndex, subtopicIndex, completed) => {
    try {
      const response = await api.put(`/roadmaps/${roadmapId}/progress/subtopic`, {
        moduleIndex,
        topicIndex,
        subtopicIndex,
        completed
      });
      return response.data;
    } catch (error) {
      console.error('Error updating subtopic progress:', error);
      throw error;
    }
  },
  
  // Update learning progress (can be used for both topics and subtopics)
  updateLearningProgress: async (progressData) => {
    try {
      const endpoint = progressData.subtopicIndex !== undefined
        ? `/roadmaps/${progressData.roadmapId}/progress/subtopic`
        : `/roadmaps/${progressData.roadmapId}/progress`;
        
      const response = await api.put(endpoint, progressData);
      return response.data;
    } catch (error) {
      console.error('Error updating learning progress:', error);
      throw error;
    }
  },
  
  // Get learning progress details for a roadmap
  getLearningProgress: async (roadmapId) => {
    try {
      const response = await api.get(`/roadmaps/${roadmapId}/progress`);
      return response.data;
    } catch (error) {
      console.error('Error fetching learning progress:', error);
      throw error;
    }
  },
  
  // Delete a roadmap
  deleteRoadmap: async (roadmapId) => {
    try {
      const response = await api.delete(`/roadmaps/${roadmapId}`);
      return response.data;
    } catch (error) {
      console.error('Error deleting roadmap:', error);
      throw error;
    }
  }
};

export default roadmapService;