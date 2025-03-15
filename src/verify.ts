import {readdir, readFile} from 'node:fs/promises';

// import { filesOfProject } from 'tsarch';
import * as ts from 'typescript';
import {Violation} from "./Violation";
import {ArchitectureSpec} from "./ArchitectureSpec";
import {Dependency} from "./Dependency";

async function getFiles(folder: string) {
  if (folder.endsWith('/')) throw new Error('folder cannot end in /');
  if (folder === '') throw new Error('folder cannot be empty');

  const files = await readdir(folder, {recursive: true});
  return files.map(file => `${folder}/${file}`);
}

type FileDependencies = {
  file: string,
  dependencies: Dependency[]
}

async function getDependenciesFromFile(file: string): Promise<FileDependencies | null> {
  try {
    const source = await readFile(file);
    const rootNode = ts.createSourceFile(
      file,
      source.toString(),
      ts.ScriptTarget.Latest,
      /*setParentNodes */ true
    );

    return {
      file: file,
      dependencies: rootNode.getChildren().flatMap(c => getDependenciesFromNode(file, c))
    };
  } catch (e: unknown) {
    // @ts-ignore
    if (e.code === 'EISDIR') return null
    throw new Error(`failed to get dependencies from file '${file}': ${e}`);
  }
}

function unLib(dependency: Dependency) {
  // todo: relative depending on tsconfig.json
  return {
    ...dependency,
    referencedSpecifier: dependency.referencedSpecifier.replace(/^\$lib\//, 'src/lib/')
  };
}

const specifierRelativeFile = /^\..*$/;
const specifierNodeModule = /^[^.]/;

/**
 * based on https://stackoverflow.com/a/69210603/820837
 */
function getDependenciesFromNode(path: string, node: ts.Node): Dependency[] {
  switch (node.kind) {
    case ts.SyntaxKind.ExportDeclaration: {
      const exportDeclaration = node as ts.ExportDeclaration;

      if (!exportDeclaration.moduleSpecifier) {
        console.log('ExportDeclaration no moduleSpecifier');
        return [];
      }
      const specifier = (exportDeclaration.moduleSpecifier as ts.StringLiteral).text;

      if (!specifier) {
        console.log('ExportDeclaration no specifier text', specifier);
        return [];
      }
      if (specifierRelativeFile.test(specifier)) {
        return [{
          typeOnly: exportDeclaration.isTypeOnly,
          relativePathReference: true,
          referencingPath: path,
          referencedSpecifier: specifier,
          originalReferencedSpecifier: specifier,
          type: 'export',
        }];
      } else if (specifierNodeModule.test(specifier)) {
        return [{
          typeOnly: exportDeclaration.isTypeOnly,
          relativePathReference: false,
          referencingPath: path,
          referencedSpecifier: specifier,
          originalReferencedSpecifier: specifier,
          type: 'export',
        }];
      } else {
        console.log('ExportDeclaration specifier neither relative nor module', specifier);
        return [];
      }
    }
    case ts.SyntaxKind.ImportDeclaration: {
      const importDeclaration = node as ts.ImportDeclaration;
      const importClause = importDeclaration.importClause;
      const specifier = (importDeclaration.moduleSpecifier as ts.StringLiteral).text;

      if (!specifier) {
        console.log('ImportDeclaration no specifier');
        return [];
      }

      if (specifierRelativeFile.test(specifier)) {
        return [{
          typeOnly: (!!importClause && !importClause.isTypeOnly),
          relativePathReference: true,
          referencingPath: path,
          referencedSpecifier: specifier,
          originalReferencedSpecifier: specifier,
          type: 'import',
        }];
      } else if (specifierNodeModule.test(specifier)) {
        return [{
          typeOnly: (!!importClause && !importClause.isTypeOnly),
          relativePathReference: false,
          referencingPath: path,
          referencedSpecifier: specifier,
          originalReferencedSpecifier: specifier,
          type: 'import',
        }];
      } else {
        console.log('ImportDeclaration specifier neither relative nor module', specifier);
        return [];
      }
    }
    case ts.SyntaxKind.CallExpression: {
      const callExpression = node as ts.CallExpression;

      if (!((callExpression.expression.kind === ts.SyntaxKind.ImportKeyword ||
          (callExpression.expression.kind === ts.SyntaxKind.Identifier &&
            callExpression.expression.getText() === 'require')) &&
        callExpression.arguments[0]?.kind === ts.SyntaxKind.StringLiteral)) {
        return node.getChildren().flatMap(c => getDependenciesFromNode(path, c));
      }

      const specifier = (callExpression.arguments[0] as ts.StringLiteral).text;

      if (specifierRelativeFile.test(specifier)) {
        return [{
          typeOnly: false,
          relativePathReference: true,
          referencingPath: path,
          referencedSpecifier: specifier,
          originalReferencedSpecifier: specifier,
          type: 'call',
        }];
      } else if (specifierNodeModule.test(specifier)) {
        return [{
          typeOnly: false,
          relativePathReference: false,
          referencingPath: path,
          referencedSpecifier: specifier,
          originalReferencedSpecifier: specifier,
          type: 'call',
        }];
      } else {
        return node.getChildren().flatMap(c => getDependenciesFromNode(path, c));
      }
    }
    default: {
      return node.getChildren().flatMap(c => getDependenciesFromNode(path, c));
    }
  }
}

export async function verifyArchitecture(spec: ArchitectureSpec): Promise<Violation[]> {
  const codeFileExtensions = ['.ts', '.js']
  const filesFromFolder = (await getFiles(spec.filesFromFolder))
    .filter(file => codeFileExtensions.filter(ext => file.endsWith(ext)).length);
  const parsedFileDependencies = await Promise.all(filesFromFolder.map(getDependenciesFromFile));

  const dependenciesFromFolder = parsedFileDependencies
    .filter(d => d !== null)
    .map(f => ({
      ...f, dependencies: f.dependencies
        .map(unLib)
      // todo: store 'original' before unlib and unrelative
      // todo: unRelative (aka handle relative paths)
    }))
  ;

  const violations: Violation[] = dependenciesFromFolder
    .map(f => {
      const notAllowed = f.dependencies.filter(({referencedSpecifier}) => referencedSpecifier.startsWith(spec.notDependOnFolder));
      if (notAllowed.length) {
        return {
          file: f.file,
          message: `should not depend on folder ${spec.notDependOnFolder}`,
          notAllowedDependencies: notAllowed,
          // todo: remove referencingPath
          // todo: rename: referencedSpecifier to imported module
          // todo: fix typeOnly seems inverse
          // todo: handle relative paths
        };
      }
      return null;
    })
    .filter(v => v !== null);
  return violations;
}
