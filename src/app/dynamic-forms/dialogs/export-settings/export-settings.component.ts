import { Component, Inject } from "@angular/core";
import { MatDialogRef, MAT_DIALOG_DATA } from "@angular/material/dialog";

import { PageOrientation } from "../../enums/page-orientation.enum";

import { IExportSettings } from "../../interface/export-settings";


@Component({
  selector: "export-settings-dialog",
  templateUrl: "./export-settings.component.html",
  styleUrls: ["./export-settings.component.scss"]
})
export class ExportSettingsDialogComponent {

  settings: IExportSettings;


  get isPortrait(): boolean {

    return (this.settings.pageOrientation === PageOrientation.Portrait);
  }


  constructor(
    public dialogRef: MatDialogRef<ExportSettingsDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: IExportSettings
  ) {

    // Set defaults
    this.settings = {
      pageOrientation: this.data.pageOrientation ?? PageOrientation.Portrait
    };
  }


  /**
   * Discards the dialog and its contents
   */
  cancel(): void {

    this.dialogRef.close();
  }


  /**
   * Passes the selected settings back to the parent component for processing
   */
  confirm(): void {

    this.dialogRef.close(this.settings);
  }


  /**
   * Sets the print mode to landscape
   */
  setLandscape(): void {

    this.settings.pageOrientation = PageOrientation.Landscape;
  }


  /**
   * Sets the print mode to portrait
   */
  setPortrait(): void {

    this.settings.pageOrientation = PageOrientation.Portrait;
  }
}
