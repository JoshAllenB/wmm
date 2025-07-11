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
      // Check if there are any filters besides services
      const hasNonServiceFilters = Object.keys(advancedFilterData).some(key => 
        key !== 'services' && 
        key !== 'subscriptionStatus' && 
        advancedFilterData[key] !== undefined && 
        advancedFilterData[key] !== null && 
        advancedFilterData[key] !== ''
      );

      // Validate pagination parameters
      const { validPage, validLimit, skip } = validatePaginationParams(page, limit);

      // Build filter query
      const filterQuery = await buildFilterQuery(filter, group, advancedFilterData);

      // Get filtered clients with pagination for display
      const clients = await this._getFilteredClients(filterQuery, skip, validLimit);
      const totalCount = await ClientModel.countDocuments(filterQuery);

      // Get all filtered client IDs
      const allFilteredClientIds = await ClientModel.find(filterQuery)
        .select('id')
        .lean()
        .exec();
      const filteredIds = allFilteredClientIds.map(client => client.id);
      const pageClientIds = clients.map(client => client.id);

      // Get paginated data for display
      const { combinedData } = await aggregateClientData(clients, modelNames, advancedFilterData);

      // Add hasNonServiceFilters flag to each client in combinedData
      const enrichedData = combinedData.map(client => ({
        ...client,
        hasNonServiceFilters
      }));

      // Calculate statistics using filter query and current page info
      const stats = await calculateStatistics(filterQuery, pageClientIds, validPage, validLimit);

      // Prepare response
      const response = {
        stats,
        totalPages: Math.ceil(totalCount / validLimit),
        currentPage: validPage,
        pageSize: validLimit,
        combinedData: enrichedData,
        clientServices: this._buildClientServices(enrichedData)
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

  async fetchAllData(params) {
    const {
      modelNames,
      filter,
      group,
      clientIds = null,
      advancedFilterData = {}
    } = params;

    try {
      // Build filter query
      let filterQuery = await buildFilterQuery(filter, group, advancedFilterData);

      // Add clientIds filter if provided
      if (clientIds && Array.isArray(clientIds) && clientIds.length > 0) {
        filterQuery = {
          ...filterQuery,
          id: { $in: clientIds.map(id => parseInt(id)) }
        };
      }

      // Get ALL clients without pagination
      const clients = await ClientModel.find(filterQuery)
        .sort({ id: 1 })
        .lean();

      // Get all data without pagination
      const { combinedData } = await aggregateClientData(clients, modelNames, advancedFilterData);

      // Calculate statistics for the entire dataset
      const stats = await calculateStatistics(filterQuery, 1, clients.length);

      // Prepare response
      const response = {
        stats,
        combinedData,
        clientServices: this._buildClientServices(combinedData)
      };

      return response;
    } catch (error) {
      console.error('Error in DataService.fetchAllData:', error);
      throw error;
    }
  }
}

// Create and export a singleton instance
const dataService = new DataService();
export default dataService; 