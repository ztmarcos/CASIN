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
    const today = new Date();
    const currentMonth = today.getMonth() + 1;
    const currentDay = today.getDate();

    const birthdays = [
      {
        id: 1,
        client_name: 'Ana Jiménez',
        birthday: '1985-12-15',
        age: 38,
        policy_type: 'Auto',
        phone: '555-0123',
        days_until_birthday: calculateDaysUntil(12, 15)
      },
      {
        id: 2,
        client_name: 'Miguel Torres',
        birthday: '1992-12-20',
        age: 31,
        policy_type: 'GMM',
        phone: '555-0456',
        days_until_birthday: calculateDaysUntil(12, 20)
      },
      {
        id: 3,
        client_name: 'Sofia Herrera',
        birthday: '1978-12-25',
        age: 45,
        policy_type: 'Life',
        phone: '555-0789',
        days_until_birthday: calculateDaysUntil(12, 25)
      }
    ];

    // Function to calculate days until birthday
    function calculateDaysUntil(month, day) {
      const today = new Date();
      const thisYear = today.getFullYear();
      let birthday = new Date(thisYear, month - 1, day);
      
      if (birthday < today) {
        birthday = new Date(thisYear + 1, month - 1, day);
      }
      
      const diffTime = birthday - today;
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      return diffDays;
    }

    res.status(200).json({ 
      success: true,
      data: birthdays,
      total_records: birthdays.length,
      timestamp: new Date().toISOString()
    });
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
    const today = new Date();
    const currentMonth = today.getMonth() + 1;
    const currentDay = today.getDate();

    const birthdays = [
      {
        id: 1,
        client_name: 'Ana Jiménez',
        birthday: '1985-12-15',
        age: 38,
        policy_type: 'Auto',
        phone: '555-0123',
        days_until_birthday: calculateDaysUntil(12, 15)
      },
      {
        id: 2,
        client_name: 'Miguel Torres',
        birthday: '1992-12-20',
        age: 31,
        policy_type: 'GMM',
        phone: '555-0456',
        days_until_birthday: calculateDaysUntil(12, 20)
      },
      {
        id: 3,
        client_name: 'Sofia Herrera',
        birthday: '1978-12-25',
        age: 45,
        policy_type: 'Life',
        phone: '555-0789',
        days_until_birthday: calculateDaysUntil(12, 25)
      }
    ];

    // Function to calculate days until birthday
    function calculateDaysUntil(month, day) {
      const today = new Date();
      const thisYear = today.getFullYear();
      let birthday = new Date(thisYear, month - 1, day);
      
      if (birthday < today) {
        birthday = new Date(thisYear + 1, month - 1, day);
      }
      
      const diffTime = birthday - today;
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      return diffDays;
    }

    res.status(200).json({ 
      success: true,
      data: birthdays,
      total_records: birthdays.length,
      timestamp: new Date().toISOString()
    });
  } else {
    res.status(405).json({ error: 'Method not allowed' });
  }
} 