import { dirname } from 'path';
import { fileURLToPath } from 'url';
import { FlatCompat } from '@eslint/eslintrc';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

/**
 * ESLint 9 flat config. `eslint-config-next` still ships the legacy
 * eslintrc shape, so it is bridged through FlatCompat.
 */
const compat = new FlatCompat({ baseDirectory: __dirname });

export default [
  {
    ignores: ['node_modules/**', '.next/**', 'out/**', 'next-env.d.ts'],
  },
  ...compat.extends('next/core-web-vitals', 'next/typescript'),
];
