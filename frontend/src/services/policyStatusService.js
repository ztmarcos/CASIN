import axios from 'axios';
import { API_URL } from '../config/api.js';

const POLICY_STATUS_ENDPOINT = `${API_URL}/policy-status`;

class PolicyStatusService {
  async getStatuses() {
    try {
      const response = await axios.get(POLICY_STATUS_ENDPOINT);
      return response.data;
    } catch (error) {
      console.error('Error fetching policy statuses:', error);
      throw error;
    }
  }

  async updateStatus(policyKey, status) {
    try {
      const response = await axios.post(POLICY_STATUS_ENDPOINT, {
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