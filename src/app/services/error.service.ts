import { Injectable } from "@angular/core";


@Injectable({
  providedIn: 'root'
})
export class ErrorService {

  /**
   * Gets the most descriptive error message available in the given error
   */
  getErrorMessage(error: any): string {

    let message = error?.cinchyException?.message ?? error?.message ?? "";

    if (error?.cinchyException?.data?.details) {
      message += `${message ? "<br /><br />" : ""}${error.cinchyException.data.details}`;
    }

    return message;
  }
}
