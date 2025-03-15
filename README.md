# ts-arch-test
test architecture dependencies

kinda in a stable state now, I'm using it myself and it's been useful!

## install
```shell
npm install --save-dev ts-arch-test
```
## update to latest version
```shell
npm install --save-dev ts-arch-test@latest
```

## examples
### simple case
```typescript
import {verifyArchitecture} from 'ts-arch-test';
import {expect} from 'chai';

describe('Architecture test', () => {
  it('single case', async () => {
    expect(await verifyArchitecture({
      filesFromFolder: 'testdata/tsconfig-inheritance/src/lib/db',
      notDependOnFolder: 'testdata/tsconfig-inheritance/src/lib/services'
    }, 'tsconfig.json')).to.deep.equal([]);
  })
});
```

### clickable error message
```typescript
import { verifyArchitecture, clickableErrorMessage } from 'ts-arch-test';
import {expect} from 'chai';

describe('Architecture test', () => {
  it('single case', async () => {
    const spec = {
      filesFromFolder: 'testdata/tsconfig-inheritance/src/lib/db',
      notDependOnFolder: 'testdata/tsconfig-inheritance/src/lib/services'
    };
    const violations = await verifyArchitecture(spec, 'tsconfig.json');
    const msg = clickableErrorMessage(spec, violations);
    expect(violations, msg).toEqual([]);
  })
});
```

### from a svelte project
```typescript
import { describe, expect, it } from 'vitest';
import { verifyArchitecture } from 'ts-arch-test';

describe('Architecture test', () => {
  const folders: Record<string, string> = {
    db: 'src/lib/server/db',
    repositories: 'src/lib/server/repositories',
    services: 'src/lib/server/services',
    routes: 'src/routes'
  };

  const cases = [
    { filesFromFolderKey: 'db', notDependOnFolderKeys: ['repositories', 'services', 'routes'] },
    { filesFromFolderKey: 'repositories', notDependOnFolderKeys: ['services', 'routes'] },
    // { filesFromFolderKey: 'services', notDependOnFolderKeys: ['db'] }, // todo: fix architecture
    { filesFromFolderKey: 'services', notDependOnFolderKeys: ['routes'] },
    { filesFromFolderKey: 'routes', notDependOnFolderKeys: ['db', 'repositories', 'routes'] }
  ];

  cases.forEach(({ filesFromFolderKey, notDependOnFolderKeys }) => {
    describe(filesFromFolderKey, () => {
      notDependOnFolderKeys.forEach(notDependOnFolderKey => {
        it(`${filesFromFolderKey} should not depend on ${notDependOnFolderKey}`, async () => {
          expect(await verifyArchitecture({
            filesFromFolder: folders[filesFromFolderKey],
            notDependOnFolder: folders[notDependOnFolderKey]
          }, 'tsconfig.json')).toEqual([]);
        });
      });
    });
  });
});
```

# Collaborating
### how to publish new version
```shell
npm version patch && npm publish
```