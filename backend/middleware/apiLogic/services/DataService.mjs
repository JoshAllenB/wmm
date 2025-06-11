import { buildFilterQuery } from './filterBuilder.mjs';
import { aggregateClientData } from './dataAggregator.mjs';
import { calculateStatistics } from './statsCalculator.mjs';
import { validatePaginationParams, parseDate } from './helpers.mjs';
import ClientModel from "../../../models/clients.mjs";

class DataService {
  constructor() {
    // Initialize any service-wide configurations here
  }

  async fetchData(params) {
    const {
      modelNames,
      filter,
      page,
      limit,
      pageSize,
      group,
      clientIds = null,
      advancedFilterData = {}
    } = params;

    try {
      // Validate pagination parameters
      const { validPage, validLimit, skip } = validatePaginationParams(page, limit);

      // Build filter query
      const filterQuery = await buildFilterQuery(filter, group, advancedFilterData);

      // Get filtered clients with pagination for display
      const clients = await this._getFilteredClients(filterQuery, skip, validLimit);
      const totalCount = await ClientModel.countDocuments(filterQuery);

      // Get paginated data for display
      const { combinedData } = await aggregateClientData(clients, modelNames, advancedFilterData);

      // Calculate statistics using the entire database and current page info
      const stats = await calculateStatistics(filterQuery, validPage, validLimit);

      // Prepare response
      const response = {
        stats,
        totalPages: Math.ceil(totalCount / validLimit),
        currentPage: validPage,
        pageSize: validLimit,
        combinedData,
        clientServices: this._buildClientServices(combinedData)
      };

      return response;
    } catch (error) {
      console.error('Error in DataService.fetchData:', error);
      throw error;
    }
  }

  async _getFilteredClients(filterQuery, skip, limit) {
    return ClientModel.find(filterQuery)
      .sort({ id: 1 })
      .skip(skip)
      .limit(limit)
      .lean();
  }

  _buildClientServices(combinedData) {
    return combinedData.map(client => {
      const services = [];
      if (client.wmmData) services.push('WMM');
      if (client.hrgData) services.push('HRG');
      if (client.fomData) services.push('FOM');
      if (client.calData) services.push('CAL');
      
      // Add group-based services
      if (client.group) {
        const group = client.group.toUpperCase();
        if (group === 'DCS') services.push('DCS');
        if (group === 'MCCJ-ASIA') services.push('MCCJ-ASIA');
        if (group === 'MCCJ') services.push('MCCJ');
      }
      
      return {
        clientId: client.id,
        services
      };
    });
  }
}

// Create and export a singleton instance
const dataService = new DataService();
export default dataService; 