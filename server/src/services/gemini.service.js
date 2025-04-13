const { GoogleGenerativeAI } = require("@google/generative-ai");

// Initialize Gemini AI with the API key
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

// Get the model - Use the most recent model available
const MODEL_NAME = "gemini-1.5-pro";

class GeminiService {
  constructor() {
    this.model = genAI.getGenerativeModel({ model: MODEL_NAME });
    console.log(`Initialized Gemini AI with model: ${MODEL_NAME}`);
  }

  /**
   * Generate a personalized learning roadmap based on user goals and preferences
   * @param {Object} userData - User data including goals and preferences
   * @returns {Object} Roadmap data with modules and topics
   */
  async generateRoadmap(userData) {
    try {
      const prompt = `
        You are an expert educational curriculum designer. Create a detailed learning roadmap for a student with the following profile:
        
        Name: ${userData.name || 'Student'}
        Age: ${userData.age || 'Unknown'}
        Education Level: ${userData.educationLevel || 'Unknown'}
        Learning Goal: ${userData.goal}
        Learning Preferences: ${userData.learningPreferences ? JSON.stringify(userData.learningPreferences) : 'No specific preferences'}
        
        The roadmap should be structured with modules and topics, where each module is a major section and 
        topics are specific lessons within each module. Break down the topics into very small atomic units 
        that can be learned in 5-10 minutes.
        
        Further break down each topic into 2-4 subtopics that represent even smaller, focused learning units.
        Each subtopic should be an atomic concept that can be learned in just a few minutes.
        
        Return the result as a JSON object with this structure:
        {
          "title": "Roadmap title",
          "description": "Brief description of the roadmap",
          "modules": [
            {
              "title": "Module title",
              "description": "Module description",
              "order": 1,
              "topics": [
                {
                  "title": "Topic title",
                  "description": "Brief topic description",
                  "order": 1,
                  "estimatedTimeMinutes": 10,
                  "subtopics": [
                    {
                      "title": "Subtopic title",
                      "description": "Brief subtopic description"
                    }
                  ]
                }
              ]
            }
          ]
        }

        The structure should be detailed with at least 3-5 modules and each module should have 5-10 small atomic topics.
        Each topic should have 2-4 subtopics where appropriate to break down the learning even further.
        Very important: Your response must be a valid JSON object with exactly this structure. Do not include markdown formatting or explanation text.
      `;

      console.log('Generating roadmap with Gemini AI...');

      // Generate content using the correct API format
      const result = await this.model.generateContent({
        contents: [
          {
            role: "user",
            parts: [{ text: prompt }]
          }
        ]
      });
      
      console.log('Raw API result:', JSON.stringify(result).substring(0, 200) + '... (truncated)');
      
      const response = result.response;
      const responseText = response.text();
      
      // Log the raw response for debugging
      console.log('Raw Gemini API response:');
      console.log(responseText.substring(0, 500) + '... (truncated)');
      
      console.log('Gemini response received, parsing JSON...');
      
      // Extract the JSON from the response
      let jsonString;
      
      // First, try to find JSON within markdown code blocks
      const jsonMatch = responseText.match(/```json\n([\s\S]*?)\n```/) || 
                        responseText.match(/```\n([\s\S]*?)\n```/);
      
      if (jsonMatch && jsonMatch[1]) {
        jsonString = jsonMatch[1];
      } else {
        // If not found in code blocks, look for JSON object pattern
        const objectMatch = responseText.match(/{[\s\S]*}/);
        if (objectMatch) {
          jsonString = objectMatch[0];
        } else {
          console.error('JSON pattern not found in response:', responseText);
          throw new Error("Failed to parse roadmap data from AI response: No JSON structure found");
        }
      }
      
      try {
        // Parse the extracted JSON
        const roadmapData = JSON.parse(jsonString);
        
        // Validate the roadmap data structure
        if (!roadmapData.title || !roadmapData.description || !Array.isArray(roadmapData.modules)) {
          console.error('Invalid roadmap data structure:', roadmapData);
          throw new Error("Invalid roadmap data structure returned by AI");
        }
        
        console.log('Roadmap JSON parsed successfully');
        return roadmapData;
      } catch (parseError) {
        console.error('JSON parse error:', parseError, 'JSON string:', jsonString);
        throw new Error(`Failed to parse roadmap data: ${parseError.message}`);
      }
    } catch (error) {
      console.error('Error generating roadmap:', error);
      throw error;
    }
  }

