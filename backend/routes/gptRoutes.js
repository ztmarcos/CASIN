const express = require('express');
const router = express.Router();

console.log('GPT Routes - Environment variables check...');
console.log('GPT Routes - VITE_OPENAI_API_KEY exists:', !!process.env.VITE_OPENAI_API_KEY);
console.log('GPT Routes - OPENAI_API_KEY exists:', !!process.env.OPENAI_API_KEY);

let openai = null;
let gptAvailable = false;

// Try to initialize OpenAI (optional)
try {
    const OpenAI = require('openai');
    const apiKey = process.env.VITE_OPENAI_API_KEY || process.env.OPENAI_API_KEY;
    
    if (apiKey && apiKey !== 'your_openai_api_key_here' && !apiKey.startsWith('sk-proj-')) {
        openai = new OpenAI({
            apiKey: apiKey,
        });
        gptAvailable = true;
        console.log('✅ OpenAI initialized successfully');
    } else {
        console.log('⚠️  No valid OpenAI API key found. GPT features will be disabled.');
    }
} catch (error) {
    console.error('⚠️  OpenAI initialization error:', error.message);
    console.log('🔄 Backend will continue without GPT features.');
}

router.post('/analyze', async (req, res) => {
    if (!gptAvailable || !openai) {
        return res.status(503).json({ 
            error: 'GPT service not available',
            message: 'OpenAI API key not configured. GPT features are disabled.',
            available: false
        });
    }

    try {
        const { type, text, metadata, targetColumns, tableName, data } = req.body;

        // Handle email generation
        if (type === 'welcome_email') {
            // Crear una lista dinámica de los datos disponibles
            const dataPoints = Object.entries(data)
                .filter(([key, value]) => value !== null && value !== undefined && value !== '')
                .map(([key, value]) => `- ${key}: ${value}`)
                .join('\n');

            const completion = await openai.chat.completions.create({
                model: "gpt-4o-mini",
                messages: [{
                    role: "system",
                    content: `Eres un experto en seguros que escribe correos profesionales y amigables en español. 
                    Genera un correo de bienvenida claro y conciso que resuma los puntos más importantes de la información proporcionada.
                    El formato debe ser:

                    ASUNTO: [El asunto del correo]

                    [Contenido del correo]`
                }, {
                    role: "user",
                    content: `Genera un correo de bienvenida para un cliente usando estos datos:
                    
                    ${dataPoints}

                    El correo debe:
                    1. Tener un saludo personalizado usando el nombre si está disponible
                    2. Agradecer por elegir nuestros servicios
                    3. Resumir los puntos más importantes de la información proporcionada
                    4. Si hay montos, incluirlos con formato de moneda mexicana
                    5. Proporcionar información de contacto
                    6. Tener un cierre profesional

                    Usa un tono profesional pero cercano, y asegúrate de que la información sea fácil de entender.`
                }],
                temperature: 0.7,
                max_tokens: 1000
            });

            const fullResponse = completion.choices[0].message.content;
            const [subject, ...messageParts] = fullResponse.split('\n\n');

            return res.json({
                emailContent: {
                    subject: subject.replace('ASUNTO: ', '').trim(),
                    message: messageParts.join('\n\n').trim()
                }
            });
        }

        // Original document analysis logic
        console.log('Iniciando análisis para tabla:', tableName);
        console.log('Columnas objetivo:', targetColumns);

        const prompt = `
        Analiza el siguiente documento y extrae la información solicitada.
        
        COLUMNAS A EXTRAER:
        ${targetColumns.map(col => `- ${col}`).join('\n')}
        
        REGLAS:
        1. Extrae el valor exacto del documento para cada columna
        2. No inventes o inferas valores que no estén en el documento
        3. Si no encuentras un valor, devuelve null
        4. Mantén los formatos originales (fechas, números, etc.)
        5. Para valores monetarios, incluye solo números sin símbolos
        6. Para fechas, mantén el formato como aparece en el documento

        REGLAS ESPECÍFICAS:
        - Si el documento es una póliza de seguros de auto y la columna es 'tipo_de_vehiculo':
          * Deduce y clasifica como: "AUTO", "MOTO", "CAMION", o "TAXI" basado en la descripción del vehículo
          * Si no puedes determinar el tipo específico, usa "AUTO" como valor predeterminado
          * Usa la descripción, uso y otras características del vehículo para determinar el tipo
        
        DOCUMENTO A ANALIZAR:
        ${text}
        
        ${metadata ? `METADATA:\n${JSON.stringify(metadata, null, 2)}` : ''}
        
        IMPORTANTE: Responde SOLO con un objeto JSON válido, sin markdown ni formato adicional.`;

        // Single GPT call for all columns
        const completion = await openai.chat.completions.create({
            model: "gpt-4o-mini",
            messages: [{
                role: "system",
                content: "Eres un asistente especializado en extraer información específica de documentos de seguros. Para pólizas de auto, clasifica el tipo_de_vehiculo como AUTO, MOTO, CAMION, o TAXI. Responde SOLO con JSON válido, sin markdown ni formato adicional."
            }, {
                role: "user",
                content: prompt
            }],
            temperature: 0,
            max_tokens: 1000
        });

        let mappedData;
        try {
            // Clean the response from any markdown formatting
            let jsonStr = completion.choices[0].message.content.trim();
            jsonStr = jsonStr.replace(/```json\n|\n```|```/g, '');
            
            // Parse the cleaned JSON response
            mappedData = JSON.parse(jsonStr);
            
            // Ensure all requested columns are present
            targetColumns.forEach(col => {
                if (!(col in mappedData)) {
                    mappedData[col] = null;
                }
            });

            // Clean numeric values
            Object.entries(mappedData).forEach(([key, value]) => {
                if (typeof value === 'string' && value.includes('$')) {
                    // Remove currency symbols and commas from numeric values
                    mappedData[key] = value.replace(/[$,]/g, '').trim();
                }
            });

            // Normalize tipo_de_vehiculo if present
            if (mappedData.tipo_de_vehiculo) {
                const tipo = mappedData.tipo_de_vehiculo.toUpperCase();
                if (!['AUTO', 'MOTO', 'CAMION', 'TAXI'].includes(tipo)) {
                    mappedData.tipo_de_vehiculo = 'AUTO';
                } else {
                    mappedData.tipo_de_vehiculo = tipo;
                }
            }

            console.log('Extracted data:', mappedData);
        } catch (error) {
            console.error('Error parsing GPT response:', error);
            console.log('Raw GPT response:', completion.choices[0].message.content);
            throw new Error('Failed to parse GPT response');
        }

        res.json({
            documentType: "Insurance Policy Document",
            keyInfo: [],
            suggestions: [],
            mappedData
        });

    } catch (error) {
        console.error('Error in GPT analysis:', error);
        res.status(500).json({ error: error.message });
    }
});

// Status endpoint
router.get('/status', (req, res) => {
    res.json({
        available: gptAvailable,
        message: gptAvailable ? 'GPT service is available' : 'GPT service is disabled (no API key)',
        model: gptAvailable ? 'gpt-4o-mini' : null
    });
});

module.exports = router; 