import os from 'node:os';
import fs from 'node:fs/promises';
import path from 'node:path';
import {
  getChatKnowledgeCacheTtlMs,
  getChatKnowledgeObjectKey,
  getChatKnowledgeR2Config,
  getEditorialKnowledgeCandidatePaths,
  getMissingRequiredEnv,
  getPortfolioCloudApiBaseUrl,
  getPrimaryEditorialKnowledgePath,
  parseCorsOrigins,
  parseTrustProxy,
  validateRuntimeConfiguration,
} from './runtime.config';

describe('runtime.config', () => {
  describe('parseCorsOrigins', () => {
    it('returns false when cors is not configured', () => {
      expect(parseCorsOrigins(undefined)).toBe(false);
      expect(parseCorsOrigins('   ')).toBe(false);
    });

    it('returns true when cors wildcard is configured', () => {
      expect(parseCorsOrigins('*')).toBe(true);
    });

    it('returns sanitized origin list for comma separated values', () => {
      expect(
        parseCorsOrigins('https://matiasgaleano.dev, http://localhost:4200 '),
      ).toEqual(['https://matiasgaleano.dev', 'http://localhost:4200']);
    });
  });

  describe('parseTrustProxy', () => {
    it('returns false by default', () => {
      expect(parseTrustProxy(undefined)).toBe(false);
      expect(parseTrustProxy('false')).toBe(false);
      expect(parseTrustProxy('0')).toBe(false);
    });

    it('returns booleans and hop counts when configured', () => {
      expect(parseTrustProxy('true')).toBe(true);
      expect(parseTrustProxy('1')).toBe(1);
      expect(parseTrustProxy('2')).toBe(2);
    });
  });

  describe('editorial knowledge paths', () => {
    it('builds stable candidate paths from cwd', () => {
      const paths = getEditorialKnowledgeCandidatePaths('/app');

      expect(paths).toEqual([
        path.resolve('/app', '.generated', 'chat', 'knowledge.json'),
        path.resolve(
          '/app',
          '..',
          'portfolio',
          '.generated',
          'chat',
          'knowledge.json',
        ),
      ]);
      expect(getPrimaryEditorialKnowledgePath('/app')).toBe(
        path.resolve('/app', '.generated', 'chat', 'knowledge.json'),
      );
    });
  });

  describe('runtime validation', () => {
    it('reports missing required contact environment variables', () => {
      expect(
        getMissingRequiredEnv({
          RESEND_API_KEY: '',
          CONTACT_FROM_EMAIL: 'from@example.com',
          PORTFOLIO_CLOUD_API_URL: '',
        }),
      ).toEqual([
        'RESEND_API_KEY',
        'CONTACT_TO_EMAIL',
        'PORTFOLIO_CLOUD_API_URL',
      ]);
    });

    it('returns the normalized portfolio-cloud base url', () => {
      expect(
        getPortfolioCloudApiBaseUrl({
          PORTFOLIO_CLOUD_API_URL: 'https://cloud.example.com/dev///',
        }),
      ).toBe('https://cloud.example.com/dev');
    });

    it('returns a default cache ttl and object key for chat knowledge', () => {
      expect(getChatKnowledgeObjectKey({})).toBe(
        'artifacts/chat/knowledge.json',
      );
      expect(getChatKnowledgeCacheTtlMs({})).toBe(300000);
    });

    it('builds the R2 chat knowledge config when the required env exists', () => {
      expect(
        getChatKnowledgeR2Config({
          R2_ENDPOINT: 'https://r2.example.com',
          R2_BUCKET: 'portfolio-media',
          R2_ACCESS_KEY_ID: 'key',
          R2_SECRET_ACCESS_KEY: 'secret',
        }),
      ).toEqual({
        endpoint: 'https://r2.example.com',
        region: 'auto',
        bucket: 'portfolio-media',
        accessKeyId: 'key',
        secretAccessKey: 'secret',
        objectKey: 'artifacts/chat/knowledge.json',
        cacheTtlMs: 300000,
      });
    });

    it('does not require the editorial artifact outside production', async () => {
      await expect(
        validateRuntimeConfiguration(
          {
            NODE_ENV: 'development',
            RESEND_API_KEY: 'key',
            CONTACT_FROM_EMAIL: 'from@example.com',
            CONTACT_TO_EMAIL: 'to@example.com',
            PORTFOLIO_CLOUD_API_URL: 'https://cloud.example.com/dev',
          },
          '/tmp/non-existent',
        ),
      ).resolves.toBeUndefined();
    });

    it('does not require the local editorial artifact in production when R2 chat knowledge is configured', async () => {
      const cwdPath = await fs.mkdtemp(
        path.join(os.tmpdir(), 'portfolio-api-runtime-'),
      );

      await expect(
        validateRuntimeConfiguration(
          {
            NODE_ENV: 'production',
            RESEND_API_KEY: 'key',
            CONTACT_FROM_EMAIL: 'from@example.com',
            CONTACT_TO_EMAIL: 'to@example.com',
            PORTFOLIO_CLOUD_API_URL: 'https://cloud.example.com/dev',
            R2_ENDPOINT: 'https://r2.example.com',
            R2_BUCKET: 'portfolio-media',
            R2_ACCESS_KEY_ID: 'key',
            R2_SECRET_ACCESS_KEY: 'secret',
          },
          cwdPath,
        ),
      ).resolves.toBeUndefined();
    });

    it('fails early when the R2 chat knowledge config is incomplete', () => {
      expect(() =>
        getChatKnowledgeR2Config({
          R2_ENDPOINT: 'https://r2.example.com',
          R2_BUCKET: 'portfolio-media',
        }),
      ).toThrow('Incomplete R2 chat knowledge configuration');
    });

    it('requires the editorial artifact in production', async () => {
      const cwdPath = await fs.mkdtemp(
        path.join(os.tmpdir(), 'portfolio-api-runtime-'),
      );

      await expect(
        validateRuntimeConfiguration(
          {
            NODE_ENV: 'production',
            RESEND_API_KEY: 'key',
            CONTACT_FROM_EMAIL: 'from@example.com',
            CONTACT_TO_EMAIL: 'to@example.com',
            PORTFOLIO_CLOUD_API_URL: 'https://cloud.example.com/dev',
          },
          cwdPath,
        ),
      ).rejects.toThrow('Missing required editorial knowledge artifact');
    });

    it('accepts production when the artifact exists in the fixed path', async () => {
      const cwdPath = await fs.mkdtemp(
        path.join(os.tmpdir(), 'portfolio-api-runtime-'),
      );
      const artifactPath = getPrimaryEditorialKnowledgePath(cwdPath);

      await fs.mkdir(path.dirname(artifactPath), { recursive: true });
      await fs.writeFile(artifactPath, '{"projects":[],"posts":[]}\n');

      await expect(
        validateRuntimeConfiguration(
          {
            NODE_ENV: 'production',
            RESEND_API_KEY: 'key',
            CONTACT_FROM_EMAIL: 'from@example.com',
            CONTACT_TO_EMAIL: 'to@example.com',
            PORTFOLIO_CLOUD_API_URL: 'https://cloud.example.com/dev',
          },
          cwdPath,
        ),
      ).resolves.toBeUndefined();
    });
  });
});
