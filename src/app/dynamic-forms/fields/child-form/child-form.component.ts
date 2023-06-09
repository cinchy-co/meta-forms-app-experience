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
    this.childFormData.childForm?.sections?.forEach((section: FormSection, sectionIndex: number) => {

      section.fields?.forEach((field: FormField, fieldIndex: number) => {

        if (!field.cinchyColumn.isDisplayColumn) {
          if (field.linkedColumn?.linkLabel === field.label) {

            this.childFormData.childForm.updateFieldValue(
              sectionIndex,
              fieldIndex,
              field.linkedColumn.linkValue ?? Number(this.childFormData.childForm.rowId)
            );

            // TODO: find a better way of updating this value. We should not be directly mutating any fields on a Form, even indirectly
            field.linkedColumn.linkedField.value = this.childFormData.childForm.sections[sectionIndex].fields[fieldIndex].value;
          }
          else if (this.childFormData.presetValues) {
            // bind dropdown values
            if (field.cinchyColumn.dataType === "Link") {
              if (!this.childFormData.presetValues[field.cinchyColumn.name]) {
                // Prefill child linked column value with parent id if the target table id matches parent form table id
                const parentRowId = field.cinchyColumn.linkTargetTableId === this.childFormData.childForm.parentForm.targetTableId ? this.childFormData.childForm.parentForm.rowId : null;
                this.childFormData.childForm.updateFieldValue(
                  sectionIndex,
                  fieldIndex,
                  parentRowId ?? null
                );
              }
              else if (field.dropdownDataset?.options?.length) {
                if (field.cinchyColumn.isMultiple) {

                  const linkIds = this.childFormData.presetValues[field.cinchyColumn.name];

                  // Search by ID, then label
                  let result = field.dropdownDataset.options.filter((option: DropdownOption) => {

                    return (linkIds.indexOf(option.id) > -1 || linkIds.indexOf(option.label) > -1);
                  });

                  this.childFormData.childForm.updateFieldValue(
                    sectionIndex,
                    fieldIndex,
                    result?.length ? result.map(item => item.id) : []
                  );
                }
                else {
                  // Search by ID, then label
                  let result = field.dropdownDataset.options.find((option: DropdownOption) => {

                    // TODO: We're explicitly using a double equals here because at this stage the ID may be either a number or string depending on where it was
                    //       populated. In the future we'll need to figure out which is correct and make sunre we're using it consistently
                    return (
                      (option.id == this.childFormData.presetValues[field.cinchyColumn.name]) ||
                      (option.label === this.childFormData.presetValues[field.cinchyColumn.name])
                    );
                  });

                  this.childFormData.childForm.updateFieldValue(
                    sectionIndex,
                    fieldIndex,
                    result?.id ?? null
                  );
                }
              }
              else {
                if (field.cinchyColumn.isMultiple) {
                  const allFieldValues = this.childFormData.presetValues[field.cinchyColumn.name]?.split(",").map((value: string) => {

                    return value.trim();
                  });

                  // We don't have enough information to mock the dataset, so the field component can handle generating one
                  this.childFormData.childForm.updateFieldValue(
                    sectionIndex,
                    fieldIndex,
                    allFieldValues
                  );
                }
                else {
                  // Since we have a value but not a dataset, mock the dataset as part of saving the value
                  this.childFormData.childForm.updateFieldValue(
                    sectionIndex,
                    fieldIndex,
                    this.childFormData.presetValues[field.cinchyColumn.name],
                    [
                      {
                        propertyName: "dropdownDataset",
                        propertyValue: new DropdownDataset(
                          [
                            {
                              id: this.childFormData.presetValues[field.cinchyColumn.name],
                              label: this.childFormData.presetValues[`${field.cinchyColumn.name} label`] ?? this.childFormData.presetValues[field.cinchyColumn.name]
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
            else if (field.cinchyColumn.dataType === "Binary") {
              this.childFormData.childForm.updateFieldValue(
                sectionIndex,
                fieldIndex,
                this.childFormData.presetValues[field.cinchyColumn.name],
                [
                  {
                    cinchyColumn: true,
                    propertyName: "fileName",
                    propertyValue: this.childFormData.presetValues[`${field.cinchyColumn.name}_Name`]
                  }
                ]
              );
            }
            else {
              // Note: We're explicitly not using optional chaining here because we need to evaluate the
              //       conditions of "exists" and "not equal" separately to ensure the correct execution
              if (field.linkedColumn && field.linkedColumn.linkLabel !== field.label) {
                this.childFormData.childForm.updateFieldValue(
                  sectionIndex,
                  fieldIndex,
                  null
                );
              } else {
                this.childFormData.childForm.updateFieldValue(
                  sectionIndex,
                  fieldIndex,
                  this.childFormData.presetValues[field.cinchyColumn.name]
                );
              }
            }
          }
          else {
            // Clear all values when default values are not provided, since that means we're creating a new record
            this.childFormData.childForm.updateFieldValue(
              sectionIndex,
              fieldIndex,
              null,
              [
                {
                  propertyName: "dropdownDataset",
                  propertyValue: null
                }
              ]
            );
          }
        }
        else {
          const displayColumnLabel = `${field.cinchyColumn.linkTargetColumnName} label`;

          if (this.childFormData.presetValues) {
            if (field.dropdownDataset?.options) {
              const selectedValue = field.dropdownDataset.options.find((option: DropdownOption) => {

                return (option.label === this.childFormData.presetValues[displayColumnLabel]);
              });

              this.childFormData.childForm.updateFieldValue(
                sectionIndex,
                fieldIndex,
                selectedValue?.id ?? null
              );
            }
            else {
              this.childFormData.childForm.updateFieldValue(
                sectionIndex,
                fieldIndex,
                this.childFormData.presetValues[displayColumnLabel] ?? null,
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
          else {
            // Clear all values when default values are not provided, since that means we're creating a new record
            this.childFormData.childForm.updateFieldValue(
              sectionIndex,
              fieldIndex,
              null
            );
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

    this.childFormData.childForm.sections.forEach((section: FormSection, sectionIndex: number) => {

      section.fields.forEach((field: FormField, fieldIndex: number) => {

        if (field.cinchyColumn.dataType === "Binary" && field.cinchyColumn.fileName) {
          const keyForBinary = field.cinchyColumn.name + "_Name";

          this.childFormData.childForm.updateFieldAdditionalProperty(
            sectionIndex,
            fieldIndex,
            {
              cinchyColumn: true,
              propertyName: "fileName",
              propertyValue: this.childFormData.presetValues[keyForBinary]
            }
          );
        }
        else if (field.cinchyColumn.isDisplayColumn && field.dropdownDataset?.isDummy) {
          field.dropdownDataset = null;
        }
      });
    });

    if (formvalidation.status) {
      this.dialogRef.close((!this.childFormData.presetValues || !this.childFormData.presetValues["Cinchy ID"]) ? -1 : this.childFormData.presetValues["Cinchy ID"]);
    } else {
      // TODO: this should be a toast, which means that we'd need to either dynamically inject the ToastrService or create a
      //       NotificationService with static functions to display this sort of thing
      console.error("Child form was invalid:", formvalidation.message);
    }
  }
}
