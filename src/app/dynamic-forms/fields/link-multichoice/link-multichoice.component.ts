import { BehaviorSubject, Subject } from "rxjs";
import { debounceTime, take, takeUntil } from "rxjs/operators";

import {
  Component,
  ElementRef,
  EventEmitter,
  Input,
  OnChanges,
  OnDestroy,
  OnInit,
  Output,
  SimpleChanges,
  ViewChild
} from "@angular/core";
import { coerceBooleanProperty } from "@angular/cdk/coercion";
import { FormControl } from "@angular/forms";
import { MatSelect } from "@angular/material/select";

import { CinchyService } from "@cinchy-co/angular-sdk";

import { faShareAlt } from "@fortawesome/free-solid-svg-icons";
import { faSitemap } from "@fortawesome/free-solid-svg-icons";
import { NgbTooltip } from "@ng-bootstrap/ng-bootstrap";

import { IFieldChangedEvent } from "../../interface/field-changed-event";

import { Form } from "../../models/cinchy-form.model";
import { FormField } from "../../models/cinchy-form-field.model";

import { CinchyQueryService } from "../../../services/cinchy-query.service";

import { DropdownDataset } from "../../service/cinchy-dropdown-dataset/cinchy-dropdown-dataset";
import { DropdownDatasetService } from "../../service/cinchy-dropdown-dataset/cinchy-dropdown-dataset.service";
import { DropdownOption } from "../../service/cinchy-dropdown-dataset/cinchy-dropdown-options";
import { ConfigService } from "../../../services/config.service";

import { ToastrService } from "ngx-toastr";

import * as R from "ramda";
import { MatOption } from "@angular/material/core";


@Component({
  selector: "cinchy-link-multichoice",
  templateUrl: "./link-multichoice.component.html",
  styleUrls: ["./link-multichoice.component.scss"],
  providers: [DropdownDatasetService]
})

export class LinkMultichoiceComponent implements OnChanges, OnDestroy, OnInit {

  @ViewChild("fileInput") fileInput: ElementRef;
  @ViewChild("multiSelect", {static: true}) multiSelect: MatSelect;
  @ViewChild("t") public tooltip: NgbTooltip;

  @Input() field: FormField;
  @Input() fieldIndex: number;
  @Input() form: Form;
  @Input() isInChildForm: boolean;
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

  multiFilterCtrl: FormControl = new FormControl();

  selectedValues = [];

  allSelected = false;
  charactersAfterWhichToShowList = 0;
  downloadLink: boolean;
  downloadableLinks: Array<any>;
  dropdownListFromLinkedTable;
  dropdownSettings;
  dropdownSetOptions: Array<DropdownOption>;
  filteredOptions;
  isCursorIn: boolean = false;
  isLoading: boolean;
  maxLimitForMaterialSelect = 4000;
  metadataQueryResult;
  renderImageFiles = true;
  showError: boolean;
  tableSourceURL: any;
  toolTipMessage: string;

  filteredListMulti = new BehaviorSubject<any[]>([]);
  onDestroy = new Subject<void>();

  faShareAlt = faShareAlt;
  faSitemap = faSitemap;


  get canEdit(): boolean {

    return (!this.isDisabled && this.field.cinchyColumn.canEdit && !this.field.cinchyColumn.isViewOnly);
  }


  constructor(
    private _dropdownDatasetService: DropdownDatasetService,
    private _cinchyService: CinchyService,
    private _configService: ConfigService,
    private _cinchyQueryService: CinchyQueryService,
    private _toastr: ToastrService
  ) { }


  ngOnChanges(changes: SimpleChanges): void {

    if (changes?.field) {
      this._setValue();
    }
  }


  ngOnDestroy(): void {

    this.onDestroy.next();
    this.onDestroy.complete();
  }


  ngOnInit(): void {

    this.bindDropdownList();

    let url = this._configService.envConfig.cinchyRootUrl;

    this.tableSourceURL = url + "/Tables/" + this.field.cinchyColumn.linkTargetTableId;
  }


