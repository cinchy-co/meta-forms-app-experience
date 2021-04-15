import { IDropdownOption } from "./cinchy-dropdown-options";
import { isNullOrUndefined } from "util";

export interface IDropdownDataset {
    options: Array<IDropdownOption>;
}

export class DropdownDataset implements IDropdownDataset {
    options: Array<IDropdownOption>;

    constructor(options: Array<IDropdownOption>) {
        if (isNullOrUndefined(options)) {
            this.options = [];
        } else {
            this.options = options;
        }
    }
}
