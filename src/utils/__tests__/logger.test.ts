import { webcrypto } from 'crypto';
import { TextDecoder, TextEncoder } from 'util';
import {
  createAuditLogger,
  parseEncryptedAuditExport,
  type AuditLoggerOptions,
  type AuditLoggerStorage,
  type EncryptedAuditLogRecord,
} from '../logger';

Object.defineProperty(globalThis, 'TextEncoder', { value: TextEncoder });
Object.defineProperty(globalThis, 'TextDecoder', { value: TextDecoder });

class MemoryStorage implements AuditLoggerStorage {
  private readonly values = new Map<string, string>();

  getItem(key: string): string | null {
    return this.values.get(key) ?? null;
  }

  setItem(key: string, value: string): void {
    this.values.set(key, value);
  }

  removeItem(key: string): void {
    this.values.delete(key);
  }
}

function makeLogger(options: Partial<AuditLoggerOptions> = {}) {
  const storage = new MemoryStorage();
  const logger = createAuditLogger({
    storage,
    crypto: webcrypto as unknown as Crypto,
    now: () => new Date('2026-06-17T12:00:00.000Z'),
    batchSize: 10,
    flushIntervalMs: 60_000,
    autoFlushOnPageLifecycle: false,
    ...options,
  });

  return { logger, storage };
}

function tamperCiphertext(record: EncryptedAuditLogRecord): EncryptedAuditLogRecord {
  return {
    ...record,
    ciphertext: `${record.ciphertext.slice(0, -4)}AAAA`,
  };
}

describe('audit logger', () => {
  test('appends, buffers, flushes, and restores encrypted audit events', async () => {
    const { logger } = makeLogger();

    const event = await logger.appendAuditEvent({
      type: 'transaction.stream',
      action: 'horizon_transaction_observed',
      resource: 'stellar.transaction',
      resourceId: 'tx-hash',
      status: 'success',
      metadata: { ledger: 1234 },
    });

    expect(event.sequence).toBe(1);
    expect(logger.getBufferedAuditEventCount()).toBe(1);
    expect(logger.readEncryptedAuditLogs()).toHaveLength(0);

    const records = await logger.flushAuditLogs();
    expect(records).toHaveLength(1);
    expect(logger.getBufferedAuditEventCount()).toBe(0);

    const restored = await logger.readAuditLogEvents(records);
    expect(restored[0]).toMatchObject({
      type: 'transaction.stream',
      action: 'horizon_transaction_observed',
      sequence: 1,
      metadata: { ledger: 1234 },
    });
  });

  test('uses monotonic sequence numbers for local ordering', async () => {
    const { logger } = makeLogger();

    await logger.appendAuditEvent({ id: 'one', type: 'vote', action: 'started' });
    await logger.appendAuditEvent({ id: 'two', type: 'vote', action: 'submitted' });

    const restored = await logger.readAuditLogEvents(await logger.flushAuditLogs());

    expect(restored.map((event) => event.sequence)).toEqual([1, 2]);
    expect(restored.map((event) => event.id)).toEqual(['one', 'two']);
  });

  test('redacts sensitive metadata and survives circular values', async () => {
    const { logger } = makeLogger();
    const circular: Record<string, unknown> = {
      privateKey: 'private-key-value',
      token: 'access-token-value',
      visible: 'safe',
    };
    circular.self = circular;

    await logger.appendAuditEvent({
      type: 'security.audit',
      action: 'metadata_sanitized',
      metadata: circular,
    });

    const [event] = await logger.readAuditLogEvents(await logger.flushAuditLogs());
    const metadataJson = JSON.stringify(event.metadata);

    expect(metadataJson).toContain('[REDACTED]');
    expect(metadataJson).toContain('[Circular]');
    expect(metadataJson).toContain('safe');
    expect(metadataJson).not.toContain('private-key-value');
    expect(metadataJson).not.toContain('access-token-value');
  });

  test('persists encrypted records without plaintext event contents', async () => {
    const { logger } = makeLogger();

    await logger.appendAuditEvent({
      type: 'guardian.vote',
      action: 'secret_action_should_not_be_plaintext',
      metadata: {
        password: 'hunter2',
      },
    });

    const serializedRecords = JSON.stringify(await logger.flushAuditLogs());

    expect(serializedRecords).toContain('AES-GCM');
    expect(serializedRecords).not.toContain('secret_action_should_not_be_plaintext');
    expect(serializedRecords).not.toContain('hunter2');
  });

  test('verifies unchanged logs and rejects tampered or reordered logs', async () => {
    const { logger } = makeLogger();

    await logger.appendAuditEvent({ id: 'a', type: 'stream', action: 'first' });
    await logger.appendAuditEvent({ id: 'b', type: 'stream', action: 'second' });
    const records = await logger.flushAuditLogs();

    await expect(logger.verifyAuditLogIntegrity(records)).resolves.toMatchObject({ valid: true });
    await expect(
      logger.verifyAuditLogIntegrity([tamperCiphertext(records[0]), records[1]]),
    ).resolves.toMatchObject({ valid: false });
    await expect(logger.verifyAuditLogIntegrity([records[1], records[0]])).resolves.toMatchObject({
      valid: false,
    });
  });

  test('exports the expected encrypted local file structure', async () => {
    const { logger } = makeLogger();

    await logger.appendAuditEvent({
      type: 'guardian.vote',
      action: 'vote_submitted',
      resource: 'pull_request',
      resourceId: 42,
    });

    const result = await logger.exportAuditLogs({ download: false });
    const parsed = parseEncryptedAuditExport(JSON.stringify(result.exportFile));

    expect(result.fileName).toBe('audit-log-2026-06-17.json.enc');
    expect(result.saved).toBe(false);
    expect(parsed).toMatchObject({
      version: 1,
      recordCount: 1,
      algorithm: 'AES-GCM',
      fileType: 'vero-audit-log-export',
      integrity: {
        algorithm: 'SHA-256',
      },
    });
    expect(parsed.records).toHaveLength(1);
    expect(JSON.stringify(parsed)).not.toContain('vote_submitted');
  });

  test('flushes the in-memory buffer to bounded encrypted storage', async () => {
    const { logger } = makeLogger({ maxRetainedRecords: 2 });

    await logger.appendAuditEvent({ id: 'one', type: 'stream', action: 'one' });
    expect(logger.getBufferedAuditEventCount()).toBe(1);
    expect(logger.readEncryptedAuditLogs()).toHaveLength(0);

    await logger.appendAuditEvent({ id: 'two', type: 'stream', action: 'two' });
    await logger.appendAuditEvent({ id: 'three', type: 'stream', action: 'three' });
    const records = await logger.flushAuditLogs();
    const restored = await logger.readAuditLogEvents(records);

    expect(records).toHaveLength(2);
    expect(restored.map((event) => event.id)).toEqual(['two', 'three']);
  });
});
