export class PowerBIAdapter {
    constructor() {
        this.name = "Power BI Sub-Fiber Scraper";
    }

    isMatch(url, documentContext) {
        // Match standard PowerBI domains and check for camelCase visualContainer
        return url.includes('powerbi.com') || url.includes('zoomcharts.com') || documentContext.querySelector('.visual-container, .visualContainer, .cardVisual') !== null;
    }

    async extract(documentContext) {
        console.log("[Power BI Adapter] Engaging Deep React Fiber Scraper...");
        const reportData = [];

        // 1. Target both common visual container classes (kebab-case and camelCase)
        const visuals = documentContext.querySelectorAll('.visualContainer, .visual-container');
        visuals.forEach(v => {
            const titleElement = v.querySelector('.visualTitle') || v.getAttribute('aria-label');
            const title = (titleElement && titleElement.innerText) ? titleElement.innerText.trim() : (typeof titleElement === 'string' ? titleElement : 'Advanced Canvas Chart');
            
            try {
                // Find React internal state key
                const fiberKey = Object.keys(v).find(k => k.startsWith('__reactFiber'));
                if (fiberKey) {
                    let currentFiber = v[fiberKey];
                    let dataView = null;

                    // Traverse up or into immediate children to find dataView 
                    const fibersToCheck = [
                        currentFiber, 
                        currentFiber?.return, 
                        currentFiber?.child, 
                        currentFiber?.child?.child,
                        currentFiber?.child?.memoizedProps?.children?.[0]?._owner
                    ].filter(Boolean);

                    for (const fiber of fibersToCheck) {
                        dataView = fiber?.memoizedProps?.visualHost?.dataViews?.[0] || 
                                   fiber?.memoizedProps?.dataViews?.[0] ||
                                   fiber?.memoizedProps?.dataView?.[0] ||
                                   fiber?.stateNode?.props?.dataViews?.[0];
                        if (dataView) break;
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
            const isDuplicate = reportData.some(row => row['Visual Title'] === title && String(row['Value']) === String(value));
            if (!isDuplicate && title && value && value !== 'N/A') {
                reportData.push({
                    "Visual Title": title,
                    "Category": "Metric",
                    "Value": value
                });
            }
        });

        // 3. Fallback for Publish-To-Web specific simple text cards if aria-labels fail
        visuals.forEach(visual => {
            const isDuplicate = reportData.some(row => visual.innerText.includes(String(row['Value'])));
            if (!isDuplicate && visual.innerText && visual.innerText.split('\n').length <= 3) {
                const cardValue = visual.innerText.split('\n').filter(t => t.trim().length > 0);
                if (cardValue.length >= 2) {
                    reportData.push({
                        "Visual Title": visual.getAttribute('aria-label') || cardValue[0],
                        "Category": cardValue[0],
                        "Value": cardValue[1]
                    });
                }
            }
        });

        return reportData;
    }
}
