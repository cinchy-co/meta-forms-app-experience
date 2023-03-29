export class IframeUtil {

  static setFrameHeight(height: string): void {

    const elements = document.getElementsByClassName("full-height-element");

    for (let i = 0; i < elements.length; i++) {
      setTimeout(() => {

        elements[i]["style"].height = `${height}px`;
      }, 500);
    }
  };
}
