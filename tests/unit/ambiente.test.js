import { describe, it, expect } from 'vitest';
import { ENV_LABEL } from '../../src/lib/config';

describe('ambiente de teste', () => {
  it('sem VITE_AMBIENTE_LABEL não há faixa (site real)', () => expect(ENV_LABEL).toBe(''));
});
