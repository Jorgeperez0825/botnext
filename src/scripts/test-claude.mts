import { config } from 'dotenv';
import { Anthropic } from '@anthropic-ai/sdk';

// Cargar variables de entorno
config();

async function testClaude() {
  try {
    console.log('🤖 Probando conexión con Claude...');
    
    const anthropic = new Anthropic({
      apiKey: process.env.CLAUDE_API_KEY
    });

    console.log('✅ Cliente inicializado');
    console.log('📝 Enviando mensaje de prueba...');

    const message = await anthropic.messages.create({
      model: "claude-3-opus-20240229",
      max_tokens: 1000,
      messages: [{
        role: "user",
        content: "Responde solo con el número 1 para confirmar que la conexión funciona."
      }]
    });

    console.log('✅ Respuesta recibida:', message.content[0].text);

  } catch (error) {
    console.error('❌ Error en la prueba:', error);
  }
}

// Ejecutar prueba
testClaude(); 