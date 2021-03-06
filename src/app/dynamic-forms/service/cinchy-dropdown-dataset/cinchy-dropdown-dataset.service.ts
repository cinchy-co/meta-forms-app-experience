import { Injectable } from '@angular/core';
import { CinchyService } from '@cinchy-co/angular-sdk';
import { isNullOrUndefined } from 'util';
import { DropdownDataset } from './cinchy-dropdown-dataset';
import { IDropdownOption, DropdownOption } from './cinchy-dropdown-options';

@Injectable({
  providedIn: 'root'
})
export class DropdownDatasetService {
  private _dropdownDatasets: { [key: number]: DropdownDataset } = {};

  constructor(private _cinchyService: CinchyService) { }

  //#region Bind dropdownList (Link Type) from database
  /**
   * bind dropdown option from cinch
   * @param linkTargetColumnId (parameter of the link type column Cinchy Id)
   * @param fieldName: string
   * @param currentFieldJson: any
   * @param dropdownFilter?:string -- Manual filter coming from Form fields table
   * @param rowId for dropdownFilter param
   * @param needUpdate for always reset list
   */
  //#endregion
  async getDropdownDataset(linkTargetColumnId: number,fieldName: string, currentFieldJson: any,
                           dropdownFilter?:string, rowId?: any, needUpdate?: boolean): Promise<DropdownDataset> {
    let result: DropdownDataset = this._dropdownDatasets[linkTargetColumnId];
    if (!isNullOrUndefined(result) && !needUpdate) {
      return result;
    }
    // Get meta data for the cinchy link
    let tableColumnQuery: string = 'select tc.[Table].[Domain].[Name] as \'Domain\', tc.[Table].[Name] as \'Table\', tc.[Name] as \'Column\' from [Cinchy].[Cinchy].[Table Columns] tc where tc.[Deleted] is null and tc.[Table].[Deleted] is null and tc.[Cinchy Id] = ' + linkTargetColumnId;
    let metadataQueryResult: Object[] = (await this._cinchyService.executeCsql(tableColumnQuery, null).toPromise()).queryResult.toObjectArray();
    if (isNullOrUndefined(metadataQueryResult) || metadataQueryResult.length == 0) {
      return null;
    }
    let dataSetQuery: string = "";
    if(metadataQueryResult[0]['Domain']==="Reference Data" && metadataQueryResult[0]['Table']==="Employees"){
      dataSetQuery = 'select t.[Cinchy Id] as \'Id\', t.[' + metadataQueryResult[0]['Column'] + '] + \' (\' + [Role].[Name] +\')\' as \'Label\' from [' + metadataQueryResult[0]['Domain'] + '].[' + metadataQueryResult[0]['Table'] + '] t where t.[Deleted] is null';
    }
    else{
      const setDisplayColumnQuery = currentFieldJson ? this.getDisplayColumnQuery(currentFieldJson) : '';
      const linkFilterExpression = currentFieldJson.linkFilterExpression;
      let whereCondition = linkFilterExpression ? `where [Deleted] is null and ${linkFilterExpression}` : `where [Deleted] is null`
      if(dropdownFilter && rowId){
        whereCondition = linkFilterExpression ? `where [Deleted] is null and ${dropdownFilter} and ${linkFilterExpression}` : `where [Deleted] is null and ${dropdownFilter}`
      }
      if(setDisplayColumnQuery){
        dataSetQuery = 'select ' + setDisplayColumnQuery +  ',[Cinchy Id] as \'Id\', [' + metadataQueryResult[0]['Column'] + '] as \'Label\' from [' + metadataQueryResult[0]['Domain'] + '].[' + metadataQueryResult[0]['Table'] + '] ' + whereCondition;
      }else{
        dataSetQuery = 'select [Cinchy Id] as \'Id\', [' + metadataQueryResult[0]['Column'] + '] as \'Label\' from [' + metadataQueryResult[0]['Domain'] + '].[' + metadataQueryResult[0]['Table'] + '] ' + whereCondition;
      }
    }
  //  console.log('------dataSetQuery', dataSetQuery);
    const params = {
      '@cinchyid': rowId ? rowId.toString() : null
    }
    let optionArray: IDropdownOption[] = [];
    (await this._cinchyService.executeCsql(dataSetQuery, params).toPromise()).queryResult.toObjectArray().forEach(function (row) {
      // TODO For now only showing one display column (display-0)
      const label = row['display-0'] ? `${row['Label']}, ${row['display-0']}` : row['Label'];
      optionArray.push(new DropdownOption(row['Id'], label));
    });
    result = new DropdownDataset(optionArray);
    this._dropdownDatasets[linkTargetColumnId] = result;
    return result;
  }

  getDisplayColumnQuery(currentFieldJson) {
    const displayColumns = currentFieldJson.SearchDisplayColumns;
    let displayStrngArr = [];
    if(displayColumns && displayColumns.length){
      displayColumns.forEach((item, index) => {
        const firstKey = item.name ? item.name.split('.')[0]: '';
        firstKey && displayStrngArr.push(`[${firstKey}] as 'display-${index}'`)
      });
    }
    return displayStrngArr.join(',');

  }
}
