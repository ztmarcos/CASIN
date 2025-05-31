const fs = require('fs');
const path = require('path');

// For now, we'll use a mock implementation
// To use real OpenAI API, install openai package and add API key to .env
// npm install openai
// Add OPENAI_API_KEY=your_key_here to .env

class OpenAIService {
  constructor() {
    this.apiKey = process.env.OPENAI_API_KEY;
    this.model = 'gpt-4o-mini';
    
    // Load CRM Guide once at startup
    this.crmGuide = this.loadCRMGuide();
  }

  loadCRMGuide() {
    try {
      const guidePath = path.join(__dirname, '../../CRM_Navigation_Guide.md');
      return fs.readFileSync(guidePath, 'utf8');
    } catch (error) {
      console.error('Error reading CRM Navigation Guide:', error);
      return 'Error: No se pudo cargar la guía de navegación del CRM.';
    }
  }

  getSystemPrompt() {
    return `Eres un asistente de soporte especializado para el CRM CASIN Seguros. Tu única función es ayudar a los usuarios con preguntas sobre navegación, funcionalidades y uso del sistema CRM basándote ÚNICAMENTE en la siguiente documentación:

${this.crmGuide}

INSTRUCCIONES IMPORTANTES:
1. SOLO responde preguntas relacionadas con el CRM CASIN Seguros y su navegación
2. Basa todas tus respuestas ÚNICAMENTE en la información proporcionada en la documentación
3. Si te preguntan algo que NO está en la documentación, responde que no tienes esa información específica pero ofrece ayuda con lo que sí sabes
4. Si te preguntan sobre temas no relacionados con el CRM, redirige amablemente la conversación al soporte del CRM
5. Sé conciso pero completo en tus respuestas
6. Usa un tono amigable y profesional
7. Siempre ofrece ayuda adicional al final de tus respuestas
8. Incluye referencias específicas a secciones del CRM cuando sea relevante (ej: "En el módulo de Directorio...")
9. Usa formato markdown para mejorar la legibilidad (negritas, listas, etc.)

Ejemplos de respuestas apropiadas:
- Explicar cómo navegar a diferentes módulos
- Describir funcionalidades específicas
- Ayudar con problemas de navegación
- Explicar cómo usar filtros y búsquedas
- Resolver problemas comunes

NO respondas preguntas sobre:
- Temas no relacionados con el CRM
- Información técnica no incluida en la documentación
- Configuraciones de servidor o base de datos
- Otros sistemas o software

Responde siempre en español y mantén un tono profesional pero cercano.`;
  }

  async generateResponse(messages) {
    // If OpenAI API key is available, use real API
    if (this.apiKey) {
      return await this.callOpenAI(messages);
    } else {
      // Use mock responses for development
      return await this.mockResponse(messages);
    }
  }

  async callOpenAI(messages) {
    try {
      // Uncomment this when you have OpenAI package installed and API key
      /*
      const { OpenAI } = require('openai');
      const openai = new OpenAI({
        apiKey: this.apiKey,
      });

      const completion = await openai.chat.completions.create({
        model: this.model,
        messages: [
          {
            role: 'system',
            content: this.getSystemPrompt()
          },
          ...messages
        ],
        max_tokens: 1000,
        temperature: 0.7,
      });

      return completion.choices[0].message.content;
      */
      
      // Fallback to mock for now
      return await this.mockResponse(messages);
    } catch (error) {
      console.error('Error calling OpenAI API:', error);
      throw new Error('Error al procesar la solicitud con OpenAI');
    }
  }

