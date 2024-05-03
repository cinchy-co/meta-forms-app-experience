import { Component, Inject } from "@angular/core";
import { MatLegacyDialogRef as MatDialogRef, MAT_LEGACY_DIALOG_DATA as MAT_DIALOG_DATA } from "@angular/material/legacy-dialog";


@Component({
  selector: "message-dialog",
  templateUrl: "./message.component.html",
  styleUrls: ["./message.component.scss"]
})
export class MessageDialogComponent {

  constructor(
    public dialogRef: MatDialogRef<MessageDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: {
      message: string,
      title: string
    }
  ) {}


  cancel(): void {

    this.dialogRef.close();
  }


  confirm(): void {

    this.dialogRef.close(true);
  }
}
