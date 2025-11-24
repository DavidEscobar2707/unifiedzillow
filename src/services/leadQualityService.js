/**
 * Lead Quality Service
 * Assesses lead quality by comparing visual validation with Zillow data
 */
class LeadQualityService {
  /**
   * Compare Zillow data with visual analysis results to detect discrepancies
   * @param {object} zillowData - Zillow property data
   * @param {object} visualAnalysis - Visual analysis results from LLM
   * @param {string} leadType - Type of lead: 'PoolLeadGen' or 'BackyardBoost'
   * @returns {object} Discrepancy report with confidence levels
   */
  compareZillowWithVisual(zillowData, visualAnalysis, leadType) {
    const discrepancy = {
      detected: false,
      type: null,
      details: [],
      confidenceDiff: 0,
      severity: 'none' // none, minor, major
    };

    if (!zillowData || !visualAnalysis) {
      return discrepancy;
    }

    if (leadType === 'PoolLeadGen') {
      return this.comparePoolData(zillowData, visualAnalysis, discrepancy);
    } else if (leadType === 'BackyardBoost') {
      return this.compareBackyardData(zillowData, visualAnalysis, discrepancy);
    }

    return discrepancy;
  }

  /**
   * Compare pool-related data between Zillow and visual analysis
   * @param {object} zillowData - Zillow property data
   * @param {object} visualAnalysis - Visual analysis results
   * @param {object} discrepancy - Discrepancy object to populate
   * @returns {object} Updated discrepancy report
   */
  comparePoolData(zillowData, visualAnalysis, discrepancy) {
    const zillowHasPool = zillowData.has_pool || false;
    const visualHasPool = visualAnalysis.has_pool || false;
    const visualConfidence = visualAnalysis.confidence || 0;

    // Check for pool mismatch
    if (zillowHasPool !== visualHasPool) {
      discrepancy.detected = true;
      discrepancy.type = 'pool_mismatch';
      discrepancy.details.push({
        field: 'has_pool',
        zillowValue: zillowHasPool,
        visualValue: visualHasPool,
        visualConfidence
      });

      // Determine severity based on confidence
      if (visualConfidence >= 80) {
        discrepancy.severity = 'major';
      } else if (visualConfidence >= 60) {
        discrepancy.severity = 'minor';
      }
    }

    // Check pool type consistency if both have pools
    if (zillowHasPool && visualHasPool) {
      const zillowPoolType = zillowData.pool_type || null;
      const visualPoolType = visualAnalysis.pool_type || null;

      if (zillowPoolType && visualPoolType && zillowPoolType !== visualPoolType) {
        discrepancy.detected = true;
        if (!discrepancy.type) {
          discrepancy.type = 'pool_type_mismatch';
        }
        discrepancy.details.push({
          field: 'pool_type',
          zillowValue: zillowPoolType,
          visualValue: visualPoolType,
          visualConfidence
        });
      }
    }

    discrepancy.confidenceDiff = Math.abs(visualConfidence - 50);

    return discrepancy;
  }

  /**
   * Compare backyard-related data between Zillow and visual analysis
   * @param {object} zillowData - Zillow property data
   * @param {object} visualAnalysis - Visual analysis results
   * @param {object} discrepancy - Discrepancy object to populate
   * @returns {object} Updated discrepancy report
   */
  compareBackyardData(zillowData, visualAnalysis, discrepancy) {
    const visualConfidence = visualAnalysis.confidence || 0;
    const visualFreeArea = visualAnalysis.estimated_free_area || 'low';
    const isUnderdeveloped = visualAnalysis.is_underdeveloped || false;
    const developmentPotential = visualAnalysis.development_potential || 'low';

    // Underdeveloped backyards are GOOD for BackyardBoost - they have potential
    // Only flag if the backyard is too developed (no potential)
    if (isUnderdeveloped && developmentPotential === 'high') {
      // This is a GOOD lead - underdeveloped with high potential
      // No discrepancy to report
      return discrepancy;
    }

    // Check for backyard size mismatch only if confidence is very high
    const zillowLotSize = zillowData.lot_size || null;
    const zillowHasBackyard = zillowData.has_backyard !== false;

    // Only flag as major discrepancy if visual shows NO space AND high confidence
    if (zillowHasBackyard && visualFreeArea === 'low' && visualConfidence >= 90) {
      discrepancy.detected = true;
      discrepancy.type = 'backyard_size_mismatch';
      discrepancy.details.push({
        field: 'estimated_free_area',
        zillowValue: zillowLotSize ? 'large' : 'unknown',
        visualValue: visualFreeArea,
        visualConfidence
      });
      discrepancy.severity = 'major';
    }

    // Surface type mismatches are not critical for BackyardBoost
    // Different surfaces can still be developed
    if (zillowData.surface_type && visualAnalysis.surface_type) {
      if (zillowData.surface_type !== visualAnalysis.surface_type) {
        // Only minor discrepancy - surfaces can change
        discrepancy.detected = true;
        if (!discrepancy.type) {
          discrepancy.type = 'surface_type_mismatch';
        }
        discrepancy.details.push({
          field: 'surface_type',
          zillowValue: zillowData.surface_type,
          visualValue: visualAnalysis.surface_type,
          visualConfidence
        });
        discrepancy.severity = 'minor';
      }
    }

    discrepancy.confidenceDiff = Math.abs(visualConfidence - 50);

    return discrepancy;
  }

