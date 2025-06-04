export default async function handler(req, res) {
  // Handle CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method === 'GET') {
    const { policy_number } = req.query;

    // Mock policy database
    const policies = {
      'AUTO-2024-001': {
        policy_number: 'AUTO-2024-001',
        client_name: 'Juan Pérez',
        status: 'active',
        type: 'Auto Insurance',
        premium: 1200,
        next_payment: '2024-01-15',
        coverage_details: 'Full Coverage including collision and comprehensive'
      },
      'GMM-2024-001': {
        policy_number: 'GMM-2024-001',
        client_name: 'Roberto Silva',
        status: 'active',
        type: 'Medical Insurance',
        premium: 3500,
        next_payment: '2024-01-10',
        coverage_details: 'Premium medical plan with worldwide coverage'
      },
      'LIFE-2024-001': {
        policy_number: 'LIFE-2024-001',
        client_name: 'María González',
        status: 'pending',
        type: 'Life Insurance',
        premium: 2400,
        next_payment: '2024-01-20',
        coverage_details: 'Term life insurance with accidental death benefit'
      }
    };

    if (policy_number) {
      const policy = policies[policy_number];
      if (policy) {
        res.status(200).json({ 
          success: true,
          data: policy,
          timestamp: new Date().toISOString()
        });
      } else {
        res.status(404).json({ 
          success: false,
          error: 'Policy not found',
          timestamp: new Date().toISOString()
        });
      }
    } else {
      // Return all policies if no specific policy number requested
      res.status(200).json({ 
        success: true,
        data: Object.values(policies),
        total_records: Object.keys(policies).length,
        timestamp: new Date().toISOString()
      });
    }
  } else {
    res.status(405).json({ error: 'Method not allowed' });
  }
} 
  // Handle CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method === 'GET') {
    const { policy_number } = req.query;

    // Mock policy database
    const policies = {
      'AUTO-2024-001': {
        policy_number: 'AUTO-2024-001',
        client_name: 'Juan Pérez',
        status: 'active',
        type: 'Auto Insurance',
        premium: 1200,
        next_payment: '2024-01-15',
        coverage_details: 'Full Coverage including collision and comprehensive'
      },
      'GMM-2024-001': {
        policy_number: 'GMM-2024-001',
        client_name: 'Roberto Silva',
        status: 'active',
        type: 'Medical Insurance',
        premium: 3500,
        next_payment: '2024-01-10',
        coverage_details: 'Premium medical plan with worldwide coverage'
      },
      'LIFE-2024-001': {
        policy_number: 'LIFE-2024-001',
        client_name: 'María González',
        status: 'pending',
        type: 'Life Insurance',
        premium: 2400,
        next_payment: '2024-01-20',
        coverage_details: 'Term life insurance with accidental death benefit'
      }
    };

    if (policy_number) {
      const policy = policies[policy_number];
      if (policy) {
        res.status(200).json({ 
          success: true,
          data: policy,
          timestamp: new Date().toISOString()
        });
      } else {
        res.status(404).json({ 
          success: false,
          error: 'Policy not found',
          timestamp: new Date().toISOString()
        });
      }
    } else {
      // Return all policies if no specific policy number requested
      res.status(200).json({ 
        success: true,
        data: Object.values(policies),
        total_records: Object.keys(policies).length,
        timestamp: new Date().toISOString()
      });
    }
  } else {
    res.status(405).json({ error: 'Method not allowed' });
  }
} 