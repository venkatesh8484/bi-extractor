export class PowerBIAdapter {
    constructor() {
        this.name = "Power BI Sub-Fiber Scraper";
    }

    isMatch(url, documentContext) {
        return url.includes('powerbi.com') || url.includes('zoomcharts.com') || documentContext.querySelector('visual-container') !== null || documentContext.querySelector('.cardVisual') !== null;
    }

    async extract(documentContext) {
        console.log("[Power BI Adapter] Engaging Deep React Fiber Scraper...");
        const reportData = [];

        // 1. Extract Deep Canvas Data by traversing the React internal memory state
        const visuals = documentContext.querySelectorAll('.visual-container');
        visuals.forEach(v => {
            const titleElement = v.querySelector('.visualTitle');
            const title = titleElement ? titleElement.innerText.trim() : 'Advanced Canvas Chart';
            
            try {
                // Find React 16/17/18 internal state key
                const fiberKey = Object.keys(v).find(k => k.startsWith('__reactFiber'));
                if (fiberKey) {
                    let currentFiber = v[fiberKey];
                    let dataView = null;

                    // Traverse up the fiber tree up to 5 levels to find the injected dataView prop
                    for(let i=0; i<5 && currentFiber; i++) {
                        dataView = currentFiber?.memoizedProps?.visualHost?.dataViews?.[0] || 
                                   currentFiber?.memoizedProps?.dataViews?.[0] ||
                                   currentFiber?.stateNode?.props?.dataViews?.[0];
                        if (dataView) break;
                        currentFiber = currentFiber.return;
                    }
                    
                    if (dataView && dataView.categorical) {
                        const categories = dataView.categorical.categories?.[0]?.values || [];
                        const valuesArray = dataView.categorical.values?.[0]?.values || [];
                        
                        if (categories.length > 0 && valuesArray.length > 0) {
                            for (let i = 0; i < Math.min(categories.length, valuesArray.length); i++) {
                                reportData.push({
                                    "Visual Title": title,
                                    "Category": String(categories[i]),
                                    "Value": valuesArray[i] !== null ? valuesArray[i] : 'N/A'
                                });
                            }
                        }
                    }
                }
            } catch (e) {
                console.warn("[Power BI Adapter] Failed to traverse React Fiber for visual:", title, e);
            }
        });

        // 2. Extract Standard Simple Number Cards (Fallback)
        const cards = documentContext.querySelectorAll('.cardVisual, .small-multiples-grid-cell-content');
        cards.forEach(card => {
            const rawText = card.innerText ? card.innerText.split('\n') : [];
            const ariaLabel = card.getAttribute('aria-label') || '';
            const title = ariaLabel ? ariaLabel.split(' card')[0].trim() : (rawText[0] || 'KPI Card');
            const value = rawText.length > 0 ? rawText[rawText.length - 1].trim() : 'N/A';
            
            // Only add if we didn't already hit this via the Fiber scraper above to prevent duplicates
            const isDuplicate = reportData.some(row => row['Visual Title'] === title && row['Value'] === value);
            if (!isDuplicate && title && value && value !== 'N/A') {
                reportData.push({
                    "Visual Title": title,
                    "Category": "Metric",
                    "Value": value
                });
            }
        });

        // 3. Extract basic SVG Paths (Old method fallback)
        visuals.forEach(container => {
            const titleElement = container.querySelector('.visualTitle');
            const title = titleElement ? titleElement.innerText.trim() : 'Graph';
            
            const dataPoints = container.querySelectorAll('svg path[aria-label], svg rect[aria-label]');
            dataPoints.forEach(pt => {
                const label = pt.getAttribute('aria-label');
                if (label) {
                    const parts = label.split(',');
                    const category = parts[0]?.trim() || "Item";
                    const value = (parts[1] || "").trim(); 
                    
                    const isDuplicate = reportData.some(row => row['Visual Title'] === title && row['Category'] === category);
                    if (!isDuplicate) {
                        reportData.push({
                            "Visual Title": title,
                            "Category": category,
                            "Value": value
                        });
                    }
                }
            });
        });

        return reportData;
    }
}
