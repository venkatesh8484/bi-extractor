import React, { useState } from 'react';
import * as XLSX from 'xlsx';
import styles from './SidePanelApp.module.css';

export default function SidePanelApp() {
  const [status, setStatus] = useState('Idle');
  const [lastExtraction, setLastExtraction] = useState(null);

  const extractAndDownload = async () => {
    setStatus(`Connecting to BI Dashboard...`);
    setLastExtraction(null);
    try {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      if (!tab) {
          setStatus('No active tab found.');
          return;
      }
      
      setStatus(`Injecting extraction hooks...`);
      chrome.tabs.sendMessage(tab.id, { action: "EXTRACT_DATA" }, (response) => {
        if(chrome.runtime.lastError) {
           console.error(chrome.runtime.lastError.message);
           setStatus(`Extension reloaded. Please refresh the BI target page!`);
           return;
        }

        if(response && response.success) {
           setStatus(`Extraction complete via ${response.platform} Adapter. Generating Excel...`);
           
           const data = response.payload;
           if (!data || data.length === 0) {
               setStatus("Adapter found no data points to extract.");
               return;
           }

           try {
               // Excel Generation using xlsx
               const worksheet = XLSX.utils.json_to_sheet(data);
               const workbook = XLSX.utils.book_new();
               XLSX.utils.book_append_sheet(workbook, worksheet, "BI Dashboard Data");
               
               // Generate Download
               const fileName = `BI_Extraction_${new Date().getTime()}.xlsx`;
               XLSX.writeFile(workbook, fileName);
               
               setLastExtraction({
                   platform: response.platform,
                   rows: data.length,
                   fileName: fileName
               });
               setStatus('Excel file generated successfully!');
           } catch (excelError) {
               console.error(excelError);
               setStatus("Failed to generate Excel file.");
           }

        } else {
           setStatus(`Extraction failed: ${response?.error || 'Unknown Error'}`);
        }
      });
    } catch (e) {
      console.error(e);
      setStatus(`Error checking active tab.`);
    }
  };

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <div className={styles.logo}>BI Extractor</div>
        <div className={styles.statusBadge}>{status}</div>
      </header>

      <main className={styles.main}>
         <div className={styles.card}>
            <h3>Automated Excel Generation</h3>
            <p className={styles.meta}>
               Click below to safely scrape the active BI report and compile all data points into an offline Excel spreadsheet.
            </p>
            <button className={`${styles.btn} ${styles.btnPrimary}`} onClick={extractAndDownload}>
              Extract Dashboard to Excel
            </button>
         </div>

         {lastExtraction && (
            <div className={`${styles.card} ${styles.resultCard}`}>
              <div className={styles.resultHeader}>
                  <h3>Extraction Success</h3>
                  <span className={`${styles.resultPill} ${styles.pillSuccess}`}>
                     Downloaded
                  </span>
              </div>
              <p className={styles.resultMsg}>Scraped utilizing the {lastExtraction.platform} adapter.</p>
              
              <div className={styles.metricsBox}>
                 <div className={styles.metricItem}>
                    <span className={styles.metricLabel}>Total Data Points:</span>
                    <span className={styles.metricValue}>{lastExtraction.rows}</span>
                 </div>
                 <div className={styles.metricItem}>
                    <span className={styles.metricLabel}>File Name:</span>
                    <span className={styles.metricValue}>{lastExtraction.fileName}</span>
                 </div>
              </div>
            </div>
         )}
      </main>
    </div>
  );
}
