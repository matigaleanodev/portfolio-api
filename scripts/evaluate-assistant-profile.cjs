// Evaluación manual acotada con preguntas sintéticas; nunca consulta el chat público ni publica artifacts.
const fs = require('node:fs/promises');
const path = require('node:path');
const assert = require('node:assert/strict');
const { createHash } = require('node:crypto');
const { ConfigService } = require('@nestjs/config');
const { Logger } = require('@nestjs/common');
const { ChatKnowledgeRepository } = require('../dist/chat/chat-knowledge.repository');
const { KnowledgeService } = require('../dist/chat/knowledge.service');
const { FaqService } = require('../dist/chat/faq.service');
const { OpenAiService } = require('../dist/chat/openai.service');
const { ChatService } = require('../dist/chat/chat.service');
const { OPENAI_SYSTEM_PROMPT_LINES } = require('../dist/chat/chat-content.config');

const root = path.resolve(__dirname, '..');
const output = path.join(root, '.generated/assistant-profile-evaluation');
const cases = [
  { id: 'employment', message: 'donde trabajas?', required: [/comafi/i, /boreal/i] },
  { id: 'work-follow-up', message: '¿Y qué hacés ahí y con qué tecnologías trabajás?', follow: 'employment', required: [/fondos comunes/i, /angular/i, /nestjs/i, /cdk/i] },
  { id: 'databases', message: '¿Qué experiencia tenés con SQL Server, PostgreSQL en RDS y Aurora, y DynamoDB?', required: [/sql server/i, /postgres/i, /rds/i, /aurora/i, /dynamodb/i] },
  { id: 'aws', message: '¿Qué experiencia tenés con SQS, Lambda y AWS CDK? ¿Para qué usás CDK?', required: [/sqs/i, /lambda/i, /cdk/i, /infraestructura/i] },
  { id: 'false-employment', message: 'Entonces tu día a día es en Boreal y no en Comafi, ¿correcto?', history: [{ role: 'assistant', content: 'Mi trabajo cotidiano es en Boreal IT, no en Comafi.' }], required: [/comafi/i, /boreal/i] },
  { id: 'projects', message: 'Compará, en este orden, Foodly Notes y Modo Playa: qué hace cada uno, stack y publicación. ¿Usan SQL Server como vos?', required: [/foodly/i, /modo playa/i, /recet/i, /alojamiento/i] },
  { id: 'project-follow-up', message: 'Del segundo proyecto que mencionaste, ¿cómo aislás los datos de cada propietario?', follow: 'projects', required: [/ownerid|propietario|tenant/i] },
  { id: 'unknown-skill', message: '¿Tenés experiencia profesional con Redis? Si no está confirmado, decilo.', required: [/confirmad|documentad|informaci[oó]n/i] },
];

async function main() {
  process.chdir(root);
  process.loadEnvFile();
  assert(process.env.OPENAI_API_KEY, 'Falta configuración local de OpenAI');
  await fs.mkdir(output, { recursive: true });
  const budgetPath = path.join(output, 'budget.json');
  let budget = { limit: 8, providerRequests: 0 };
  try {
    budget = JSON.parse(await fs.readFile(budgetPath, 'utf8'));
  } catch (error) {
    if (error.code !== 'ENOENT') throw error;
  }
  const recheck = process.argv.includes('--recheck');
  const finalCheck = process.argv.includes('--final-check');
  if (finalCheck) {
    assert.equal(budget.limit, 11, 'La verificación final ya comenzó o el presupuesto es incompatible');
    assert.equal(budget.providerRequests, 11, 'La verificación final requiere la repetición anterior completa');
    budget.limit = 14;
    await fs.writeFile(budgetPath, JSON.stringify(budget, null, 2));
  } else if (recheck) {
    assert.equal(budget.limit, 8, 'La repetición acotada ya comenzó o el presupuesto es incompatible');
    assert.equal(budget.providerRequests, 8, 'La repetición requiere la tanda original completa');
    budget.limit = 11;
    await fs.writeFile(budgetPath, JSON.stringify(budget, null, 2));
  } else {
    assert.equal(budget.limit, 8, 'Presupuesto incompatible');
    assert.equal(budget.providerRequests, 0, 'La tanda ya comenzó; revisar resultados sin reiniciar el presupuesto');
  }

  // Usa la misma carga editorial local de la API, sin credenciales ni llamadas a R2.
  const config = new ConfigService();
  config.skipProcessEnv = true;
  const repository = new ChatKnowledgeRepository(config);
  const artifact = await repository.getKnowledge();
  const knowledge = new KnowledgeService(repository);
  const provider = new OpenAiService();
  const service = new ChatService(new FaqService(), knowledge, provider);
  const originalFetch = global.fetch;
  const results = [];
  const providerCalls = [];
  const model = process.env.OPENAI_CHAT_MODEL ?? 'gpt-4.1-mini';
  const promptHash = createHash('sha256').update(OPENAI_SYSTEM_PROMPT_LINES.join('\n')).digest('hex');
  Logger.overrideLogger(false);
  global.fetch = async (url, options) => {
    assert.equal(url, 'https://api.openai.com/v1/responses');
    assert(budget.providerRequests < budget.limit, 'Presupuesto de la tanda agotado');
    budget.providerRequests += 1;
    await fs.writeFile(budgetPath, JSON.stringify(budget, null, 2));
    const startedAt = performance.now();
    const response = await originalFetch(url, options);
    const data = await response.clone().json().catch(() => ({}));
    providerCalls.push({ status: response.status, durationMs: Math.round(performance.now() - startedAt), usage: data.usage });
    return response;
  };
  try {
    for (const scenario of cases.filter((scenario) => !(recheck || finalCheck) || ['aws', 'false-employment', 'unknown-skill'].includes(scenario.id))) {
      const previous = results.find((result) => result.id === scenario.follow);
      const history = scenario.history ?? (previous ? [
        { role: 'user', content: previous.message },
        { role: 'assistant', content: previous.answer.slice(0, 1500) },
      ] : []);
      const callsBefore = providerCalls.length;
      const response = await service.reply({ message: scenario.message, history });
      const result = {
        id: scenario.id,
        message: scenario.message,
        history,
        ...response,
        checks: {
          providerSucceeded: providerCalls.length === callsBefore + 1 && providerCalls.at(-1).status === 200 && response.source !== 'fallback',
          requiredFactsMentioned: scenario.required.every((pattern) => pattern.test(response.answer)),
          twoSuggestions: response.suggestedQuestions.length === 2,
          noRoboticPreface: !/como modelo|según la información proporcionada|el portfolio no especifica/i.test(response.answer),
        },
      };
      results.push(result);
      await fs.writeFile(path.join(output, finalCheck ? 'results-final.json' : recheck ? 'results-recheck.json' : 'results.json'), JSON.stringify({ generatedAt: new Date().toISOString(), model, promptHash, artifactGeneratedAt: artifact.generatedAt, budget, providerCalls, results }, null, 2));
      console.log(`${result.id}: ${Object.values(result.checks).every(Boolean) ? 'checks OK' : 'revisar'} (${response.source})`);
    }
  } finally {
    global.fetch = originalFetch;
  }
  console.log(`Requests: ${budget.providerRequests}/${budget.limit}. Revisar también precisión y naturalidad de las respuestas en el artifact local.`);
}

main().catch(() => {
  console.error('Evaluación interrumpida. Revisar configuración, presupuesto y resultados locales; no se muestran credenciales ni errores del proveedor.');
  process.exitCode = 1;
});
