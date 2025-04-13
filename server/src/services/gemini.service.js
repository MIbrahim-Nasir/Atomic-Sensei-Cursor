const { GoogleGenerativeAI } = require("@google/generative-ai");

// Initialize Gemini AI with the API key
const API_KEY = process.env.GEMINI_API_KEY;

class GeminiService {
  constructor() {
    // Initialize the Gemini API with the recommended format
    this.genAI = new GoogleGenerativeAI(API_KEY, {
      httpOptions: { apiVersion: "v1" }  // Using v1 as a more stable version
    });
    
    // Use the model name from documentation - update to latest model
    this.modelName = "gemini-1.5-pro"; // Can be updated to newer models when available
    this.model = this.genAI.getGenerativeModel({ model: this.modelName });
    
    console.log(`Initialized Gemini AI with model: ${this.modelName}`);
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
   * @param {Object} contentRequest - Data about the content to generate
   * @param {Object} userData - User data for personalization
   * @returns {Object} Generated content data
   */
  async generateContent(contentRequest, userData) {
    try {
      // Determine if we're generating content for a topic or subtopic
      const isSubtopic = contentRequest.subtopicIndex !== undefined && contentRequest.subtopicTitle;
      
      // Get the title of the learning unit
      const unitTitle = isSubtopic ? contentRequest.subtopicTitle : contentRequest.topicTitle;
      
      // Start with the user's skill level from userData, default to intermediate if not provided
      const skillLevel = userData?.skillLevel || 'intermediate';
      
      // Base learning goal from the roadmap
      const learningGoal = contentRequest.roadmapGoal || "Learn new skills";
      
      const prompt = `
        You are an expert educational content creator. Generate comprehensive, engaging learning content on the following topic:
        
        ${isSubtopic ? 'Subtopic' : 'Topic'}: ${unitTitle}
        
        This content is part of: ${contentRequest.topicTitle}${isSubtopic ? '' : ' in ' + contentRequest.moduleName}
        Module Goal: ${contentRequest.moduleDescription || 'Build skills in this area'}
        Overall Learning Goal: ${learningGoal}
        
        The content should be:
        1. Tailored for a ${skillLevel} skill level
        2. Concise but comprehensive with a word count of 800-1200 words
        3. Include concrete examples and practical applications
        4. Incorporate analogies to aid understanding where appropriate
        5. Use a clear structure with headings and subheadings
        6. Include code examples if the topic is technical or programming-related
        
        The content should flow in this structure:
        - Introduction (brief overview and why this topic matters)
        - Main concepts (core ideas broken down clearly)
        - Examples and applications
        - Common misconceptions or pitfalls
        - Summary of key takeaways
        
        Format the content using Markdown for better readability.
        
        Return ONLY the educational content without any prefacing or additional commentary.
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
      
      console.log(`Generated content for ${unitTitle} (truncated):`, 
        contentText.substring(0, 200) + '... (truncated)');
      
      return {
        title: unitTitle,
        contentText,
        generatedAt: new Date(),
        wordCount: contentText.split(/\s+/).length,
        readingTimeMinutes: Math.ceil(contentText.split(/\s+/).length / 200) // Assuming 200 words per minute reading speed
      };
    } catch (error) {
      console.error('Error generating content:', error);
      throw error;
    }
  }

  /**
   * Generate quiz questions for a specific topic or subtopic based on content
   * @param {Object} learningData - Data about the learning unit (topic or subtopic)
   * @param {Object} userData - User data and preferences
   * @returns {Object} Quiz data with questions
   */
  async generateQuiz(learningData, userData) {
    try {
      // Determine if we're generating a quiz for a topic or subtopic
      const isSubtopic = learningData.subtopicIndex !== undefined && learningData.subtopicTitle;
      
      // Get the title of the learning unit
      const unitTitle = isSubtopic ? learningData.subtopicTitle : learningData.topicTitle;
      
      console.log(`Generating quiz for ${isSubtopic ? 'subtopic' : 'topic'}: ${unitTitle}`);
      
      // Create a structured prompt that includes all necessary context and explicitly requests JSON
      const prompt = `
        You are an expert educational assessment creator designing a quiz for a learning platform. 
        Create a quiz based on the following content:
        
        --- LEARNING CONTEXT ---
        Topic: ${unitTitle}
        ${isSubtopic ? `Parent Topic: ${learningData.topicTitle}` : ''}
        Module: ${learningData.moduleTitle}
        Module Description: ${learningData.moduleDescription}
        
        --- CONTENT TO QUIZ ON ---
        ${learningData.contentText ? learningData.contentText.substring(0, 8000) : 'Focus on the topic title and description as content is not available'}
        
        --- QUIZ REQUIREMENTS ---
        1. Create exactly 5 quiz questions that test understanding of key concepts from this specific content
        2. Questions must be accurate and based solely on the provided content
        3. Include a mix of multiple-choice (4 options) and true/false questions 
        4. Each question must have an explanation for the correct answer
        5. Make questions engaging, clear, and educational
        6. Ensure questions range from basic recall to application of concepts
        
        --- RESPONSE FORMAT ---
        Return a valid JSON object with the following structure without any markdown formatting:
        {
          "title": "Quiz: [appropriate title based on content]",
          "description": "Brief description of what the quiz covers",
          "questions": [
            {
              "type": "multipleChoice",
              "question": "Question text goes here?",
              "options": ["Option A", "Option B", "Option C", "Option D"],
              "answer": 0,
              "explanation": "Explanation of why this answer is correct"
            },
            {
              "type": "trueFalse",
              "question": "True/false statement goes here?",
              "answer": true,
              "explanation": "Explanation of why this is true or false"
            }
          ]
        }
        
        IMPORTANT: 
        - The response must be a single valid JSON object
        - Do not include backticks, "json" keyword, or any other text before or after the JSON
        - For multiple-choice questions, specify the index of the correct option (0-based) in the "answer" field
        - For true-false questions, use a boolean value (true or false) in the "answer" field
        - Ensure all fields are present in each question object
      `;

      try {
        // Generate content using the updated API format
        console.log(`Sending quiz generation prompt to Gemini for ${unitTitle}`);
        const result = await this.model.generateContent({
          contents: [{ role: "user", parts: [{ text: prompt }] }],
          generationConfig: {
            temperature: 0.2, // Lower temperature for more structured output
            maxOutputTokens: 8192,
          }
        });
        
        const response = result.response;
        const responseText = response.text();
        
        // Log a truncated version of the response for debugging
        console.log(`Quiz generation response for ${unitTitle} (truncated):`, 
          responseText.substring(0, 200) + '... (truncated)');
        
        // Attempt to parse the response as JSON
        let quizData;
        try {
          // First attempt: try to parse the entire response as JSON
          quizData = JSON.parse(responseText);
        } catch (directParseError) {
          console.log('Direct JSON parse failed, trying to extract JSON from response');
          
          // Second attempt: try to extract JSON using regex patterns
          let jsonString;
          // Look for JSON in markdown code blocks
          const jsonMatch = responseText.match(/```(?:json)?\s*([\s\S]*?)\s*```/) || 
                            responseText.match(/({[\s\S]*})/);
          
          if (jsonMatch && jsonMatch[1]) {
            jsonString = jsonMatch[1].trim();
            console.log('Found JSON pattern in response');
            try {
              quizData = JSON.parse(jsonString);
            } catch (matchParseError) {
              console.error('Failed to parse extracted JSON:', matchParseError);
              throw new Error('Could not parse quiz data from AI response');
            }
          } else {
            console.error('No JSON structure could be extracted from the response');
            throw new Error('AI response did not contain valid JSON data');
          }
        }
        
        // Validate the quiz data structure
        if (!quizData || !quizData.questions || !Array.isArray(quizData.questions) || quizData.questions.length === 0) {
          console.error('Invalid quiz data structure:', quizData);
          throw new Error("Invalid quiz data structure returned by AI");
        }
        
        console.log(`Quiz JSON parsed successfully with ${quizData.questions.length} questions`);
        
        // Format the title based on whether it's a topic or subtopic
        const titlePrefix = isSubtopic ? `${learningData.topicTitle}: ` : '';
        quizData.title = quizData.title || `Quiz: ${titlePrefix}${unitTitle}`;
        
        // Ensure all questions have the required fields
        quizData.questions = quizData.questions.map((question, index) => {
          // Make sure each question has a default explanation if none provided
          if (!question.explanation) {
            question.explanation = "This answer is correct based on the learning material.";
          }
          
          // Ensure options exist for multiple choice questions
          if (question.type === "multipleChoice" && (!question.options || !Array.isArray(question.options))) {
            question.options = ["Option A", "Option B", "Option C", "Option D"];
            question.answer = 0; // Default to first option
          }
          
          return question;
        });
        
        return quizData;
      } catch (generationError) {
        console.error('Quiz generation API error:', generationError);
        throw new Error(`Failed to generate quiz: ${generationError.message}`);
      }
    } catch (error) {
      console.error('Error in quiz generation process:', error);
      
      // Return a basic fallback quiz structure if generation fails
      return this.createFallbackQuiz(learningData);
    }
  }
  
  /**
   * Create a fallback quiz when AI generation fails
   * @param {Object} learningData - Data about the learning unit
   * @returns {Object} Basic quiz structure
   */
  createFallbackQuiz(learningData) {
    const isSubtopic = learningData.subtopicIndex !== undefined && learningData.subtopicTitle;
    const unitTitle = isSubtopic ? learningData.subtopicTitle : learningData.topicTitle;
    
    console.log(`Creating fallback quiz for ${unitTitle}`);
    
    return {
      title: `Quiz: ${unitTitle}`,
      description: `Test your knowledge about ${unitTitle}`,
      questions: [
        {
          type: "multipleChoice",
          question: `Which of the following best describes ${unitTitle}?`,
          options: [
            "A core concept in this module",
            "An advanced topic requiring prerequisite knowledge",
            "A supplementary concept providing context",
            "A practical application of earlier concepts"
          ],
          answer: 0,
          explanation: "This is the main focus of the current learning unit."
        },
        {
          type: "trueFalse",
          question: `${unitTitle} is an important concept to understand for mastery of this subject.`,
          answer: true,
          explanation: "Understanding this concept is essential for building a solid foundation in this subject area."
        }
      ]
    };
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