  async bindDropdownList(): Promise<void> {

    if (!this.dropdownListFromLinkedTable) {
      this.isLoading = true;
      let dropdownDataset: DropdownDataset;
      let currentFieldJson;

      let tableColumnQuery: string = `select tc.[Table].[Domain].[Name] as 'Domain', tc.[Table].[Name] as 'Table', tc.[Name] as 'Column'
        from [Cinchy].[Cinchy].[Table Columns] tc
        where tc.[Deleted] is null and tc.[Table].[Deleted] is null and tc.[Cinchy ID] = ${this.field.cinchyColumn.linkTargetColumnId}`;

      this.metadataQueryResult = (await this._cinchyService.executeCsql(tableColumnQuery, null).toPromise()).queryResult.toObjectArray();

      const formFieldsJsonData = JSON.parse(this.field.cinchyColumn.formFieldsJsonData);

      if (formFieldsJsonData?.Columns) {
        currentFieldJson = formFieldsJsonData.Columns.find(field => field.name === this.field.cinchyColumn.name);
      }

      if (this.field.cinchyColumn.linkTargetColumnId) {
        dropdownDataset = await this._dropdownDatasetService.getDropdownDataset(this.field.cinchyColumn.linkTargetColumnId, this.field.label, currentFieldJson, this.field.cinchyColumn.dropdownFilter, this.form.rowId);

        this.dropdownListFromLinkedTable = true;

        dropdownDataset = this.getSortedList(dropdownDataset);
        this.field.dropdownDataset = dropdownDataset;

        this.dropdownSetOptions = dropdownDataset?.options ?? [];
        this.charactersAfterWhichToShowList = this.dropdownSetOptions.length > this.maxLimitForMaterialSelect ? 3 : 0;
        this.setFilteredOptions();
        this._setValue();

        if (this.dropdownSetOptions.length > this.maxLimitForMaterialSelect && this.selectedValues) {
          this.dropdownSetOptions = this.selectedValues.concat(this.dropdownSetOptions);

          this.dropdownSetOptions = R.uniqBy((item) => {
            return item.id;
          }, this.dropdownSetOptions)

          this.filteredListMulti.next(this.dropdownSetOptions.slice());
        }

        this.checkForAttachmentUrl();
      }

      this.toolTipMessage = `Please type at least ${this.charactersAfterWhichToShowList} characters to see the dropdown list of items. You have to select from the dropdown to update this field`;

      this.isLoading = false;
    }
  }


  checkForAttachmentUrl(): void {

    this.downloadLink = coerceBooleanProperty(this.field.cinchyColumn.attachmentUrl);

    if (this.field.cinchyColumn.attachmentUrl && this.selectedValues?.length) {
      this.downloadLink = true;
      this.downloadableLinks = [];

      this.selectedValues.forEach((listItem: any) => {

        const replacedCinchyIdUrl = this.field.cinchyColumn.attachmentUrl.replace("@cinchyid", this.form.rowId?.toString());
        const replacedFileIdUrl = this._configService.envConfig.cinchyRootUrl + replacedCinchyIdUrl.replace("@fileid", listItem.id);
        const selectedValuesWithUrl = { fileName: listItem.label, fileUrl: replacedFileIdUrl, fileId: listItem.id };

        this.downloadableLinks.push(selectedValuesWithUrl);
      })
    }
  }


  compareWith(a: MatOption, b: MatOption): boolean {

    return (a?.id && b?.id && a.id === b.id);
  };


  closeTooltip(tooltip: NgbTooltip): void {

    setTimeout(() => {

      if (tooltip.isOpen() && !this.isCursorIn) {
        tooltip.close();
      }
    }, 100);
  }


  /**
   * Generates a tooltip for the given link
   */
  downloadableLinkTooltip(link: { fileName: string, fileUrl: string, fileId: string }): string {

    return `Download ${link.fileName}`;
  }


  fileNameIsImage(fileName: string): boolean {

    const lowercase = fileName.toLowerCase();

    return lowercase.endsWith(".png") ||
      lowercase.endsWith(".jpg") ||
      lowercase.endsWith(".jpeg") ||
      lowercase.endsWith(".gif") ||
      lowercase.endsWith(".svg");
  }


  protected filterMulti(): void {

    if (this.dropdownSetOptions) {
      // get the search keyword
      let search = this.multiFilterCtrl.value;

      if (!search) {
        this.filteredListMulti.next(this.dropdownSetOptions.slice());
      } else {
        search = search.toLowerCase();

        // filter the lis
        this.filteredListMulti.next(
          this.dropdownSetOptions.filter(item => item.label.toLowerCase().indexOf(search) > -1)
        );
      }
    }

  }


  generateMultipleOptionsFromSingle(): Array<DropdownOption> {

    if (this.field.dropdownDataset?.options?.length) {
      let selectedIds: Array<string>;

      // Fallback for legacy logic
      if (this.field.dropdownDataset.options.length === 1 && this.field.dropdownDataset.options[0].id.includes(",")) {
        selectedIds = this.field.dropdownDataset.options[0].id?.split(",").map((id: string) => {

          return id.trim();
        });

        this.field.dropdownDataset.options = this.field.dropdownDataset.options[0].label.split(",").map((label: string, index: number) => {

          return new DropdownOption(
            selectedIds[index],
            label.trim()
          );
        });
      }

      let fieldIds = new Array<string>();

      if (this.field.value) {
        // Fallback for legacy logic
        if (typeof this.field.value === "string") {
          fieldIds = this.field.value.split(",").map((id: string) => {

            return id.trim();
          });
        }
        else if (Array.isArray(this.field.value)) {
          fieldIds = this.field.value;
        }
      }

      selectedIds = fieldIds.filter((id: string) => {

        return fieldIds.includes(id);
      });

      if (selectedIds?.length) {
        return selectedIds.map((id: string) => {

          return this.field.dropdownDataset.options.find((option: DropdownOption) => {

            return (option.id === id);
          });
        });
      }
    }

    return [];
  }


