export interface IQuery {
  query: string;
  params: { [key: string]: any };
  attachedFilesInfo?: [{ domain: string; table: string; column: string; fileName: string }];
  childFormParentIdInfo?: { childFormParentId: string; childFormLinkId: string };
}

export class Query implements IQuery {
  constructor(public query: string, public params: { [key: string]: any }, public attachedFilesInfo?, public childFormParentIdInfo?) {
  }
}
