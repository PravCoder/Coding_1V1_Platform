
// import open-ai library
const OpenAI = require('openai');
// use open-ai-api-key environment variable 
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY 
});

// this function takes in for context (problem, user solution, explanation), sends it to openai to evlaute the explaantion based on criteria correctness, clarity, completeness
async function evaluateExplanationOpenAI(problem, userCode, transcript, language) {
  try {
    // define prompt here, inject context + user code + explanation
    const prompt = `You are an expert coding interview evaluator. Evaluate the following explanation of a coding problem solution.

**Problem Context:**
Title: ${problem.title}
Description: ${problem.description}
Examples: ${problem.examples || 'N/A'}

**User's Code (${language}):**
\`\`\`${language}
${userCode}
\`\`\`

**User's Verbal Explanation Transcript:**
"${transcript}"

**Evaluation Criteria:**
Rate the explanation on three criteria and provide scores:

1. **Correctness (0-10 points)**: Does the explanation accurately describe the solution and algorithm?
   - Does it correctly describe the logic in the code?
   - Are test cases and edge cases handled correctly in the explanation?
   - Does the explanation match what the code actually does?

2. **Clarity (0-5 points)**: Is the explanation easy to understand?
   - Proper structure (introduction → approach → edge cases → conclusion)
   - Logical flow of ideas
   - Avoids confusion or contradictory statements

3. **Completeness (0-5 points)**: Does the explanation cover all relevant parts?
   - Mentions main steps of the solution
   - Notes key decisions (why certain data structures/algorithms were chosen)
   - Discusses edge cases or constraints

**Response Format (JSON only):**
{
  "correctness": {
    "score": <0-10>,
    "feedback": "<specific feedback about what was correct or incorrect>"
  },
  "clarity": {
    "score": <0-5>,
    "feedback": "<specific feedback about clarity issues or strengths>"
  },
  "completeness": {
    "score": <0-5>,
    "feedback": "<specific feedback about what was covered or missing>"
  },
  "total_score": <sum of all scores>,
  "overall_feedback": "<brief 2-3 sentence summary of the explanation quality>"
}

Provide only the JSON response, no additional text.`;
    
    // send request to opena-ai
    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini", // or "gpt-4" for better quality
      messages: [
        {
          role: "system",
          content: "You are an expert coding interview evaluator. Provide fair, constructive feedback on code explanations. Return only valid JSON."
        },
        {
          role: "user",
          content: prompt   // pass in prompt to request
        }
      ],
      temperature: 0.3, // lower temperature for more consistent scoring
      max_tokens: 1000,
      response_format: { type: "json_object" } // ensures JSON response
    });

    // parse the returned json rating 
    const evaluation = JSON.parse(completion.choices[0].message.content);
    return evaluation;

  } catch (error) {
    console.error("Error evaluating explanation with OpenAI:", error);
    return {
      correctness: { score: 0, feedback: "Evaluation failed" },
      clarity: { score: 0, feedback: "Evaluation failed" },
      completeness: { score: 0, feedback: "Evaluation failed" },
      total_score: 0,
      overall_feedback: "Unable to evaluate explanation due to an error."
    };
  }
}


module.exports = evaluateExplanationOpenAI;
