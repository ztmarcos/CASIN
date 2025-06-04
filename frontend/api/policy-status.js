import { db } from '../src/config/firebase.js';
import { collection, getDocs, query, where } from 'firebase/firestore';

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
    try {
      const { policy_number } = req.query;

      if (!policy_number) {
        return res.status(400).json({
          success: false,
          error: 'policy_number is required'
        });
      }

      // Search in autos collection
      const autosRef = collection(db, 'autos');
      const autosQuery = query(autosRef, where('numero_poliza', '==', policy_number));
      const autosSnapshot = await getDocs(autosQuery);

      if (!autosSnapshot.empty) {
        const autoDoc = autosSnapshot.docs[0];
        const autoData = autoDoc.data();
        
        return res.status(200).json({
          success: true,
          policy: {
            policy_number: autoData.numero_poliza,
            client_name: autoData.nombre_contratante,
            status: 'active',
            type: 'Auto Insurance',
            premium: autoData.pago_total_o_prima_total,
            next_payment: autoData.vigencia_fin,
            coverage_details: autoData.descripcion_del_vehiculo,
            vehicle: autoData.descripcion_del_vehiculo,
            plates: autoData.placas,
            insurer: autoData.aseguradora,
            start_date: autoData.vigencia_inicio,
            end_date: autoData.vigencia_fin,
            payment_method: autoData.forma_de_pago,
            rfc: autoData.rfc,
            email: autoData.e_mail
          },
          source: 'Firebase Firestore - autos'
        });
      }

      // Search in vida collection
      const vidaRef = collection(db, 'vida');
      const vidaQuery = query(vidaRef, where('numero_poliza', '==', parseInt(policy_number)));
      const vidaSnapshot = await getDocs(vidaQuery);

      if (!vidaSnapshot.empty) {
        const vidaDoc = vidaSnapshot.docs[0];
        const vidaData = vidaDoc.data();
        
        return res.status(200).json({
          success: true,
          policy: {
            policy_number: vidaData.numero_poliza.toString(),
            client_name: vidaData.contratante,
            status: 'active',
            type: 'Life Insurance',
            premium: vidaData.importe_a_pagar_mxn,
            next_payment: vidaData.fecha_fin,
            coverage_details: vidaData.coberturas,
            plan: vidaData.tipo_de_plan,
            insurer: vidaData.aseguradora,
            start_date: vidaData.fecha_inicio,
            end_date: vidaData.fecha_fin,
            payment_method: vidaData.forma_pago,
            rfc: vidaData.rfc,
            email: vidaData.email
          },
          source: 'Firebase Firestore - vida'
        });
      }

      // Search in rc collection
      const rcRef = collection(db, 'rc');
      const rcQuery = query(rcRef, where('numero_poliza', '==', parseInt(policy_number)));
      const rcSnapshot = await getDocs(rcQuery);

      if (!rcSnapshot.empty) {
        const rcDoc = rcSnapshot.docs[0];
        const rcData = rcDoc.data();
        
        return res.status(200).json({
          success: true,
          policy: {
            policy_number: rcData.numero_poliza.toString(),
            client_name: rcData.asegurado,
            status: 'active',
            type: 'Civil Liability Insurance',
            premium: rcData.importe_total,
            next_payment: rcData.fecha_fin,
            coverage_details: `Límite máximo: ${rcData.limite_maximo_responsabilidad}`,
            insurer: rcData.aseguradora,
            start_date: rcData.fecha_inicio,
            end_date: rcData.fecha_fin,
            payment_method: rcData.forma_pago,
            email: rcData.email
          },
          source: 'Firebase Firestore - rc'
        });
      }

      // Policy not found
      res.status(404).json({
        success: false,
        error: 'Policy not found',
        policy_number: policy_number,
        message: 'No policy found with this number in any collection'
      });

    } catch (error) {
      console.error('Firebase error:', error);
      res.status(500).json({ 
        success: false,
        error: 'Failed to search policy in Firebase',
        message: error.message 
      });
    }
  } else {
    res.status(405).json({ error: 'Method not allowed' });
  }
} 
            type: 'Auto Insurance',
            premium: autoData.pago_total_o_prima_total,
            next_payment: autoData.vigencia_fin,
            coverage_details: autoData.descripcion_del_vehiculo,
            vehicle: autoData.descripcion_del_vehiculo,
            plates: autoData.placas,
            insurer: autoData.aseguradora,
            start_date: autoData.vigencia_inicio,
            end_date: autoData.vigencia_fin,
            payment_method: autoData.forma_de_pago,
            rfc: autoData.rfc,
            email: autoData.e_mail
          },
          source: 'Firebase Firestore - autos'
        });
      }

      // Search in vida collection
      const vidaRef = collection(db, 'vida');
      const vidaQuery = query(vidaRef, where('numero_poliza', '==', parseInt(policy_number)));
      const vidaSnapshot = await getDocs(vidaQuery);

      if (!vidaSnapshot.empty) {
        const vidaDoc = vidaSnapshot.docs[0];
        const vidaData = vidaDoc.data();
        
        return res.status(200).json({
          success: true,
          policy: {
            policy_number: vidaData.numero_poliza.toString(),
            client_name: vidaData.contratante,
            status: 'active',
            type: 'Life Insurance',
            premium: vidaData.importe_a_pagar_mxn,
            next_payment: vidaData.fecha_fin,
            coverage_details: vidaData.coberturas,
            plan: vidaData.tipo_de_plan,
            insurer: vidaData.aseguradora,
            start_date: vidaData.fecha_inicio,
            end_date: vidaData.fecha_fin,
            payment_method: vidaData.forma_pago,
            rfc: vidaData.rfc,
            email: vidaData.email
          },
          source: 'Firebase Firestore - vida'
        });
      }

      // Search in rc collection
      const rcRef = collection(db, 'rc');
      const rcQuery = query(rcRef, where('numero_poliza', '==', parseInt(policy_number)));
      const rcSnapshot = await getDocs(rcQuery);

      if (!rcSnapshot.empty) {
        const rcDoc = rcSnapshot.docs[0];
        const rcData = rcDoc.data();
        
        return res.status(200).json({
          success: true,
          policy: {
            policy_number: rcData.numero_poliza.toString(),
            client_name: rcData.asegurado,
            status: 'active',
            type: 'Civil Liability Insurance',
            premium: rcData.importe_total,
            next_payment: rcData.fecha_fin,
            coverage_details: `Límite máximo: ${rcData.limite_maximo_responsabilidad}`,
            insurer: rcData.aseguradora,
            start_date: rcData.fecha_inicio,
            end_date: rcData.fecha_fin,
            payment_method: rcData.forma_pago,
            email: rcData.email
          },
          source: 'Firebase Firestore - rc'
        });
      }

      // Policy not found
      res.status(404).json({
        success: false,
        error: 'Policy not found',
        policy_number: policy_number,
        message: 'No policy found with this number in any collection'
      });

    } catch (error) {
      console.error('Firebase error:', error);
      res.status(500).json({ 
        success: false,
        error: 'Failed to search policy in Firebase',
        message: error.message 
      });
    }
  } else {
    res.status(405).json({ error: 'Method not allowed' });
  }
} 