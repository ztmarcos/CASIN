const express = require('express');
const router = express.Router();
const OpenAI = require('openai');
require('dotenv').config();

const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
});

router.post('/analyze', async (req, res) => {
    try {
        const { text, metadata, targetColumns, tableName } = req.body;
        console.log('Starting analysis for table:', tableName);
        console.log('Target columns:', targetColumns);

        // Create a single comprehensive prompt for all columns
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

module.exports = router; 