  /**
   * Flag a lead with discrepancy information
   * @param {string} leadId - Lead identifier
   * @param {string} discrepancyType - Type of discrepancy (e.g., 'pool_mismatch')
   * @param {object} evidence - Evidence object containing analysis details
   * @returns {object} Flag object with all details
   */
  flagLeadDiscrepancy(leadId, discrepancyType, evidence) {
    const flag = {
      leadId,
      flagType: discrepancyType,
      flaggedAt: new Date().toISOString(),
      evidence: {
        satelliteImageUrl: evidence.satelliteImageUrl || null,
        zillowData: evidence.zillowData || {},
        visualAnalysis: evidence.visualAnalysis || {},
        discrepancyDetails: evidence.discrepancyDetails || [],
        visualConfidence: evidence.visualConfidence || 0,
        leadType: evidence.leadType || null
      },
      status: 'flagged',
      requiresReview: true
    };

    console.log(`[LeadQualityService] Lead flagged: ${leadId} - Type: ${discrepancyType}`, {
      flaggedAt: flag.flaggedAt,
      severity: evidence.severity || 'unknown'
    });

    return flag;
  }

  /**
   * Calculate lead quality score based on validation results
   * @param {object} zillowData - Zillow property data
   * @param {object} visualAnalysis - Visual analysis results
   * @param {object} discrepancy - Discrepancy report
   * @param {string} leadType - Type of lead
   * @returns {object} Quality assessment with score and reasoning
   */
  calculateLeadQuality(zillowData, visualAnalysis, discrepancy, leadType) {
    let qualityScore = 'medium';
    let confidence = 0;
    let reasoning = [];

    if (!visualAnalysis) {
      return {
        qualityScore: 'low',
        confidence: 0,
        reasoning: ['Visual analysis failed or unavailable'],
        details: {}
      };
    }

    const visualConfidence = visualAnalysis.confidence || 0;

    // Base scoring on visual confidence
    if (visualConfidence >= 80) {
      confidence = visualConfidence;
    } else if (visualConfidence >= 60) {
      confidence = visualConfidence;
    } else {
      confidence = visualConfidence;
    }

    // Adjust score based on discrepancies
    if (!discrepancy.detected) {
      // No discrepancies detected
      if (visualConfidence >= 80) {
        qualityScore = 'high';
        reasoning.push('Visual validation confirms Zillow data with high confidence');
      } else if (visualConfidence >= 60) {
        qualityScore = 'medium';
        reasoning.push('Visual validation confirms Zillow data with moderate confidence');
      } else if (visualConfidence >= 50) {
        qualityScore = 'medium';
        reasoning.push('Visual validation has moderate confidence');
      } else {
        qualityScore = 'medium';
        reasoning.push('Visual validation has low confidence but no contradictions');
      }
    } else {
      // Discrepancies detected
      if (discrepancy.severity === 'major') {
        qualityScore = 'low';
        reasoning.push(`Major discrepancy detected: ${discrepancy.type}`);
        reasoning.push('Lead requires manual review before use');
      } else if (discrepancy.severity === 'minor') {
        // For BackyardBoost, minor discrepancies don't reduce quality much
        if (leadType === 'BackyardBoost') {
          qualityScore = 'medium';
          reasoning.push(`Minor discrepancy detected: ${discrepancy.type}`);
          reasoning.push('Lead still viable for BackyardBoost opportunities');
        } else {
          qualityScore = 'medium';
          reasoning.push(`Minor discrepancy detected: ${discrepancy.type}`);
          reasoning.push('Lead quality reduced due to data inconsistency');
        }
      }
    }

    // Additional quality factors
    const details = {
      visualConfidence,
      discrepancyDetected: discrepancy.detected,
      discrepancyType: discrepancy.type,
      discrepancySeverity: discrepancy.severity,
      leadType
    };

    // Lead-type specific quality factors
    if (leadType === 'PoolLeadGen') {
      details.poolConfidence = visualAnalysis.confidence || 0;
      if (visualAnalysis.has_pool && visualConfidence >= 85) {
        reasoning.push('Pool presence confirmed with high confidence');
      }
    } else if (leadType === 'BackyardBoost') {
      details.backyardConfidence = visualAnalysis.confidence || 0;
      const isUnderdeveloped = visualAnalysis.is_underdeveloped || false;
      const developmentPotential = visualAnalysis.development_potential || 'low';
      
      if (isUnderdeveloped && developmentPotential === 'high') {
        reasoning.push('Underdeveloped backyard with high development potential');
        if (qualityScore === 'medium') {
          qualityScore = 'high';
        }
      }
      
      if (visualAnalysis.is_empty_backyard && visualConfidence >= 75) {
        reasoning.push('Empty backyard confirmed - good opportunity for development');
      }
    }

    console.log(`[LeadQualityService] Lead quality calculated: ${qualityScore}`, {
      confidence,
      discrepancyDetected: discrepancy.detected,
      leadType
    });

    return {
      qualityScore,
      confidence,
      reasoning,
      details
    };
  }

