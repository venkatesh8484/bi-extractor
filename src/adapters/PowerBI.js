export class PowerBIAdapter {
    constructor() {
        this.name = "Power BI Recursive Fiber Scraper";
    }

    isMatch(url, documentContext) {
        return url.includes('powerbi.com') || url.includes('zoomcharts.com') || documentContext.querySelector('.visual-container, .visualContainer, .cardVisual') !== null;
    }

    async extract(documentContext) {
        console.log("[Power BI Adapter] Engaging Deep React Fiber Scraper with Recursive Traversal...");
        const reportData = [];

        function extractDataFromDataViews(dataViews, title) {
            let extracted = [];
            let seenCategories = new Set();
            
            dataViews.forEach(dv => {
                // 1. Array Categories (Bar charts, Line charts)
                if (dv && dv.categorical) {
                    const categories = dv.categorical.categories?.[0]?.values || [];
                    const valuesArray = dv.categorical.values?.[0]?.values || [];
                    
                    if (categories.length > 0 && valuesArray.length > 0) {
                        for (let i = 0; i < Math.min(categories.length, valuesArray.length); i++) {
                            const catName = String(categories[i]);
                            const val = valuesArray[i] !== null ? valuesArray[i] : 'N/A';
                            if (!seenCategories.has(catName)) {
                                seenCategories.add(catName);
                                extracted.push({
                                    "Visual Title": title,
                                    "Category": catName,
                                    "Value": val
                                });
                            }
                        }
                    }
                } 
                // 2. Single value instances (KPI Cards, Ring Charts)
                if (dv && dv.single) {
                    const singleVal = dv.single.value !== null ? dv.single.value : 'N/A';
                    if (singleVal !== 'N/A') {
                        extracted.push({
                            "Visual Title": title,
                            "Category": "Metric",
                            "Value": singleVal
                        });
                    }
                }
                // 3. Table Layouts (Large grids of data)
                if (dv && dv.table) {
                    const columns = (dv.table.columns || []).map(c => c.displayName || "Column");
                    const rows = dv.table.rows || [];
                    rows.forEach(row => {
                        row.forEach((value, i) => {
                            extracted.push({
                                "Visual Title": title,
                                "Category": columns[i] || `Column ${i}`,
                                "Value": value !== null ? value : ''
                            });
                        });
                    });
                }
                // 4. Matrix Layouts (Hierarchical Pivot Tables)
                if (dv && dv.matrix) {
                    const valueSources = dv.matrix.valueSources || [];
                    const walk = (node, rowHeaders = []) => {
                        if (node.values) {
                            Object.keys(node.values).forEach(vKey => {
                                const cellData = node.values[vKey];
                                const measure = valueSources[vKey];
                                extracted.push({
                                    "Visual Title": title,
                                    "Category": rowHeaders.join(' > ') + (measure ? ` | ${measure.displayName}` : ''),
                                    "Value": cellData.value !== null ? cellData.value : ''
                                });
                            });
                        }
                        if (node.children) {
                            node.children.forEach(child => {
                                walk(child, [...rowHeaders, child.value]);
                            });
                        }
                    };
                    const rootChildren = dv.matrix.rows?.root?.children || [];
                    rootChildren.forEach(child => walk(child, [child.value]));
                }
            });
            return extracted;
        }

        const visuals = documentContext.querySelectorAll('.visualContainer, .visual-container');
        visuals.forEach(v => {
            const titleElement = v.querySelector('.visualTitle') || v.getAttribute('aria-label');
            const title = (titleElement && titleElement.innerText) ? titleElement.innerText.trim() : (typeof titleElement === 'string' ? titleElement : 'Advanced Canvas Chart');
            
            try {
                const fiberKey = Object.keys(v).find(k => k.startsWith('__reactFiber'));
                if (fiberKey) {
                    const rootFiber = v[fiberKey];
                    let rawDataViews = new Set();
                    let seenFibers = new Set();

                    // Recursive Deep Tree Traversal
                    function checkProps(props) {
                        if (!props || typeof props !== 'object') return;
                        const candidates = [props.dataView, props.dataViews, props.visual?.dataView, props.visualDataView];
                        for (const cand of candidates) {
                            if (!cand) continue;
                            const dvs = Array.isArray(cand) ? cand : [cand];
                            for (const dv of dvs) {
                                if (dv && (dv.categorical || dv.single || dv.table)) {
                                    rawDataViews.add(dv);
                                }
                            }
                        }
                    }

                    function traverse(f, depth) {
                        if (!f || depth > 20 || seenFibers.has(f)) return;
                        seenFibers.add(f);
                        checkProps(f.memoizedProps);
                        checkProps(f.pendingProps);
                        if (f.child) traverse(f.child, depth + 1);
                        if (f.sibling) traverse(f.sibling, depth + 1);
                    }

                    // Initiate deep search up to 20 depths down the Fiber tree
                    traverse(rootFiber, 0);

                    // Compile extracted points
                    const compiledPoints = extractDataFromDataViews(Array.from(rawDataViews), title);
                    compiledPoints.forEach(pt => reportData.push(pt));
                }
            } catch (e) {
                console.warn("[Power BI Adapter] Failed to traverse React Fiber for visual:", title, e);
            }
        });

        // Fallbacks for Simple Number Cards & Standard Paths
        const cards = documentContext.querySelectorAll('.cardVisual, .small-multiples-grid-cell-content');
        cards.forEach(card => {
            const rawText = card.innerText ? card.innerText.split('\n') : [];
            const ariaLabel = card.getAttribute('aria-label') || '';
            const title = ariaLabel ? ariaLabel.split(' card')[0].trim() : (rawText[0] || 'KPI Card');
            const value = rawText.length > 0 ? rawText[rawText.length - 1].trim() : 'N/A';
            
            const isDuplicate = reportData.some(row => row['Visual Title'] === title && String(row['Value']) === String(value));
            if (!isDuplicate && title && value && value !== 'N/A') {
                reportData.push({
                    "Visual Title": title,
                    "Category": "Metric",
                    "Value": value
                });
            }
        });
        // 3. Ultimate Fallback for embedded iframe specific simple text cards if Fiber + DOM fails completely.
        visuals.forEach(visual => {
            const titleElement = visual.querySelector('.visualTitle') || visual.getAttribute('aria-label');
            const title = (titleElement && titleElement.innerText) ? titleElement.innerText.trim() : (typeof titleElement === 'string' ? titleElement : 'Dashboard Matrix');
            
            // Check if it's a natively rendered Table in the DOM (bypassing React Fiber)
            const pivotTable = visual.querySelector('.pivotTable');
            if (pivotTable) {
                try {
                    const headers = Array.from(pivotTable.querySelectorAll('.columnHeaders .pivotTableCellWrap')).map(h => h.innerText.trim());
                    const cells = Array.from(pivotTable.querySelectorAll('.bodyCells .pivotTableCellWrap'));
                    
                    if (headers.length > 0 && cells.length > 0) {
                        for (let i = 0; i < cells.length; i++) {
                            const colIndex = i % headers.length;
                            const cellValue = cells[i].innerText.trim();
                            // Optional: ignore empty row cells or pagination blobs
                            if (cellValue.length > 0) {
                                const isDuplicate = reportData.some(row => row['Visual Title'] === title && row['Category'] === headers[colIndex] && row['Value'] === cellValue);
                                if (!isDuplicate) {
                                    reportData.push({
                                        "Visual Title": title,
                                        "Category": headers[colIndex],
                                        "Value": cellValue
                                    });
                                }
                            }
                        }
                    }
                } catch(e) {
                    console.warn("DOM Matrix Extraction Failed", e);
                }
            } else {
                // Otherwise try text card fallback
                try {
                    if (visual.innerText && visual.innerText.split('\n').length <= 5) {
                        const cardValue = visual.innerText.split('\n').filter(t => t.trim().length > 0 && !t.includes('Reset Filter') && !t.includes('Summary'));
                        if (cardValue.length >= 2) {
                            const val = cardValue[cardValue.length - 1];
                            const isDuplicate = reportData.some(row => row['Visual Title'] === title && String(row['Value']) === String(val));
                            if (!isDuplicate && val !== title) {
                                reportData.push({
                                    "Visual Title": title,
                                    "Category": cardValue[0],
                                    "Value": val
                                });
                            }
                        }
                    }
                } catch(e) {}
            }
        });

        // 4. Ensure we don't return 0 if there was absolute catastrophic failure (Fallback Generic)
        if (reportData.length === 0) {
            console.warn("[Power BI Adapter] Real extraction yielded 0 results. Fallback triggered.");
        }

        return reportData;
    }
}
