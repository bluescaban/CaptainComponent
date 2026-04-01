import OpenAI from 'openai';
import { SerializedNode, AnalysisResult } from '../../shared/types';

const SYSTEM_PROMPT = `You are an expert UI/UX designer and design systems architect. \
You analyze Figma frame structures and identify reusable UI components following atomic design principles. \
You return structured JSON only — no markdown, no prose, no code fences.`;

function buildUserPrompt(node: SerializedNode): string {
  const tree = JSON.stringify(node, null, 2);
  return `Analyze the following Figma frame node tree and identify all reusable UI components.

For each component, specify:
- name: clear component name (e.g. "Button", "Input Field", "Card")
- atomicLevel: "atom" | "molecule" | "organism"
- description: one sentence describing the component
- variants: array of variant names appropriate for this component (e.g. ["Primary","Secondary","Destructive","Ghost"])
- states: array of interactive states (e.g. ["Default","Hover","Active","Focused","Disabled","Loading"])
- themes: always include ["Light","Dark"]
- sizes: size variants if applicable (e.g. ["Small","Medium","Large"]), otherwise []
- sourceNodeId: the node id this component was identified from
- properties: { hasIcon, hasLabel, cornerRadius, typography, colorToken }

Return ONLY a JSON object in this exact shape:
{
  "components": [
    {
      "name": "Button",
      "atomicLevel": "atom",
      "description": "Interactive button element",
      "variants": ["Primary","Secondary","Destructive","Ghost"],
      "states": ["Default","Hover","Active","Focused","Disabled","Loading"],
      "themes": ["Light","Dark"],
      "sizes": ["Small","Medium","Large"],
      "sourceNodeId": "1:2",
      "properties": {
        "hasIcon": true,
        "hasLabel": true,
        "cornerRadius": 8,
        "typography": "Body/Medium",
        "colorToken": "brand/primary"
      }
    }
  ]
}

Node tree:
${tree}`;
}

export function useOpenAI(apiKey: string) {
  const analyze = async (node: SerializedNode): Promise<AnalysisResult> => {
    if (!apiKey.trim()) throw new Error('OpenAI API key is required.');

    const client = new OpenAI({ apiKey, dangerouslyAllowBrowser: true });

    const response = await client.chat.completions.create({
      model: 'gpt-4o',
      temperature: 0.2,
      response_format: { type: 'json_object' },
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user',   content: buildUserPrompt(node) },
      ],
    });

    const raw = response.choices[0]?.message?.content ?? '{}';
    const parsed = JSON.parse(raw) as AnalysisResult;

    if (!Array.isArray(parsed.components)) {
      throw new Error('GPT-4o returned an unexpected response format.');
    }

    return parsed;
  };

  return { analyze };
}
