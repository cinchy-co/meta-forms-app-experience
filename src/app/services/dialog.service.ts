import {Injectable} from '@angular/core';
import {MatLegacyDialog as MatDialog} from '@angular/material/legacy-dialog';

@Injectable({
  providedIn: 'root'
})
export class DialogService {
  defaultOptions = {
    width: '1200px'
  };

  constructor(private dialog: MatDialog) {
  }

  openDialog(component, data?, options?) {
    const configOptions = {
      ...this.defaultOptions, ...options
    };
    const dialogRef = this.dialog.open(component, {
      width: configOptions.width,
      height: configOptions.height,
      data
    });
    return dialogRef;
  }
}
