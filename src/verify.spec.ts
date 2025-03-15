import * as assert from 'assert';
import {verifyArchitecture} from "./verify";

describe('verify', function () {
  const tsconfig = 'testdata/tsconfig-inheritance/tsconfig.json'

  const folders: Record<string, string> = {
    db: 'src/lib/db',
    repositories: 'src/lib/repositories',
    services: 'src/lib/services',
  };

  it('should not return violations when ok', async function () {
    let violations = await verifyArchitecture({
      filesFromFolder: folders['db'],
      notDependOnFolder: folders['repositories']
    }, tsconfig);

    assert.deepEqual(violations, []);
  })

  it('should crash when notDependOnFolder does not exist', async function () {
    try {
      await verifyArchitecture({
        filesFromFolder: folders['repositories'],
        notDependOnFolder: 'doesNotExist'
      }, tsconfig);
    } catch (e) {
      return
    }
    assert.fail('should throw error');
  })

  it('should return violations when NOT ok', async function () {
    let violations = await verifyArchitecture({
      filesFromFolder: folders['repositories'],
      notDependOnFolder: folders['db']
    }, tsconfig);

    assert.equal(violations.length, 1);
  })

  // it('let it crash for debug', async function () {
  //   let violations = await verifyArchitecture({
  //     filesFromFolder: folders['repositories'],
  //     notDependOnFolder: folders['db']
  //   }, tsconfig);
  //
  //   assert.deepEqual(violations, []);
  // })
});