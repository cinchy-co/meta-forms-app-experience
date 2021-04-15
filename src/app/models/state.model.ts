export interface IContact {
  fullName: string;
  sentiment?: string;
  id?: string;
  title?:string;
}


export interface IGetQuery {
  queryResult: any,
  callbackState: any
}

export interface IToggleButton {
  displayValue: string;
  value: string | number | boolean;
}
