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
                name: ['nombre', 'name', 'contratante', 'asegurado'],
                email: ['email', 'e_mail', 'correo'],
                rfc: ['rfc'],
                birthdate: ['fecha_nacimiento', 'birth', 'nacimiento', 'birthdate'],
                policy: ['poliza', 'policy', 'numero_de_poliza', 'n__mero_de_p__liza']
            };

            for (const table of tables) {
                try {
                    const columns = await this.getTableColumns(table);
                    if (!columns) continue;

                    // Buscar las columnas necesarias
                    const nameColumn = this.findColumn(columns, columnPatterns.name);
                    const emailColumn = this.findColumn(columns, columnPatterns.email);
                    const rfcColumn = this.findColumn(columns, columnPatterns.rfc);
                    const birthdateColumn = this.findColumn(columns, columnPatterns.birthdate);
                    const policyColumn = this.findColumn(columns, columnPatterns.policy);

                    // Si no encontramos al menos una columna de nombre y RFC, saltamos esta tabla
                    if (!nameColumn || !rfcColumn) continue;

                    const query = `
                        SELECT 
                            '${table}' as source,
                            ${nameColumn} as name,
                            ${birthdateColumn ? birthdateColumn + ' as birthdate' : 'NULL as birthdate'},
                            ${emailColumn ? emailColumn + ' as email' : 'NULL as email'},
                            ${rfcColumn} as rfc,
                            ${policyColumn ? policyColumn + ' as policy_number' : 'NULL as policy_number'}
                        FROM ${table}`;

                    const data = await mysqlDatabase.executeQuery(query, []);
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
                        birthDate = this.parseDate(birthday.birthdate);
                        if (birthDate) birthdaySource = 'Campo birthdate';
                    }

                    if (!birthDate) return null;

                    return {
                        date: birthDate,
                        name: birthday.name,
                        email: birthday.email,
                        rfc: birthday.rfc,
                        source: birthday.source,
                        details: `Póliza: ${birthday.policy_number || 'N/A'}`,
                        age: birthDate ? this.calculateAge(birthDate) : null,
                        birthdaySource
                    };
                })
                .filter(birthday => birthday !== null)
                .sort((a, b) => {
                    const monthA = a.date.getMonth();
                    const monthB = b.date.getMonth();
                    if (monthA !== monthB) return monthA - monthB;
                    return a.date.getDate() - b.date.getDate();
                });

            return allBirthdays;
        } catch (error) {
            console.error('Error getting all birthdays:', error);
            throw error;
        }
    }

    async checkAndSendBirthdayEmails() {
        try {
            // Get today's date in format MM-DD
            const today = new Date();
            const monthDay = `${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
            
            // Get all birthdays
            const allBirthdays = await this.getAllBirthdays();
            
            // Filter for today's birthdays
            const todaysBirthdays = allBirthdays.filter(birthday => {
                const birthMonth = String(birthday.date.getMonth() + 1).padStart(2, '0');
                const birthDay = String(birthday.date.getDate()).padStart(2, '0');
                return `${birthMonth}-${birthDay}` === monthDay;
            });
            
            // Send emails to each birthday person
            for (const person of todaysBirthdays) {
                if (person.email) {
                    await emailService.sendBirthdayEmail(person.email, {
                        nombre: person.name,
                        companyName: process.env.COMPANY_NAME || 'Cambiando Historias',
                        companyAddress: process.env.COMPANY_ADDRESS || 'Ciudad de México'
                    });
                    console.log(`Birthday email sent to ${person.name} (${person.email})`);
                }
            }
            
            return {
                success: true,
                emailsSent: todaysBirthdays.length
            };
        } catch (error) {
            console.error('Error in birthday service:', error);
            throw error;
        }
    }

    parseDate(dateStr) {
        if (!dateStr) return null;
        
        // Try DD/MM/YYYY format
        let parts = dateStr.split('/');
        if (parts.length === 3) {
            const [day, month, year] = parts;
            return new Date(year, month - 1, day);
        }
        
        // Try YYYY-MM-DD format
        parts = dateStr.split('-');
        if (parts.length === 3) {
            const [year, month, day] = parts;
            return new Date(year, month - 1, day);
        }
        
        return null;
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