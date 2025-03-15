export type Dependency = {
  typeOnly: boolean
  relativePathReference: boolean
  referencedSpecifier: string
  originalReferencedSpecifier: string
  type: 'import' | 'call' | 'export'
}