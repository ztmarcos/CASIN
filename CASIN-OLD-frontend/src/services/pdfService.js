import * as pdfjs from 'pdfjs-dist';

class PDFService {
  constructor() {
    // Use CDN worker for better compatibility
    pdfjs.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjs.version}/pdf.worker.min.js`;
  }

  /**
   * Parse a PDF file and extract its text content
   * @param {File|Blob} file - The PDF file to parse
   * @returns {Promise<{text: string, pages: number, metadata: Object}>}
   */
  async parsePDF(file) {
    try {
      const arrayBuffer = await file.arrayBuffer();
      const pdf = await pdfjs.getDocument({ data: arrayBuffer }).promise;
      
      const numPages = pdf.numPages;
      const metadata = await pdf.getMetadata();
      let fullText = '';

      // Extract text from each page
      for (let i = 1; i <= numPages; i++) {
        const page = await pdf.getPage(i);
        const textContent = await page.getTextContent();
        const pageText = textContent.items.map(item => item.str).join(' ');
        fullText += pageText + '\n\n';
      }

      return {
        text: fullText.trim(),
        pages: numPages,
        metadata: metadata.info
      };
    } catch (error) {
      console.error('Error parsing PDF:', error);
      throw new Error('Failed to parse PDF file');
    }
  }

  /**
   * Extract tables from PDF content
   * @param {File|Blob} file - The PDF file to parse
   * @returns {Promise<Array<Array<string>>>}
   */
  async extractTables(file) {
    try {
      const arrayBuffer = await file.arrayBuffer();
      const pdf = await pdfjs.getDocument({ data: arrayBuffer }).promise;
      const tables = [];

      for (let i = 1; i <= pdf.numPages; i++) {
        const page = await pdf.getPage(i);
        const textContent = await page.getTextContent();
        
        // Basic table detection (looking for structured content)
        const lines = this._groupTextItems(textContent.items);
        const potentialTables = this._detectTables(lines);
        
        if (potentialTables.length > 0) {
          tables.push(...potentialTables);
        }
      }

      return tables;
    } catch (error) {
      console.error('Error extracting tables:', error);
      throw new Error('Failed to extract tables from PDF');
    }
  }

  /**
   * Group text items into lines based on their vertical position
   * @private
   */
  _groupTextItems(items) {
    const lines = {};
    items.forEach(item => {
      const y = Math.round(item.transform[5]); // Vertical position
      if (!lines[y]) {
        lines[y] = [];
      }
      lines[y].push({
        text: item.str,
        x: item.transform[4] // Horizontal position
      });
    });

    // Sort lines by vertical position (top to bottom)
    return Object.entries(lines)
      .sort(([y1], [y2]) => Number(y2) - Number(y1))
      .map(([_, items]) => 
        items.sort((a, b) => a.x - b.x).map(item => item.text)
      );
  }

  /**
   * Detect potential tables in grouped lines
   * @private
   */
  _detectTables(lines) {
    const tables = [];
    let currentTable = [];
    let columnCount = 0;

    lines.forEach(line => {
      // Simple heuristic: lines with similar number of items might be table rows
      if (line.length > 1) {
        if (columnCount === 0) {
          columnCount = line.length;
          currentTable.push(line);
        } else if (line.length === columnCount || 
                  (line.length >= columnCount * 0.7 && line.length <= columnCount * 1.3)) {
          currentTable.push(line);
        } else if (currentTable.length > 0) {
          if (currentTable.length >= 2) { // Minimum 2 rows to consider it a table
            tables.push([...currentTable]);
          }
          currentTable = [];
          columnCount = 0;
        }
      } else if (currentTable.length > 0) {
        if (currentTable.length >= 2) {
          tables.push([...currentTable]);
        }
        currentTable = [];
        columnCount = 0;
      }
    });

    // Don't forget the last table if it exists
    if (currentTable.length >= 2) {
      tables.push(currentTable);
    }

    return tables;
  }
}

export default new PDFService(); 