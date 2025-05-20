const emailService = require('./email/emailService');
const mysqlDatabase = require('./mysqlDatabase');
const { extractBirthdayFromRFC } = require('../utils/rfcUtils');

class BirthdayService {
    async getTableColumns(tableName) {
        try {
            const query = `SHOW COLUMNS FROM ${tableName}`;
            const columns = await mysqlDatabase.executeQuery(query, []);
            return columns.map(col => col.Field);
        } catch (error) {
            console.error(`Error getting columns for table ${tableName}:`, error);
            return null;
        }
    }

    async getAvailableTables() {
        try {
            const query = 'SHOW TABLES';
            const tables = await mysqlDatabase.executeQuery(query, []);
            return tables.map(table => Object.values(table)[0]);
        } catch (error) {
            console.error('Error getting available tables:', error);
            return [];
        }
    }

    findColumn(columns, patterns) {
        return columns.find(col => 
            patterns.some(pattern => 
                col.toLowerCase().includes(pattern.toLowerCase())
            )
        );
    }

    async getAllBirthdays() {
        try {
            const tables = await this.getAvailableTables();
            const results = {};

            // Columnas que necesitamos encontrar en cada tabla
            const columnPatterns = {
                name: ['nombre', 'name', 'contratante', 'asegurado', 'nombre_completo'],
                email: ['email', 'e_mail', 'correo', 'e-mail'],
                rfc: ['rfc'],
                birthdate: ['fecha_nacimiento', 'birth', 'nacimiento', 'birthdate'],
                policy: ['poliza', 'policy', 'numero_de_poliza', 'n__mero_de_p__liza']
            };

            console.log('Available tables:', tables);

            for (const table of tables) {
                try {
                    const columns = await this.getTableColumns(table);
                    if (!columns) continue;

                    console.log(`Checking table ${table} columns:`, columns);

                    // Buscar las columnas necesarias
                    const nameColumn = this.findColumn(columns, columnPatterns.name);
                    const emailColumn = this.findColumn(columns, columnPatterns.email);
                    const rfcColumn = this.findColumn(columns, columnPatterns.rfc);
                    const birthdateColumn = this.findColumn(columns, columnPatterns.birthdate);
                    const policyColumn = this.findColumn(columns, columnPatterns.policy);

                    console.log(`Found columns in ${table}:`, {
                        nameColumn,
                        emailColumn,
                        rfcColumn,
                        birthdateColumn,
                        policyColumn
                    });

                    // Si no encontramos al menos una columna de nombre y RFC o fecha de nacimiento, saltamos esta tabla
                    if (!nameColumn || (!rfcColumn && !birthdateColumn)) {
                        console.log(`Skipping table ${table} - missing required columns`);
                        continue;
                    }

                    const query = `
                        SELECT 
                            '${table}' as source,
                            ${nameColumn} as name,
                            ${birthdateColumn ? birthdateColumn + ' as birthdate' : 'NULL as birthdate'},
                            ${emailColumn ? emailColumn + ' as email' : 'NULL as email'},
                            ${rfcColumn ? rfcColumn + ' as rfc' : 'NULL as rfc'},
                            ${policyColumn ? policyColumn + ' as policy_number' : 'NULL as policy_number'}
                        FROM ${table}`;

                    console.log(`Executing query for table ${table}:`, query);
                    const data = await mysqlDatabase.executeQuery(query, []);
                    console.log(`Retrieved ${data.length} records from ${table}`);
                    results[table] = data;
                } catch (error) {
                    console.error(`Error fetching birthdays from ${table}:`, error);
                    results[table] = [];
                }
            }

            // Combine and format all results
            const allBirthdays = Object.values(results)
                .flat()
                .map(birthday => {
                    // Try to get birthday from multiple sources
                    let birthDate = null;
                    let birthdaySource = 'No disponible';
                    
                    // 1. Try from RFC first
                    if (birthday.rfc) {
                        birthDate = extractBirthdayFromRFC(birthday.rfc);
                        if (birthDate) birthdaySource = 'RFC';
                    }
                    
                    // 2. If no RFC birthday, try from birthdate field
                    if (!birthDate && birthday.birthdate) {
                        console.log('Attempting to parse birthdate:', birthday.birthdate);
                        birthDate = this.parseDate(birthday.birthdate);
                        if (birthDate) {
                            console.log('Successfully parsed birthdate:', {
                                original: birthday.birthdate,
                                parsed: birthDate,
                                month: birthDate.getMonth() + 1,
                                day: birthDate.getDate(),
                                year: birthDate.getFullYear()
                            });
                            birthdaySource = 'Campo birthdate';
                        } else {
                            console.log('Failed to parse birthdate:', birthday.birthdate);
                        }
                    }

                    if (!birthDate) return null;

                    // Clean and validate email
                    const email = birthday.email ? birthday.email.trim().toLowerCase() : null;

                    // Create a unique identifier
                    const uniqueId = `${birthday.source}-${birthday.rfc || ''}-${birthday.policy_number || ''}-${Date.now()}`;

                    return {
                        id: uniqueId,
                        date: birthDate,
                        name: birthday.name ? birthday.name.trim() : '',
                        email: email,
                        rfc: birthday.rfc ? birthday.rfc.trim().toUpperCase() : null,
                        source: birthday.source,
                        policy_number: birthday.policy_number,
                        details: `Póliza: ${birthday.policy_number || 'N/A'}`,
                        age: birthDate ? this.calculateAge(birthDate) : null,
                        birthdaySource
                    };
                })
                .filter(birthday => birthday !== null);

            // Deduplicate birthdays based on RFC and name
            const uniqueBirthdays = allBirthdays.reduce((acc, birthday) => {
                // Create a composite key using multiple fields
                const key = birthday.rfc ? 
                    birthday.rfc : // If RFC exists, use it as the key
                    `${birthday.name.toLowerCase()}-${birthday.policy_number || ''}-${birthday.source}-${birthday.date.toISOString().split('T')[0]}`;
                
                // If we already have this birthday, keep the one with more information
                if (acc[key]) {
                    const existing = acc[key];
                    // Score each record based on available information
                    const existingScore = (existing.email ? 1 : 0) + 
                                        (existing.rfc ? 2 : 0) + 
                                        (existing.policy_number ? 1 : 0);
                    const newScore = (birthday.email ? 1 : 0) + 
                                   (birthday.rfc ? 2 : 0) + 
                                   (birthday.policy_number ? 1 : 0);
                    
                    // Keep the record with the higher score
                    if (newScore > existingScore) {
                        acc[key] = birthday;
                    }
                } else {
                    acc[key] = birthday;
                }
                return acc;
            }, {});

            // Convert back to array and sort
            const sortedBirthdays = Object.values(uniqueBirthdays)
                .sort((a, b) => {
                    const monthA = a.date.getMonth();
                    const monthB = b.date.getMonth();
                    if (monthA !== monthB) return monthA - monthB;
                    return a.date.getDate() - b.date.getDate();
                });

            console.log('Total birthdays found:', sortedBirthdays.length);
            return sortedBirthdays;
        } catch (error) {
            console.error('Error getting all birthdays:', error);
            throw error;
        }
    }

