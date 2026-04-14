export class SpotfireAdapter {
    constructor() {
        this.name = "Spotfire";
    }

    isMatch(url, documentContext) {
        return url.toLowerCase().includes('spotfire') || documentContext.querySelector('.sfc-app') !== null;
    }

    async extract(documentContext) {
        console.log(`[Spotfire Adapter] Engaging extraction sequences.`);
        const extracted = [];
        
        // Target the primary containers for visuals on Spotfire dashboards
        // Include .sfc-text-area and .sfpc-visual for KPI boxes!
        const containers = documentContext.querySelectorAll('.sf-element-dialog, .sfc-highlight-root, .sfc-visual, .sfc-element, .sfc-text-area, .sfpc-visual');
        
        containers.forEach(container => {
            // Get all text lines within the container
            const lines = container.innerText.split('\n')
                .map(t => t.trim())
                .filter(t => t.length > 0 && !t.includes('Drag items'));
            
            if (lines.length >= 2) {
                let title = lines[0];
                let value = lines.slice(1).join(' ');
                
                // Heuristic: If the first line contains a value ($ or digits) 
                // and the second line looks like a label, swap them.
                if ((lines[0].includes('$') || /\d/.test(lines[0])) && !/\d/.test(lines[1])) {
                    title = lines[1];
                    value = lines[0];
                }
                
                // Avoid capturing the main header as a visual data point
                if (title.length < 50 && value.length < 100) {
                    extracted.push({
                        "Visual Title": title,
                        "Category": "Data Point",
                        "Value": value
                    });
                }
            }
        });

        // Fallback for native DOM tables (Supports both legacy .sfc and modern .sfpc namespace)
        const tables = documentContext.querySelectorAll('.sfc-table, .sfpc-table');
        tables.forEach((table, tableIdx) => {
             let title = "Spotfire Table " + (tableIdx + 1);
             
             // Attempt to locate an actual visual title instead of generic fallback
             const visual = table.closest('.sfc-visual, .sf-element-visual, .sfc-element');
             if (visual) {
                 const titleEl = visual.querySelector('.sfc-visual-title, .sf-element-visual-title, .sfc-title');
                 if (titleEl && titleEl.innerText.trim() !== '') {
                     title = titleEl.innerText.trim();
                 }
             }

             const cols = Array.from(table.querySelectorAll('.sfc-table-header-cell, .sfpc-table-header-cell')).map(c => c.innerText.trim());
             const rows = Array.from(table.querySelectorAll('.sfc-table-row, .sfpc-table-row'));
             rows.forEach(r => {
                  const cells = Array.from(r.querySelectorAll('.sfc-table-cell, .sfpc-table-cell')).map(c => c.innerText.trim());
                  cells.forEach((val, i) => {
                       if (cols[i]) {
                           extracted.push({
                               "Visual Title": title,
                               "Category": cols[i],
                               "Value": val
                           });
                       }
                  });
             });
        });

        // Filter out duplicates and system UI elements
        const seen = new Set();
        return extracted.filter(item => {
            const key = `${item["Visual Title"]}|${item["Value"]}`;
            if (seen.has(key) || item["Visual Title"].includes('Live Offer Monitoring')) return false;
            seen.add(key);
            return true;
        });
    }
}
