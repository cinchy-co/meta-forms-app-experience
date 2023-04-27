import { IDropdownOption } from "./cinchy-dropdown-options";


export class DropdownDataset {

  options: Array<IDropdownOption>;

  constructor(options: Array<IDropdownOption>) {

    this.options = options || [];
  }
}