    async checkAndSendBirthdayEmails() {
        try {
            console.log('Starting birthday email check process...');
            
            // Get today's date in format MM-DD
            const today = new Date();
            const monthDay = `${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
            console.log('Checking birthdays for date:', monthDay);
            
            // Get all birthdays
            console.log('Fetching all birthdays...');
            const allBirthdays = await this.getAllBirthdays();
            console.log('Total birthdays fetched:', allBirthdays.length);
            
            if (!Array.isArray(allBirthdays)) {
                throw new Error(`Invalid birthdays data: ${JSON.stringify(allBirthdays)}`);
            }
            
            // Filter for today's birthdays
            console.log('Filtering birthdays for today...');
            const todaysBirthdays = allBirthdays.filter(birthday => {
                if (!birthday || !birthday.date) {
                    console.log('Invalid birthday entry:', birthday);
                    return false;
                }
                const birthMonth = String(birthday.date.getMonth() + 1).padStart(2, '0');
                const birthDay = String(birthday.date.getDate()).padStart(2, '0');
                const birthdayDate = `${birthMonth}-${birthDay}`;
                console.log(`Comparing birthday ${birthdayDate} with today ${monthDay} for ${birthday.name}`);
                return birthdayDate === monthDay;
            });
            
            console.log('Found birthdays for today:', todaysBirthdays.length);
            console.log('Birthday details:', JSON.stringify(todaysBirthdays, null, 2));
            
            if (todaysBirthdays.length === 0) {
                console.log('No birthdays found for today');
                return {
                    success: true,
                    emailsSent: 0,
                    message: 'No birthdays found for today'
                };
            }
            
            // Send emails to each birthday person
            let emailsSent = 0;
            const emailResults = [];
            
            for (const person of todaysBirthdays) {
                if (!person.email) {
                    console.log(`Skipping ${person.name} - no email address available`);
                    emailResults.push({
                        name: person.name,
                        status: 'skipped',
                        reason: 'No email address'
                    });
                    continue;
                }
                
                console.log(`Attempting to send email to ${person.name} (${person.email})`);
                try {
                    // Convert name to proper case before sending
                    const properName = person.name.split(' ')
                        .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
                        .join(' ');
                        
                        
                    await emailService.sendBirthdayEmail(person.email, {
                        nombre: properName,
                        companyName: process.env.COMPANY_NAME || 'CASIN Seguros',
                        companyAddress: process.env.COMPANY_ADDRESS || 'Ciudad de México'
                    });
                    console.log(`Successfully sent birthday email to ${properName} (${person.email})`);
                    emailsSent++;
                    emailResults.push({
                        name: person.name,
                        email: person.email,
                        status: 'success'
                    });
                } catch (emailError) {
                    console.error(`Failed to send email to ${person.name} (${person.email}):`, emailError);
                    emailResults.push({
                        name: person.name,
                        email: person.email,
                        status: 'failed',
                        error: emailError.message
                    });
                }
            }
            
            const result = {
                success: true,
                emailsSent,
                totalBirthdays: todaysBirthdays.length,
                details: emailResults
            };
            
            console.log('Birthday email process complete:', result);
            return result;
        } catch (error) {
            console.error('Error in birthday service:', {
                message: error.message,
                stack: error.stack,
                cause: error.cause
            });
            throw error;
        }
    }

    parseDate(dateStr) {
        if (!dateStr) return null;
        
        try {
            // Try DD/MM/YYYY format
            let parts = dateStr.split('/');
            if (parts.length === 3) {
                const day = parseInt(parts[0], 10);
                const month = parseInt(parts[1], 10) - 1; // JS months are 0-based
                const year = parseInt(parts[2], 10);
                
                const date = new Date(year, month, day);
                if (!isNaN(date.getTime())) {
                    return date;
                }
            }
            
            // Try YYYY-MM-DD format
            parts = dateStr.split('-');
            if (parts.length === 3) {
                const year = parseInt(parts[0], 10);
                const month = parseInt(parts[1], 10) - 1; // JS months are 0-based
                const day = parseInt(parts[2], 10);
                
                const date = new Date(year, month, day);
                if (!isNaN(date.getTime())) {
                    return date;
                }
            }
            
            // Try to parse as a regular date string
            const date = new Date(dateStr);
            if (!isNaN(date.getTime())) {
                return date;
            }
            
            return null;
        } catch (error) {
            console.error('Error parsing date:', dateStr, error);
            return null;
        }
    }

    calculateAge(birthDate) {
        const today = new Date();
        let age = today.getFullYear() - birthDate.getFullYear();
        const m = today.getMonth() - birthDate.getMonth();
        if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
            age--;
        }
        return age;
    }
}

module.exports = new BirthdayService(); 