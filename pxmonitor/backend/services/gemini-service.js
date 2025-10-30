
/**
 * Gemini API Service
 * 
 * This module provides functionality to interact with Google's Generative AI (Gemini)
 * for explaining network components and providing insights about network metrics.
 */

import { GoogleGenerativeAI } from "@google/generative-ai";

// You'll need to replace this with your actual API key
// In a production environment, this should be stored as an environment variable
const API_KEY = "AIzaSyAah3zF7-38kHIeiAbF8LxwS6HMKFovt1U"; // replace with Gemini key
 // Replace with your API key

// Initialize the Gemini API client
const genAI = new GoogleGenerativeAI(API_KEY);

/**
 * Get an explanation for a network component
 * @param {string} componentName - The name of the component to explain
 * @returns {Promise<string>} - A description of the component
 */
async function explainNetworkComponent(componentName) {
  try {
    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });
    
    const prompt = `Explain what a "${componentName}" is in the context of network monitoring 
                    and how it helps users understand their network performance. 
                    Keep the explanation under 150 words, technical but accessible.`;
    
    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();
    
    return text;
  } catch (error) {
    console.error("Error calling Gemini API:", error);
    return `Failed to get explanation for ${componentName}. Please try again later.`;
  }
}

/**
 * Analyze network metrics and provide insights
 * @param {Object} metrics - The network metrics to analyze
 * @returns {Promise<string>} - Insights about the network metrics
 */
async function analyzeNetworkMetrics(metrics) {
  try {
    const model = genAI.getGenerativeModel({ model: "gemini-flash-2.5" });
    
    const prompt = `I have the following network metrics:
                    - Latency: ${metrics.latency}ms
                    - Jitter: ${metrics.jitter}ms
                    - Packet Loss: ${metrics.packetLoss}%
                    - Bandwidth: ${metrics.bandwidth}Mbps
                    - DNS Delay: ${metrics.dnsDelay}ms
                    - Health Score: ${metrics.healthScore}
                    - Network Stability: ${metrics.stability}
                    - Network Congestion: ${metrics.congestion}
                    
                    Based on these metrics, provide a brief analysis of the network health
                    and 2-3 specific recommendations to improve performance.
                    Keep it under 150 words and focus on actionable advice.`;
    
    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();
    
    return text;
  } catch (error) {
    console.error("Error calling Gemini API for network analysis:", error);
    return "Failed to analyze network metrics. Please try again later.";
  }
}
/**
 * @param {string} question - User question (e.g., "Why is my PC slow?")
 * @param {Object} context - Context data (processes, system health, suspicious processes)
 * @returns {Promise<string>} - Gemini's plain-English answer
 */
async function askSystemQuestion(question, context,history = []) {
  try {
    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });
    const historyString = history
      .map(message => `${message.role === 'user' ? 'User' : 'AI'}: ${message.text}`)
      .join('\n');
    // The context is already summarized, so we use it directly
    const prompt = `
      You are PXMonitor, a smart system assistant that provides very concise summaries.
      A user is asking: "${question}"
      ---
      PREVIOUS CONVERSATION:
      ${historyString}
      ---
  Here is a summary of their system's current state:
  - System Health Score: ${context.health.healthScore}/100
  - CPU Load: ${context.health.cpuLoad}%
  - Memory Usage: ${context.health.usedMemMB}MB / ${context.health.totalMemMB}MB
  - Disk Info: ${JSON.stringify(context.health.disks)}
  - Key Services: ${JSON.stringify(context.health.keyServices)}
  - OS & Uptime: ${context.health.os}, running for ${context.health.uptimeDays} days.
  - GPU: ${context.health.gpu}, Usage: ${context.health.gpuUsagePercent}%, Temp: ${context.health.gpuTempC}°C
  - Top Processes (Name, CPU, Memory): ${context.topProcesses} // The compact string from before
  - Potentially Suspicious Processes: ${context.suspicious}

  Based on the previous conversation and current system data, provide a clear, plain-English analysis for the user's question.
  Highlight potential bottlenecks (CPU, memory, disk, or thermals).
  
      IMPORTANT INSTRUCTIONS:
      Your response must be friendly, clear, and under 150 words. Structure your answer in three short paragraphs:
      1.  **Diagnosis:** Start by directly answering the user's question and identifying the main issue. (e.g., "Your system is slow right now because a process called 'Memory Compression' is using a lot of CPU.")
      2.  **Context:** Briefly explain what this means in simple terms. (e.g., "Memory Compression is a normal Windows feature that helps manage your RAM, but sometimes it can work too hard, which slows things down.")
      3.  **Recommendation:** Provide 1-2 clear, actionable steps the user can take. (e.g., "A simple restart often resolves this. If the problem continues, you may want to check for any recently installed software that could be using a lot of memory.")
    `;
    
    // ... the rest of the function stays the same
    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();
    return text;

  } catch (error) {
    console.error("Error calling Gemini for system Q/A:", error);
    return "Failed to analyze your question. Please try again later.";
  }
}

/**
 * Analyzes a list of network connections for potential security risks.
 * @param {Array<object>} connectionsList - The list of active connections.
 * @returns {Promise<string>} - An AI-generated security summary.
 */
async function analyzeConnectionsForSecurity(connectionsList) {
  try {
    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

    const prompt = `
      You are a cybersecurity analyst providing a quick, high-level risk assessment based on network connections. Your audience is non-technical.

      Analyze the following list of active network connections:
      Connections: ${JSON.stringify(connectionsList.slice(0, 30))} // Analyze a sample to stay efficient

      Based ONLY on this data, provide a concise summary. Follow these rules STRICTLY:
      1.  Start your response with a clear risk level: "Risk Level: Low," "Risk Level: Medium," or "Risk Level: High."
      2.  In 1-3 sentences, explain in simple terms WHY you choose that risk level. Mention only the most significant finding.
      3.  Your entire response MUST be under 100 words.
      4.  Do NOT give a list of recommendations or suggest further actions. Just provide the risk assessment.

      Example of a good response:
      "Risk Level: Medium. One of your system processes (svchost.exe) is making an unusual connection to a non-Microsoft server. While this could be for a legitimate service, it's worth being aware of. All other connections from applications like Chrome appear normal."
    `;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    return response.text();

  } catch (error) {
    console.error("Error calling Gemini for connection security analysis:", error);
    return "Failed to analyze connections due to an error.";
  }
}

/**
 * Explains a given hostname in simple terms.
 * @param {string} hostname - The hostname to explain.
 * @returns {Promise<string>} - An AI-generated explanation.
 */
async function explainHostname(hostname) {
  try {
    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

    const prompt = `
      You are an AI assistant explaining a network connection to a non-technical user.
      The user wants to know about the hostname: "${hostname}"

      Provide a response in the following format:
      - Owner: [Name of the company that owns this server, e.g., Google, Microsoft, Amazon Web Services]
      - Purpose: [In simple terms, what is this server's job? e.g., "This is one of Google's servers used for Chrome services like syncing bookmarks."]
      - Safety: [A clear verdict, e.g., "This is a standard and safe connection for this application."]

      Keep the entire response under 75 words.
    `;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    return response.text();

  } catch (error) {
    console.error("Error calling Gemini for hostname explanation:", error);
    return `Failed to get an explanation for ${hostname}.`;
  }
}

export {
  explainNetworkComponent,
  analyzeNetworkMetrics,
  askSystemQuestion,
  analyzeConnectionsForSecurity,
  explainHostname
};