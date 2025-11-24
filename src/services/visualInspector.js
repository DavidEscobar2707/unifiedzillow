const axios = require('axios');
const config = require('../config');

/**
 * Visual Inspector Service
 * Validates property characteristics using satellite imagery and multimodal LLM analysis
 * Supports OpenAI (primary) and Gemini (fallback) for image analysis
 */
class VisualInspector {
  constructor() {
    this.googleMapsApiKey = config.visualInspector.googleMapsApiKey;
    this.openaiApiKey = config.visualInspector.openaiApiKey;
    this.openaiModel = config.visualInspector.openaiModel;
    this.geminiApiKey = config.visualInspector.geminiApiKey;
    this.geminiModel = config.visualInspector.geminiModel;

    // Create axios instances for external APIs
    this.googleMapsClient = axios.create({
      timeout: 10000
    });

    this.openaiClient = axios.create({
      baseURL: 'https://api.openai.com/v1',
      headers: {
        'Authorization': `Bearer ${this.openaiApiKey}`,
        'Content-Type': 'application/json'
      },
      timeout: 30000
    });

    this.geminiClient = axios.create({
      timeout: 30000
    });
  }

  /**
   * Fetch satellite image from Google Maps Static API with property marker
   * @param {number} latitude - Property latitude
   * @param {number} longitude - Property longitude
   * @returns {Promise<string>} Image URL with marker
   * @throws {Error} If image retrieval fails
   */
  async getGoogleMapsStaticImage(latitude, longitude) {
    try {
      if (!this.googleMapsApiKey) {
        throw new Error('GOOGLE_MAPS_API_KEY is not configured');
      }

      if (typeof latitude !== 'number' || typeof longitude !== 'number') {
        throw new Error('Latitude and longitude must be numbers');
      }

      // Add marker to highlight the property location
      const marker = `color:red|label:P|${latitude},${longitude}`;

      const params = {
        center: `${latitude},${longitude}`,
        zoom: 21,
        size: '600x600',
        maptype: 'satellite',
        markers: marker,
        key: this.googleMapsApiKey
      };

      const url = 'https://maps.googleapis.com/maps/api/staticmap';
      
      console.log(`[VisualInspector] Fetching satellite image for coordinates: ${latitude}, ${longitude} with property marker`);

      const response = await this.googleMapsClient.get(url, { params });

      // Google Maps Static API returns the image directly
      // We construct the URL for reference
      const imageUrl = `${url}?${new URLSearchParams(params).toString()}`;
      
      console.log(`[VisualInspector] Successfully fetched satellite image with marker`);
      return imageUrl;
    } catch (error) {
      console.error(`[VisualInspector] Error fetching satellite image:`, error.message);
      throw new Error(`Failed to fetch satellite image: ${error.message}`);
    }
  }

  /**
   * Analyze property image with Groq Vision model (second fallback)
   * @param {string} imageUrl - URL of the satellite image
   * @param {string} leadType - Type of lead: 'PoolLeadGen' or 'BackyardBoost'
   * @param {object} propertyData - Optional Zillow property data for context
   * @returns {Promise<object>} Analysis results with confidence scores
   * @throws {Error} If analysis fails
   */
  async analyzePropertyWithGroq(imageUrl, leadType, propertyData = {}) {
    try {
      if (!config.visualInspector.groqApiKey) {
        throw new Error('GROQ_API_KEY is not configured');
      }

      if (!imageUrl) {
        throw new Error('Image URL is required');
      }

      if (!['PoolLeadGen', 'BackyardBoost'].includes(leadType)) {
        throw new Error('Lead type must be either PoolLeadGen or BackyardBoost');
      }

      // Generate dynamic prompt based on lead type
      const prompt = this.generatePrompt(leadType, propertyData);

      console.log(`[VisualInspector] Analyzing image with Groq (${config.visualInspector.groqModel}) for lead type: ${leadType}`);

      const requestBody = {
        model: config.visualInspector.groqModel,
        messages: [
          {
            role: 'user',
            content: [
              {
                type: 'image_url',
                image_url: {
                  url: imageUrl
                }
              },
              {
                type: 'text',
                text: prompt
              }
            ]
          }
        ],
        max_tokens: 1024,
        temperature: 0.2
      };

      const response = await axios.post(
        'https://api.groq.com/openai/v1/chat/completions',
        requestBody,
        {
          headers: {
            'Authorization': `Bearer ${config.visualInspector.groqApiKey}`,
            'Content-Type': 'application/json'
          },
          timeout: 30000
        }
      );

      const analysisText = response.data.choices[0].message.content;
      
      // Parse JSON response from LLM
      const analysis = this.parseAnalysisResponse(analysisText, leadType);

      console.log(`[VisualInspector] Successfully analyzed image with Groq for ${leadType}`);
      return analysis;
    } catch (error) {
      console.error(`[VisualInspector] Error analyzing image with Groq:`, error.message);
      throw new Error(`Failed to analyze image with Groq: ${error.message}`);
    }
  }

