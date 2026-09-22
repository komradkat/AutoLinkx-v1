import coreWebVitals from 'eslint-config-next/core-web-vitals';
import typescript from 'eslint-config-next/typescript';

/** `next lint` was removed in Next 16; `npm run lint` runs the ESLint CLI. */
const config = [
  ...coreWebVitals,
  ...typescript,
  { ignores: ['.next/**', 'node_modules/**', 'Ui design/**', 'next-env.d.ts'] },
];

export default config;
