import { SerializedNode, AnalysisResult } from '../../shared/types';

// Hard cap on serialized node JSON sent to the API (~12 KB ≈ ~3 000 tokens)
const MAX_PAYLOAD_CHARS = 12_000;

const SYSTEM_PROMPT = `You are a UI design systems expert. Analyze a Figma node tree and identify the most important reusable components using atomic design. Return compact JSON only — no prose, no markdown.`;

function buildUserPrompt(node: SerializedNode): string {
  let tree = JSON.stringify(node, null, 1);
  const truncated = tree.length > MAX_PAYLOAD_CHARS;
  if (truncated) tree = tree.slice(0, MAX_PAYLOAD_CHARS) + '\n... (truncated)';

  return `Identify up to 8 of the most important reusable UI components in this Figma frame.
${truncated ? 'Note: the node tree was truncated to fit the token limit.\n' : ''}
Rules:
- Focus on the most distinct, high-value components only (buttons, inputs, cards, nav, etc.)
- Keep variants to the most relevant 2-4 per component
- states: include only ["Default","Hover","Disabled"] unless component clearly needs more
- themes: always ["Light","Dark"]
- sizes: [] unless the component clearly comes in multiple sizes

Return ONLY this JSON shape:
{
  "components": [
    {
      "name": "Button",
      "atomicLevel": "atom",
      "description": "Short description",
      "variants": ["Primary","Secondary"],
      "states": ["Default","Hover","Disabled"],
      "themes": ["Light","Dark"],
      "sizes": [],
      "sourceNodeId": "1:2",
      "properties": { "hasIcon": false, "hasLabel": true, "cornerRadius": 8 }
    }
  ]
}

Node tree:
${tree}`;
}

export function useOpenAI(apiKey: string) {
  const analyze = async (node: SerializedNode): Promise<AnalysisResult> => {
    if (!apiKey.trim()) throw new Error('OpenAI API key is required.');

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',          // much higher TPM limits than gpt-4o
        temperature: 0.2,
        max_tokens: 1500,              // cap output tokens too
        response_format: { type: 'json_object' },
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          { role: 'user',   content: buildUserPrompt(node) },
        ],
      }),
    });

    if (!response.ok) {
      const err = await response.json().catch(() => ({})) as { error?: { message?: string } };
      throw new Error(err.error?.message ?? `OpenAI error ${response.status}`);
    }

    const data = await response.json() as { choices: { message: { content: string } }[] };
    const raw  = data.choices[0]?.message?.content ?? '{}';
    const parsed = JSON.parse(raw) as AnalysisResult;

    if (!Array.isArray(parsed.components)) {
      throw new Error('Unexpected response format from GPT.');
    }

    return parsed;
  };

  return { analyze };
}
