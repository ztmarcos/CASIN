/**
 * Extracts the birthday from a Mexican RFC.
 * RFC format: AAAA######XXX where # represents the birth date
 * @param {string} rfc - The RFC string
 * @returns {Date|null} - The extracted birth date or null if invalid
 */
function extractBirthdayFromRFC(rfc) {
    if (!rfc || typeof rfc !== 'string' || rfc.length < 10) {
        return null;
    }

    try {
        // Extract the birth date portion (positions 4-9)
        const birthDateStr = rfc.substring(4, 10);
        
        // Extract year, month, and day
        const year = parseInt(birthDateStr.substring(0, 2));
        const month = parseInt(birthDateStr.substring(2, 4)) - 1; // JS months are 0-based
        const day = parseInt(birthDateStr.substring(4, 6));
        
        // Determine the century
        const currentYear = new Date().getFullYear();
        const century = year + 2000 > currentYear ? 1900 : 2000;
        const fullYear = century + year;
        
        // Create and validate the date
        const date = new Date(fullYear, month, day);
        
        // Check if the date is valid
        if (isNaN(date.getTime())) {
            return null;
        }
        
        return date;
    } catch (error) {
        console.error('Error extracting birthday from RFC:', error);
        return null;
    }
}

module.exports = {
    extractBirthdayFromRFC
}; 