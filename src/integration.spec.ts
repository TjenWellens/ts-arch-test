import {verifyArchitecture} from './verify';
import {expect} from 'chai';

describe('Architecture test', () => {
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
        it(`services should not depend on ${notDependOnFolderKey}`, async () => {
          expect(await verifyArchitecture({
            filesFromFolder: folders[filesFromFolderKey],
            notDependOnFolder: folders[notDependOnFolderKey]
          }, 'tsconfig.json')).to.deep.equal([]);
        });
      });
    });
  });
});