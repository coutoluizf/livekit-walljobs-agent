// SPDX-FileCopyrightText: 2024 LiveKit, Inc.
//
// SPDX-License-Identifier: Apache-2.0

// Import required dependencies
import {
  type JobContext,
  WorkerOptions,
  cli,
  defineAgent,
  llm,
  multimodal,
} from '@livekit/agents';
import * as openai from '@livekit/agents-plugin-openai';
import dotenv from 'dotenv';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { z } from 'zod';

if (!process.env.PORT) {
  process.env.PORT = '44739'; // fallback port; Render will provide one in production
}

const instructions: string = `
Simulação de Entrevista com IA
Você é a Ana, um assistente de IA especializado em simular entrevistas de emprego para diferentes posições em empresas. 
Sua função é simular o papel de um entrevistador humano, conduzindo uma entrevista realista, interativa e profissional com o usuário.

Instruções principais:
	1.	Linguagem e Estilo de Comunicação:
	•	Seja direto e conciso. Fale apenas o necessário para explicar a pergunta ou seguir com uma nova.
	2.	Estrutura da Entrevista:
	•	Comece apresentando o papel que está sendo entrevistado e dê um breve contexto sobre o que será avaliado.
	•	Faça perguntas relacionadas à experiência, competências técnicas e comportamentais.
	•	Inclua perguntas hipotéticas ou baseadas em cenários, dependendo da vaga.
	•	Evite monólogos ou explicações longas. Dê feedback breve e continue a entrevista.
	3.	Tom e Adaptabilidade:
	•	Mantenha um tom respeitoso, profissional e motivador.
	•	Adapte o nível de profundidade das perguntas conforme as respostas do candidato.
	4.	Foco Personalizado na Vaga:
	•	Para posições técnicas, pergunte sobre habilidades práticas, ferramentas, linguagens de programação ou design de sistemas.
	•	Para posições de gestão ou marketing, foque em liderança, estratégia e resolução de problemas.
	5.	Finalização:
	•	Agradeça o candidato pela participação ao final.
	•	(Opcional) Forneça um resumo rápido sobre os pontos fortes e sugestões de melhoria.

Nota: Concentre-se em criar uma experiência rápida e objetiva, com respostas breves e diretas para evitar longos diálogos desnecessários.

# Cargo e Empresa:
- O Cargo em que a entrevista será conduzida será para a posição de Analista de Conteúdo no Youtube.

# Conduza a entrevista no idioma Português.

# Início da Entrevista:
Você inicia a conversa se apresentando e inicie a entrevista, seja breve e conciso.      
`;

const initialAssistantMessage: string = `Olá, sou a Ana, sua entrevistadora. Vamos começar a entrevista para a posição de Analista de Conteúdo no Youtube.`;

// Set up environment configuration
// Only load .env.local if NOT in production
if (process.env.NODE_ENV == 'development') {
  console.log('\n\nLoading .env.local\n\n');
  const __dirname = path.dirname(fileURLToPath(import.meta.url));
  const envPath = path.join(__dirname, '../.env.local');
  dotenv.config({ path: envPath });
}

// Define the main agent configuration and behavior
export default defineAgent({
  entry: async (ctx: JobContext) => {
    try {
      console.log('Starting agent...');
      // Connect to LiveKit room and wait for participant
      await ctx.connect();
      console.log('waiting for participant');
      const participant = await ctx.waitForParticipant();
      console.log(`starting assistant example agent for ${participant.identity}`);

      // gpt-4o-realtime-preview-2024-10-01
      const modelName: string = 'gpt-4o-realtime-preview-2024-12-17';
      // Initialize OpenAI model with custom instructions for job interview simulation
      const model = new openai.realtime.RealtimeModel({
        instructions: instructions,
        // model: modelName,
      });

      // Define available functions for the agent to use
      const fncCtx: llm.FunctionContext = {
        // Weather function implementation
        weather: {
          description: 'Get the weather in a location',
          parameters: z.object({
            location: z.string().describe('The location to get the weather for'),
          }),
          // Function to fetch weather data from wttr.in API
          execute: async ({ location }) => {
            console.debug(`executing weather function for ${location}`);
            const response = await fetch(`https://wttr.in/${location}?format=%C+%t`);
            if (!response.ok) {
              throw new Error(`Weather API returned status: ${response.status}`);
            }
            const weather = await response.text();
            return `The weather in ${location} right now is ${weather}.`;
          },
        },
      };

      // Initialize multimodal agent with model and function context
      const agent = new multimodal.MultimodalAgent({ model, fncCtx });
      const session = await agent
        .start(ctx.room, participant)
        .then((session) => session as openai.realtime.RealtimeSession);

      // Create initial greeting message
      // session.conversation.item.create(llm.ChatMessage.create({
      //   role: llm.ChatRole.ASSISTANT,
      //   text: initialAssistantMessage,
      // }));

      // Start the response handling
      session.response.create();

    } catch (err) {
      console.log("Error in agent entry:", err);
      console.error("Error in agent entry:", err);
      throw err; // ensures the worker logs a fatal error, but now with details
    }

  },
});

// Start the agent application
cli.runApp(new WorkerOptions({ agent: fileURLToPath(import.meta.url) }));
