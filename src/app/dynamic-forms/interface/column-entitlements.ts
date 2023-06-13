/**
 * Describes the permissions associated with interacting with a column
 */
export interface IColumnEntitlements {
  canEdit: boolean;
  canView: boolean;
  columnGuid: string;
  columnId: number;
  columnName: string;
}
