/**
 * KPI Controller
 * Handles KPI calculations and queries
 */

import iotDataService from '../services/iotDataService.js';
import logger from '../utils/logger.js';
import { subDays } from 'date-fns';

class KpiController {
  /**
   * Get all KPIs
   * GET /api/kpis
   */
  async getAllKPIs(req, res) {
    try {
      const {
        startDate = subDays(new Date(), 7).toISOString(),
        endDate = new Date().toISOString()
      } = req.query;

      const kpis = await iotDataService.getAllKPIs(startDate, endDate);

      res.json({
        success: true,
        data: kpis,
        parameters: {
          startDate,
          endDate
        }
      });

    } catch (error) {
      logger.error('Error fetching KPIs', { error: error.message });
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }

  /**
   * Get specific KPI
   * GET /api/kpis/:name
   */
  async getKPI(req, res) {
    try {
      const { name } = req.params;
      const {
        startDate = subDays(new Date(), 7).toISOString(),
        endDate = new Date().toISOString()
      } = req.query;

      const kpi = await iotDataService.calculateKPI(name, startDate, endDate);

      res.json({
        success: true,
        data: kpi
      });

    } catch (error) {
      logger.error('Error fetching KPI', { error: error.message, name: req.params.name });
      res.status(404).json({
        success: false,
        error: error.message
      });
    }
  }
}

export default new KpiController();
