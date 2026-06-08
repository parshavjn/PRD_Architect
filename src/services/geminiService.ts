import { GoogleGenAI } from "@google/genai";

export interface PRDInputs {
  idea: string;
  feedback: string;
  assumptions: string;
  goals: string;
  constraints: string;
}

export async function generatePRD(inputs: PRDInputs): Promise<string> {
  const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
  
  const prompt = `
Act as a senior product manager, startup founder advisor, UX strategist, and prototype planner.
Convert the following raw startup input into a structured, execution-ready Strategic PRD.

RAW INPUT:
1. Startup/Product Idea: ${inputs.idea}
2. User Feedback/Notes: ${inputs.feedback}
3. Founder Assumptions/Vision: ${inputs.assumptions}
4. Business Goal: ${inputs.goals}
5. Constraints: ${inputs.constraints}

OUTPUT FORMAT (Markdown):
Please output the PRD containing exactly the following sections in this exact order. Ensure each section is rich, detailed, and directly synthesised from the raw input, applying PM frameworks (e.g., Mom's Test, ICE, JTBD):

### 1. Mission
- Describe the core mission of the product and company based on the idea and vision.

### 2. Revenue Source
- Outline the proposed business model, monetization strategy, and revenue sources.

### 3. Competitive Positioning
- Analyze the competitive landscape. Detail how the product differentiates itself from key competitors.

### 4. Flow and Friction
- **Friction Areas:** Detail onboarding/entry, core value delivery, return/habit formation, and decision/commitment friction.
- **Behavioral Friction Table:** Generate a markdown table listing behavioral friction reported by users:
  | Friction Point | User Flow Stage | Description | Impact (High/Med/Low) |

### 5. Feature Reverse Engineering
- For the primary proposed features, break down:
  - How it works
  - Business value
  - User value
  - Why it works and why it fails

### 6. User Segment
- Define:
  - Primary segment
  - Sub-segments
  - Core needs
  - Observed problems

### 7. Hypothesis
- State hypotheses in the format: "Observed friction - User segment - Source / Evidence".

### 8. User Interview Questions (Mom's Test) & JTBD
- **Mom's Test Questions:** Create non-leading questions to ask users (following the Mom's Test methodology).
- **Jobs to Be Done (JTBD):** Define key JTBD statements (When... I want to... So I can...).
- **Hypothesis Check:** Summarize feedback validation based on sources like Reddit, LinkedIn, Google Play Store.
- **Competitor Solutions:** Analyze how competitors solve the problems identified in user interviews.

### 9. Clustering Problems & Finding Direction
- **Metric-based Grouping:** Group validated user problems by the business metrics they affect.
- **Focus Area:** Explicitly choose which cluster of problems to focus on.
- **Goal Statement / Goal Setting:** Formulate a clear, measurable product goal statement.

### 10. User Persona (Need vs. Problem)
- Outline key user personas, explicitly detailing their needs versus the actual problems they encounter.

### 11. Problem Prioritization
- Prioritize identified user problems based on severity, frequency, and strategic alignment.

### 12. P0 Statement
- Define the absolute must-solve problem (P0) that the current iteration is focused on.

### 14. Solution Space
- Explore the range of potential solutions for the P0 problem.

### 15. Brain Solution Matrix
- Describe proposed solutions including:
  - Short description
  - Key assumption(s)
  - Category (Moonshot, High Confidence, Low Confidence)

### 16. Solution Prioritization (ICE)
- Prioritize solutions using a markdown table based on ICE framework:
  | Solution | Impact (1-10) | Confidence (1-10) | Ease (1-10) | ICE Score (I * C * E) |

### 17. Prototype
- Detail the flow, features, and specs of the MVP prototype to be built.

### 18. Metric
- List primary and secondary North Star/success metrics for the prototype.

### 19. Guardrails
- Define guardrail metrics to monitor (to ensure the solution doesn't negatively impact other parts of the business or product).

### 20. Pitfalls & Mitigation
- Predict potential failure modes, user drop-off points, or technical pitfalls, along with clear mitigation strategies.

### 21. PRD (Detailed Requirements)
- Document the detailed functional and technical requirements for engineers to build the solution. Include:
  - Requirement ID, description, and user stories.
  - Screen placement, interactions, and primary UI feedback loops.

CRITICAL INSTRUCTIONS:
- **Groundedness:** Base all sections strictly on the provided raw inputs (Startup/Product Idea, User Feedback/Notes, Founder Assumptions/Vision, Business Goals, Constraints). Do not hallucinate external features, requirements, or user segments that are completely unrelated or conflict with the provided inputs.
- **Unbiased & Objective Analysis:** Avoid promotional language, product hype, or buzzwords. Maintain an objective, neutral product strategy tone. Critique founder assumptions critically using Mom's Test logic, and clearly state when assumptions lack validation or present strategic risks.
- **Strict Logical Derivation (No Fabrication/Assumptions):** Do not invent, assume, or fabricate any data, features, user behaviors, or business metrics that cannot be directly and logically derived from the raw inputs. If details are missing or cannot be logically deduced, explicitly state that they are "Not Provided / Requires Validation" rather than making placeholder assumptions.
- If feedback is vague (solution-biased), rewrite it into objective user needs.
- Keep the solution lean and MVP-focused.
- Ensure the spec is detailed enough for an AI prototype builder to act on immediately.
`;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: prompt,
    });
    return response.text || "Failed to generate PRD.";
  } catch (error) {
    console.error("Error generating PRD:", error);
    throw error;
  }
}

export async function analyzePRD(prdContent: string): Promise<string> {
  const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
  
  const prompt = `
Act as a world-class Product Management Lead and Strategy Advisor.
You will be given the content of a Product Requirements Document (PRD).
Analyze it deeply and provide a strategic assessment.

PRD CONTENT:
${prdContent}

ANALYSIS REQUIREMENTS:
1. OVERALL RATING: Categorize it as [STRONGLY DEFINED], [AVERAGE / REFINABLE], or [WEAK / LACKS SUBSTANCE].
2. CORE STRENGTHS: What is well-defined?
3. CRITICAL GAPS: What is missing? (e.g., edge cases, success metrics, technical constraints, user flow clarity).
4. AMBIGUITY CHECK: Point out 2-3 specific phrases or sections that are too vague.
5. STRATEGIC SUGGESTIONS: Provide a list of actionable modifications to make the PRD production-ready.

FORMAT YOUR RESPONSE IN MARKDOWN. Use a professional, high-stakes strategic tone.
`;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: prompt,
    });
    return response.text || "Failed to analyze PRD.";
  } catch (error) {
    console.error("Error analyzing PRD:", error);
    throw error;
  }
}
