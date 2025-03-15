import {db1data} from "$lib/db/db1";
import {relativeImportedData} from "../relativeImport/relative";

export const repo1data = {
  fromdb: db1data,
  fromRelative: relativeImportedData,
  fromme: 'hello from repo 1'
}