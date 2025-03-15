export type Dependency = {
  typeOnly: boolean
  relativePathReference: boolean
  referencingPath: string
  referencedSpecifier: string
  originalReferencedSpecifier: string
  type: 'import' | 'call' | 'export'
}