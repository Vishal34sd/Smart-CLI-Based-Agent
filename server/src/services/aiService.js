import { AIService } from "../cli/ai/googleService.js";

let cachedService;

export const getAIService = () => {
  if (!cachedService) {
    cachedService = new AIService();
  }
  return cachedService;
};
