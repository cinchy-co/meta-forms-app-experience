import { Component, Inject } from "@angular/core";
import { MatDialogRef, MAT_DIALOG_DATA } from "@angular/material/dialog";


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