  /**
   * Analyze property image with Gemini Vision model (fallback)
   * @param {string} imageUrl - URL of the satellite image
   * @param {string} leadType - Type of lead: 'PoolLeadGen' or 'BackyardBoost'
   * @param {object} propertyData - Optional Zillow property data for context
   * @returns {Promise<object>} Analysis results with confidence scores
   * @throws {Error} If analysis fails
   */
  async analyzePropertyWithGemini(imageUrl, leadType, propertyData = {}) {
    try {
      if (!this.geminiApiKey) {
        throw new Error('GEMINI_API_KEY is not configured');
      }

      if (!imageUrl) {
        throw new Error('Image URL is required');
      }

      if (!['PoolLeadGen', 'BackyardBoost'].includes(leadType)) {
        throw new Error('Lead type must be either PoolLeadGen or BackyardBoost');
      }

      // Generate dynamic prompt based on lead type
      const prompt = this.generatePrompt(leadType, propertyData);

      console.log(`[VisualInspector] Analyzing image with Gemini (${this.geminiModel}) for lead type: ${leadType}`);

      const requestBody = {
        contents: [
          {
            parts: [
              {
                text: prompt
              },
              {
                inline_data: {
                  mime_type: 'image/jpeg',
                  data: await this.fetchImageAsBase64(imageUrl)
                }
              }
            ]
          }
        ],
        generationConfig: {
          temperature: 0.2,
          maxOutputTokens: 1024
        }
      };

      const url = `https://generativelanguage.googleapis.com/v1beta/models/${this.geminiModel}:generateContent?key=${this.geminiApiKey}`;
      const response = await this.geminiClient.post(url, requestBody);

      const analysisText = response.data.candidates[0].content.parts[0].text;
      
      // Parse JSON response from LLM
      const analysis = this.parseAnalysisResponse(analysisText, leadType);

      console.log(`[VisualInspector] Successfully analyzed image with Gemini for ${leadType}`);
      return analysis;
    } catch (error) {
      console.error(`[VisualInspector] Error analyzing image with Gemini:`, error.message);
      throw new Error(`Failed to analyze image with Gemini: ${error.message}`);
    }
  }

  /**
   * Fetch image from URL and convert to base64
   * @param {string} imageUrl - URL of the image
   * @returns {Promise<string>} Base64 encoded image data
   */
  async fetchImageAsBase64(imageUrl) {
    try {
      const response = await this.googleMapsClient.get(imageUrl, {
        responseType: 'arraybuffer'
      });
      return Buffer.from(response.data).toString('base64');
    } catch (error) {
      console.error(`[VisualInspector] Error fetching image as base64:`, error.message);
      throw new Error(`Failed to fetch image: ${error.message}`);
    }
  }

