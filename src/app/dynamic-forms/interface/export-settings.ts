import { PageOrientation } from "../enums/page-orientation.enum";
import { PageSize } from "../enums/page-size.enum";


export interface IExportSettings {
  pageOrientation?: PageOrientation;
  pageSize?: PageSize;
  pageMargins?: Array<number>;
}