  getAndSetLatestFileValue(): void {

    this._cinchyQueryService.getFilesInCell(this.field.cinchyColumn.name, this.field.cinchyColumn.domainName, this.field.cinchyColumn.tableName, this.form.rowId).subscribe((resp: Array<{ fileId: any, fileName: string }>) => {

      if (resp?.length) {
        this.field.value = (this.field.value ?? []).concat(resp.map(x => x.fileId));

        const replacedCinchyIdUrl = this.field.cinchyColumn.attachmentUrl.replace("@cinchyid", this.form?.rowId.toString());

        this.selectedValues = this.selectedValues ?? [];
        this.downloadableLinks = this.downloadableLinks ?? [];

        resp.forEach((newFile: { fileId: any, fileName: string }) => {

          const fileUrl = this._configService.envConfig.cinchyRootUrl + replacedCinchyIdUrl.replace("@fileid", newFile.fileId?.toString());
          const newSelectedValue = { fileName: newFile.fileName, fileUrl: fileUrl, fileId: newFile.fileId };

          this.selectedValues.push(newSelectedValue);
          this.downloadableLinks.push(newSelectedValue);
        });

        this._cinchyQueryService.updateFilesInCell(this.downloadableLinks.map(x => x.fileId), this.field.cinchyColumn.name, this.field.cinchyColumn.domainName, this.field.cinchyColumn.tableName, this.form.rowId).subscribe(resp => {
          this.fileInput.nativeElement.value = null;
          this._toastr.success("File(s) uploaded", "Success");
        });
      }
    });
  }


  getSortedList(dropdownDataset: DropdownDataset): DropdownDataset {

    let filteredOutNullSets: Array<DropdownOption>;

    if (dropdownDataset?.options) {
      filteredOutNullSets = dropdownDataset.options.filter(option => option.label);

      return new DropdownDataset(filteredOutNullSets.sort((a, b) => a.label.toLowerCase().localeCompare(b.label.toLowerCase())));
    }

    return null;
  }


  isSelected(dropdownOption: DropdownOption): boolean {

    return this.selectedValues.find(item => item.id === dropdownOption.id);
  }


  openTooltip(tooltip: NgbTooltip): void {

    tooltip.open();
    this.tooltip = tooltip;

    if (tooltip.isOpen()) {
      const tooltipElement = document.getElementsByTagName("ngb-tooltip-window");

      if (tooltipElement[0]) {
        tooltipElement[0].addEventListener("mouseleave", this.removeTooltipElement.bind(this));
        tooltipElement[0].addEventListener("mouseenter", this.setTooltipCursor.bind(this));
      }
    }
  }


  onDeleteFile(item: any): void {

    if (item.fileId && this.selectedValues?.length) {
      this.selectedValues = this.selectedValues.filter((value: any) => {

        return (value.fileId?.toString !== item.fileId?.toString());
      });

      this.downloadableLinks = this.downloadableLinks.filter(x => x.fileId !== item.fileId);

      this.valueChanged();
    }
  }


  onFileSelected(event: any): void {

    if (event?.target?.files?.length) {
      const uploadUrl = this._configService.envConfig.cinchyRootUrl + this.field.cinchyColumn.uploadUrl.replace("@cinchyid", this.form.rowId?.toString());

      this._cinchyQueryService.uploadFiles(event?.target?.files, uploadUrl)?.subscribe(
        {
          error: () => {

            this._toastr.error("Could not upload the file(s)", "Error");
          },
          next: () => {

            this.getAndSetLatestFileValue();
          }
        }
      );
    }
  }


  removeTooltipElement(): void {

    this.isCursorIn = false;
    this.tooltip.close();
  }


  setFilteredOptions(dropdownOptions?: Array<DropdownOption>): void {

    this.filteredOptions = dropdownOptions ? dropdownOptions : this.dropdownSetOptions;
    this.selectedValues = [];

    // load the initial list
    this.filteredListMulti.next(this.dropdownSetOptions.slice());

    if (this.dropdownSetOptions.length > this.maxLimitForMaterialSelect) {
      this.charactersAfterWhichToShowList = 2;
    }

    this.multiFilterCtrl.valueChanges
      .pipe(takeUntil(this.onDestroy))
      .subscribe(() => {

        this.filterMulti();
      });
  }


  setTooltipCursor(): void {

    this.isCursorIn = true;
  }


  toggleSelectAll(selectAll: boolean): void {

    if (selectAll) {
      this.selectedValues = this.filteredListMulti.value;
    }
    else {
      this.selectedValues = [];
    }

    this.valueChanged();
  }


  valueChanged(): void {

    this.onChange.emit({
      form: this.form,
      fieldIndex: this.fieldIndex,
      newValue: this.selectedValues?.map((value: any) => {

        return value.id;
      }) ?? [],
      sectionIndex: this.sectionIndex,
      targetColumnName: this.field.cinchyColumn.name,
      targetTableName: this.targetTableName
    });
  }


  private _setValue(): void {

    if (this.field.dropdownDataset?.options?.length || this.isInChildForm) {
      this.selectedValues = this.generateMultipleOptionsFromSingle();
    }
  }
}
