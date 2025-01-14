const express = require('express');
const router = express.Router();
const OpenAI = require('openai');
require('dotenv').config();

const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
});

// Helper function to get column description and rules
function getColumnPrompt(columnName) {
    const rules = {
        'n__mero_de_p__liza': 'Extrae solo el número de póliza. Sin texto adicional.',
        'contratante': 'Extrae solo el nombre completo del contratante. Sin texto adicional.',
        'rfc': 'Extrae solo el RFC en mayúsculas. Sin texto adicional.',
        'nombre_del_asegurado': 'Extrae solo el nombre completo del asegurado. Sin texto adicional.',
        'direcci__n': 'Extrae solo la dirección completa. Sin texto adicional.',
        'tel__fono': 'Extrae solo el número telefónico. Sin texto adicional.',
        'c__digo_cliente': 'Extrae solo el código de cliente. Sin texto adicional.',
        'vigencia__inicio_': 'Extrae solo la fecha de inicio en formato dd/mm/aaaa. Sin texto adicional.',
        'vigencia__fin_': 'Extrae solo la fecha de fin en formato dd/mm/aaaa. Sin texto adicional.',
        'duraci__n': 'Extrae solo el número de días. Sin texto adicional.',
        'prima_neta': 'Extrae solo el monto numérico sin símbolos ni comas. Sin texto adicional.',
        'derecho_de_p__liza': 'Extrae solo el monto numérico sin símbolos ni comas. Sin texto adicional.',
        'i_v_a__16_': 'Extrae solo el monto del IVA sin símbolos ni comas. Sin texto adicional.',
        'recargo_por_pago_fraccionado': 'Extrae solo el monto del recargo sin símbolos ni comas. Sin texto adicional.',
        'importe_total_a_pagar': 'Extrae solo el monto total sin símbolos ni comas. Sin texto adicional.',
        'forma_de_pago': 'Indica solo: Anual, Mensual, Trimestral o Semestral. Sin texto adicional.',
        'pagos_fraccionados': 'Indica solo: 0 si es Anual, 12 si es Mensual, 4 si es Trimestral, 2 si es Semestral. Sin texto adicional.',
        'monto_parcial': 'Calcula: (importe_total_a_pagar - derecho_de_p__liza) / pagos_fraccionados. Sin texto adicional.',
        'fecha_de_expedici__n': 'Extrae solo la fecha en formato dd/mm/aaaa. Sin texto adicional.',
        'aseguradora': 'Indica solo: GNP, Qualitas, ANA, HDI, SURA o MAPFRE. Sin texto adicional.',
        'fecha_nacimiento_asegurado': 'Extrae solo la fecha en formato dd/mm/aaaa. Sin texto adicional.',
        'versi__n': 'Extrae solo el número de versión. Sin texto adicional.',
        'renovacion': 'Indica solo: si o no. Sin texto adicional.',
    };

    return rules[columnName] || 'Extrae solo el valor solicitado. Sin texto adicional.';
}

router.post('/analyze', async (req, res) => {
    try {
        console.log('Starting analysis with columns:', req.body.targetColumns);
        const { text, metadata, targetColumns } = req.body;
        const mappedData = {};

        // Set id to null for database auto-increment
        mappedData.id = null;

        // Process each column individually
        for (const column of targetColumns) {
            console.log(`Processing column: ${column}`);
            
            if (column === 'id') {
                continue; // Skip id as we already set it
            }
            
            if (column === 'pdf' || column === 'e_mail') {
                console.log(`Skipping column ${column} - setting empty value`);
                mappedData[column] = "";
                continue;
            }

            const prompt = `IMPORTANTE: ${getColumnPrompt(column)}

TEXTO A ANALIZAR:
${text}

${metadata ? `METADATA:\n${JSON.stringify(metadata, null, 2)}` : ''}`;

            console.log(`Sending prompt for column ${column}:`, prompt);

            // Call OpenAI API for each column
            const completion = await openai.chat.completions.create({
                model: "gpt-4o-mini",
                messages: [{
                    role: "system",
                    content: "Extrae y devuelve SOLO el valor solicitado. Sin explicaciones ni texto adicional."
                }, {
                    role: "user",
                    content: prompt
                }],
                temperature: 0,
                max_tokens: 100
            });

            // Get the response and clean it
            let value = completion.choices[0].message.content.trim();
            console.log(`Raw response for ${column}:`, value);
            
            // Remove any quotes or extra characters
            value = value.replace(/^["']|["']$/g, '');
            
            // Clean numeric values
            if (['prima_neta', 'derecho_de_p__liza', 'i_v_a__16_', 'recargo_por_pago_fraccionado', 'importe_total_a_pagar', 'monto_parcial'].includes(column)) {
                value = value.replace(/[^0-9.]/g, '');
            }
            
            console.log(`Cleaned value for ${column}:`, value);
            
            // Store the value
            mappedData[column] = value || "";
        }

        console.log('Final mapped data:', mappedData);

        // Return the response
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