import { Component, Inject } from '@angular/core';
import { MatDialogRef, MAT_DIALOG_DATA } from "@angular/material/dialog";

import { IRichTextImage } from '../../interface/rich-text-image';


@Component({
  selector: 'app-add-rich-text-image',
  templateUrl: './add-rich-text-image.component.html',
  styleUrls: ['./add-rich-text-image.component.scss']
})
export class AddRichTextImageDialogComponent {

  src: string;


  get canSave(): boolean {

    return this.src ? true : false;
  }


  constructor(
    public dialogRef: MatDialogRef<AddRichTextImageDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: IRichTextImage
  ) {

    this.src = data.src;
  }


  cancel(): void {

    this.dialogRef.close();
  }


  saveImageDetails(): void {

    if (this.canSave) {
      this.dialogRef.close({
        src: this.src
      } as IRichTextImage);
    }
  }
}
