import {verifyArchitecture} from './verify';
import {expect} from 'chai';

describe('Architecture test', () => {
  it('single case', async () => {
    expect(await verifyArchitecture({
      filesFromFolder: 'testdata/tsconfig-inheritance/src/lib/db',
      notDependOnFolder: 'testdata/tsconfig-inheritance/src/lib/services'
    }, 'tsconfig.json')).to.deep.equal([]);
  })

  const folders: Record<string, string> = {
    db: 'testdata/tsconfig-inheritance/src/lib/db',
    repositories: 'testdata/tsconfig-inheritance/src/lib/repositories',
    services: 'testdata/tsconfig-inheritance/src/lib/services',
  };

  const cases = [
    {filesFromFolderKey: 'db', notDependOnFolderKeys: ['repositories', 'services']},
    {filesFromFolderKey: 'repositories', notDependOnFolderKeys: ['services']},
    {filesFromFolderKey: 'services', notDependOnFolderKeys: ['db']}
  ];

  cases.forEach(({filesFromFolderKey, notDependOnFolderKeys}) => {
    describe(filesFromFolderKey, () => {
      notDependOnFolderKeys.forEach(notDependOnFolderKey => {
        it(`${filesFromFolderKey} should not depend on ${notDependOnFolderKey}`, async () => {
          expect(await verifyArchitecture({
            filesFromFolder: folders[filesFromFolderKey],
            notDependOnFolder: folders[notDependOnFolderKey]
          }, 'tsconfig.json')).to.deep.equal([]);
        });
      });
    });
  });
});