import { coerceBooleanProperty } from "@angular/cdk/coercion";

import { DropdownOption } from "./cinchy-dropdown-options";


export class DropdownDataset {

  isDummy: boolean;

  options: Array<DropdownOption>;

  constructor(
    options: Array<DropdownOption>,
    isDummy = false
  ) {

    this.isDummy = coerceBooleanProperty(isDummy);
    this.options = options || [];
  }
}
