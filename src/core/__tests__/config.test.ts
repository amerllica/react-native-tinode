import { expect, test } from '@jest/globals';
import pkg from '../../../package.json';
import { LIBRARY, PACKAGE_VERSION } from '../config';

test('PACKAGE_VERSION matches package.json', () => {
  expect(PACKAGE_VERSION).toBe(pkg.version);
  expect(LIBRARY).toBe(`react-native-tinode/${pkg.version}`);
});
