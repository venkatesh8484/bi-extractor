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
             const visual = table.closest('.sfc-visual, .sf-element-visual, .sfc-element, .sfpc-visual');
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

        // Fallback 3: Virtualized Coordinate-Based Grids (Flattened Spotfire 10+ Canvases)
        const gridPanels = documentContext.querySelectorAll('.sfc-visual, .sfpc-visual, .sf-element-visual, .sfc-element, .sfpc-panel');
        gridPanels.forEach((panel, pIdx) => {
             // Avoid double-processing if it already had a native table
             if (panel.querySelector('.sfc-table, .sfpc-table')) return;

             let title = "Virtual Grid " + (pIdx + 1);
             const titleEl = panel.querySelector('.sfc-visual-title, .sf-element-visual-title, .sfc-title');
             if (titleEl && titleEl.innerText.trim() !== '') title = titleEl.innerText.trim();

             // Find all absolute child nodes inside this panel that have text
             const leafNodes = Array.from(panel.querySelectorAll('*')).filter(el => 
                  el.children.length === 0 && el.innerText && el.innerText.trim().length > 0 && 
                  !el.classList.contains('sfc-title') && !el.classList.contains('sfc-visual-title') // avoid titles
             );

             // If there are many floating leaf nodes, it's a virtualized text grid
             if (leafNodes.length > 5) {
                 // Map them by bounding box relative to panel
                 const cells = leafNodes.map(el => {
                      const rect = el.getBoundingClientRect();
                      return { text: el.innerText.trim(), x: rect.left, y: rect.top };
                 });
                 
                 // Group rows by Y coordinate within 10px margin
                 const rowsMap = {};
                 cells.forEach(c => {
                      // snap to nearest 10 pixels to group loose columns
                      const snapY = Math.round(c.y / 10) * 10;
                      if (!rowsMap[snapY]) rowsMap[snapY] = [];
                      rowsMap[snapY].push({ text: c.text, x: c.x });
                 });

                 // Reconstruct Table Mapping
                 const sortedYVals = Object.keys(rowsMap).sort((a,b) => parseFloat(a) - parseFloat(b));
                 if (sortedYVals.length >= 2) { 
                     // Assume highest elements (smallest Y) function as headers
                     const headerRow = rowsMap[sortedYVals[0]].sort((a,b) => a.x - b.x).map(c => c.text);
                     
                     for (let i = 1; i < sortedYVals.length; i++) {
                          const dataRow = rowsMap[sortedYVals[i]].sort((a,b) => a.x - b.x);
                          
                          // Avoid generating records for axes values like '2020', '2021', '0'
                          if (dataRow.length > 1 || isNaN(dataRow[0]?.text)) {
                              dataRow.forEach((cData, colIndex) => {
                                   const hd = headerRow[colIndex] || `Column ${colIndex}`;
                                   extracted.push({
                                       "Visual Title": title,
                                       "Category": hd,
                                       "Value": cData.text
                                   });
                              });
                          }
                     }
                 }
             }
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
