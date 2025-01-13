const express = require('express');
const router = express.Router();
const OpenAI = require('openai');
require('dotenv').config();

const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
});

router.post('/analyze', async (req, res) => {
    try {
        const { text, tables, metadata } = req.body;

        // Prepare the content for analysis
        let content = `Please analyze this document content and provide insights:\n\n`;
        content += `TEXT CONTENT:\n${text}\n\n`;
        
        if (tables && tables.length > 0) {
            content += `TABLES:\n`;
            tables.forEach((table, index) => {
                content += `Table ${index + 1}:\n`;
                table.forEach(row => {
                    content += row.join(' | ') + '\n';
                });
                content += '\n';
            });
        }

        if (metadata) {
            content += `METADATA:\n${JSON.stringify(metadata, null, 2)}\n\n`;
        }

        content += `Please provide the following analysis:
1. Document type and purpose
2. Key information extracted
3. Suggestions or recommendations based on the content`;

        const completion = await openai.chat.completions.create({
            model: "gpt-4",
            messages: [{
                role: "system",
                content: "You are a document analysis expert. Analyze the provided document and extract key information."
            }, {
                role: "user",
                content
            }],
            temperature: 0.7,
            max_tokens: 1500
        });

        const analysis = completion.choices[0].message.content;

        // Parse the analysis into structured format
        const sections = analysis.split('\n\n');
        const response = {
            documentType: sections[0].replace(/^[0-9]+\.\s*/, '').trim(),
            keyInfo: sections[1].split('\n').filter(line => line.trim()).map(line => 
                line.replace(/^[0-9]+\.\s*/, '').trim()
            ),
            suggestions: sections[2].split('\n').filter(line => line.trim()).map(line => 
                line.replace(/^[0-9]+\.\s*/, '').trim()
            )
        };

        res.json(response);
    } catch (error) {
        console.error('Error analyzing content:', error);
        res.status(500).json({ 
            error: 'Failed to analyze content',
            details: error.message 
        });
    }
});

module.exports = router; 