  /**
   * Analyze property image with GPT-4o Vision model (primary)
   * Falls back to Groq, then Gemini if OpenAI fails
   * @param {string} imageUrl - URL of the satellite image
   * @param {string} leadType - Type of lead: 'PoolLeadGen' or 'BackyardBoost'
   * @param {object} propertyData - Optional Zillow property data for context
   * @returns {Promise<object>} Analysis results with confidence scores
   * @throws {Error} If all analysis methods fail
   */
  async analyzePropertyWithLLM(imageUrl, leadType, propertyData = {}) {
    try {
      if (!this.openaiApiKey) {
        console.warn('[VisualInspector] OPENAI_API_KEY not configured, attempting Groq fallback');
        return await this.analyzePropertyWithGroq(imageUrl, leadType, propertyData);
      }

      if (!imageUrl) {
        throw new Error('Image URL is required');
      }

      if (!['PoolLeadGen', 'BackyardBoost'].includes(leadType)) {
        throw new Error('Lead type must be either PoolLeadGen or BackyardBoost');
      }

      // Generate dynamic prompt based on lead type
      const prompt = this.generatePrompt(leadType, propertyData);

      console.log(`[VisualInspector] Analyzing image with GPT-4o for lead type: ${leadType}`);

      const requestBody = {
        model: this.openaiModel,
        messages: [
          {
            role: 'user',
            content: [
              {
                type: 'image_url',
                image_url: {
                  url: imageUrl
                }
              },
              {
                type: 'text',
                text: prompt
              }
            ]
          }
        ],
        max_tokens: 1024
      };

      const response = await this.openaiClient.post('/chat/completions', requestBody);

      const analysisText = response.data.choices[0].message.content;
      
      // Parse JSON response from LLM
      const analysis = this.parseAnalysisResponse(analysisText, leadType);

      console.log(`[VisualInspector] Successfully analyzed image with GPT-4o for ${leadType}`);
      return analysis;
    } catch (error) {
      console.error(`[VisualInspector] Error analyzing image with GPT-4o:`, error.message);
      console.log('[VisualInspector] Attempting Groq fallback...');

      try {
        return await this.analyzePropertyWithGroq(imageUrl, leadType, propertyData);
      } catch (groqError) {
        console.error(`[VisualInspector] Groq fallback failed:`, groqError.message);
        console.log('[VisualInspector] Attempting Gemini fallback...');

        try {
          return await this.analyzePropertyWithGemini(imageUrl, leadType, propertyData);
        } catch (geminiError) {
          console.error(`[VisualInspector] Gemini fallback also failed:`, geminiError.message);
          throw new Error(`Failed to analyze image with all providers (OpenAI, Groq, Gemini): ${error.message}`);
        }
      }
    }
  }

  /**
   * Generate dynamic prompt based on lead type
   * @param {string} leadType - Type of lead: 'PoolLeadGen' or 'BackyardBoost'
   * @param {object} propertyData - Optional property data for context
   * @returns {string} Formatted prompt for LLM
   */
  generatePrompt(leadType, propertyData = {}) {
    if (leadType === 'PoolLeadGen') {
      return `Analyze this satellite image of a property and provide a JSON response with the following structure:
{
  "has_pool": boolean,
  "confidence": number (0-100),
  "pool_type": string or null (e.g., "in-ground", "above-ground", "hot-tub"),
  "pool_size_estimate": string or null (e.g., "small", "medium", "large"),
  "water_bodies": string or null (description of any water features detected),
  "reasoning": string (brief explanation of findings)
}

Focus on detecting:
1. Swimming pools (in-ground or above-ground)
2. Hot tubs or spas
3. Any water bodies or water features
4. Confidence level based on image clarity and feature visibility

Return ONLY valid JSON, no additional text.`;
    } else if (leadType === 'BackyardBoost') {
      return `Analyze this satellite image of a property's backyard and provide a JSON response with the following structure:
{
  "is_empty_backyard": boolean,
  "is_underdeveloped": boolean,
  "surface_type": string (e.g., "grass", "dirt", "paved", "mixed"),
  "estimated_free_area": string (e.g., "high", "medium", "low"),
  "confidence": number (0-100),
  "structures_detected": array of strings (e.g., ["shed", "deck", "fence", "trees"]),
  "development_potential": string (e.g., "high", "medium", "low"),
  "reasoning": string (brief explanation of findings)
}

Focus on detecting:
1. Empty or available backyard space
2. Underdeveloped backyard (minimal structures, mostly open space)
3. Surface type (grass, dirt, concrete, etc.)
4. Existing structures (sheds, decks, pools, etc.)
5. Estimated percentage of free usable space
6. Development potential for improvements
7. Confidence level based on image clarity

Return ONLY valid JSON, no additional text.`;
    }
  }

