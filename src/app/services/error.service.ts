import { Injectable } from "@angular/core";


@Injectable({
  providedIn: 'root'
})
export class ErrorService {

  /**
   * Gets the most descriptive error message available in the given error
   */
  getErrorMessage(error: any): string {

    const message = error?.cinchyException?.data?.details || null;
    const details = error?.cinchyException?.message || error?.message || null;

    const messageId = new Date().valueOf();

    if (message && details) {
      return `${message}<br /><br />${details}`;
    }
    else {
      return `${message || details}`;
    }
  }
}
