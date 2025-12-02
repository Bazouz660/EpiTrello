import { describe, expect, it } from 'vitest';

import * as jsEntry from './testUtils.js';
import * as jsxEntry from './testUtils.jsx';

describe('test utilities entry points', () => {
  it('re-export helpers through the .js entry for CommonJS tooling', () => {
    expect(jsEntry).toMatchObject(jsxEntry);
    expect(jsEntry.createTestStore).toBe(jsxEntry.createTestStore);
    expect(jsEntry.renderWithProviders).toBe(jsxEntry.renderWithProviders);
  });
});
