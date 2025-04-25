import * as assert from 'assert';
import {verifyArchitecture} from "./verify";

describe('verify', function () {
	const tsconfig = 'testdata/tsconfig-inheritance/tsconfig.json'

	const folders: Record<string, string> = {
		db: 'src/lib/db',
		repositories: 'src/lib/repositories',
		services: 'src/lib/services',
		relativeImport: 'src/lib/relativeImport',
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

	it('should return violations when NOT ok - relative import', async function () {
		let violations = await verifyArchitecture({
			filesFromFolder: folders['repositories'],
			notDependOnFolder: folders['relativeImport']
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

describe('type-only', function () {
	const tsconfig = 'testdata/type-only/tsconfig.json'

	const folders: Record<string, string> = {
		db: 'src/db',
		both: 'src/imports-both-types-and-code',
		typeInside: 'src/only-imports-types-inside-curly-braces',
		typeOutside: 'src/only-imports-types-outside-curly-braces',
		namespaceType: 'src/namespace-import-type-only',
		namespaceCode: 'src/namespace-import-code',
	};

	function expected(fromFolder: string, expectTypeOnly: boolean) {
		return [{
			"file": `${fromFolder}/code.ts`,
			"message": "should not depend on folder src/db",
			"notAllowedDependencies": [
				{
					"importedModule": "src/db/some-lib",
					"originalImportedModule": "../db/some-lib",
					"relativePathReference": true,
					"type": "import",
					"typeOnly": expectTypeOnly,
				}
			]
		}]
	}

	function act(fromFolder: string) {
		return verifyArchitecture({
			filesFromFolder: fromFolder,
			notDependOnFolder: folders['db']
		}, tsconfig);
	}

	it('should not type only when imports code', async function () {
		const fromFolder = folders['both'];
		const expectTypeOnly = false;
		const violations = await act(fromFolder);
		assert.deepEqual(violations, expected(fromFolder, expectTypeOnly));
	})

	it('should type only when imports type only entire line (aka outside curly braces)', async function () {
		const fromFolder = folders['typeOutside'];
		const expectTypeOnly = true;
		const violations = await act(fromFolder);
		assert.deepEqual(violations, expected(fromFolder, expectTypeOnly));
	})

	it('should type only when only imports type inside curly braces', async function () {
		const fromFolder = folders['typeInside'];
		const expectTypeOnly = true;
		const violations = await act(fromFolder);
		assert.deepEqual(violations, expected(fromFolder, expectTypeOnly));
	})

	describe('namespace import', ()=>{

		it('should not type only when imports code', async function () {
			const fromFolder = folders['namespaceCode'];
			const expectTypeOnly = false;
			const violations = await act(fromFolder);
			assert.deepEqual(violations, expected(fromFolder, expectTypeOnly));
		})

		it('should type only when only imports type', async function () {
			const fromFolder = folders['namespaceType'];
			const expectTypeOnly = true;
			const violations = await act(fromFolder);
			assert.deepEqual(violations, expected(fromFolder, expectTypeOnly));
		})
	})
});
