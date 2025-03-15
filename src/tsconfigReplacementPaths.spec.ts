import {_tsconfigPathReplacements, relativeResolve, relativeResolveTsconfigPaths} from "./tsconfigReplacementPaths";
import * as path from 'node:path';
import * as assert from 'assert';

describe('tsconfig', function () {
  describe('relativeResolve()', function () {
    it('sibling', async function () {
      let from = 'grandparent/parent/child.txt';
      let toSibling = 'sibling.txt';
      assert.equal(relativeResolve(toSibling, from)
        , 'grandparent/parent/sibling.txt');
    })

    it('parent', async function () {
      let from = './grandparent/parent/child.txt';
      let toOtherParent = '../otherParent.txt';
      assert.equal(relativeResolve(toOtherParent, from)
        , 'grandparent/otherParent.txt');
    });

    it('tsconfig extends', async function () {
      let _base = './testdata/tsconfig-inheritance/tsconfig.json';
      let _extents = './parent/tsconfig.json';
      assert.equal(relativeResolve(_extents, _base)
        , 'testdata/tsconfig-inheritance/parent/tsconfig.json');
    });

    it('???', async function () {
      let _base = 'testdata/tsconfig-inheritance/parent/tsconfig.json';
      let _extents = '../src/lib';
      assert.equal(relativeResolve(_extents, _base)
        , 'testdata/tsconfig-inheritance/src/lib');
    });
  })

  it('relativeResolveTsconfigPaths() double', async function () {
    let _base = './testdata/tsconfig-inheritance/tsconfig.json';
    let _extends = './parent/tsconfig.json';
    let _to = '../src/lib';
    assert.equal(relativeResolveTsconfigPaths(_base, _extends, _to)
      , 'src/lib');
  });

  describe('path library', function () {
    it('dirname()', async function () {
      assert.equal(path.dirname('./grandparent/parent/sibling.txt'), './grandparent/parent');
      assert.equal(path.dirname('./grandparent/parent/'), './grandparent');
      assert.equal(path.dirname('./grandparent/parent'), './grandparent');
    });
    it('normalize()', async function () {
      assert.equal(path.normalize('./grandparent/parent/sibling.txt'), 'grandparent/parent/sibling.txt');
      assert.equal(path.normalize('./grandparent/parent/../uncle.txt'), 'grandparent/uncle.txt');
      assert.equal(path.normalize('./grandparent/parent/./child.txt'), 'grandparent/parent/child.txt');
    });
  });

  describe('_tsconfigPathReplacements', function () {
    it('inheritance', async function () {
      const tsconfigFilename = './testdata/tsconfig-inheritance/tsconfig.json';
      const replacements = await _tsconfigPathReplacements(tsconfigFilename)
      assert.deepEqual(replacements, [{
        from: '$lib',
        to: 'src/lib'
      },
        {
          from: '$lib/*',
          to: 'src/lib/*'
        }]);
    });
  });
});