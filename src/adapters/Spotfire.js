export class SpotfireAdapter {
    constructor() {
        this.name = "Spotfire";
    }

    isMatch(url, documentContext) {
        return url.toLowerCase().includes('spotfire') || documentContext.querySelector('.sfc-app') !== null;
    }

    async extract(documentContext) {
        console.log(`[Spotfire Adapter] Engaging extraction sequences.`);
        // TBD: Hook into dxp-document variables
        return [];
    }
}
