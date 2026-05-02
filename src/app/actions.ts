"use server"

import { 
  aiAssistedStatusSuggestion, 
  AiAssistedStatusSuggestionInput, 
  AiAssistedStatusSuggestionOutput 
} from '@/ai/flows/ai-assisted-status-suggestion';

export async function getStatusSuggestion(input: AiAssistedStatusSuggestionInput): Promise<AiAssistedStatusSuggestionOutput> {
  try {
    const result = await aiAssistedStatusSuggestion(input);
    return result;
  } catch (error) {
    console.error("AI Suggestion failed:", error);
    throw new Error("Failed to get AI status suggestion.");
  }
}
