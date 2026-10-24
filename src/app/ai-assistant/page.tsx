import AIAssistantClient from './AIAssistantClient';

export const dynamic = 'force-dynamic';

export default function AIAssistantPage() {
  return <AIAssistantClient modelConfigured={Boolean(process.env.OPENAI_API_KEY)} configuredModel={process.env.OPENAI_MODEL?.trim() || 'gpt-6-astra'} />;
}
