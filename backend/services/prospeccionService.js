const mysqlDatabase = require('./mysqlDatabase');
const OpenAI = require('openai');
require('dotenv').config({ path: '../../.env' });

console.log('Prospeccion Service - Environment variables:', Object.keys(process.env));
console.log('Prospeccion Service - VITE_OPENAI_API_KEY exists:', !!process.env.VITE_OPENAI_API_KEY);

const openai = new OpenAI({
  apiKey: process.env.VITE_OPENAI_API_KEY
});

class ProspeccionService {
  async getCards(userId) {
    const connection = await mysqlDatabase.getConnection();
    try {
      const [rows] = await connection.execute(
        `SELECT * FROM prospeccion_cards 
         WHERE user_id = ? AND status = 'active'
         ORDER BY created_at DESC`,
        [userId]
      );
      return rows;
    } finally {
      await connection.end();
    }
  }

  async createCard(userId, title) {
    const connection = await mysqlDatabase.getConnection();
    try {
      const [result] = await connection.execute(
        `INSERT INTO prospeccion_cards (title, user_id)
         VALUES (?, ?)`,
        [title, userId]
      );
      return { id: result.insertId, title, user_id: userId };
    } finally {
      await connection.end();
    }
  }

  async updateCard(cardId, userId, data) {
    console.log('Updating card:', { cardId, userId, data });
    const connection = await mysqlDatabase.getConnection();
    try {
      const [result] = await connection.execute(
        `UPDATE prospeccion_cards 
         SET title = ?, content = ?, updated_at = CURRENT_TIMESTAMP
         WHERE id = ? AND user_id = ?`,
        [data.title, data.content, cardId, userId]
      );
      console.log('Update result:', result);
      if (result.affectedRows === 0) {
        throw new Error('Card not found or unauthorized');
      }
      // Return the full updated card
      const [updatedCard] = await connection.execute(
        `SELECT * FROM prospeccion_cards WHERE id = ?`,
        [cardId]
      );
      return updatedCard[0];
    } catch (error) {
      console.error('Error updating card:', error);
      throw error;
    } finally {
      await connection.end();
    }
  }

  async deleteCard(cardId, userId) {
    const connection = await mysqlDatabase.getConnection();
    try {
      const [result] = await connection.execute(
        `UPDATE prospeccion_cards 
         SET status = 'deleted', updated_at = CURRENT_TIMESTAMP
         WHERE id = ? AND user_id = ?`,
        [cardId, userId]
      );
      if (result.affectedRows === 0) {
        throw new Error('Card not found or unauthorized');
      }
      return { id: cardId, status: 'deleted' };
    } finally {
      await connection.end();
    }
  }

  async analyzeWithGPT(cardId, userId) {
    const connection = await mysqlDatabase.getConnection();
    try {
      // First get the card content
      const [cards] = await connection.execute(
        `SELECT content FROM prospeccion_cards 
         WHERE id = ? AND user_id = ?`,
        [cardId, userId]
      );
      
      if (!cards[0]) {
        throw new Error('Card not found');
      }

      // Analyze with GPT
      const completion = await openai.chat.completions.create({
        messages: [
          {
            role: "system",
            content: `Analiza la siguiente nota de prospección y proporciona insights:
            
            Por favor proporciona:
            1. Puntos clave
            2. Oportunidades potenciales
            3. Pasos siguientes recomendados
            4. Factores de riesgo`
          },
          {
            role: "user",
            content: cards[0].content
          }
        ],
        model: "gpt-4o-mini",
      });

      const analysis = completion.choices[0].message.content;

      // Save the analysis
      const [result] = await connection.execute(
        `UPDATE prospeccion_cards 
         SET gpt_analysis = ?, updated_at = CURRENT_TIMESTAMP
         WHERE id = ? AND user_id = ?`,
        [analysis, cardId, userId]
      );

      if (result.affectedRows === 0) {
        throw new Error('Failed to save analysis');
      }

      return { id: cardId, analysis };
    } catch (error) {
      console.error('GPT Analysis error:', error);
      throw new Error('Failed to analyze with GPT: ' + error.message);
    } finally {
      await connection.end();
    }
  }
}

module.exports = new ProspeccionService(); 