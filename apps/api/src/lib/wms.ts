/**
 * WMS access — thin re-export from adapters/registry for backwards compat.
 * New code should import from `../adapters/registry` directly.
 *
 * logSync() still lives here because it's a cross-cutting concern
 * (audit trail) independent of the adapter implementation.
 */
import { prisma } from './prisma';
import { adapters } from '../adapters/registry';

export type { WmsAdapter } from '../adapters/types';
export const wms = adapters.wms;

/**
 * Wrap an adapter call with DB logging. Used by SO confirm flow so we
 * have an audit trail even when things go sideways (timeouts, mismatches).
 */
export async function logSync<T>(
  entity: string,
  action: 'push' | 'pull',
  request: unknown,
  fn: () => Promise<T>,
): Promise<T> {
  const log = await prisma.wmsSyncLog.create({
    data: {
      entity,
      action,
      requestJson: request as never,
      status: 'PENDING',
    },
  });
  try {
    const result = await fn();
    await prisma.wmsSyncLog.update({
      where: { id: log.id },
      data: {
        responseJson: result as never,
        status: 'SUCCESS',
      },
    });
    return result;
  } catch (err) {
    await prisma.wmsSyncLog.update({
      where: { id: log.id },
      data: {
        status: 'FAILED',
        errorMsg: err instanceof Error ? err.message : String(err),
      },
    });
    throw err;
  }
}
