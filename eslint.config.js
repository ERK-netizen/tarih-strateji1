// Bölüm 5.5 modül bağımlılık kuralları ve 6.3 motor yasakları (CI'da hata).
import tseslint from 'typescript-eslint';

const motorYasak = {
  'no-restricted-globals': ['error',
    { name: 'Date', message: '6.3: Motor Date kullanamaz; takvim modülünü kullanın.' },
    { name: 'Intl', message: '6.3: Motor Intl kullanamaz.' },
    { name: 'performance', message: '6.3: Motor zaman ölçemez.' },
    { name: 'setTimeout', message: '6.3: Motor zamanlayıcı kullanamaz.' }],
  'no-restricted-properties': ['error',
    { object: 'Math', property: 'random', message: '6.5: Anahtarlı rng kullanın.' },
    { object: 'Math', property: 'round', message: '6.2: roundHalfEven kullanın.' },
    { object: 'Math', property: 'sqrt', message: '6.2: sqrtInt kullanın.' },
    { object: 'Math', property: 'pow', message: '6.2: Derlenmiş sabit kullanın.' },
    { object: 'Math', property: 'log', message: '6.2: Derlenmiş sabit kullanın.' },
    { object: 'Math', property: 'exp', message: '6.2: Derlenmiş sabit kullanın.' },
    { property: 'toLocaleString', message: '6.3: Motor yerel biçimlendirme kullanamaz.' }],
  'no-restricted-syntax': ['error', { selector: 'ForInStatement', message: '6.3: Nesne anahtar sırasına bağlı yineleme yasak.' }],
};

export default tseslint.config(
  { ignores: ['**/dist/**', 'dist-tek/**', 'apps/android/android/**', 'node_modules/**'] },
  ...tseslint.configs.recommended,
  {
    rules: {
      '@typescript-eslint/no-explicit-any': 'off',
      '@typescript-eslint/no-unused-vars': ['warn', { argsIgnorePattern: '^_' }],
      '@typescript-eslint/no-non-null-assertion': 'off',
    },
  },
  { files: ['packages/engine/src/**/*.ts'], rules: motorYasak },
  {
    files: ['packages/engine/src/num/**', 'packages/engine/src/rng/**', 'packages/engine/src/calendar/**', 'packages/engine/src/hash/**'],
    rules: { 'no-restricted-imports': ['error', { patterns: [{ group: ['../*', '!../num/*'], message: '5.5: Çekirdek yardımcılar yalnız kendi içini import eder.' }] }] },
  },
  {
    files: ['packages/engine/src/decision/**'],
    rules: { 'no-restricted-imports': ['error', { patterns: [{ group: ['../state/table*', '../serialize/*', '../phases/*'], message: '5.5: Karar modülü tabloya, serileştiriciye ve faz hattına erişemez.' }] }] },
  },
  {
    files: ['packages/ui/src/**', 'packages/map/src/**'],
    rules: { 'no-restricted-imports': ['error', { patterns: [{ group: ['**/engine/src/state/*', '**/engine/src/systems/*', '**/storage/*'], message: '5.5: Arayüz motor iç modüllerine ve depolamaya erişemez.' }] }] },
  },
  {
    files: ['packages/command/src/**'],
    rules: { 'no-restricted-imports': ['error', { patterns: [{ group: ['**/engine/src/**'], message: '5.5: Komut paketi motor iç modüllerini import edemez.' }] }] },
  },
);