  /**
   * Parse JSON response from LLM
   * @param {string} responseText - Raw response text from LLM
   * @param {string} leadType - Type of lead for validation
   * @returns {object} Parsed analysis data
   * @throws {Error} If JSON parsing fails
   */
  parseAnalysisResponse(responseText, leadType) {
    try {
      // Extract JSON from response (in case there's extra text)
      const jsonMatch = responseText.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('No JSON found in LLM response');
      }

      const analysis = JSON.parse(jsonMatch[0]);

      // Validate required fields based on lead type
      if (leadType === 'PoolLeadGen') {
        if (typeof analysis.has_pool !== 'boolean') {
          throw new Error('Invalid has_pool field in response');
        }
        if (typeof analysis.confidence !== 'number' || analysis.confidence < 0 || analysis.confidence > 100) {
          throw new Error('Invalid confidence score in response');
        }
      } else if (leadType === 'BackyardBoost') {
        if (typeof analysis.is_empty_backyard !== 'boolean') {
          throw new Error('Invalid is_empty_backyard field in response');
        }
        if (typeof analysis.is_underdeveloped !== 'boolean') {
          throw new Error('Invalid is_underdeveloped field in response');
        }
        if (!['high', 'medium', 'low'].includes(analysis.estimated_free_area)) {
          throw new Error('Invalid estimated_free_area in response');
        }
        if (!['high', 'medium', 'low'].includes(analysis.development_potential)) {
          throw new Error('Invalid development_potential in response');
        }
        if (typeof analysis.confidence !== 'number' || analysis.confidence < 0 || analysis.confidence > 100) {
          throw new Error('Invalid confidence score in response');
        }
      }

      return analysis;
    } catch (error) {
      console.error(`[VisualInspector] Error parsing LLM response:`, error.message);
      throw new Error(`Failed to parse LLM analysis: ${error.message}`);
    }
  }

  /**
   * Main orchestration function for visual property validation
   * @param {number} latitude - Property latitude
   * @param {number} longitude - Property longitude
   * @param {string} leadType - Type of lead: 'PoolLeadGen' or 'BackyardBoost'
   * @param {object} zillowData - Optional Zillow property data for comparison
   * @returns {Promise<object>} Validation result with confidence scores
   * @throws {Error} If validation workflow fails
   */
  async verify_property_visually(latitude, longitude, leadType, zillowData = {}) {
    try {
      console.log(`[VisualInspector] Starting visual verification for ${leadType}`);

      // Step 1: Fetch satellite image
      const satelliteImageUrl = await this.getGoogleMapsStaticImage(latitude, longitude);

      // Step 2: Analyze image with LLM (with fallback)
      const analysis = await this.analyzePropertyWithLLM(satelliteImageUrl, leadType, zillowData);

      // Step 3: Build validation result
      const validationResult = {
        success: true,
        validation: {
          leadType,
          satelliteImageUrl,
          analysis,
          timestamp: new Date().toISOString()
        }
      };

      console.log(`[VisualInspector] Visual verification completed successfully with model: ${analysis.model}`);
      return validationResult;
    } catch (error) {
      console.error(`[VisualInspector] Visual verification failed:`, error.message);
      throw new Error(`Visual property verification failed: ${error.message}`);
    }
  }
}

module.exports = new VisualInspector();
