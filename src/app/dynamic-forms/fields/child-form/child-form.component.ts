import { Component, Inject } from "@angular/core";
import { MatDialogRef, MAT_DIALOG_DATA } from "@angular/material/dialog";

import { DropdownDatasetService } from "../../service/cinchy-dropdown-dataset/cinchy-dropdown-dataset.service";

import { DropdownOption } from "../../service/cinchy-dropdown-dataset/cinchy-dropdown-options";
import { Form } from "../../models/cinchy-form.model";
import { FormField } from "../../models/cinchy-form-field.model";
import { FormSection } from "../../models/cinchy-form-section.model";

import { DropdownDataset } from "../../service/cinchy-dropdown-dataset/cinchy-dropdown-dataset";

import { isNullOrUndefined } from "util";
import { IFieldChangedEvent } from "../../interface/field-changed-event";


/**
 * This section is used to create cinchy child form.
 */
@Component({
  selector: "cinchy-child-form",
  templateUrl: "./child-form.component.html",
  styleUrls: ["./child-form.component.scss"],
  providers: [DropdownDatasetService]
})
export class ChildFormComponent {

  constructor(
    public dialogRef: MatDialogRef<ChildFormComponent>,
    @Inject(MAT_DIALOG_DATA) public childFormData: {
      childForm: Form,
      presetValues?: { [key: string]: any },
      title: string
    }
  ) {}


  ngOnInit(): void {

    // TODO: atomize this function
    this.childFormData.childForm?.sections?.forEach((section: FormSection) => {

      const linkedColumn = section.linkedColumnDetails;

      section.fields?.forEach((field: FormField, fieldIndex: number) => {

        field.noPreselect = false;

        if (!field.cinchyColumn.isDisplayColumn) {
          if (linkedColumn?.linkLabel === field.label) {
            if (linkedColumn.linkValue) {
              field.value = field.value ?? linkedColumn.linkValue;
            }

            field.value = field.value ?? Number(this.childFormData.childForm.rowId);

            linkedColumn.linkedElement.value = linkedColumn.linkedElement.value || Number(this.childFormData.childForm.rowId);
          }

          if (this.childFormData.presetValues) {
            // bind dropdown values
            if (field.cinchyColumn.dataType === "Link") {
              if (!isNullOrUndefined(field.dropdownDataset)) {
                // When element value is not there but obj can have value and we have dropdown set
                if (!field.value) {
                  let dropdownResult = field.dropdownDataset.options.find((option: DropdownOption) => {

                    return (option.label === this.childFormData.presetValues[field.cinchyColumn.name]);
                  });

                  if (dropdownResult) {
                    this.childFormData.childForm.updateFieldValue(
                      0,
                      fieldIndex,
                      dropdownResult.id,
                      [
                        {
                          propertyName: "noPreselect",
                          propertyValue: false
                        }
                      ]
                    );
                  }
                  // In case the field has multiple names and the dropdown has those names in separate options
                  else {
                    if (this.childFormData.presetValues[field.cinchyColumn.name] && field.cinchyColumn.isMultiple) {
                      const allFieldLabels = this.childFormData.presetValues[field.cinchyColumn.name]?.split(",").map((value: string) => {

                        return value.trim();
                      });

                      let multiDropdownResult = field.dropdownDataset.options.filter(e => allFieldLabels.indexOf(e.label) > -1);

                      this.childFormData.childForm.updateFieldValue(
                        0,
                        fieldIndex,
                        multiDropdownResult?.length ? multiDropdownResult.map(item => item.id).join(",") : null
                      );
                    }
                    else {
                      this.childFormData.childForm.updateFieldValue(
                        0,
                        fieldIndex,
                        null,
                        [
                          {
                            propertyName: "noPreselect",
                            propertyValue: true
                          }
                        ]
                      );
                    }
                  }
                }
                // When obj doesnt have value and element.value also have no value
                else if (!this.childFormData.presetValues[field.cinchyColumn.name]) {
                  this.childFormData.childForm.updateFieldValue(
                    0,
                    fieldIndex,
                    null,
                    [
                      {
                        propertyName: "noPreselect",
                        propertyValue: true
                      }
                    ]
                  );
                }
                else if (this.childFormData.presetValues[field.cinchyColumn.name] && field.cinchyColumn.isMultiple) {
                  const allFieldLabels = this.childFormData.presetValues[field.cinchyColumn.name]?.split(",").map((value: string) => {

                    return value.trim();
                  });

                  let multiDropdownResult = field.dropdownDataset.options.filter(e => allFieldLabels.indexOf(e.label) > -1);

                  if (multiDropdownResult?.length) {
                    this.childFormData.childForm.updateFieldValue(
                      0,
                      fieldIndex,
                      multiDropdownResult.map(item => item.id).join(",")
                    );
                  }
                }
                else if (this.childFormData.presetValues[field.cinchyColumn.name] && !field.cinchyColumn.isMultiple) {
                  let singleDropdownResult = field.dropdownDataset.options.find(e => e.label === this.childFormData.presetValues[field.cinchyColumn.name]);

                  if (!singleDropdownResult && field.value) {
                    // sometimes label contains display label so it won't match, then try id
                    singleDropdownResult = field.dropdownDataset.options.find(e => e.id === field.value);
                  }

                  this.childFormData.childForm.updateFieldValue(
                    0,
                    fieldIndex,
                    singleDropdownResult ? singleDropdownResult.id : null
                  );
                }
              }
            }
            else if (field.cinchyColumn.dataType === "Binary") {
              const keyForBinary = field.cinchyColumn.name + "_Name";

              this.childFormData.childForm.updateFieldValue(
                0,
                fieldIndex,
                this.childFormData.presetValues[field.cinchyColumn.name],
                [
                  {
                    cinchyColumn: true,
                    propertyName: "fileName",
                    propertyValue: this.childFormData.presetValues[keyForBinary]
                  }
                ]
              );
            }
            else {
              // Note: We're explicitly not using optional chaining here because we need to evaluate the
              //       conditions of "exists" and "not equal" separately to ensure the correct execution
              if (linkedColumn && linkedColumn.linkLabel !== field.label) {
                this.childFormData.childForm.updateFieldValue(
                  0,
                  fieldIndex,
                  null
                );
              } else {
                this.childFormData.childForm.updateFieldValue(
                  0,
                  fieldIndex,
                  this.childFormData.presetValues[field.cinchyColumn.name]
                );
              }
            }
          }
          else if (linkedColumn?.linkLabel !== field.label) {
            this.childFormData.childForm.updateFieldValue(
              0,
              fieldIndex,
              null,
              [
                {
                  propertyName: "noPreselect",
                  propertyValue: true
                }
              ]
            );
          }
        }
        else if (field.cinchyColumn.isDisplayColumn) {
          const displayColumnLabel = `${field.cinchyColumn.linkTargetColumnName} label`;
          let selectedValue: DropdownOption;

          if (this.childFormData.presetValues) {
            if (field.dropdownDataset?.options) {
              selectedValue = field.dropdownDataset.options.find((option: DropdownOption) => {

                return (option.label === this.childFormData.presetValues[displayColumnLabel]);
              });

              if (selectedValue) {
                this.childFormData.childForm.updateFieldValue(
                  0,
                  fieldIndex,
                  selectedValue.id
                );
              }
            }

            if (!selectedValue) {
              // Creating dummy dropdown and value using multi-field value since it's read only value
              this.childFormData.childForm.updateFieldValue(
                0,
                fieldIndex,
                this.childFormData.presetValues[displayColumnLabel],
                [
                  {
                    propertyName: "dropdownDataset",
                    propertyValue: new DropdownDataset(
                      [
                        {
                          id: this.childFormData.presetValues[displayColumnLabel],
                          label: this.childFormData.presetValues[displayColumnLabel]
                        }
                      ],
                      true
                    )
                  }
                ]
              );
            }
          }
        }
      });
    });
  }