  /**
   * Generate educational content for a specific topic or subtopic
   * @param {Object} learningData - Data about the learning unit (topic or subtopic)
   * @param {Object} userData - User data and preferences
   * @returns {Object} Content data
   */
  async generateContent(learningData, userData) {
    try {
      // Determine if we're generating content for a topic or subtopic
      const isSubtopic = learningData.subtopicIndex !== undefined && learningData.subtopicTitle;
      
      // Get the title and description of the learning unit
      const unitTitle = isSubtopic ? learningData.subtopicTitle : learningData.topicTitle;
      const unitDescription = isSubtopic ? learningData.subtopicDescription : learningData.topicDescription;
      
      // Enhance context by including module/topic information for subtopics
      const contextInfo = isSubtopic
        ? `This is part of the topic "${learningData.topicTitle}" within the module "${learningData.moduleTitle}".`
        : `This is part of the module "${learningData.moduleTitle}".`;
      
      const prompt = `
        You are an expert educational content creator. Create detailed learning content for the following:
        
        Title: ${unitTitle}
        Description: ${unitDescription}
        Context: ${contextInfo}
        
        User Age: ${userData.age || 'Unknown'}
        Education Level: ${userData.educationLevel || 'Unknown'}
        Learning Preferences: ${userData.learningPreferences ? JSON.stringify(userData.learningPreferences) : 'No specific preferences'}
        
        Create engaging, clear, and educational content that explains this topic thoroughly yet concisely.
        The content should be appropriate for a ${userData.age || 'college'}-year-old at ${userData.educationLevel || 'undergraduate'} education level.
        
        Structure the content with:
        1. A brief introduction to the concept
        2. Main points and explanations
        3. Examples or real-world applications
        4. A concise summary
        
        Use markdown formatting for better readability:
        - Use # for main headings
        - Use ## for subheadings
        - Use bullet points (- ) for lists
        - Use **bold** for important terms
        - Include code blocks where relevant
        
        The content should be detailed enough to help the student understand the concept completely
        but be readable within ${learningData.estimatedTimeMinutes || 10} minutes.
        
        Return only the formatted educational content, without any introductions or explanations.
      `;

      // Generate content using the correct API format
      const result = await this.model.generateContent({
        contents: [
          {
            role: "user",
            parts: [{ text: prompt }]
          }
        ]
      });
      
      const response = result.response;
      const contentText = response.text();
      
      // Format the title based on whether it's a topic or subtopic
      const titlePrefix = isSubtopic ? `${learningData.topicTitle}: ` : '';
      
      return {
        title: `${titlePrefix}${unitTitle}`,
        description: unitDescription,
        type: 'text',
        textContent: contentText,
        estimatedTimeMinutes: learningData.estimatedTimeMinutes || 10,
        tags: [unitTitle.toLowerCase()],
        difficulty: 'beginner', // Default, can be adjusted based on topic/user
        moduleIndex: learningData.moduleIndex,
        topicIndex: learningData.topicIndex,
        subtopicIndex: isSubtopic ? learningData.subtopicIndex : null
      };
    } catch (error) {
      console.error('Error generating content:', error);
      throw error;
    }
  }

  /**
   * Generate quiz questions for a specific topic or subtopic based on content
   * @param {Object} learningData - Data about the learning unit (topic or subtopic)
   * @param {Object} contentData - The content the quiz is based on
   * @param {Object} userData - User data and preferences
   * @returns {Object} Quiz data with questions
   */
  async generateQuiz(learningData, contentData, userData) {
    try {
      // Determine if we're generating a quiz for a topic or subtopic
      const isSubtopic = learningData.subtopicIndex !== undefined && learningData.subtopicTitle;
      
      // Get the title of the learning unit
      const unitTitle = isSubtopic ? learningData.subtopicTitle : learningData.topicTitle;
      
      const prompt = `
        You are an expert educational assessment creator. Create a quiz based on the following content:
        
        Topic: ${unitTitle}
        Content: ${contentData.textContent.substring(0, 8000)} // Limit content length to avoid token limits
        
        Create 3-5 quiz questions that test understanding of key concepts from this specific content.
        Include a mix of multiple choice and true/false questions.
        Each question should have an explanation for the correct answer to help the student learn.
        
        Make sure that:
        1. Questions focus on the most important concepts covered in the content
        2. Multiple choice questions have 4 options with only one correct answer
        3. True/false questions are clear and unambiguous
        4. All questions directly relate to the material in the content
        5. Questions range from basic recall to application of concepts
        
        Return the result as a JSON object with this structure:
        {
          "title": "Quiz title",
          "description": "Brief quiz description",
          "questions": [
            {
              "questionText": "Question text",
              "questionType": "multiple-choice",
              "options": [
                { "id": "a", "text": "Option text", "isCorrect": true/false }
              ],
              "correctAnswer": "a",
              "explanation": "Explanation of the correct answer"
            },
            {
              "questionText": "True/false question text",
              "questionType": "true-false",
              "correctAnswer": "true",
              "explanation": "Explanation of why this is true/false"
            }
          ]
        }
        
        For multiple-choice questions, include the ID of the correct option in the "correctAnswer" field.
        For true-false questions, use either "true" or "false" as the correctAnswer.
        Ensure the JSON is valid with no syntax errors.
      `;

      // Generate content using the correct API format
      const result = await this.model.generateContent({
        contents: [
          {
            role: "user",
            parts: [{ text: prompt }]
          }
        ]
      });
      
      const response = result.response;
      const responseText = response.text();
      
      // Extract the JSON from the response
      const jsonMatch = responseText.match(/```json\n([\s\S]*?)\n```/) || 
                        responseText.match(/```\n([\s\S]*?)\n```/) || 
                        responseText.match(/{[\s\S]*}/);
      
      let quizData;
      if (jsonMatch) {
        quizData = JSON.parse(jsonMatch[1] || jsonMatch[0]);
      } else {
        throw new Error("Failed to parse quiz data from AI response");
      }
      
      // Format the title based on whether it's a topic or subtopic
      const titlePrefix = isSubtopic ? `${learningData.topicTitle}: ` : '';
      quizData.title = `Quiz: ${titlePrefix}${unitTitle}`;
      
      return quizData;
    } catch (error) {
      console.error('Error generating quiz:', error);
      throw error;
    }
  }

