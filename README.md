# ts-arch-test
test architecture dependencies

very unstable, work in progress


example use
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
    { filesFromFolderKey: 'services', notDependOnFolderKeys: ['db', 'routes'] },
    { filesFromFolderKey: 'routes', notDependOnFolderKeys: ['db', 'repositories', 'routes'] }
  ];

  cases.forEach(({ filesFromFolderKey, notDependOnFolderKeys }) => {
    describe(filesFromFolderKey, () => {
      notDependOnFolderKeys.forEach(notDependOnFolderKey => {
        it(`services should not depend on ${notDependOnFolderKey}`, async () => {
          expect(await verifyArchitecture({
            filesFromFolder: folders[filesFromFolderKey],
            notDependOnFolder: folders[notDependOnFolderKey]
          })).toEqual([]);
        });
      });
    });
  });
});
```