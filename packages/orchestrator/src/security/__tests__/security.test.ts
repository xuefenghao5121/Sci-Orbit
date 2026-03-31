import { describe, it, expect } from 'vitest';
/**
 * Security module tests
 */
import { sanitizeString } from '../../security/sanitizer.js';
import { sanitizeId } from '../../security/sanitizer.js';

describe('Security modules', () => {
  it('sanitizeString escapes HTML', () => {
    expect(sanitizeString("<script>alert('xss')</script>")).toBe("&lt;script&gt;alert(&#x27;xss&#x27;)&lt;/script&gt;");
  });

  it('sanitizeId removes special chars', () => {
    expect(sanitizeId('hello world!')).toBe('hello_world_');
  });
});
