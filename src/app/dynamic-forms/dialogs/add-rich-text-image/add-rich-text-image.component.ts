import { Component, Inject } from '@angular/core';
import { MatDialogRef, MAT_DIALOG_DATA } from "@angular/material/dialog";
import { IRichTextLink } from "../../interface/rich-text-link";

import { isNullOrUndefined } from "util";
@Component({
  selector: 'app-add-rich-text-image',
  templateUrl: './add-rich-text-image.component.html',
  styleUrls: ['./add-rich-text-image.component.scss']
})
export class AddRichTextImageComponent {

  content: string;

  href: string;

  targetBlank = true;


  get canSave(): boolean {

    return !isNullOrUndefined(this.href && this.content);
  }


  constructor(
    public dialogRef: MatDialogRef<AddRichTextImageComponent>,
    @Inject(MAT_DIALOG_DATA) public data: IRichTextLink
  ) {

    this.content = data.content;
  }


  cancel(): void {

    this.dialogRef.close();
  }


  saveImageDetails(): void {

    if (this.canSave) {
      this.dialogRef.close({
        content: this.content,
        href: this.href,
        targetBlank: this.targetBlank
      } as IRichTextLink);
    }
  }

}
