import { Router } from 'express';
import { opcodeManager } from '../opencode.js';

const router = Router();

// Get available models from OpenCode
router.get('/', async (req, res) => {
  try {
    const client = opcodeManager.getClient();

    // Fetch providers which contain model information
    const providersResponse = await (client as any).provider.list();

    if (!providersResponse.data) {
      console.log('⚠️ No data in providersResponse');
      return res.json({ models: [] });
    }

    // Extract models from providers
    const models: Array<{ id: string; name: string; provider: string }> = [];

    // Parse provider data - using 'all' array from response
    const providers = providersResponse.data.all || [];

    console.log(`👥 Found ${providers.length} providers`);

    for (const provider of providers) {
      console.log(`\n🔍 Provider: ${provider.name || provider.id}`);

      // Models is an object/dictionary, not an array!
      if (provider.models && typeof provider.models === 'object') {
        const modelEntries = Object.entries(provider.models);
        console.log(`   ✅ Has ${modelEntries.length} models`);

        for (const [modelKey, model] of modelEntries) {
          const modelData = model as any;
          models.push({
            id: modelData.id || modelKey,
            name: modelData.name || modelKey,
            provider: provider.name || provider.id,
          });
        }
      } else {
        console.log(`   ❌ No models object found`);
      }
    }

    console.log(`\n📋 Total available models: ${models.length}`);
    console.log('Models:', JSON.stringify(models, null, 2));
    res.json({ models });
  } catch (error: any) {
    console.error('❌ Failed to fetch models:', error);
    console.error('Error stack:', error.stack);

    // Fallback to default Claude models if OpenCode API fails
    const defaultModels = [
      { id: 'claude-opus-4-6', name: 'Claude 4.6 Opus', provider: 'anthropic' },
      { id: 'claude-sonnet-4-5-20250929', name: 'Claude 4.5 Sonnet', provider: 'anthropic' },
      { id: 'claude-haiku-4-5-20251001', name: 'Claude 4.5 Haiku', provider: 'anthropic' },
      { id: 'claude-3-5-sonnet-20241022', name: 'Claude 3.5 Sonnet (Oct 2024)', provider: 'anthropic' },
      { id: 'claude-3-5-sonnet-20240620', name: 'Claude 3.5 Sonnet (Jun 2024)', provider: 'anthropic' },
      { id: 'claude-3-5-haiku-20241022', name: 'Claude 3.5 Haiku', provider: 'anthropic' },
      { id: 'claude-3-opus-20240229', name: 'Claude 3 Opus', provider: 'anthropic' },
      { id: 'claude-3-sonnet-20240229', name: 'Claude 3 Sonnet', provider: 'anthropic' },
      { id: 'claude-3-haiku-20240307', name: 'Claude 3 Haiku', provider: 'anthropic' },
    ];

    res.json({ models: defaultModels });
  }
});

export default router;
