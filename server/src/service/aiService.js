import { AIService } from "../cli/ai/googleService.js";

export const getAIService = (modelConfig = null) => {
  return new AIService(modelConfig);
};
