import {access, readdir, readFile} from 'node:fs/promises';
import * as ts from 'typescript';
import {Violation} from "./Violation";
import {ArchitectureSpec} from "./ArchitectureSpec";
import {Dependency} from "./Dependency";
import {PathReplacement, relativeResolve, tsconfigReplacementPaths} from "./tsconfigReplacementPaths";
import * as path from "node:path";
import {EOL} from "node:os";

type FilePathInfo = {
  extension: string
  relativeToPWDPath: string
  relativeToTsconfigPath: string // the nice one
  absolutePath: string
}

async function getFiles(folder: string, relativeToTsconfigFile: string): Promise<FilePathInfo[]> {
  if (folder === '') throw new Error('folder cannot be empty');

  let projectRoot = path.dirname(relativeToTsconfigFile);
  let absoluteFolderPath = path.resolve(projectRoot, folder);

  // verify exists
  await access(absoluteFolderPath)

  const files = await readdir(absoluteFolderPath, {recursive: true});
  return files.map(file => {
    const extension = path.extname(file)
    const relativeToTsconfigPath = `${folder}/${file}`
    const relativeToPWDPath = path.relative(relativeToTsconfigPath, absoluteFolderPath);
    const absolutePath = `${absoluteFolderPath}/${file}`
    return {
      extension,
      relativeToTsconfigPath,
      relativeToPWDPath,
      absolutePath,
    };
  });
}

type FileDependencies = {
  file: string,
  dependencies: Dependency[]
}

async function getDependenciesFromFile(file: FilePathInfo): Promise<FileDependencies | null> {
  try {
    const source = await readFile(file.absolutePath);
    const rootNode = ts.createSourceFile(
      file.absolutePath,
      source.toString(),
      ts.ScriptTarget.Latest,
      /*setParentNodes */ true
    );

    return {
      file: file.relativeToTsconfigPath,
      dependencies: rootNode.getChildren().flatMap(c => getDependenciesFromNode(file, c))
    };
  } catch (e: unknown) {
    // @ts-ignore
    if (e.code === 'EISDIR') return null
    throw new Error(`failed to get dependencies from file '${file}': ${e}`);
  }
}

const specifierRelativeFile = /^\..*$/;
const specifierNodeModule = /^[^.]/;

/**
 * based on https://stackoverflow.com/a/69210603/820837
 */
function getDependenciesFromNode(path: FilePathInfo, node: ts.Node): Dependency[] {
  switch (node.kind) {
    case ts.SyntaxKind.ExportDeclaration: {
      const exportDeclaration = node as ts.ExportDeclaration;

      if (!exportDeclaration.moduleSpecifier) {
        console.warn('ExportDeclaration no moduleSpecifier');
        return [];
      }
      const specifier = (exportDeclaration.moduleSpecifier as ts.StringLiteral).text;

      if (!specifier) {
        console.warn('ExportDeclaration no specifier text', specifier);
        return [];
      }
      if (specifierRelativeFile.test(specifier)) {
        return [{
          typeOnly: exportDeclaration.isTypeOnly,
          relativePathReference: true,
          importedModule: specifier,
          originalImportedModule: specifier,
          type: 'export',
        }];
      } else if (specifierNodeModule.test(specifier)) {
        return [{
          typeOnly: exportDeclaration.isTypeOnly,
          relativePathReference: false,
          importedModule: specifier,
          originalImportedModule: specifier,
          type: 'export',
        }];
      } else {
        console.warn('ExportDeclaration specifier neither relative nor module', specifier);
        return [];
      }
    }
    case ts.SyntaxKind.ImportDeclaration: {
      const importDeclaration = node as ts.ImportDeclaration;
      const importClause = importDeclaration.importClause;
      const specifier = (importDeclaration.moduleSpecifier as ts.StringLiteral).text;

      if (!specifier) {
        console.warn('ImportDeclaration no specifier');
        return [];
      }

      if (specifierRelativeFile.test(specifier)) {
        return [{
          typeOnly: (importClause?.isTypeOnly || false),
          relativePathReference: true,
          importedModule: specifier,
          originalImportedModule: specifier,
          type: 'import',
        }];
      } else if (specifierNodeModule.test(specifier)) {
        return [{
          typeOnly: (importClause?.isTypeOnly || false),
          relativePathReference: false,
          importedModule: specifier,
          originalImportedModule: specifier,
          type: 'import',
        }];
      } else {
        console.warn('ImportDeclaration specifier neither relative nor module', specifier);
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
          importedModule: specifier,
          originalImportedModule: specifier,
          type: 'call',
        }];
      } else if (specifierNodeModule.test(specifier)) {
        return [{
          typeOnly: false,
          relativePathReference: false,
          importedModule: specifier,
          originalImportedModule: specifier,
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

function createUnRelative(f: FileDependencies) {
  return function unRelative(dependency: Dependency): Dependency {
    if (dependency.importedModule.startsWith('.')) {
      return {
        ...dependency,
        importedModule: relativeResolve(dependency.importedModule, f.file)
      }
    } else {
      return dependency;
    }
  }
}

function createUnCompilerOptionsPaths(replacements: PathReplacement[]) {
  return function unCompilerOptionsPaths(dependency: Dependency): Dependency {
    const replacement = replacements.find(r => dependency.importedModule.startsWith(r.from))
    if (replacement) {
      return {
        ...dependency,
        importedModule: dependency.importedModule.replace(replacement.from, replacement.to)
      };
    } else {
      return dependency;
    }
  }
}

export function clickableErrorMessage(spec: ArchitectureSpec, violations: Violation[]) {
  const lineNumber = 0; //todo: get first actual line number
  const clickableFilenames = violations
    .map(v => v.file)
    .map(filename => `${filename}:${lineNumber}`)

  return `these files should NOT depend on ${spec.notDependOnFolder}${EOL}${clickableFilenames.join(EOL)}${EOL}`
}

export async function verifyArchitecture(spec: ArchitectureSpec, tsconfig: string = 'tsconfig.json'): Promise<Violation[]> {
  try {
    await access(path.resolve(path.dirname(tsconfig), spec.notDependOnFolder))
  } catch (e) {
    throw new Error(`ArchitectureSpec.notDependOnFolder must exist: ${spec.notDependOnFolder}`);
  }

  const codeFileExtensions = ['.ts', '.js'] // todo get from tsconfig?
  const filesFromFolder = (await getFiles(spec.filesFromFolder, tsconfig))
    .filter(file => codeFileExtensions.filter(ext => file.extension.endsWith(ext)).length);
  const parsedFileDependencies = await Promise.all(filesFromFolder.map(getDependenciesFromFile));

  const replacements = await tsconfigReplacementPaths(tsconfig)

  const dependenciesFromFolder: FileDependencies[] = parsedFileDependencies
    .filter(d => d !== null)
    .map(f => ({
      ...f, dependencies: f.dependencies
        .map(createUnCompilerOptionsPaths(replacements))
        .map(createUnRelative(f))
    }));

  const violations: Violation[] = dependenciesFromFolder
    .map(f => {
      const notAllowed = f.dependencies.filter(({importedModule}) => importedModule.startsWith(spec.notDependOnFolder));
      if (notAllowed.length) {
        return {
          file: f.file,
          message: `should not depend on folder ${spec.notDependOnFolder}`,
          notAllowedDependencies: notAllowed,
          // todo: fix typeOnly seems inverse
        };
      }
      return null;
    })
    .filter(v => v !== null);
  return violations;
}
