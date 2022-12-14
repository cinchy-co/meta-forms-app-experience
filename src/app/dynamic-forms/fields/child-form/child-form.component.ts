import { Component, Inject, EventEmitter } from '@angular/core';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';

import { DropdownDatasetService } from '../../service/cinchy-dropdown-dataset/cinchy-dropdown-dataset.service';

import { isNullOrUndefined } from 'util';


//#region Cinchy Dynamic Child Form
/**
 * This section is used to create cinchy child form.
 */
//#endregion
@Component({
  selector: "cinchy-child-form",
  templateUrl: "./child-form.component.html",
  styleUrls: ["./child-form.component.scss"],
  // TODO Need to set this environment Dynamically
  providers: [DropdownDatasetService]
})
export class ChildFormComponent {
  public data: any;
  public datachild = [];
  public cinchyID = null;
  public fieldName = '';
  public fieldValue = '';
  eventHandler = new EventEmitter();

  constructor(
    public dialogRef: MatDialogRef<ChildFormComponent>,
    @Inject(MAT_DIALOG_DATA) public _ChildFormData: any
  ) {
  }

  ngOnInit() {
    // bind and load child form.
    let obj = this._ChildFormData.values;
    this._ChildFormData.childFormData.sections.forEach(section => {
      const linkedColumn = section['LinkedColumnDetails'];
      section.fields.forEach(element => {
        element.noPreSelect = false;
        if (!element.cinchyColumn.isDisplayColumn) {
          if (linkedColumn && (linkedColumn.linkLabel == element.label)) {
            if (linkedColumn.linkValue) {
              element.value = element.value ? element.value : linkedColumn.linkValue;
            }
            element.value = element.value ? element.value : Number(this._ChildFormData.rowId);
            linkedColumn.linkedElement.value = linkedColumn.linkedElement.value ? linkedColumn.linkedElement.value : Number(this._ChildFormData.rowId);
          }
          if (!isNullOrUndefined(obj)) {
            // bind dropdown values
            if (element.cinchyColumn.dataType === 'Link') {
              if (!isNullOrUndefined(element['dropdownDataset'])) {
                if (!element.value) { // When element value is not there but obj can have value and we have dropdown set
                  element.noPreSelect = false;
                  let dropdownResult = element['dropdownDataset'].options.find(e => e.label == obj[element.cinchyColumn.name]);
                  if (!isNullOrUndefined(dropdownResult)) {
                    element.value = dropdownResult['id'];
                  } else { // Incase obj has multiple names and dropdown has those names in sepratae options
                    if (obj[element.cinchyColumn.name] && element.cinchyColumn.isMultiple) {
                      // Checking for multi select values in obj
                      const allFieldLabels = obj[element.cinchyColumn.name].split(',')
                      const trimedValues = allFieldLabels && allFieldLabels.length ? allFieldLabels.map(label => label.trim()) : allFieldLabels;
                      let multiDropdownResult = element['dropdownDataset'].options.filter(e => trimedValues.indexOf(e.label) > -1);
                      element.value = multiDropdownResult && multiDropdownResult.length ? multiDropdownResult.map(item => item.id).join(',') : null;
                    }
                    else {
                      element.value = null;
                      element.noPreSelect = !(dropdownResult && dropdownResult['length']);
                    }
                  }
                } else if (!obj[element.cinchyColumn.name]) { // When obj doesnt have value and element.value also have no value
                  element.value = null;
                  element.noPreSelect = true;
                } else if (obj[element.cinchyColumn.name] && element.cinchyColumn.isMultiple) {
                  const allFieldLabels = obj[element.cinchyColumn.name].split(',')
                  const trimedValues = allFieldLabels && allFieldLabels.length ? allFieldLabels.map(label => label.trim()) : allFieldLabels;

                  let multiDropdownResult = element['dropdownDataset'].options.filter(e => trimedValues.indexOf(e.label) > -1);
                  element.value = multiDropdownResult && multiDropdownResult.length ? multiDropdownResult.map(item => item.id).join(',') : element.value;
                } else if (obj[element.cinchyColumn.name] && !element.cinchyColumn.isMultiple) {
                  let singleDropdownResult = element['dropdownDataset'].options.find(e => e.label == obj[element.cinchyColumn.name]);
                  if (!singleDropdownResult && element.value) { // sometimes label contains display label so it won't match, then try id
                    singleDropdownResult = element['dropdownDataset'].options.find(e => e.id == element.value);
                  }
                  element.value = singleDropdownResult ? singleDropdownResult.id : null;
                }
              }
            } else if (element.cinchyColumn.dataType === 'Binary') {
              const keyForBinary = element.cinchyColumn.name + '_Name';
              element.cinchyColumn.fileName = this._ChildFormData.values[keyForBinary];
              element.value = this._ChildFormData.values[element.cinchyColumn.name];
            } else {
              if (this._ChildFormData.type === 'Add' && linkedColumn && (linkedColumn.linkLabel != element.label)) {
                element.value = null;
              } else {
                element.value = obj[element.cinchyColumn.name]
              }
            }
          }
          else if (linkedColumn && (linkedColumn.linkLabel != element.label)) {
            element.noPreSelect = true;
            element.value = null;
          } else if (!linkedColumn) {
            element.value = null;
            element.noPreSelect = true;
          }
        } else if (element.cinchyColumn.isDisplayColumn) {
          const labelInObj = `${element.cinchyColumn.linkTargetColumnName} label`;
          let selectedValue;
          let hasDropdown = false;
          if (element.dropdownDataset && element.dropdownDataset.options) {
            selectedValue = element.dropdownDataset.options.find(item => item.label == obj[labelInObj]);
            if (selectedValue != null) {
              hasDropdown = true;
              element.value = selectedValue?.id;
            }
          }

          if (!hasDropdown) {
            // Creating dummy dropdown and value using multi-field value since it's read only value
            if (obj) {
              const dummyDropdown = { id: obj[labelInObj], label: obj[labelInObj] };
              element.dropdownDataset = { options: [dummyDropdown], isDummy: true };
              element.value = dummyDropdown.id;
            }
          }
        }
      });
    });
    // this check is for new record or edit record
    if (this._ChildFormData.type === 'Add') {
      this.cinchyID = 0;
    } else {
      this.cinchyID = obj['Cinchy ID'];
    }
    this.data = this._ChildFormData;
  }

