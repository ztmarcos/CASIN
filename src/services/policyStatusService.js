import axios from 'axios';
import { API_URL } from '../config/api.js';

const API_BASE_URL = API_URL;

class PolicyStatusService {
  async getStatuses() {
    try {
      const response = await axios.get(API_BASE_URL);
      return response.data;
    } catch (error) {
      console.error('Error fetching policy statuses:', error);
      throw error;
    }
  }

  async updateStatus(policyKey, status) {
    try {
      const response = await axios.post(API_BASE_URL, {
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