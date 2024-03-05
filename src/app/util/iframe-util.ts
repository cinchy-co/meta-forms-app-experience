/**
 * Utility wrapper for managing embedded iframes
 */
export class IframeUtil {

  /**
   * The frame height needs to be available on-demand since we don't know what the timing of the API calls that populate
   * the DOM will be
   */
  static get fullScreenHeight(): string {

    if (IframeUtil._fullScreenHeight) {
      return ((window.location === window.parent.location) ? "" : `${IframeUtil._fullScreenHeight}px`);
    }

    return "";
  }
  private static _fullScreenHeight: string;


  /**
   * This fallback exists primarily to allow the index.html file, which does not have an Angular context at its root level,
   * to have hte frame height correctly applied to the body element.
   */
  static setFrameHeight(value: string): void {

    IframeUtil._fullScreenHeight = value;

    localStorage.setItem("cinchy-fullScreenHeight", value || "");

    const elements = document.getElementsByClassName("full-height-element");

    for (let i = 0; i < elements.length; i++) {
        elements[i]["style"].height = `${IframeUtil.fullScreenHeight}px`;
    }
  };
}