  onNoClick(): void {
    this.dialogRef.close();
  }

  /**
   * On click of Ok Button
   * 1. Check validation for the fields.
   * 2. pass data to parent form
   */
  async onOkClick() {
    let formvalidation = this._ChildFormData.childFormData.checkChildFormValidation();
    this._ChildFormData.childFormData.sections.forEach(section => {
      section.fields.forEach(element => {
        if (element.cinchyColumn.dataType === 'Binary' && element.cinchyColumn.fileName) {
          const keyForBinary = element.cinchyColumn.name + '_Name';
          this._ChildFormData.values = this._ChildFormData.values || {};
          this._ChildFormData.values[keyForBinary] = element.cinchyColumn.fileName;
        } else if (element.cinchyColumn.isDisplayColumn && element.dropdownDataset?.isDummy) {
          element.dropdownDataset = null;
        }
      });
    });
    let result = {
      data: this._ChildFormData.childFormData,
      id: this.cinchyID,
      childFormId: this._ChildFormData.childFormData.id
    };
    if (formvalidation.status) {
      this.dialogRef.close(result);
    } else {
      //  console.log(formvalidation.message);
    }
  }

  getField(field, section) {
    const linkedColumn = section['LinkedColumnDetails'];
    if (linkedColumn && (linkedColumn.linkLabel == field.label)) {
      linkedColumn.linkedElement.value = linkedColumn.linkedElement.value ? linkedColumn.linkedElement.value : this._ChildFormData.rowId;
      return linkedColumn.linkedElement;
    } else {
      return field;
    }
  }

  //#region This method is used to handle the field event
  handleFieldsEvent($event) {
    // Emit the event to the Project.
    this.eventHandler.emit($event);
  }

  //#endregion
}
