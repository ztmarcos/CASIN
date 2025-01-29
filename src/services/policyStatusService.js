import axios from 'axios';

const API_URL = 'http://localhost:3001/api/policy-status';

class PolicyStatusService {
  async getStatuses() {
    try {
      const response = await axios.get(API_URL);
      return response.data;
    } catch (error) {
      console.error('Error fetching policy statuses:', error);
      throw error;
    }
  }

  async updateStatus(policyKey, status) {
    try {
      const response = await axios.post(API_URL, {
        policyKey,
        status
      });
      return response.data;
    } catch (error) {
      console.error('Error updating policy status:', error);
      throw error;
    }
  }
}

export default new PolicyStatusService(); 