  handleOnChange(event: IFieldChangedEvent): void {

    this.childFormData.childForm.updateFieldValue(
      event.sectionIndex,
      event.fieldIndex,
      event.newValue,
      event.additionalPropertiesToUpdate
    );

    this.childFormData.presetValues = this.childFormData.presetValues || {};
    this.childFormData.presetValues[this.childFormData.childForm.sections[event.sectionIndex].fields[event.fieldIndex].label] = event.newValue;
  }


  /**
   * Closes the dialog and discards the form contents
   */
  cancel(): void {

    this.dialogRef.close();
  }


  /**
   * Validates the form data, and the passes it back to the parent for processing
   */
  save() {

    let formvalidation = this.childFormData.childForm.checkChildFormValidation();

    this.childFormData.childForm.sections.forEach(section => {

      section.fields.forEach(element => {

        if (element.cinchyColumn.dataType === "Binary" && element.cinchyColumn.fileName) {
          const keyForBinary = element.cinchyColumn.name + "_Name";
          this.childFormData.presetValues = this.childFormData.presetValues || {};
          this.childFormData.presetValues[keyForBinary] = element.cinchyColumn.fileName;
        }
        else if (element.cinchyColumn.isDisplayColumn && element.dropdownDataset?.isDummy) {
          element.dropdownDataset = null;
        }
      });
    });

    if (formvalidation.status) {
      this.dialogRef.close(!this.childFormData.presetValues ? -1 : this.childFormData.presetValues["Cinchy ID"]);
    } else {
      // TODO: this should be a toast, which means that we'd need to either dynamically inject the ToastrService or create a
      //       NotificationService with static functions to display this sort of thing
      console.error("Child form was invalid:", formvalidation.message);
    }
  }
}
