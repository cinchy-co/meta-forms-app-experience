import { TextFormatType } from "../enums/text-format-type.enum";

export interface ICinchyColumn {
  id: number;
  tableId: number;
  tableName: string;
  domainName: string;
  name: string;
  dataType: string;
  isMandatory: boolean;
  textColumnMaxLength: number;
  linkTargetColumnId: number;
  LinkTargetTableId: number;
  linkTargetTableName: string;
  linkTargetColumnName: string;
  isMultiple: boolean;
  validationExpression: string;
  minValue: number;
  canEdit: boolean;
  canView: boolean;
  DeviationSeverityColor: string;
  choiceOptions: string;
  FormFieldsJsonData: string; // String of json object
  dataFormatType: string;
  doNotWrap: boolean;
  hasChanged: boolean;
  isViewOnly: boolean;
  linkedFieldId: any;
  IsDisplayColumn: boolean;
  FileName: any;
  FileNameColumn: any;
  dropdownFilter: any;
  totalTextAreaRows: number;
  numberFormatter: string;
  attachmentUrl: string;
  uploadUrl: string;
  childFormParentId: string;
  childFormLinkId: string;
  isCalculated: boolean;
  textFormat: TextFormatType;
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
    public LinkTargetTableId: number,
    public linkTargetTableName: string,
    public DeviationSeverityColor: string,
    public choiceOptions: string,
    public FormFieldsJsonData,
    public dataFormatType,
    public hasChanged: boolean,
    public isViewOnly: boolean,
    public linkedFieldId: any,
    public IsDisplayColumn: boolean,
    public FileName: any,
    public FileNameColumn: any,
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
