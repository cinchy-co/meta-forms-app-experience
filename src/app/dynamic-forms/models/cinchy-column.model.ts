import { TextFormatType } from "../enums/text-format-type.enum";

export interface ICinchyColumn {
  attachmentUrl: string;
  canEdit: boolean;
  canView: boolean;
  childFormParentId: string;
  childFormLinkId: string;
  choiceOptions: string;
  dataFormatType: string;
  dataType: string;
  deviationSeverityColor: string;
  domainName: string;
  doNotWrap: boolean;
  dropdownFilter: any;
  fileName: any;
  fileNameColumn: any;
  formFieldsJsonData: string; // String of json object
  hasChanged: boolean;
  id: number;
  isCalculated: boolean;
  isDisplayColumn: boolean;
  isMandatory: boolean;
  isMultiple: boolean;
  isViewOnly: boolean;
  linkedFieldId: any;
  linkTargetColumnId: number;
  linkTargetColumnName: string;
  linkTargetTableId: number;
  linkTargetTableName: string;
  minValue: number;
  name: string;
  numberFormatter: string;
  tableId: number;
  tableName: string;
  textColumnMaxLength: number;
  textFormat: TextFormatType,
  totalTextAreaRows: number;
  uploadUrl: string;
  validationExpression: string;
}

export class CinchyColumn implements ICinchyColumn {
  constructor(
    public id: number,
    public tableId: number,
    public tableName: string,
    public domainName: string,
    public name: string,
    public dataType: string,
    public isMandatory: boolean,
    public textColumnMaxLength: number,
    public linkTargetColumnId: number,
    public linkTargetColumnName: string,
    public isMultiple: boolean,
    public validationExpression: string,
    public minValue: number,
    public canEdit: boolean,
    public canView: boolean,
    public createlinkOptionFormId: string,
    public createlinkOptionName: string,
    public linkTargetTableId: number,
    public linkTargetTableName: string,
    public linkTableDomainName: string,
    public deviationSeverityColor: string,
    public choiceOptions: string,
    public formFieldsJsonData,
    public dataFormatType,
    public hasChanged: boolean,
    public isViewOnly: boolean,
    public linkedFieldId: any,
    public isDisplayColumn: boolean,
    public fileName: any,
    public fileNameColumn: any,
    public dropdownFilter: any,
    public totalTextAreaRows: number,
    public numberFormatter: string,
    public attachmentUrl: string,
    public uploadUrl: string,
    public childFormParentId: string,
    public childFormLinkId: string, 
    public doNotWrap: boolean,
    public displayFormat: string,
    public isCalculated: boolean,
    public textFormat: TextFormatType
  ) {}
}
