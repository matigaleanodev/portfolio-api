import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { KnowledgeService } from './knowledge.service';

describe('KnowledgeService', () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('prioriza el artifact editorial cuando coincide mejor con la pregunta', async () => {
    const cwdPath = await writeKnowledgeArtifact({
      generatedAt: new Date().toISOString(),
      projects: [
        {
          slug: 'foodly-notes',
          title: 'Foodly Notes',
          excerpt: 'App de recetas publicada en Google Play Store.',
          stack: ['Angular', 'Ionic', 'NestJS'],
          links: [
            {
              label: 'Play Store',
              url: 'https://play.google.com/store/apps/details?id=io.example',
            },
          ],
          highlights: ['Publicada en Google Play Store.'],
          searchText: 'foodly notes play store angular ionic nestjs',
        },
      ],
      posts: [],
    });

    jest.spyOn(process, 'cwd').mockReturnValue(cwdPath);

    const service = new KnowledgeService();
    const result = await service.getRelevantContext(
      'publicaste alguna app en play store',
    );

    expect(result[0]).toEqual(
      expect.objectContaining({
        sourceType: 'project',
        sourceId: 'foodly-notes',
        links: [
          expect.objectContaining({
            label: 'Play Store',
          }),
        ],
      }),
    );
  });

  it('responde con conocimiento curado local cuando no hay artifact editorial', async () => {
    const cwdPath = await fs.mkdtemp(
      path.join(os.tmpdir(), 'portfolio-chat-no-artifact-'),
    );
    jest.spyOn(process, 'cwd').mockReturnValue(cwdPath);

    const service = new KnowledgeService();
    const result = await service.getRelevantContext(
      'como esta armado el ecosistema de portfolio cloud',
    );

    expect(result).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          sourceType: 'cloud',
          sourceId: 'cloud-ecosystem',
        }),
      ]),
    );
  });

  it('incluye posts del blog dentro del conocimiento editorial', async () => {
    const cwdPath = await writeKnowledgeArtifact({
      generatedAt: new Date().toISOString(),
      projects: [],
      posts: [
        {
          slug: 'desplegar-apis-docker-ec2',
          title: 'Cómo desplegar APIs con Docker en un EC2',
          excerpt: 'Post sobre deploy de APIs NestJS con Docker y EC2.',
          date: '2026-03-02',
          tags: ['docker', 'aws', 'ec2'],
          canonicalUrl: 'https://matiasgaleano.dev/blog/desplegar-apis-docker-ec2',
          summary: 'Explica el criterio operativo para deploy con Docker Compose.',
          searchText: 'docker aws ec2 deploy compose portfolio api',
        },
      ],
    });

    jest.spyOn(process, 'cwd').mockReturnValue(cwdPath);

    const service = new KnowledgeService();
    const result = await service.getRelevantContext(
      'escribiste algo sobre docker en ec2',
    );

    expect(result).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          sourceType: 'post',
          sourceId: 'desplegar-apis-docker-ec2',
        }),
      ]),
    );
  });

  it('prioriza conocimiento cloud cuando la pregunta apunta a lambdas y serverless', async () => {
    const service = new KnowledgeService();

    const result = await service.getRelevantContext(
      'como resolviste lambdas y serverless en portfolio cloud',
    );

    expect(result[0]).toEqual(
      expect.objectContaining({
        sourceType: 'cloud',
      }),
    );
  });
});

async function writeKnowledgeArtifact(
  payload: Record<string, unknown>,
): Promise<string> {
  const directoryPath = await fs.mkdtemp(
    path.join(os.tmpdir(), 'portfolio-chat-knowledge-'),
  );
  const generatedPath = path.join(directoryPath, '.generated', 'chat');
  await fs.mkdir(generatedPath, { recursive: true });
  const filePath = path.join(generatedPath, 'knowledge.json');
  await fs.writeFile(filePath, `${JSON.stringify(payload, null, 2)}\n`);
  return directoryPath;
}
