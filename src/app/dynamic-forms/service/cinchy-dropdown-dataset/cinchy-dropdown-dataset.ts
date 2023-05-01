import { DropdownOption } from "./cinchy-dropdown-options";


export class DropdownDataset {

  options: Array<DropdownOption>;

  constructor(options: Array<DropdownOption>) {

    this.options = options || [];
  }
}
