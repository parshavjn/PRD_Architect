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
Convert the following raw startup input into a structured, execution-ready PRD.

RAW INPUT:
1. Startup/Product Idea: ${inputs.idea}
2. User Feedback/Notes: ${inputs.feedback}
3. Founder Assumptions/Vision: ${inputs.assumptions}
4. Business Goal: ${inputs.goals}
5. Constraints: ${inputs.constraints}

OUTPUT FORMAT (Markdown):

### 1. Product Summary
- Product / feature name
- One-line pitch
- What problem it solves
- Why this matters now
- Who it is for

### 2. Background and Context
- What triggered this product idea
- What user feedback suggests
- What patterns are visible in the feedback
- What the founder likely believes
- What assumptions are being made

### 3. Problem Statement
- Primary problem
- Secondary problems
- Current user pain points
- Why existing workflow fails
- Why current feedback collection is not actionable

### 4. Target Users
For each major user segment:
- User type, Goals, Pain points, Context of use, Frequency of use, Success metrics.

### 5. Jobs to Be Done (JTBD)
- 3–5 statements (When... I want to... So I can...)

### 6. Key Insights from Feedback
- Cluster raw feedback into: Repeated pain points, Feature requests, Workflow bottlenecks, Emotional signals, Unmet needs.
- For each insight: Insight, Evidence, Product implication, Priority (High/Med/Low).

### 7. Product Goals
- User goals, Business goals, Product goals, Non-goals for v1.

### 8. MVP Scope
- Must have (Feature, User Value, Description, Why it matters, Minimal Version)
- Nice to have
- Not now

### 9. Functional Requirements
- Requirement ID, Description, Trigger.

### 10. Suggested Screens
- Detailed description of key screens for the v1 prototype. Include component placement, primary actions, and feedback loops.

CRITICAL INSTRUCTIONS:
- If feedback is vague (solution-biased), rewrite it into user needs.
- If any input is missing, infer cautiously and clearly mark as [ASSUMPTION].
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