  /**
   * Generate comprehensive quality assessment report
   * @param {string} leadId - Lead identifier
   * @param {object} zillowData - Zillow property data
   * @param {object} visualValidation - Visual validation result
   * @param {string} leadType - Type of lead
   * @returns {object} Complete quality assessment report
   */
  generateQualityReport(leadId, zillowData, visualValidation, leadType) {
    const visualAnalysis = visualValidation.analysis || {};
    const satelliteImageUrl = visualValidation.satelliteImageUrl || null;

    // Compare data
    const discrepancy = this.compareZillowWithVisual(zillowData, visualAnalysis, leadType);

    // Calculate quality
    const qualityAssessment = this.calculateLeadQuality(
      zillowData,
      visualAnalysis,
      discrepancy,
      leadType
    );

    // Build report
    const report = {
      leadId,
      leadType,
      assessmentTimestamp: new Date().toISOString(),
      qualityScore: qualityAssessment.qualityScore,
      confidence: qualityAssessment.confidence,
      reasoning: qualityAssessment.reasoning,
      discrepancy: {
        detected: discrepancy.detected,
        type: discrepancy.type,
        severity: discrepancy.severity,
        details: discrepancy.details
      },
      evidence: {
        satelliteImageUrl,
        visualAnalysis,
        zillowData
      },
      recommendation: this.getRecommendation(qualityAssessment.qualityScore, discrepancy)
    };

    // Flag if needed
    if (discrepancy.detected && discrepancy.severity === 'major') {
      report.flag = this.flagLeadDiscrepancy(leadId, discrepancy.type, {
        satelliteImageUrl,
        zillowData,
        visualAnalysis,
        discrepancyDetails: discrepancy.details,
        visualConfidence: visualAnalysis.confidence || 0,
        leadType,
        severity: discrepancy.severity
      });
    }

    return report;
  }

  /**
   * Get recommendation based on quality score and discrepancies
   * @param {string} qualityScore - Quality score (high/medium/low)
   * @param {object} discrepancy - Discrepancy report
   * @returns {string} Recommendation for lead handling
   */
  getRecommendation(qualityScore, discrepancy) {
    if (qualityScore === 'high') {
      return 'APPROVE - Lead meets quality standards';
    } else if (qualityScore === 'medium') {
      // For medium quality, only reject if there are major discrepancies
      if (discrepancy.detected && discrepancy.severity === 'major') {
        return 'REVIEW - Major discrepancies detected, manual review recommended';
      }
      // Otherwise approve medium quality leads - they still have value
      return 'APPROVE - Lead meets quality standards';
    } else {
      return 'REJECT - Lead quality too low, major discrepancies detected';
    }
  }
}

module.exports = new LeadQualityService();
