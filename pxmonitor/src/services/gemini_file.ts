import { GoogleGenerativeAI } from "@google/generative-ai";
import { supabase } from "@/lib/supabaseClient";

// IMPORTANT: Remember to replace "YOUR_API_KEY" with your actual Google AI Studio API key.
const API_KEY = "AIzaSyAajxqRTFjW0gSph8Aod3sCOpc8qvhmFR0";

const genAI = new GoogleGenerativeAI(API_KEY);
const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

const analysisCache = new Map<string, string>();

export async function generateDetailedAnalysis(metrics: Record<string, unknown>): Promise<string> {
    const cacheKey = JSON.stringify(metrics);
    if (analysisCache.has(cacheKey)) {
        console.log("Returning cached detailed analysis.");
        return analysisCache.get(cacheKey)!;
    }

    const prompt = `
        Analyze the following comprehensive network metrics data and provide a detailed, easy-to-understand explanation of the overall network health.

        Your analysis should cover:
        1.  **Overall Summary**: Start with a brief, high-level summary of the network's current state (e.g., excellent, good, fair, poor).
        2.  **Core Metrics (The Good and The Bad)**: Discuss the key performance indicators: Latency, Jitter, Packet Loss, and Bandwidth. Explain what their current values mean. Highlight any that are particularly good or problematic.
        3.  **Connection Stability & Congestion**: Explain the 'Connection Stability' and 'Network Congestion' statuses. What do they imply for the user's experience?
        4.  **Protocol Distribution**: Look at the protocol data. What are the dominant protocols? Is this traffic expected? (e.g., lots of TLSv1.2 is normal for web browsing, lots of UDP might be streaming or gaming).
        5.  **Actionable Advice**: Based on the analysis, provide 2-3 simple, actionable recommendations for the user. For example, if latency is high, suggest checking for background downloads. If congestion is high, suggest disconnecting some devices.
        6.  **Formatting**: Use markdown for formatting. Use headings (e.g., "### Core Metrics") and bullet points to make the text scannable and easy to read. Do not use emojis. Be professional but not overly formal.

        Here is the data:
        \`\`\`json
        ${JSON.stringify(metrics, null, 2)}
        \`\`\`
    `;

    try {
        console.log("Generating new detailed analysis from Gemini...");
        const result = await model.generateContent(prompt);
        const response = await result.response;
        const text = response.text();

        // Save the report to Supabase
        const { error: supabaseError } = await supabase
            .from('network_report')
            .insert([{ created_at: new Date().toISOString(), summary: text }]);

        if (supabaseError) {
            console.error("Error saving report to Supabase:", supabaseError);
            // We won't throw an error to the user, just log it for debugging.
        } else {
            console.log("Report saved to Supabase successfully.");
        }
        
        // Cache the result for a short period to avoid rapid re-calls
        analysisCache.set(cacheKey, text);
        setTimeout(() => analysisCache.delete(cacheKey), 60000); // Cache for 1 minute

        return text;
    } catch (error: unknown) {
        console.error("Error calling Gemini API for detailed analysis:", error);
        if (error instanceof Error && error.message.includes('API key not valid')) {
            throw new Error("The Gemini API key is not valid. Please check the key in 'src/services/gemini_file.ts'.");
        }
        throw new Error("The AI analysis service is currently unavailable or encountered an error.");
    }
}
