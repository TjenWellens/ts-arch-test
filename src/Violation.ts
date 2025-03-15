import {Dependency} from "./Dependency";

export type Violation = {
  file: string,
  message: string
  notAllowedDependencies: Dependency[]
}