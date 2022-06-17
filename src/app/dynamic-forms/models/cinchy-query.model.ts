export interface IQuery {
  query: string;
  params: { [key: string]: any };
  attachedFilesInfo?: [{ domain: string; table: string; column: string; fileName: string }];
}

export class Query implements IQuery {
  constructor(public query: string, public params: { [key: string]: any }, public attachedFilesInfo?) {
  }
}
