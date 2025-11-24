/**
 * Properties Routes Tests
 * Tests for search-and-analyze endpoints
 */

const request = require('supertest');
const express = require('express');
const propertiesRouter = require('../properties');

// Mock services
jest.mock('../../services/zillowService');
jest.mock('../../services/batchLeadService');
jest.mock('../../services/responseFormatter');
jest.mock('../../services/visualInspector');
jest.mock('../../services/leadQualityService');
jest.mock('../../services/cacheService');
jest.mock('../../services/transformService');

const batchLeadService = require('../../services/batchLeadService');
const responseFormatter = require('../../services/responseFormatter');

describe('Properties Routes - Search and Analyze', () => {
  let app;

  beforeEach(() => {
    app = express();
    app.use(express.json());
    app.use('/api/properties', propertiesRouter);
    jest.clearAllMocks();
  });

  describe('POST /api/properties/search-and-analyze-pool', () => {
    it('should return formatted pool leads with CSV', async () => {
      // Mock batch lead service
      const mockLeads = [
        {
          zpid: '12345',
          address: '123 Main St, Miami, FL',
          latitude: 25.7617,
          longitude: -80.1918,
          visualValidation: {
            analysis: {
              has_pool: true,
              pool_type: 'in-ground',
              confidence: 85
            },
            satelliteImageUrl: 'https://example.com/image.jpg'
          },
          qualityReport: {
            qualityScore: 'high',
            confidence: 85,
            recommendation: 'APPROVE'
          }
        }
      ];

      batchLeadService.getBatchLeads.mockResolvedValue({
        leads: mockLeads,
        statistics: {
          validationRate: '70.00%',
          priceRangesSearched: 8,
          averageConfidence: '82.50'
        }
      });

      // Mock response formatter
      responseFormatter.formatLead.mockReturnValue({
        address: '123 Main St, Miami, FL',
        coordinates: { lat: 25.7617, lng: -80.1918 },
        zpid: '12345',
        imagery: {
          image_url: 'https://example.com/image.jpg',
          zoom: 20,
          size: { w: 600, h: 600 }
        },
        vision: {
          pool_present: true,
          pool_type: 'in-ground',
          pool_size: 'large',
          confidence: 0.85,
          model: 'gpt-4o'
        },
        lead_score: 85,
        quality_report: {
          score: 'high',
          confidence: 85,
          recommendation: 'APPROVE'
        }
      });

      responseFormatter.generateCSV.mockReturnValue(
        'Address,Latitude,Longitude,ZPID,Lead Score,Quality Score,Confidence,Image URL\n' +
        '123 Main St,25.7617,-80.1918,12345,85,high,85,https://example.com/image.jpg'
      );

      const response = await request(app)
        .post('/api/properties/search-and-analyze-pool')
        .send({ location: 'Miami, FL', count: 10 });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.location).toBe('Miami, FL');
      expect(response.body.count).toBe(1);
      expect(response.body.leads).toHaveLength(1);
      expect(response.body.leads[0]).toHaveProperty('vision');
      expect(response.body.leads[0]).toHaveProperty('lead_score');
      expect(response.body.leads[0]).toHaveProperty('imagery');
      expect(response.body.csv).toBeDefined();
      expect(response.body.csv.filename).toContain('poolleadgen_leads');
      expect(response.body.csv.base64).toBeDefined();
      expect(response.body.metadata.statistics).toBeDefined();
    });

    it('should handle missing location parameter', async () => {
      const response = await request(app)
        .post('/api/properties/search-and-analyze-pool')
        .send({ count: 10 });

      expect(response.status).toBe(500);
    });
  });

  describe('POST /api/properties/search-and-analyze-backyard', () => {
    it('should return formatted backyard leads with CSV', async () => {
      // Mock batch lead service
      const mockLeads = [
        {
          zpid: '12345',
          address: '123 Main St, Austin, TX',
          latitude: 30.2672,
          longitude: -97.7431,
          visualValidation: {
            analysis: {
              is_empty_backyard: false,
              surface_type: 'mixed',
              estimated_free_area: 'large',
              confidence: 85
            },
            satelliteImageUrl: 'https://example.com/image.jpg'
          },
          qualityReport: {
            qualityScore: 'high',
            confidence: 85,
            recommendation: 'APPROVE'
          }
        }
      ];

      batchLeadService.getBatchLeads.mockResolvedValue({
        leads: mockLeads,
        statistics: {
          validationRate: '70.00%',
          priceRangesSearched: 8,
          averageConfidence: '82.50'
        }
      });

      // Mock response formatter
      responseFormatter.formatLead.mockReturnValue({
        address: '123 Main St, Austin, TX',
        coordinates: { lat: 30.2672, lng: -97.7431 },
        zpid: '12345',
        imagery: {
          image_url: 'https://example.com/image.jpg',
          zoom: 20,
          size: { w: 600, h: 600 }
        },
        vision: {
          empty_backyard: false,
          surface_type: 'mixed',
          free_area: 'large',
          confidence: 0.85,
          model: 'gpt-4o'
        },
        lead_score: 85,
        quality_report: {
          score: 'high',
          confidence: 85,
          recommendation: 'APPROVE'
        }
      });

      responseFormatter.generateCSV.mockReturnValue(
        'Address,Latitude,Longitude,ZPID,Lead Score,Quality Score,Confidence,Image URL\n' +
        '123 Main St,30.2672,-97.7431,12345,85,high,85,https://example.com/image.jpg'
      );

      const response = await request(app)
        .post('/api/properties/search-and-analyze-backyard')
        .send({ location: 'Austin, TX', count: 10 });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.location).toBe('Austin, TX');
      expect(response.body.count).toBe(1);
      expect(response.body.leads).toHaveLength(1);
      expect(response.body.leads[0]).toHaveProperty('vision');
      expect(response.body.leads[0]).toHaveProperty('lead_score');
      expect(response.body.leads[0]).toHaveProperty('imagery');
      expect(response.body.csv).toBeDefined();
      expect(response.body.csv.filename).toContain('backyardboost_leads');
      expect(response.body.csv.base64).toBeDefined();
      expect(response.body.metadata.statistics).toBeDefined();
    });
  });
});
