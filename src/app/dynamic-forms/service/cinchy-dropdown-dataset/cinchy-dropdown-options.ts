export interface IDropdownOption {
  id: string;
  label: string;
  group: string;
  displayOnlyLabel?: any
}

export class DropdownOption implements IDropdownOption {
  public group: string;

  constructor(public id: string, public label: string, public displayOnlyLabel?: any) {

  }
}
