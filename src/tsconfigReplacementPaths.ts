import {readFile} from "node:fs/promises";
import * as path from 'node:path';
import * as JSON5 from 'json5'

type Tsconfig = {
  compilerOptions?: {
    paths?: { string: string }
  },
  extends?: string
}

type PathReplacement = {
  from: string, to: string
}

/**
 * inspired by new URL(url: string | url, base?: string | url), but for paths
 */
export function relativeResolve(file: string, baseFile: string) {
  let dir = path.dirname(baseFile);
  return path.normalize(`${dir}/${file}`)
}

export function relativeResolveTsconfigPaths(base: string, _extends: string, to:string):string {
  const parentTsconfig = relativeResolve(_extends, base);
  const fullRelativePath = relativeResolve(to, parentTsconfig);
  return path.relative(path.dirname(base), fullRelativePath)
}

export async function _tsconfigPathReplacements(tsconfigFilename: string) {
  const tsconfigContent = await readFile(tsconfigFilename, 'utf8');
  const tsconfig = JSON5.parse(tsconfigContent) as Tsconfig;
  const pathReplacements: PathReplacement[] = []

  if (tsconfig.extends) {
    const _extends = tsconfig.extends
    const inheritFromParentFilename = path.resolve(path.dirname(tsconfigFilename), _extends);
    const inheritedReplacements = await _tsconfigPathReplacements(inheritFromParentFilename);
    const normalized: PathReplacement[] = inheritedReplacements.map(rep => ({
      ...rep,
      to: relativeResolveTsconfigPaths(tsconfigFilename, _extends, rep.to),
    }))
    pathReplacements.push(...normalized)
  }

  let paths = tsconfig.compilerOptions?.paths;
  if (paths) {
    const replacements = Object.entries(paths)
      .map(([key, value]) => {
        if(value.length !== 1) {
          throw new Error(`we cannot handle '${tsconfigFilename}' with multiple values for a compilerOptions.paths.xxx[]; "${key}" must be array.length == 1`);
        }
        return ({
          from: key,
          to: value[0]
        });
      });
    pathReplacements.push(...replacements)
  }
  return pathReplacements;
}

export async function tsconfigReplacementPaths(tsconfig: string = 'tsconfig.json') {
  return await _tsconfigPathReplacements(tsconfig)
}