  analyzeConversationContext(messages) {
    const context = {
      previousTopics: [],
      userQuestions: [],
      assistantResponses: [],
      currentTopic: null,
      isFollowUp: false,
      needsMoreDetail: false
    };

    // Analyze last 6 messages for context
    const recentMessages = messages.slice(-6);
    
    for (let i = 0; i < recentMessages.length; i++) {
      const msg = recentMessages[i];
      const content = msg.content.toLowerCase();
      
      if (msg.role === 'user') {
        context.userQuestions.push(content);
        
        // Detect topics mentioned
        if (content.includes('directorio')) context.previousTopics.push('directorio');
        if (content.includes('filtro') || content.includes('buscar')) context.previousTopics.push('filtros');
        if (content.includes('póliza') || content.includes('poliza')) context.previousTopics.push('polizas');
        if (content.includes('paginación')) context.previousTopics.push('paginacion');
        if (content.includes('dashboard')) context.previousTopics.push('dashboard');
        if (content.includes('problema') || content.includes('error')) context.previousTopics.push('problemas');
        
        // Detect follow-up questions
        if (content.includes('cómo') || content.includes('como') || 
            content.includes('más') || content.includes('mas') ||
            content.includes('también') || content.includes('tambien') ||
            content.includes('además') || content.includes('ademas') ||
            content.includes('y si') || content.includes('pero') ||
            content.includes('entonces') || content.includes('ahora') ||
            content.includes('después') || content.includes('despues') ||
            content.includes('siguiente') || content.includes('otra') ||
            content.includes('otro') || content.includes('vista') ||
            content.includes('funciona')) {
          context.isFollowUp = true;
        }
        
        // Detect need for more detail
        if (content.includes('explica') || content.includes('detalle') ||
            content.includes('específico') || content.includes('especifico') ||
            content.includes('ejemplo')) {
          context.needsMoreDetail = true;
        }
      } else {
        context.assistantResponses.push(content);
      }
    }
    
    // Determine current topic (prioritize main topics over problems)
    if (context.previousTopics.length > 0) {
      // Filter out 'problemas' to prioritize main topics
      const mainTopics = context.previousTopics.filter(topic => topic !== 'problemas');
      if (mainTopics.length > 0) {
        context.currentTopic = mainTopics[mainTopics.length - 1];
      } else {
        context.currentTopic = context.previousTopics[context.previousTopics.length - 1];
      }
    }
    
    return context;
  }

