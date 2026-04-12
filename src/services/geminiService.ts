import { GoogleGenAI, Type } from "@google/genai";
import { QuickQuote, InputType } from "../types";

const apiKey = process.env.GEMINI_API_KEY;
const ai = new GoogleGenAI({ apiKey: apiKey || "" });

const QUOTE_SCHEMA = {
  type: Type.OBJECT,
  properties: {
    suggested_job_type: { type: Type.STRING, description: "The likely name of the job" },
    estimated_material_cost: { type: Type.NUMBER, description: "Estimated cost of materials" },
    estimated_labor_cost: { type: Type.NUMBER, description: "Estimated cost of labor" },
    estimated_subcontractor_cost: { type: Type.NUMBER, description: "Estimated cost of subcontractors" },
    estimated_total: { type: Type.NUMBER, description: "Total estimated cost" },
    flat_rate_low: { type: Type.NUMBER, description: "Lower end of a typical flat rate range" },
    flat_rate_high: { type: Type.NUMBER, description: "Upper end of a typical flat rate range" },
    confidence_score: { type: Type.NUMBER, description: "Confidence score from 0 to 1" },
    reasoning: { type: Type.STRING, description: "Brief explanation for the estimate" },
    missing_items: { 
      type: Type.ARRAY, 
      items: { type: Type.STRING },
      description: "List of items that might be missing from the estimate"
    },
    tags: {
      type: Type.ARRAY,
      items: { type: Type.STRING },
      description: "Short, relevant tags for the job (e.g., 'Emergency', 'Warranty', 'HVAC', 'Plumbing', 'Priority')"
    }
  },
  required: ["suggested_job_type", "estimated_total", "confidence_score", "reasoning"]
};

export async function interpretQuote(text: string, inputType: InputType): Promise<Partial<QuickQuote>> {
  if (!apiKey) {
    console.warn("GEMINI_API_KEY is not set. Returning mock interpretation.");
    return mockInterpretation(text);
  }

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: `Interpret this field technician's input for a quick job quote: "${text}". 
      The input was ${inputType}. 
      Provide a structured estimate for an internal job budget. 
      Specialize in HVAC and Plumbing jobs. 
      Align all pricing and estimates with current ballpark figures for the Dallas-Fort Worth (DFW), Texas area.
      Include relevant tags for the job based on the description.`,
      config: {
        responseMimeType: "application/json",
        responseSchema: QUOTE_SCHEMA,
        systemInstruction: "You are an expert estimator for HVAC and Plumbing services specifically for the Dallas-Fort Worth (DFW) market. Your goal is to turn short, informal notes from field technicians into structured internal job budgets that reflect DFW labor rates and material costs. Be practical, realistic, and localized to North Texas. Also, intelligently tag the job with 2-4 relevant keywords (e.g., 'HVAC', 'Repair', 'Emergency', 'Residential')."
      }
    });

    const result = JSON.parse(response.text || "{}");
    return {
      ...result,
      source_input_text: text,
      source_input_type: inputType,
      status: 'draft',
      created_at: new Date().toISOString(),
    };
  } catch (error) {
    console.error("Error interpreting quote:", error);
    return mockInterpretation(text);
  }
}

function mockInterpretation(text: string): Partial<QuickQuote> {
  const lowerText = text.toLowerCase();
  if (lowerText.includes("capacitor")) {
    return {
      suggested_job_type: "Capacitor Replacement",
      estimated_material_cost: 50,
      estimated_labor_cost: 300,
      estimated_total: 350,
      flat_rate_low: 350,
      flat_rate_high: 500,
      confidence_score: 0.9,
      reasoning: "Standard capacitor replacement based on common pricing.",
      tags: ["HVAC", "Repair", "Capacitor"],
      source_input_text: text,
      source_input_type: 'typed',
      status: 'draft',
      created_at: new Date().toISOString(),
    };
  }
  return {
    suggested_job_type: "General Repair",
    estimated_total: 250,
    confidence_score: 0.5,
    reasoning: "Could not determine specific job type. Providing general estimate.",
    tags: ["General"],
    source_input_text: text,
    source_input_type: 'typed',
    status: 'draft',
    created_at: new Date().toISOString(),
  };
}

const PROFIT_INSIGHT_SCHEMA = {
  type: Type.OBJECT,
  properties: {
    insights: {
      type: Type.ARRAY,
      items: { type: Type.STRING },
      description: "2-3 short, actionable insights or blunt contractor remarks about the job's profitability variance."
    }
  },
  required: ["insights"]
};

export async function analyzeProfitReality(
  estimate: number,
  actualMaterials: number,
  actualLabor: number,
  actualExtras: number
): Promise<string[]> {
  const actualTotal = actualMaterials + actualLabor + actualExtras;
  const margin = estimate > 0 ? ((estimate - actualTotal) / estimate) * 100 : 0;
  const variance = estimate - actualTotal;

  if (!apiKey) {
      if (variance < 0) return ["You lost money on this job.", "Check your estimating process."];
      if (margin < 20) return ["Margins are too tight.", "Watch your labor hours."];
      return ["Good job, you made money.", "Solid margins."];
  }

  const prompt = `
    Analyze this contractor job outcome:
    Estimated Revenue: $${estimate}
    Actual Material Cost: $${actualMaterials}
    Actual Labor Cost: $${actualLabor}
    Actual Extra Cost: $${actualExtras}
    Total Actual Cost: $${actualTotal}
    Net Profit/Loss: $${variance}
    Margin: ${margin.toFixed(1)}%

    Provide 2-3 short, punchy, "reality check" insights for the contractor. Be direct, slightly brutally honest if they lost money or had tight margins, or encouraging if they did well. Limit each insight to 1-2 sentences. Return exactly an array of strings.
  `;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: PROFIT_INSIGHT_SCHEMA,
        systemInstruction: "You are a seasoned, no-nonsense contractor mentor analyzing job profits."
      }
    });

    const result = JSON.parse(response.text || "{}");
    return result.insights || ["No insights available."];
  } catch (error) {
    console.error("Error generating profit insights:", error);
    return ["Unable to generate insights.", "Check your API connection."];
  }
}
