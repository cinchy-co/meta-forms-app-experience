import { Component, Inject } from "@angular/core";
import { MatDialogRef, MAT_DIALOG_DATA } from "@angular/material/dialog";

import { IRichTextLink } from "../../interface/rich-text-link";

import { isNullOrUndefined } from "util";


@Component({
  selector: "add-rich-text-link-dialog",
  templateUrl: "./add-rich-text-link.component.html",
  styleUrls: ["./add-rich-text-link.component.scss"]
})
export class AddRichTextLinkDialogComponent {

  content: string;

  href: string;

  targetBlank: boolean = true;


  /**
   * Determines whether or not the dialog is in a state where it can be saved
   */
  get canSave(): boolean {

    return !isNullOrUndefined(this.href && this.content);
  }


  constructor(
    public dialogRef: MatDialogRef<AddRichTextLinkDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: IRichTextLink
  ) {

    this.content = data.content;
  }


  /**
   * Closes the dialog without saving
   */
  cancel(): void {

    this.dialogRef.close();
  }


  /**
   * Passes the entered data back to the parent component for processing
   */
  saveLinkDetails(): void {

    if (this.canSave) {
      this.dialogRef.close({
        content: this.content,
        href: this.href,
        targetBlank: this.targetBlank
      } as IRichTextLink);
    }
  }
}
