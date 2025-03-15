# ts-arch-test
test architecture dependencies

very unstable, work in progress


example use
```typescript
import { describe, expect, it } from 'vitest';
import { verifyArchitecture } from 'ts-arch-test';

describe('Architecture test', () => {
  it('services should not depend on db', async () => {
    expect(await verifyArchitecture({
      filesFromFolder: 'src/lib/server/services',
      notDependOnFolder: 'src/lib/server/db'
    })).toEqual([]);
  });
});
```