  /**
   * Evaluate a user's answer to a short-answer question
   * @param {String} questionText - The question text
   * @param {String} correctAnswer - The correct answer
   * @param {String} userAnswer - The user's answer
   * @returns {Object} Evaluation result
   */
  async evaluateAnswer(questionText, correctAnswer, userAnswer) {
    try {
      const prompt = `
        You are an educational assessment evaluator. Evaluate if the student's answer is correct:
        
        Question: ${questionText}
        Correct Answer: ${correctAnswer}
        Student's Answer: ${userAnswer}
        
        Judge whether the student's answer captures the key points of the correct answer.
        Consider partial credit if appropriate.
        
        Return the result as a JSON object with this structure:
        {
          "isCorrect": true/false,
          "score": 0-100 percentage,
          "feedback": "Constructive feedback for the student"
        }
      `;

      // Generate content using the correct API format
      const result = await this.model.generateContent({
        contents: [
          {
            role: "user",
            parts: [{ text: prompt }]
          }
        ]
      });
      
      const response = result.response;
      const responseText = response.text();
      
      // Extract the JSON from the response
      const jsonMatch = responseText.match(/```json\n([\s\S]*?)\n```/) || 
                        responseText.match(/```\n([\s\S]*?)\n```/) || 
                        responseText.match(/{[\s\S]*}/);
      
      let evaluationData;
      if (jsonMatch) {
        evaluationData = JSON.parse(jsonMatch[1] || jsonMatch[0]);
      } else {
        throw new Error("Failed to parse evaluation data from AI response");
      }
      
      return evaluationData;
    } catch (error) {
      console.error('Error evaluating answer:', error);
      throw error;
    }
  }
  
  /**
   * Calculate the next delivery time based on spaced repetition algorithm
   * @param {Object} userData - User data
   * @param {Object} learningData - Topic/subtopic data
   * @param {Object} quizResult - Quiz result data
   * @returns {Object} Timer data
   */
  async calculateNextDeliveryTime(userData, learningData, quizResult) {
    try {
      const prompt = `
        You are an expert in spaced repetition learning. Calculate the next optimal time to deliver content to a student:
        
        User Profile: ${JSON.stringify(userData)}
        Learning Unit: ${JSON.stringify(learningData)}
        Quiz Result: ${JSON.stringify(quizResult)}
        
        Based on the student's performance in the quiz and spaced repetition principles, determine:
        1. How many minutes from now the student should receive the next content
        2. Whether the next content should be a review of this topic or move on to the next topic
        
        Consider these factors:
        - If the score was high (>80%), a longer interval may be appropriate
        - If the score was low (<50%), a shorter interval with review is recommended
        - The complexity of the topic
        - Any previous learning history if available
        
        Return the result as a JSON object with this structure:
        {
          "intervalMinutes": number of minutes,
          "isReview": true/false,
          "reason": "Brief explanation of the decision"
        }
      `;

      // Generate content using the correct API format
      const result = await this.model.generateContent({
        contents: [
          {
            role: "user",
            parts: [{ text: prompt }]
          }
        ]
      });
      
      const response = result.response;
      const responseText = response.text();
      
      // Extract the JSON from the response
      const jsonMatch = responseText.match(/```json\n([\s\S]*?)\n```/) || 
                        responseText.match(/```\n([\s\S]*?)\n```/) || 
                        responseText.match(/{[\s\S]*}/);
      
      let timerData;
      if (jsonMatch) {
        timerData = JSON.parse(jsonMatch[1] || jsonMatch[0]);
      } else {
        throw new Error("Failed to parse timer data from AI response");
      }
      
      return timerData;
    } catch (error) {
      console.error('Error calculating next delivery time:', error);
      throw error;
    }
  }
}

// Export an instance of the GeminiService
module.exports = new GeminiService(); 