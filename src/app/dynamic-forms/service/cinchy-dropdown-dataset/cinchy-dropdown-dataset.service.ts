import { Injectable } from "@angular/core";

import { CinchyService } from "@cinchy-co/angular-sdk";

import { DropdownDataset } from "./cinchy-dropdown-dataset";
import { DropdownOption } from "./cinchy-dropdown-options";


@Injectable({
  providedIn: "root"
})
export class DropdownDatasetService {

  private _cachedDatasets: { [key: number]: DropdownDataset } = {};


  constructor(
    private _cinchyService: CinchyService
  ) {}


  /**
   * Bind dropdownList (Link Type) from database
   *
   * @param linkTargetColumnId parameter of the link type column Cinchy ID
   * @param currentFieldJson
   * @param dropdownFilter Manual filter coming from Form fields table
   * @param rowId The current selected record of the form, used for filtering
   * @param needUpdate If not set, then a cached version of the set will be used if available
   * @param displayColumnsToIgnore in the case that the query fails because a particular display column was deleted, we
   *                             will want to try again without those columns
   */
  async getDropdownDataset(
      linkTargetColumnId: number,
      currentFieldJson: any,
      dropdownFilter?: string,
      rowId?: any,
      needUpdate?: boolean,
      displayColumnsToIgnore?: Array<string>
  ): Promise<DropdownDataset> {

    if (!needUpdate) {
      if (this._cachedDatasets[linkTargetColumnId]) {
        return this._cachedDatasets[linkTargetColumnId];
      }
    }

    // Get meta data for the cinchy link
    let tableColumnQuery: string = `
      SELECT
        tc.[Table].[Domain].[Name] AS 'Domain',
        tc.[Table].[Name] AS 'Table',
        tc.[Name] AS 'Column'
      FROM [Cinchy].[Cinchy].[Table Columns] tc
      WHERE tc.[Deleted] IS NULL
        AND tc.[Table].[Deleted] IS NULL
        AND tc.[Cinchy ID] = ${linkTargetColumnId}`;

    let metadataQueryResult: Object[] = (await this._cinchyService.executeCsql(tableColumnQuery, null).toPromise()).queryResult.toObjectArray();

    if (!metadataQueryResult?.length) {
      return null;
    }

    let dataSetQuery: string = "";

    if (metadataQueryResult[0]["Domain"] === "Reference Data" && metadataQueryResult[0]["Table"] === "Employees") {
      dataSetQuery = `
        SELECT
          t.[Cinchy ID] AS 'Id',
          t.[${metadataQueryResult[0]["Column"]}] + ' (\' + [Role].[Name] + \')' AS 'Label'
        FROM [${metadataQueryResult[0]["Domain"]}].[${metadataQueryResult[0]["Table"]}] t
        WHERE t.[Deleted] IS NULL`;
    }
    else{
      const setDisplayColumnQuery = currentFieldJson ? this._getDisplayColumnQuery(currentFieldJson, displayColumnsToIgnore) : '';
      const linkFilterExpression = currentFieldJson.linkFilterExpression;

      let whereCondition: string = `WHERE [Deleted] IS NULL`;

      if (linkFilterExpression) {
        whereCondition += ` AND ${linkFilterExpression}`;
      }

      if (dropdownFilter && rowId) {
        whereCondition += ` AND ${dropdownFilter}`;
      }

      if (setDisplayColumnQuery) {
        dataSetQuery = `
          SELECT
            ${setDisplayColumnQuery},
            [Cinchy ID] as 'Id',
            [${metadataQueryResult[0]["Column"]}] as 'Label'
          FROM [${metadataQueryResult[0]["Domain"]}].[${metadataQueryResult[0]["Table"]}]
          ${whereCondition};`;
      }
      else {
        dataSetQuery = `
          SELECT
            [Cinchy ID] AS 'Id',
            [${metadataQueryResult[0]["Column"]}] AS 'Label'
          FROM [${metadataQueryResult[0]["Domain"]}].[${metadataQueryResult[0]["Table"]}]
          ${whereCondition};`;
      }
    }

    const params = {
      "@cinchyid": rowId?.toString() || null
    };

    let optionArray: DropdownOption[] = [];

    try {
      (await this._cinchyService.executeCsql(dataSetQuery, params).toPromise()).queryResult.toObjectArray().forEach(function (row) {

        // TODO For now only showing one display column (display-0)
        const label = row["display-0"] ? `${row["Label"]}, ${row["display-0"]}` : row["Label"];

        optionArray.push(new DropdownOption(row["Id"].toString(), row["Label"]?.toString(), label));
      });

      this._cachedDatasets[linkTargetColumnId] = new DropdownDataset(optionArray);

      return this._cachedDatasets[linkTargetColumnId];
    }
    catch (error: any) {
      // Target the specific response of "Column [COLUMN_NAME] could not be found", indicating that a display
      // column is not available or has been deleted. If that error occurs, compile a set of
      if (error.cinchyException?.data.status === 400 && error.cinchyException?.data.details.includes("could not be found")) {
        const errorMessage = error.cinchyException.data.details as string;

        let columnMatch: Array<string> | null;
        let startingIndex = 0;

        // If this process needs to repeat for multiple display columns (and those display columns aren't all included
        // in the error), then use what was already provided and build on it
        const displayColumnsFoundInErrorResponse = displayColumnsToIgnore?.slice() ?? new Array<string>();

        do {
          // WIll match a column name in the form of `[COLUMN_NAME]`, resulting in an array with [`[COLUMN_NAME]`]
          columnMatch = errorMessage.substring(startingIndex).match(/\[([^\[\]]+)]/g);

          if (columnMatch?.length) {
            startingIndex = errorMessage.indexOf(columnMatch[0]) + columnMatch[0].length;

            displayColumnsFoundInErrorResponse.push(columnMatch[0].replace("[", "").replace("]", ""));
          }
        }
        while (columnMatch);

        // Can use matchAll to avoid the loop when targeting ES2020 or later
        // errorMessage.matchAll(/\[([^\[\]]+)]/g); -> [[`[COLUMN_NAME]`, `COLUMN_NAME`]], ... ]

        return await this.getDropdownDataset(linkTargetColumnId, currentFieldJson, dropdownFilter, rowId, needUpdate, displayColumnsFoundInErrorResponse);
      }
    }
  }


  /**
   * Generates a series of SELECT clauses to match the display columns associated with the target field
   *
   * @param currentFieldJson A JSON construct representing metadata associated with the target field
   * @param displayColumnsToIgnore Any display columns to not generate statements for. Used when a particular column
   *                               is known to be erroneous
   */
  private _getDisplayColumnQuery(currentFieldJson: { [key: string]: any }, displayColumnsToIgnore: Array<string> = []): string {

    let displayColumnQueryItems: Array<string> = new Array<string>();

    if (currentFieldJson.SearchDisplayColumns?.length) {
      currentFieldJson.SearchDisplayColumns.forEach(
        (column: { name: string }, index: number) => {

          const key: string = column.name ? column.name.split(".")[0] : "";

          if (key && !displayColumnsToIgnore.includes(key)) {
            displayColumnQueryItems.push(`[${key}] as 'display-${index}'`)
          }
        }
      );
    }

    return displayColumnQueryItems.join(",");
  }
}
