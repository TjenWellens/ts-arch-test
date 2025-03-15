export type Dependency = {
  typeOnly: boolean
  relativePathReference: boolean
  importedModule: string
  originalImportedModule: string
  type: 'import' | 'call' | 'export'
}