/**
 * Response Formatter Service
 * Transforms analysis results into standardized response format
 */
class ResponseFormatter {
  /**
   * Format a single property analysis result
   * @param {object} analysisResult - Result from analyzePoolProperty or analyzeBackyardProperty
   * @param {string} leadType - Type of lead: 'PoolLeadGen' or 'BackyardBoost'
   * @returns {object} Formatted lead object
   */
  formatLead(analysisResult, leadType) {
    const { zpid, address, latitude, longitude, visualValidation, qualityReport, analysis, zillow_data } = analysisResult;

    // Extract vision data based on lead type
    let visionData = {};
    if (leadType === 'PoolLeadGen') {
      visionData = {
        pool_present: visualValidation.analysis.has_pool,
        pool_type: visualValidation.analysis.pool_type || null,
        pool_size: visualValidation.analysis.pool_size_estimate || null,
        water_bodies: visualValidation.analysis.water_bodies || null,
        confidence: visualValidation.analysis.confidence / 100, // Convert to 0-1 scale
        model: visualValidation.analysis.model || 'gpt-4o'
      };
    } else if (leadType === 'BackyardBoost') {
      visionData = {
        empty_backyard: visualValidation.analysis.is_empty_backyard,
        surface_type: visualValidation.analysis.surface_type,
        free_area: visualValidation.analysis.estimated_free_area,
        structures: visualValidation.analysis.structures_detected || [],
        confidence: visualValidation.analysis.confidence / 100, // Convert to 0-1 scale
        model: visualValidation.analysis.model || 'gpt-4o'
      };
    }

    // Calculate lead score (0-100) based on quality report
    const leadScore = this.calculateLeadScore(qualityReport);

    // Extract property details from zillow_data if available
    const propertyDetails = zillow_data ? {
      bedrooms: zillow_data.bedrooms || zillow_data.beds || null,
      bathrooms: zillow_data.bathrooms || zillow_data.baths || null,
      square_feet: zillow_data.livingArea || zillow_data.squareFeet || null,
      lot_size: zillow_data.lotAreaValue || zillow_data.lotSize || null,
      year_built: zillow_data.yearBuilt || null,
      property_type: zillow_data.homeType || zillow_data.propertyType || null,
      price: zillow_data.price || null,
      zillow_url: zillow_data.hdpUrl || zillow_data.url || `https://www.zillow.com/homedetails/${zpid}_zpid/`,
      listing_status: zillow_data.homeStatus || zillow_data.status || null,
      zestimate: zillow_data.zestimate || null
    } : null;

    return {
      address,
      coordinates: {
        lat: latitude,
        lng: longitude
      },
      zpid,
      property: propertyDetails,
      imagery: {
        image_url: visualValidation.satelliteImageUrl,
        zoom: 20,
        size: {
          w: 600,
          h: 600
        }
      },
      vision: visionData,
      lead_score: leadScore,
      quality_report: {
        score: qualityReport.qualityScore,
        confidence: qualityReport.confidence,
        recommendation: qualityReport.recommendation
      }
    };
  }

  /**
   * Calculate lead score from quality report
   * @param {object} qualityReport - Quality report from leadQualityService
   * @returns {number} Lead score 0-100
   */
  calculateLeadScore(qualityReport) {
    let score = 50; // Base score

    // Adjust based on quality score
    if (qualityReport.qualityScore === 'high') {
      score = 85;
    } else if (qualityReport.qualityScore === 'medium') {
      score = 65;
    } else if (qualityReport.qualityScore === 'low') {
      score = 35;
    }

    // Adjust based on confidence
    score = Math.round((score * qualityReport.confidence) / 100);

    // Penalize if discrepancies detected
    if (qualityReport.discrepancy && qualityReport.discrepancy.detected) {
      score = Math.max(0, score - 15);
    }

    return Math.min(100, Math.max(0, score));
  }

  /**
   * Format batch analysis results into standardized response
   * @param {array} leads - Array of formatted lead objects
   * @param {string} location - Search location (city/area)
   * @param {string} leadType - Type of lead: 'PoolLeadGen' or 'BackyardBoost'
   * @returns {object} Formatted response with CSV export
   */
  formatBatchResponse(leads, location, leadType) {
    // Generate CSV data
    const csvData = this.generateCSV(leads, leadType);
    const csvBase64 = Buffer.from(csvData).toString('base64');
    const filename = `${leadType.toLowerCase()}_leads_${new Date().toISOString().split('T')[0]}.csv`;

    return {
      location,
      count: leads.length,
      leads,
      csv: {
        filename,
        base64: csvBase64
      },
      metadata: {
        timestamp: new Date().toISOString(),
        leadType,
        exportFormat: 'csv'
      }
    };
  }

  /**
   * Escape CSV field value
   * @param {*} value - Value to escape
   * @returns {string} Escaped CSV field
   */
  escapeCSVField(value) {
    if (value === null || value === undefined) {
      return '';
    }

    const stringValue = String(value);

    // If contains comma, quote, or newline, wrap in quotes and escape quotes
    if (stringValue.includes(',') || stringValue.includes('"') || stringValue.includes('\n')) {
      return `"${stringValue.replace(/"/g, '""')}"`;
    }

    return stringValue;
  }

  /**
   * Generate CSV from leads data
   * @param {array} leads - Array of formatted lead objects
   * @param {string} leadType - Type of lead
   * @returns {string} CSV string
   */
  generateCSV(leads, leadType) {
    const headers = [
      'Address',
      'Latitude',
      'Longitude',
      'ZPID',
      'Bedrooms',
      'Bathrooms',
      'Square Feet',
      'Lot Size',
      'Year Built',
      'Property Type',
      'Price',
      'Zillow URL',
      'Lead Score',
      'Quality Score',
      'Confidence',
      'Image URL'
    ];

    // Add lead-type specific headers
    if (leadType === 'PoolLeadGen') {
      headers.push('Pool Present', 'Pool Type', 'Pool Size', 'Water Bodies');
    } else if (leadType === 'BackyardBoost') {
      headers.push('Empty Backyard', 'Surface Type', 'Free Area', 'Structures');
    }

    // Build CSV rows
    const rows = [headers.map(h => this.escapeCSVField(h)).join(',')];

    leads.forEach(lead => {
      const prop = lead.property || {};
      const row = [
        lead.address,
        lead.coordinates.lat,
        lead.coordinates.lng,
        lead.zpid,
        prop.bedrooms || '',
        prop.bathrooms || '',
        prop.square_feet || '',
        prop.lot_size || '',
        prop.year_built || '',
        prop.property_type || '',
        prop.price || '',
        prop.zillow_url || '',
        lead.lead_score,
        lead.quality_report.score,
        lead.quality_report.confidence,
        lead.imagery.image_url
      ];

      // Add lead-type specific data
      if (leadType === 'PoolLeadGen') {
        row.push(
          lead.vision.pool_present,
          lead.vision.pool_type || '',
          lead.vision.pool_size || '',
          lead.vision.water_bodies || ''
        );
      } else if (leadType === 'BackyardBoost') {
        row.push(
          lead.vision.empty_backyard,
          lead.vision.surface_type,
          lead.vision.free_area,
          (lead.vision.structures || []).join('; ')
        );
      }

      rows.push(row.map(v => this.escapeCSVField(v)).join(','));
    });

    return rows.join('\n');
  }
}

module.exports = new ResponseFormatter();
