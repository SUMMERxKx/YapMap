// Writes src/data/third-party-licenses.json, the list the Acknowledgements screen shows: every
// open-source package that ships inside the app, with its licence text.
//
//   npm run licenses                         rewrite the file (after adding, removing or updating a dependency)
//   npm run licenses -- --check              fail if the file is out of date, without writing it
//   npm run licenses -- --export-dir dist    reuse an `npx expo export --source-maps` you already ran
//
// What "ships" means:
//   1. Every package whose code is in the iOS or Android JavaScript bundle. The script exports
//      both bundles with source maps (a few minutes) and reads the package names from them, so
//      build tools like Metro and Babel, which never reach a phone, are left out.
//   2. Packages with native code (an ios/ or android/ folder) that the app depends on without
//      importing them from JavaScript, e.g. expo-splash-screen or expo-dev-client.
// Add things that don't come from npm to EXTRAS below.

import { execFileSync } from 'node:child_process';
import { existsSync, mkdtempSync, readdirSync, readFileSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const outFile = join(root, 'src/data/third-party-licenses.json');

// The MIT licence. A package that declares MIT but ships no licence file gets this text with its
// author's name, and the entries below use it too.
function mitText(copyrightHolder) {
  return `MIT License

Copyright (c) ${copyrightHolder}

Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.`;
}

/** A short notice for a licence whose full text is long and published at a fixed address. */
function noticeText(copyrightHolder, licenseTitle, licenseUrl) {
  return `Copyright (c) ${copyrightHolder}\n\nLicensed under the ${licenseTitle}. The full licence text is at ${licenseUrl}`;
}

const APACHE = ['Apache License, Version 2.0', 'https://www.apache.org/licenses/LICENSE-2.0'];
const BSD3 = ['BSD 3-Clause License', 'https://opensource.org/license/bsd-3-clause'];

// Credits for things that ship without their own npm package: the icon font, and the main native
// libraries the packages above build into the iOS and Android apps.
const EXTRAS = [
  {
    name: 'Ionicons',
    version: '7',
    license: 'MIT',
    repository: 'https://github.com/ionic-team/ionicons',
    text: mitText('2015-present Ionic (http://ionic.io/)'),
  },
  {
    name: 'Hermes (JavaScript engine, in react-native)',
    version: '',
    license: 'MIT',
    repository: 'https://github.com/facebook/hermes',
    text: mitText('Meta Platforms, Inc. and affiliates.'),
  },
  {
    name: 'Folly (native library, in react-native)',
    version: '',
    license: 'Apache-2.0',
    repository: 'https://github.com/facebook/folly',
    text: noticeText('Meta Platforms, Inc. and affiliates.', ...APACHE),
  },
  {
    name: 'glog (native library, in react-native)',
    version: '',
    license: 'BSD-3-Clause',
    repository: 'https://github.com/google/glog',
    text: noticeText('2008, Google Inc.', ...BSD3),
  },
  {
    name: 'double-conversion (native library, in react-native)',
    version: '',
    license: 'BSD-3-Clause',
    repository: 'https://github.com/google/double-conversion',
    text: noticeText('2006-2011, the V8 project authors', ...BSD3),
  },
  {
    name: 'fmt (native library, in react-native)',
    version: '',
    license: 'MIT',
    repository: 'https://github.com/fmtlib/fmt',
    text: mitText('2012 - present, Victor Zverovich and {fmt} contributors'),
  },
  {
    name: 'Boost (native library, in react-native)',
    version: '',
    license: 'BSL-1.0',
    repository: 'https://www.boost.org',
    text: 'Distributed under the Boost Software License, Version 1.0. The full licence text is at https://www.boost.org/LICENSE_1_0.txt',
  },
  {
    name: 'OkHttp and Okio (Android networking, in react-native)',
    version: '',
    license: 'Apache-2.0',
    repository: 'https://github.com/square/okhttp',
    text: noticeText('Square, Inc.', ...APACHE),
  },
  {
    name: 'Fresco (Android images, in react-native)',
    version: '',
    license: 'MIT',
    repository: 'https://github.com/facebook/fresco',
    text: mitText('Meta Platforms, Inc. and affiliates.'),
  },
  {
    name: 'SDWebImage (iOS images, in expo-image)',
    version: '',
    license: 'MIT',
    repository: 'https://github.com/SDWebImage/SDWebImage',
    text: mitText('2009-2020 Olivier Poitrey rs@dailymotion.com'),
  },
  {
    name: 'Glide (Android images, in expo-image)',
    version: '',
    license: 'BSD-2-Clause, MIT and Apache-2.0',
    repository: 'https://github.com/bumptech/glide',
    text: 'Copyright 2014 Google, Inc. All rights reserved.\n\nGlide is licensed under a BSD 2-Clause licence, and parts of it under the MIT licence and the Apache License, Version 2.0. The licence texts are at https://github.com/bumptech/glide/blob/master/LICENSE',
  },
  {
    name: 'Google Maps SDK for Android (in react-native-maps)',
    version: '',
    license: 'Google Maps Platform Terms of Service',
    repository: 'https://cloud.google.com/maps-platform/terms',
    text: 'The map on Android is provided by Google. Use of Google Maps is subject to the Google Maps Platform Terms of Service (https://cloud.google.com/maps-platform/terms) and the Google Privacy Policy (https://policies.google.com/privacy). On iPhone the map is Apple Maps; its legal notices are linked from the map itself.',
  },
];

// Licence files are named in many ways: LICENSE, LICENSE.md, LICENCE.txt, license, COPYING...
const LICENSE_FILE = /^(licen[cs]e|copying)(\.|-|$)/i;

function readJson(file) {
  return JSON.parse(readFileSync(file, 'utf8'));
}

function argValue(flag) {
  const index = process.argv.indexOf(flag);
  if (index === -1) return null;
  return process.argv[index + 1] ?? null;
}

/** Where Node would find `name` when it is required from the folder `fromDir`. */
function resolvePackageDir(name, fromDir) {
  let dir = fromDir;
  while (true) {
    const candidate = join(dir, 'node_modules', name);
    if (existsSync(join(candidate, 'package.json'))) return candidate;
    if (dir === root || dir === dirname(dir)) return null;
    dir = dirname(dir);
  }
}

/** The package folder a bundled file came from, e.g. ".../node_modules/@scope/name". */
function packageDirOfSource(source) {
  const marker = '/node_modules/';
  const index = source.lastIndexOf(marker);
  if (index === -1) return null;
  const parts = source.slice(index + marker.length).split('/');
  const nameParts = parts[0].startsWith('@') ? 2 : 1;
  return source.slice(0, index + marker.length) + parts.slice(0, nameParts).join('/');
}

/** Package folders whose code is in the exported iOS and Android bundles. */
function bundledPackageDirs(exportDir) {
  const dirs = new Set();
  const maps = [];
  const walk = (dir) => {
    for (const entry of readdirSync(dir)) {
      const path = join(dir, entry);
      if (statSync(path).isDirectory()) walk(path);
      else if (entry.endsWith('.map')) maps.push(path);
    }
  };
  walk(exportDir);
  if (maps.length === 0) throw new Error(`No source maps in ${exportDir}. Export with --source-maps.`);

  for (const map of maps) {
    for (const source of readJson(map).sources) {
      // Metro writes paths from the project folder ("/node_modules/react/index.js").
      const dir = packageDirOfSource(source.startsWith(root) ? source : join(root, source));
      if (dir && existsSync(join(dir, 'package.json'))) dirs.add(dir);
    }
  }
  return dirs;
}

function hasNativeCode(dir) {
  return ['ios', 'android', 'expo-module.config.json'].some((entry) => existsSync(join(dir, entry)));
}

/** Packages with native code reachable from package.json's dependencies, bundled or not. */
function nativePackageDirs() {
  const app = readJson(join(root, 'package.json'));
  const dirs = new Set();
  const visited = new Set();
  const queue = Object.keys(app.dependencies ?? {}).map((name) => ({ name, fromDir: root }));
  while (queue.length > 0) {
    const { name, fromDir } = queue.shift();
    const dir = resolvePackageDir(name, fromDir);
    if (!dir || visited.has(dir)) continue;
    visited.add(dir);
    if (!hasNativeCode(dir)) continue;
    dirs.add(dir);
    const pkg = readJson(join(dir, 'package.json'));
    for (const child of Object.keys({ ...pkg.dependencies, ...pkg.optionalDependencies })) {
      queue.push({ name: child, fromDir: dir });
    }
  }
  return dirs;
}

function licenseName(pkg) {
  if (typeof pkg.license === 'string') return pkg.license;
  if (pkg.license?.type) return pkg.license.type;
  if (Array.isArray(pkg.licenses)) return pkg.licenses.map((entry) => entry.type ?? entry).join(' OR ');
  return 'UNKNOWN';
}

function authorName(pkg) {
  const author = typeof pkg.author === 'string' ? pkg.author : pkg.author?.name;
  // "Name <email> (url)" -> "Name"
  if (author) return author.replace(/\s*[<(].*$/, '');
  return `the ${pkg.name} authors`;
}

function repositoryUrl(pkg) {
  let url = typeof pkg.repository === 'string' ? pkg.repository : pkg.repository?.url;
  if (!url) return pkg.homepage ?? '';
  // "github:owner/repo" and "owner/repo" are shorthand for GitHub.
  if (/^(github:)?[\w.-]+\/[\w.-]+$/.test(url)) url = `https://github.com/${url.replace(/^github:/, '')}`;
  return url
    .replace(/^git\+/, '')
    .replace(/^git:\/\//, 'https://')
    .replace(/^ssh:\/\/git@github\.com/, 'https://github.com')
    .replace(/\.git$/, '');
}

/** The package's own licence file, or the one of the repository it was published from. */
function licenseText(dir) {
  for (const candidate of [dir, dirname(dirname(dir))]) {
    const file = readdirSync(candidate).find((entry) => LICENSE_FILE.test(entry));
    if (file && statSync(join(candidate, file)).isFile()) {
      return readFileSync(join(candidate, file), 'utf8').replace(/\r\n/g, '\n').trim();
    }
    // Only the package's own folder counts unless it sits inside node_modules/@scope.
    if (!dir.includes('/node_modules/@')) break;
  }
  return '';
}

function exportBundles() {
  const dir = mkdtempSync(join(tmpdir(), 'yap-licenses-'));
  console.log('Exporting the iOS and Android bundles with source maps (this takes a few minutes)...');
  execFileSync(
    'npx',
    ['expo', 'export', '--platform', 'ios', '--platform', 'android', '--source-maps', '--output-dir', dir],
    { cwd: root, stdio: ['ignore', 'ignore', 'inherit'] },
  );
  return dir;
}

function collect(exportDir) {
  const dirs = new Set([...bundledPackageDirs(exportDir), ...nativePackageDirs()]);
  const byKey = new Map(); // "name@version" -> entry
  for (const dir of dirs) {
    const pkg = readJson(join(dir, 'package.json'));
    // Some packages ship extra package.json files in subfolders with no name; skip those.
    if (!pkg.name || pkg.name === readJson(join(root, 'package.json')).name) continue;
    const key = `${pkg.name}@${pkg.version}`;
    if (byKey.has(key)) continue;
    const license = licenseName(pkg);
    let text = licenseText(dir);
    if (!text && license === 'MIT') text = mitText(authorName(pkg));
    byKey.set(key, { name: pkg.name, version: pkg.version, license, repository: repositoryUrl(pkg), text });
  }
  const entries = [...byKey.values(), ...EXTRAS];
  entries.sort((a, b) => a.name.localeCompare(b.name) || a.version.localeCompare(b.version));

  // The same licence text is often shared by many packages, so each text is stored once and
  // packages point at it by index.
  const texts = [];
  const packages = entries.map(({ text, ...entry }) => {
    let textIndex = -1;
    if (text) {
      textIndex = texts.indexOf(text);
      if (textIndex === -1) textIndex = texts.push(text) - 1;
    }
    return { ...entry, textIndex };
  });
  return { packages, texts };
}

const givenExportDir = argValue('--export-dir');
const exportDir = givenExportDir ?? exportBundles();
let result;
try {
  result = collect(exportDir);
} finally {
  if (!givenExportDir) rmSync(exportDir, { recursive: true, force: true });
}
const output = `${JSON.stringify(result, null, 1)}\n`;

if (process.argv.includes('--check')) {
  const current = existsSync(outFile) ? readFileSync(outFile, 'utf8') : '';
  if (current !== output) {
    console.error('src/data/third-party-licenses.json is out of date. Run `npm run licenses` and commit it.');
    process.exit(1);
  }
  console.log(`third-party-licenses.json is up to date (${result.packages.length} packages).`);
} else {
  writeFileSync(outFile, output);
  console.log(`Wrote ${result.packages.length} packages to src/data/third-party-licenses.json.`);
  const unknown = result.packages.filter((entry) => entry.license === 'UNKNOWN').map((entry) => entry.name);
  if (unknown.length > 0) console.log(`No licence declared by: ${unknown.join(', ')}`);
  const missing = result.packages.filter((entry) => entry.textIndex === -1).map((entry) => entry.name);
  if (missing.length > 0) console.log(`No licence text found for (the screen links to their repository): ${missing.join(', ')}`);
}
