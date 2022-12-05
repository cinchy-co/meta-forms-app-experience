import { AfterViewInit, Component, Input, OnInit, ViewChild } from "@angular/core";

import { faCalculator } from "@fortawesome/free-solid-svg-icons";


//#region Cinchy Dynamic Calculated field
/**
 * This section is used to create Calculated field of cinchy table.
 */
//#endregion
@Component({
  selector: "cinchy-calculated",
  templateUrl: "./calculated.component.html",
  styleUrls: ["./calculated.component.scss"]
})
export class CalculatedComponent implements OnInit, AfterViewInit {
  @Input() field: any;
  isFormatted: boolean;
  @ViewChild("editor") editor;
  faCalculator = faCalculator;


  constructor() {}


  ngOnInit() {
    this.isFormatted = !!this.field.cinchyColumn.dataFormatType;
  }

  ngAfterViewInit() {
    if (this.isFormatted) {
      this.editor.getEditor().setOptions({
        showLineNumbers: true,
        tabSize: 4,
        theme: "ace/theme/sqlserver",
        enableBasicAutocompletion: true,
        enableSnippets: true,
        enableLiveAutocompletion: true,
        highlightGutterLine: true
      });
      this.editor.mode = "text";
      this.editor.value = this.field.value;
      this.editor.setReadOnly(true);
    }
  }
}
