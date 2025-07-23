import { buildFilterQuery } from './filterBuilder.mjs';
import { aggregateClientData } from './dataAggregator.mjs';
import { calculateStatistics } from './statsCalculator.mjs';
import { validatePaginationParams, parseDate, adjustModelNamesForSubscription } from './helpers.mjs';
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
      // Ensure subscription type is set
      const subscriptionType = advancedFilterData.subscriptionType || 'WMM';

      // Check if there are any filters besides services
      const hasNonServiceFilters = Object.keys(advancedFilterData).some(key => 
        key !== 'services' && 
        key !== 'subscriptionType' && 
        advancedFilterData[key] !== undefined && 
        advancedFilterData[key] !== null && 
        advancedFilterData[key] !== ''
      );

      // Validate pagination parameters
      const { validPage, validLimit, skip } = validatePaginationParams(page, limit);

      // Build filter query with subscription type
      const filterQuery = await buildFilterQuery(filter, group, {
        ...advancedFilterData,
        subscriptionType
      });

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

      // Adjust model names based on subscription type using helper function
      const adjustedModelNames = adjustModelNamesForSubscription(modelNames, subscriptionType);

      // Get paginated data for display with subscription type
      const { combinedData } = await aggregateClientData(clients, adjustedModelNames, {
        ...advancedFilterData,
        subscriptionType
      });

      // Add hasNonServiceFilters flag and subscription type to each client in combinedData
      const enrichedData = combinedData.map(client => {
        // Start with base client data
        const enrichedClient = {
          ...client,
          hasNonServiceFilters,
          subscriptionType
        };

        // Only include the relevant subscription data based on type
        switch(subscriptionType) {
          case 'Promo':
            enrichedClient.promoData = client.promoData || null;
            delete enrichedClient.wmmData;
            delete enrichedClient.compData;
            break;
          case 'Complimentary':
            enrichedClient.compData = client.compData || null;
            delete enrichedClient.wmmData;
            delete enrichedClient.promoData;
            break;
          default: // WMM
            enrichedClient.wmmData = client.wmmData || null;
            delete enrichedClient.promoData;
            delete enrichedClient.compData;
        }

        // Keep other service data
        if (client.hrgData) enrichedClient.hrgData = client.hrgData;
        if (client.fomData) enrichedClient.fomData = client.fomData;
        if (client.calData) enrichedClient.calData = client.calData;

        return enrichedClient;
      });

      // Calculate statistics using filter query and current page info
      const stats = await calculateStatistics(filterQuery, pageClientIds, validPage, validLimit);

      // Build client services based on subscription type
      const clientServices = this._buildClientServices(enrichedData, subscriptionType);

      // Prepare response
      const response = {
        stats,
        totalPages: Math.ceil(totalCount / validLimit),
        currentPage: validPage,
        pageSize: validLimit,
        combinedData: enrichedData,
        clientServices,
        subscriptionType // Include subscription type in response
      };

      return response;
    } catch (error) {
      console.error('Error in DataService.fetchData:', error);
      throw error;
    }
  }

  async _getFilteredClients(filterQuery, skip, limit) {
    const clients = await ClientModel.find(filterQuery)
      .sort({ id: 1 })
      .skip(skip)
      .limit(limit)
      .lean();
    return clients;
  }

  _buildClientServices(combinedData, subscriptionType) {
    return combinedData.map(client => {
      const services = [];
      
      // Add subscription service based on type
      switch(subscriptionType) {
        case 'Promo':
          if (client.promoData) services.push('PROMO');
          break;
        case 'Complimentary':
          if (client.compData) services.push('COMP');
          break;
        default:
          if (client.wmmData) services.push('WMM');
      }

      // Add other services
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
      // Ensure modelNames is an array
      const validModelNames = Array.isArray(modelNames) ? modelNames : [];
      if (validModelNames.length === 0) {
        throw new Error('No valid model names provided');
      }

      // Build filter query
      let filterQuery = await buildFilterQuery(filter, group, advancedFilterData);

      // Add clientIds filter if provided and ensure it's a valid array
      if (clientIds) {
        const validClientIds = Array.isArray(clientIds) ? clientIds.filter(id => id !== null && id !== undefined) : [];
        if (validClientIds.length > 0) {
          filterQuery = {
            ...filterQuery,
            id: { $in: validClientIds.map(id => parseInt(id) || id) }
          };
        }
      }

      // Get ALL clients without pagination
      const clients = await ClientModel.find(filterQuery)
        .sort({ id: 1 })
        .lean();

      // Get all data without pagination
      const { combinedData } = await aggregateClientData(clients, validModelNames, advancedFilterData);

      // Calculate statistics for the entire dataset
      const stats = await calculateStatistics(filterQuery, clients.map(c => c.id), 1, clients.length);

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