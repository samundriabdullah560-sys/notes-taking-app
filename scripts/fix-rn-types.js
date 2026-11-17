const fs = require('fs');
const path = require('path');

const rootDir = path.resolve(__dirname, '..');
const rnPkgPath = path.join(rootDir, 'node_modules', 'react-native', 'package.json');
const rnIndexDts = path.join(rootDir, 'node_modules', 'react-native', 'index.d.ts');
const atTypesRnDir = path.join(rootDir, 'node_modules', '@types', 'react-native');

try {
  // 1. Create node_modules/react-native/index.d.ts
  fs.writeFileSync(rnIndexDts, 'export * from "./types_generated/index";\n', 'utf8');
  console.log('Created:', rnIndexDts);

  // 2. Add types field to node_modules/react-native/package.json
  if (fs.existsSync(rnPkgPath)) {
    const pkg = JSON.parse(fs.readFileSync(rnPkgPath, 'utf8'));
    pkg.types = './types_generated/index.d.ts';
    pkg.typings = './types_generated/index.d.ts';
    fs.writeFileSync(rnPkgPath, JSON.stringify(pkg, null, 2), 'utf8');
    console.log('Updated package.json with types field');
  }

  // 3. Create node_modules/@types/react-native
  fs.mkdirSync(atTypesRnDir, { recursive: true });
  fs.writeFileSync(
    path.join(atTypesRnDir, 'index.d.ts'),
    'export * from "react-native/types_generated/index";\n',
    'utf8'
  );
  fs.writeFileSync(
    path.join(atTypesRnDir, 'package.json'),
    JSON.stringify({
      name: '@types/react-native',
      version: '0.88.0',
      types: 'index.d.ts'
    }, null, 2),
    'utf8'
  );
  console.log('Created @types/react-native');
} catch (e) {
  console.error('Error fixing react-native types:', e);
}