  async mockResponse(messages) {
    const userMessage = messages[messages.length - 1].content.toLowerCase();
    
    // Analyze conversation context for better reasoning
    const conversationContext = this.analyzeConversationContext(messages);
    
    // Enhanced keyword-based responses with context awareness
    if (userMessage.includes('directorio') || 
        (conversationContext.previousTopics.includes('directorio') && 
         (userMessage.includes('vista') || userMessage.includes('tarjeta') || userMessage.includes('tabla')))) {
      let response = '';
      
      if (conversationContext.isFollowUp && conversationContext.previousTopics.includes('directorio')) {
        // This is a follow-up question about Directorio
        if (userMessage.includes('vista') || userMessage.includes('tarjeta') || userMessage.includes('tabla')) {
          response = `Perfecto, veo que quieres profundizar en las **vistas del Directorio**. Te explico cada una en detalle:

**📋 Vista de Tarjetas:**
- Ideal para navegación visual rápida
- Muestra foto, nombre, teléfono y estado
- Botones de acción directos (editar, eliminar, ver pólizas)
- Responsive design para móviles

**📊 Vista de Tabla:**
- Información completa en formato tabular
- Ordenamiento por cualquier columna
- Paginación avanzada (25, 50, 100, 200 registros)
- Filtros aplicables en tiempo real
- Exportación de datos

**🔗 Vista de Relaciones:**
- Análisis visual de conexiones
- Mapeo de clientes con múltiples pólizas
- Identificación de patrones de negocio

¿Te interesa alguna vista en particular o tienes alguna duda específica sobre su uso?`;
        } else if (userMessage.includes('filtro') || userMessage.includes('buscar')) {
          response = `Como ya hemos hablado del Directorio, te explico específicamente los **filtros avanzados**:

**Filtros Inteligentes:**
• **Búsqueda Global**: Busca en nombre, email, teléfono simultáneamente
• **Filtro por Estado**: Cliente/Prospecto con contadores en tiempo real
• **Filtro por Origen**: Fuente de adquisición del contacto
• **Filtro por Género**: Segmentación demográfica

**Stats Cards como Filtros:**
- Cada contador es clickeable y funciona como filtro rápido
- Se actualizan automáticamente al aplicar otros filtros
- Combinables entre sí para búsquedas precisas

**Consejos avanzados:**
1. Usa Ctrl+F para búsqueda rápida en la página actual
2. Los filtros se mantienen al cambiar de vista
3. Presiona "Esc" para limpiar todos los filtros

¿Hay algún tipo de filtro específico que necesitas usar?`;
        } else {
          response = `Veo que sigues interesado en el **Directorio**. Como ya hemos hablado de él, ¿hay algún aspecto específico que te gustaría profundizar?

**Temas que podemos explorar:**
• Gestión avanzada de contactos
• Integración con pólizas
• Flujo de trabajo Cliente/Prospecto
• Exportación e importación de datos
• Configuración de campos personalizados

¿Cuál de estos temas te interesa más o tienes alguna pregunta específica sobre el Directorio?`;
        }
      } else {
        // First time asking about Directorio
        response = `El módulo de **Directorio** (/directorio) es una de las funcionalidades más completas del CRM. Te permite gestionar contactos y clientes con tres vistas diferentes:

**📋 Vista de Tarjetas**: Visualización en tarjetas con información resumida
**📊 Vista de Tabla**: Tabla completa con paginación avanzada (25, 50, 100, 200 registros)
**🔗 Vista de Relaciones**: Análisis de relaciones entre contactos y pólizas

**Funcionalidades principales:**
• Búsqueda por nombre, email, teléfono
• Filtros por estado (Cliente/Prospecto), origen y género
• Stats cards clickeables que funcionan como filtros rápidos
• Gestión completa: crear, editar, eliminar contactos
• Ver pólizas de clientes (botón 📋)

¿Te gustaría que te explique alguna funcionalidad específica del Directorio?`;
      }
      
      return response;
    }
    
    if (userMessage.includes('filtro') || userMessage.includes('buscar')) {
      let response = '';
      
      if (conversationContext.previousTopics.includes('directorio')) {
        // User already knows about Directorio, focus on advanced filtering
        response = `Perfecto, como ya conoces el Directorio, te explico las **técnicas avanzadas de filtrado**:

**Filtrado Combinado:**
• Combina búsqueda de texto + filtros de estado + origen
• Los filtros se aplican en tiempo real sin recargar
• Cada filtro reduce progresivamente los resultados

**Filtros Inteligentes por Contexto:**
• **Para Ventas**: Filtra "Prospectos" + origen específico
• **Para Renovaciones**: Filtra "Clientes" + ver pólizas próximas a vencer
• **Para Marketing**: Usa filtros demográficos (género, origen)

**Shortcuts de Productividad:**
- **Ctrl+F**: Búsqueda rápida en página actual
- **Esc**: Limpia todos los filtros activos
- **Enter**: Confirma búsqueda en campo de texto
- **Click en Stats**: Filtro rápido por categoría

**Casos de Uso Avanzados:**
1. Buscar clientes sin pólizas activas
2. Identificar prospectos de fuente específica
3. Segmentar por demografía para campañas

¿Hay algún escenario específico de filtrado que necesitas implementar?`;
      } else {
        // General filtering information
        response = `El CRM ofrece múltiples opciones de **filtrado y búsqueda**:

**En el módulo de Directorio:**
• **Búsqueda General**: Por nombre, email, teléfono
• **Filtros por Estado**: Cliente, Prospecto, Todos
• **Filtros por Origen**: Fuente de adquisición
• **Filtros por Género**: Masculino, Femenino, Otros
• **Stats Cards Clickeables**: Los contadores funcionan como filtros rápidos

**Consejos para filtrar eficientemente:**
1. Usa las stats cards para filtros rápidos
2. Combina búsqueda con filtros para resultados precisos
3. Presiona "Esc" para limpiar filtros
4. Usa "Enter" para confirmar búsquedas

¿Necesitas ayuda con algún filtro específico?`;
      }
      
      return response;
    }
    
    if (userMessage.includes('póliza') || userMessage.includes('poliza')) {
      return `Para **ver las pólizas de un cliente** en el Directorio:

**Paso a paso:**
1. Ve al módulo **Directorio** (/directorio)
2. Busca el cliente (solo aparece para contactos con estado "Cliente")
3. Haz clic en el botón **📋** (Ver Pólizas)

**El modal de pólizas incluye:**
• **Nube de Texto**: Visualización de tipos de pólizas con colores
• **Tarjetas Detalladas** con información completa:
  - Número de póliza
  - Aseguradora
  - Fechas de vigencia
  - Montos (prima neta, total)
  - Forma de pago
  - RFC y tipo de póliza

**Nota importante**: El botón de pólizas solo aparece para contactos con estado "Cliente", no para prospectos.

¿Te gustaría saber más sobre alguna funcionalidad específica?`;
    }
    
    if (userMessage.includes('paginación') || userMessage.includes('página')) {
      return `La **paginación avanzada** del CRM incluye múltiples controles:

**Controles de Navegación:**
• **⏮️ Primera** / **⏭️ Última**: Ir al inicio/final
• **⬅️ Anterior** / **➡️ Siguiente**: Navegación secuencial
• **Números de página**: Con elipsis para rangos grandes

**Opciones de visualización:**
• **Items por página**: 25, 50, 100, 200 registros
• **Salto directo**: Campo para ir a página específica
• **Información de estado**: "Mostrando X-Y de Z contactos"

**Consejos:**
- Reduce items por página si la carga es lenta
- Usa salto directo para páginas específicas
- La paginación se mantiene al cambiar filtros

¿Necesitas ayuda con algún aspecto específico de la navegación?`;
    }
    
    if (userMessage.includes('problema') || userMessage.includes('error') || userMessage.includes('no aparece')) {
      let response = '';
      
      if (conversationContext.previousTopics.length > 0) {
        const lastTopic = conversationContext.currentTopic;
        response = `Entiendo que tienes un problema relacionado con **${lastTopic}**. Te ayudo con soluciones específicas:

**Problemas específicos en ${lastTopic}:**\n`;
        
        switch (lastTopic) {
          case 'directorio':
            response += `• **Contactos no aparecen**: Verifica filtros activos, especialmente estado Cliente/Prospecto
• **Búsqueda no funciona**: Limpia filtros con "Esc" y reintenta
• **Pólizas no se muestran**: Solo aparecen para contactos con estado "Cliente"
• **Vista lenta**: Reduce items por página (25 en lugar de 200)
• **Datos desactualizados**: Refrescar página (Ctrl+R)`;
            break;
          case 'filtros':
            response += `• **Filtros no responden**: Verificar que no hay conflictos entre filtros
• **Búsqueda sin resultados**: Revisar ortografía y filtros activos
• **Stats cards incorrectas**: Refrescar página para actualizar contadores
• **Filtros se resetean**: Normal al cambiar de vista, es comportamiento esperado`;
            break;
          case 'polizas':
            response += `• **Modal no abre**: Verificar que el contacto sea "Cliente", no "Prospecto"
• **Pólizas no cargan**: Problema de conexión, refrescar página
• **Información incompleta**: Datos pueden estar en proceso de sincronización
• **Botón no aparece**: Solo visible para contactos con estado "Cliente"`;
            break;
          default:
            response += `• **Datos no aparecen**: Refrescar página y verificar filtros
• **Funcionalidad lenta**: Reducir carga de datos
• **Errores de conexión**: Verificar internet y recargar`;
        }
        
        response += `\n\n**Solución rápida recomendada:**
1. Presiona **Ctrl+R** para refrescar
2. Si persiste, presiona **Esc** para limpiar filtros
3. Si aún hay problemas, describe exactamente qué intentas hacer

¿El problema persiste después de estos pasos?`;
      } else {
        response = `Para **problemas comunes** en el CRM, sigue estos pasos:

**Si no aparecen datos:**
1. **Refrescar página** (Ctrl + R) como primer paso
2. **Verificar filtros activos** - pueden estar ocultando resultados
3. **Limpiar filtros** y recargar página
4. **Verificar conexión** a internet

**Si la navegación es lenta:**
1. Reducir items por página en tablas grandes
2. Cerrar pestañas innecesarias del navegador
3. Refrescar página periódicamente

**Si los gráficos no aparecen:**
1. Verificar que JavaScript esté habilitado
2. Refrescar la página
3. Ajustar zoom del navegador al 100%

**Escalación:**
Si el problema persiste, contacta al equipo técnico con:
- URL específica del problema
- Pasos para reproducir
- Navegador y versión

¿Puedes describir más específicamente qué problema estás experimentando?`;
      }
      
      return response;
    }
    
    if (userMessage.includes('dashboard') || userMessage.includes('inicio')) {
      return `El **Dashboard** (/) es el panel principal del CRM con widgets informativos:

**Widgets disponibles:**
• **🌤️ Clima**: Widget meteorológico en tiempo real
• **🎂 Cumpleaños de la Semana**: Próximos cumpleaños de clientes
• **📅 Vencimientos del Mes**: Pólizas que vencen este mes
• **📊 Actividad Reciente**: Log de acciones del sistema

**Navegación al Dashboard:**
- Hacer clic en el **logo CASIN Seguros**
- Hacer clic en el **icono de casa** (🏠) en el menú
- Ir directamente a la URL base (/)

**Características:**
- Vista ejecutiva con métricas importantes
- Información actualizada en tiempo real
- Enlaces rápidos a funcionalidades relacionadas

¿Te gustaría conocer más sobre algún widget específico del Dashboard?`;
    }

    if (userMessage.includes('reportes') || userMessage.includes('reporte')) {
      return `El módulo de **Reportes** (/reports) ofrece análisis y reportería avanzada:

**Características principales:**
• **Reportes de Vencimientos**: Análisis temporal de vencimientos de pólizas
• **Gráficos de Distribución**: Visualización por ramos y aseguradoras
• **Análisis Matricial**: Distribución cruzada de datos
• **Filtros Temporales**: 4 meses, 6 meses, año completo

**Tipos de gráficos disponibles:**
- Barras por período
- Distribución por ramo
- Análisis por aseguradora
- Tendencias temporales

**Funcionalidades:**
- Exportación de reportes en diferentes formatos
- Filtros interactivos
- Visualización en tiempo real

¿Te interesa algún tipo de reporte específico?`;
    }

    if (userMessage.includes('data') || userMessage.includes('datos')) {
      return `El módulo de **Data** (/data) es el centro de gestión de datos del CRM:

**Funcionalidades principales:**
• **Vista de Tablas**: Listado de todas las tablas disponibles
• **Gestión de Datos**: CRUD completo para registros
• **Importación/Exportación**: Herramientas para manejo masivo de datos
• **Vista de Tarjetas**: Visualización alternativa de datos
• **Filtros Avanzados**: Búsqueda y filtrado por múltiples criterios

**Vistas disponibles:**
- Vista de tabla tradicional
- Vista de tarjetas (cards)
- Vista de importación
- Gestión de columnas

**Consejos:**
- Usa filtros para reducir la carga de datos
- Aprovecha la vista de tarjetas para navegación visual
- Siempre haz backup antes de operaciones masivas

¿Necesitas ayuda con alguna funcionalidad específica de gestión de datos?`;
    }
    
    // Intelligent default response based on conversation context
    let contextualResponse = '';
    
    if (conversationContext.previousTopics.length > 0) {
      const lastTopic = conversationContext.currentTopic;
      contextualResponse = `Veo que hemos estado hablando sobre **${lastTopic}**. `;
      
      if (conversationContext.isFollowUp) {
        contextualResponse += `¿Hay algo más específico sobre este tema que te gustaría saber? `;
      }
      
      if (conversationContext.needsMoreDetail) {
        contextualResponse += `Puedo darte más detalles y ejemplos prácticos. `;
      }
      
      contextualResponse += `\n\n**Temas relacionados que podrían interesarte:**\n`;
      
      switch (lastTopic) {
        case 'directorio':
          contextualResponse += `• Integración con pólizas\n• Flujos de trabajo avanzados\n• Exportación de datos\n• Configuración de campos`;
          break;
        case 'filtros':
          contextualResponse += `• Búsquedas avanzadas\n• Automatización de filtros\n• Reportes personalizados\n• Segmentación de clientes`;
          break;
        case 'polizas':
          contextualResponse += `• Gestión de renovaciones\n• Análisis de vencimientos\n• Reportes de pólizas\n• Integración con clientes`;
          break;
        case 'dashboard':
          contextualResponse += `• Personalización de widgets\n• Métricas avanzadas\n• Configuración de alertas\n• Análisis de tendencias`;
          break;
        default:
          contextualResponse += `• Funcionalidades relacionadas\n• Mejores prácticas\n• Casos de uso avanzados\n• Integración con otros módulos`;
      }
      
      contextualResponse += `\n\n¿Te gustaría profundizar en alguno de estos aspectos?`;
    } else {
      contextualResponse = `¡Hola! Soy tu asistente de soporte para el CRM CASIN Seguros. Puedo ayudarte con:

**📍 Navegación entre módulos**
• Dashboard, Directorio, Reportes, Data, Drive, etc.

**🔍 Búsquedas y filtros**
• Cómo encontrar contactos, aplicar filtros, usar stats cards

**👥 Gestión de contactos**
• Crear, editar, eliminar contactos y ver pólizas

**📊 Funcionalidades específicas**
• Paginación, vistas, modales, reportes

**🛠️ Resolución de problemas**
• Datos que no aparecen, navegación lenta, errores comunes

¿En qué específicamente puedo ayudarte hoy? Puedes preguntarme sobre cualquier funcionalidad del CRM.`;
    }
    
    return contextualResponse;
  }
}

module.exports = new OpenAIService(); 