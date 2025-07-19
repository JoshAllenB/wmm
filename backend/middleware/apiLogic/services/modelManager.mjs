import ClientModel from "../../../models/clients.mjs";

// Global model cache to avoid repeated dynamic imports across requests
const globalModelCache = {};

const additionalModels = {
  WmmModel: () => import("../../../models/wmm.mjs"),
  HrgModel: () => import("../../../models/hrg.mjs"),
  FomModel: () => import("../../../models/fom.mjs"),
  CalModel: () => import("../../../models/cal.mjs"),
  PromoModel: () => import("../../../models/promo.mjs"),
  ComplimentaryModel: () => import("../../../models/complimentary.mjs"),
};

// Helper function to get model from cache or import it
async function getModelInstance(modelKey) {
  // First check the cache with exact key
  if (globalModelCache[modelKey]) {
    return globalModelCache[modelKey];
  }

  // Try to find a case-insensitive match in additionalModels
  const normalizedKey = modelKey.toLowerCase();
  const matchingKey = Object.keys(additionalModels).find(
    key => key.toLowerCase() === normalizedKey
  );

  if (matchingKey) {
    try {
      const { default: Model } = await additionalModels[matchingKey]();
      globalModelCache[modelKey] = Model; // Cache with original key
      return Model;
    } catch (error) {
      throw error;
    }
  }

  throw new Error(`Unknown model key: ${modelKey}`);
}

export { ClientModel, getModelInstance, additionalModels }; 