import { describe, expect, it, vi } from 'vitest';

import { errorHandler, notFoundHandler } from '../src/middleware/errorHandlers.js';

describe('middleware/errorHandlers', () => {
  it('forwards not found errors', () => {
    const next = vi.fn();
    notFoundHandler({}, {}, next);
    expect(next).toHaveBeenCalledWith(expect.objectContaining({ status: 404 }));
  });

  it('formats errors and responds with fallback message', () => {
    const json = vi.fn();
    const status = vi.fn().mockReturnValue({ json });

    errorHandler({}, {}, { status });

    expect(status).toHaveBeenCalledWith(500);
    expect(json).toHaveBeenCalledWith(
      expect.objectContaining({
        status: 500,
        message: expect.any(String)
      })
    );
  });
});
