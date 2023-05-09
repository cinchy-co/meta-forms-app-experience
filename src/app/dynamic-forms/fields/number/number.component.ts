import { Component, EventEmitter, Input, OnInit, Output } from "@angular/core";
import { coerceBooleanProperty } from "@angular/cdk/coercion";
import { CurrencyPipe } from "@angular/common";

import { IFieldChangedEvent } from "../../interface/field-changed-event";

import { faHashtag } from "@fortawesome/free-solid-svg-icons";

import { NumeralPipe } from "ngx-numeral";
import { FormField } from "../../models/cinchy-form-field.model";
import { Form } from "../../models/cinchy-form.model";


/**
 * This section is used to create Dynamic Number field
 */
@Component({
  selector: "cinchy-number",
  templateUrl: "./number.component.html",
  styleUrls: ["./number.component.scss"],
  providers: [CurrencyPipe]
})
export class NumberComponent implements OnInit {

  @Input() field: FormField;
  @Input() fieldIndex: number;
  @Input() form: Form;
  @Input() isDisabled: boolean;
  @Input() sectionIndex: number;
  @Input() targetTableName: string;

  @Input("fieldsWithErrors") set fieldsWithErrors(errorFields: any) {

    this.showError = coerceBooleanProperty(
      errorFields?.find((item: string) => {

        return (item === this.field?.label);
      })
    );
  };

  @Output() onChange = new EventEmitter<IFieldChangedEvent>();

  formattedAmount: string;
  numeralValue: NumeralPipe;
  showError: boolean;

  faHashtag = faHashtag;


  get canEdit(): boolean {

    return (!this.isDisabled && this.field.cinchyColumn.canEdit && !this.field.cinchyColumn.isViewOnly);
  }


  ngOnInit(): void {

    if (this.field.cinchyColumn.numberFormatter && this.field.value) {
      this.numeralValue = new NumeralPipe(this.field.value);
      this.formattedAmount = this.numeralValue.format(this.field.cinchyColumn.numberFormatter);
    } else {
      this.numeralValue = null;
      this.formattedAmount = this.field.value;
    }
  }


  transformAmount() {

    if (this.formattedAmount) {
      this.numeralValue = new NumeralPipe(this.field.value);
      this.formattedAmount = this.field.cinchyColumn.numberFormatter ? this.numeralValue.format(this.field.cinchyColumn.numberFormatter) : this.numeralValue.value().toString();
    }
    else {
      this.numeralValue = null;
      this.formattedAmount = "";
    }

    this.valueChanged();
  }


  reverseTransform() {

    this.formattedAmount = this.numeralValue?.value()?.toString() ?? "";
  }


  valueChanged() {

    this.onChange.emit({
      form: this.form,
      fieldIndex: this.fieldIndex,
      newValue: this.numeralValue?.value() ?? null,
      sectionIndex: this.sectionIndex,
      targetColumnName: this.field.cinchyColumn.name,
      targetTableName: this.targetTableName
    });
  }
}
