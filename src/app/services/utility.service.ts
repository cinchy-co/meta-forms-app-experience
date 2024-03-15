import { Injectable } from "@angular/core";

import { ToastrService } from "ngx-toastr";


@Injectable({
  providedIn: 'root'
})
export class UtilityService {

  constructor(
    private _toastrService: ToastrService
  ) {}


  /**
   * Displays the given error message as a toast
   */
  displayErrorMessage(message: string, error: any): void {

    this._toastrService.error(`${message}. ${this.getErrorMessage(error)}`, "Error");
  }

  /**
   * Gets the most descriptive error message available in the given error
   */
  getErrorMessage(error: any): string {

    // DEBUG
    console.log(error);

    return error?.cinchyException?.data?.details || error.error?.message || error.body?.errorMessage || error.message;
  }
}
