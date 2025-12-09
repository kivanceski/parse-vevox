import { GoogleGenerativeAI } from "@google/generative-ai";

export const getAvailableModels = async (apiKey) => {
  if (!apiKey) return [];
  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`,
    );
    if (!response.ok) {
      throw new Error(`Failed to fetch models: ${response.statusText}`);
    }
    const data = await response.json();
    return data.models || [];
  } catch (error) {
    console.error("Error fetching models:", error);
    return [];
  }
};

export const classifyMessages = async (
  apiKey,
  messages,
  categories,
  modelName = "gemini-3-pro-preview",
) => {
  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({ model: modelName });

  const simplifiedMessages = messages.map((m) => ({
    id: m.id,
    text: m.message,
  }));

  // We don't strictly need to pass the categories list if we hardcode the logic in the prompt as per requirements,
  // but it helps to be explicit.
  const targetCategories = "ui_ux, library, ai, headless, uncategorized";
  const targetSentiments = "positive, negative, question, neutral";

  const prompt = `
    You are a data classifier for a specific software project ecosystem.
    
    Context:
    - **Library**: Topics related to "Takeoff" or "Takeoff UI".
    - **Headless UI**: Topics specifically about headless components or "Headless UI". If a component is mentioned in a headless context, put it here.
    - **AI**: Topics related to "Takeoff MCP server", "GenFly" (AI image generation platform), or general AI/LLM discussions.
    - **UI/UX**: Topics related to design, user experience, look and feel.
    - **Uncategorized**: Anything that doesn't fit the above.

    Your task is to classify each message into TWO attributes:
    1. **Category**: One of [${targetCategories}].
    2. **Sentiment**: One of [${targetSentiments}].
       - 'question': If the message is asking for help or clarification.
       - 'positive': If it's praise or constructive feedback.
       - 'negative': If it's a complaint or bug report.
       - 'neutral': If strictly informational.

    Return the result strictly as a JSON object where the key is the message ID and the value is an object containing "category" and "sentiment".
    
    Example Output:
    {
      "1": { "category": "ai", "sentiment": "positive" },
      "2": { "category": "library", "sentiment": "question" }
    }

    Do not include markdown formatting like \`\`\`json. Just the raw JSON string.
    
    Messages:
    ${JSON.stringify(simplifiedMessages)}
  `;

  try {
    const result = await model.generateContent(prompt);
    const response = await result.response;
    let text = response.text();

    // Cleanup markdown if present
    text = text
      .replace(/```json/g, "")
      .replace(/```/g, "")
      .trim();

    return JSON.parse(text);
  } catch (error) {
    console.error("Gemini API Error:", error);
    throw error;
  }
};
