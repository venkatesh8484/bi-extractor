import { PowerBIAdapter } from './PowerBI.js';
import { SpotfireAdapter } from './Spotfire.js';
import { SAPBOAdapter } from './SAPBO.js';

export class AdapterManager {
    static getAdapters() {
        return [new PowerBIAdapter(), new SpotfireAdapter(), new SAPBOAdapter()];
    }

    static async extractData(url, documentContext) {
        const adapters = this.getAdapters();
        
        for (const adapter of adapters) {
            if (adapter.isMatch(url, documentContext)) {
                console.log(`[AdapterManager] Compatible platform detected. Routing to ${adapter.name} Adapter...`);
                try {
                    return { platform: adapter.name, data: await adapter.extract(documentContext) };
                } catch (e) {
                    console.error(`[${adapter.name}] failed to extract:`, e);
                    throw new Error(`Data extraction failed inside the ${adapter.name} adapter.`);
                }
            }
        }
        
        // Fallback for demonstration if not a known BI tool (so it doesn't just error out)
        console.warn(`[AdapterManager] No compatible BI adapter found. Falling back to generic mock for testing.`);
        return { 
            platform: "Generic Testing", 
            data: [
                { "Visual Title": "Generic Table", "Category": "Row 1", "Value": 100 },
                { "Visual Title": "Generic Table", "Category": "Row 2", "Value": 250 }
            ]
        };
    }
}
