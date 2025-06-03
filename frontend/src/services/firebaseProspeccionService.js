import firebaseService from './firebaseService';

class FirebaseProspeccionService {
  constructor() {
    this.firebaseService = firebaseService;
    this.collectionName = 'prospeccion_cards';
  }

  /**
   * Load cards for a specific user from Firebase
   */
  async loadCards(userId) {
    try {
      console.log(`📋 Loading prospeccion cards for user: ${userId}`);
      
      // Get all cards for this user
      const cards = await this.firebaseService.getAllDocuments(this.collectionName);
      
      // Filter by userId and sort by creation date
      const userCards = cards
        .filter(card => card.userId === userId)
        .sort((a, b) => {
          const dateA = new Date(a.created_at || 0);
          const dateB = new Date(b.created_at || 0);
          return dateB - dateA; // Most recent first
        });
      
      console.log(`✅ Found ${userCards.length} prospeccion cards for user: ${userId}`);
      return userCards;
      
    } catch (error) {
      console.error(`❌ Error loading prospeccion cards for user ${userId}:`, error);
      throw error;
    }
  }

  /**
   * Create a new card for a user
   */
  async createCard(userId, title = '') {
    try {
      console.log(`➕ Creating new prospeccion card for user: ${userId}`);
      
      const newCard = {
        userId: userId,
        title: title || `Tarjeta ${Date.now()}`,
        content: '',
        gpt_analysis: '',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };
      
      const cardId = await this.firebaseService.createDocument(this.collectionName, newCard);
      
      const createdCard = {
        id: cardId,
        ...newCard
      };
      
      console.log(`✅ Created prospeccion card with ID: ${cardId}`);
      return createdCard;
      
    } catch (error) {
      console.error(`❌ Error creating prospeccion card for user ${userId}:`, error);
      throw error;
    }
  }

  /**
   * Update a card (title and/or content)
   */
  async updateCard(userId, cardId, updates) {
    try {
      console.log(`✏️ Updating prospeccion card ${cardId} for user: ${userId}`);
      
      // Prepare update data
      const updateData = {
        ...updates,
        updated_at: new Date().toISOString()
      };
      
      // Remove any undefined values
      Object.keys(updateData).forEach(key => {
        if (updateData[key] === undefined) {
          delete updateData[key];
        }
      });
      
      await this.firebaseService.updateDocument(this.collectionName, cardId, updateData);
      
      console.log(`✅ Updated prospeccion card ${cardId}`);
      
      // Return updated card data
      const updatedCard = await this.firebaseService.getDocument(this.collectionName, cardId);
      return updatedCard;
      
    } catch (error) {
      console.error(`❌ Error updating prospeccion card ${cardId}:`, error);
      throw error;
    }
  }

  /**
   * Delete a card
   */
  async deleteCard(userId, cardId) {
    try {
      console.log(`🗑️ Deleting prospeccion card ${cardId} for user: ${userId}`);
      
      await this.firebaseService.deleteDocument(this.collectionName, cardId);
      
      console.log(`✅ Deleted prospeccion card ${cardId}`);
      return { success: true };
      
    } catch (error) {
      console.error(`❌ Error deleting prospeccion card ${cardId}:`, error);
      throw error;
    }
  }

  /**
   * Add GPT analysis to a card
   */
  async addAnalysisToCard(userId, cardId, analysis) {
    try {
      console.log(`🤖 Adding GPT analysis to card ${cardId} for user: ${userId}`);
      
      const updateData = {
        gpt_analysis: analysis,
        analyzed_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };
      
      await this.firebaseService.updateDocument(this.collectionName, cardId, updateData);
      
      console.log(`✅ Added GPT analysis to card ${cardId}`);
      
      // Return updated card
      const updatedCard = await this.firebaseService.getDocument(this.collectionName, cardId);
      return { success: true, analysis: analysis, card: updatedCard };
      
    } catch (error) {
      console.error(`❌ Error adding analysis to card ${cardId}:`, error);
      throw error;
    }
  }

  /**
   * Get cards with pagination
   */
  async getCardsPaginated(userId, limit = 50, startAfter = null) {
    try {
      console.log(`📄 Getting paginated cards for user: ${userId}`);
      
      // For now, use the simple approach since we don't expect too many cards per user
      const allCards = await this.loadCards(userId);
      
      // Simple pagination logic
      const startIndex = startAfter ? allCards.findIndex(card => card.id === startAfter) + 1 : 0;
      const endIndex = startIndex + limit;
      
      const paginatedCards = allCards.slice(startIndex, endIndex);
      
      return {
        cards: paginatedCards,
        hasMore: endIndex < allCards.length,
        nextCursor: paginatedCards.length > 0 ? paginatedCards[paginatedCards.length - 1].id : null
      };
      
    } catch (error) {
      console.error(`❌ Error getting paginated cards for user ${userId}:`, error);
      throw error;
    }
  }

  /**
   * Search cards by content or title
   */
  async searchCards(userId, searchTerm) {
    try {
      console.log(`🔍 Searching cards for user ${userId} with term: "${searchTerm}"`);
      
      const allCards = await this.loadCards(userId);
      
      if (!searchTerm || searchTerm.trim() === '') {
        return allCards;
      }
      
      const lowerSearchTerm = searchTerm.toLowerCase();
      
      const filteredCards = allCards.filter(card => {
        const titleMatch = card.title && card.title.toLowerCase().includes(lowerSearchTerm);
        const contentMatch = card.content && card.content.toLowerCase().includes(lowerSearchTerm);
        const analysisMatch = card.gpt_analysis && card.gpt_analysis.toLowerCase().includes(lowerSearchTerm);
        
        return titleMatch || contentMatch || analysisMatch;
      });
      
      console.log(`✅ Found ${filteredCards.length} cards matching search term`);
      return filteredCards;
      
    } catch (error) {
      console.error(`❌ Error searching cards for user ${userId}:`, error);
      throw error;
    }
  }

  /**
   * Get statistics for user's cards
   */
  async getCardStatistics(userId) {
    try {
      const cards = await this.loadCards(userId);
      
      const stats = {
        totalCards: cards.length,
        cardsWithContent: cards.filter(card => card.content && card.content.trim() !== '').length,
        cardsWithAnalysis: cards.filter(card => card.gpt_analysis && card.gpt_analysis.trim() !== '').length,
        averageContentLength: 0,
        lastUpdated: null
      };
      
      if (cards.length > 0) {
        const contentLengths = cards
          .filter(card => card.content)
          .map(card => card.content.length);
          
        stats.averageContentLength = contentLengths.length > 0 
          ? Math.round(contentLengths.reduce((sum, len) => sum + len, 0) / contentLengths.length)
          : 0;
          
        // Find most recent update
        const sortedByUpdate = cards
          .filter(card => card.updated_at)
          .sort((a, b) => new Date(b.updated_at) - new Date(a.updated_at));
          
        stats.lastUpdated = sortedByUpdate.length > 0 ? sortedByUpdate[0].updated_at : null;
      }
      
      return stats;
    } catch (error) {
      console.error(`❌ Error getting card statistics for user ${userId}:`, error);
      throw error;
    }
  }
}

// Create and export singleton instance
const firebaseProspeccionService = new FirebaseProspeccionService();
export default firebaseProspeccionService; 