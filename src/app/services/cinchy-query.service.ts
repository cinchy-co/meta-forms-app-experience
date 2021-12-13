import {Injectable, Inject} from '@angular/core';
import {CinchyService} from '@cinchy-co/angular-sdk';
import {Observable, of} from 'rxjs';
import {IGetQuery} from "../models/state.model";
import { HttpClient } from '@angular/common/http';
import { map } from 'rxjs/operators';
import { Subject } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class CinchyQueryService {
  cachedPeople;
  cachedOpportunityDetails;

  constructor(private cincyService: CinchyService, private httpClient: HttpClient) {
  }

  uploadFiles(files: File[], uploadUrl: string): Observable<any> {
    if (files && uploadUrl) {
      let formData = new FormData();

      // Add the uploaded file to the form data collection
      if (files.length > 0) {
        for (let i = 0; i < files.length; i++) {
          formData.append("files", files[i]);
        }
      }
      //const url = `${this.baseUrl}${uploadUrl}`;
      const url = `${uploadUrl}`;
      return this.httpClient.post(url, formData);
      //return of('')
    }
    return null;
  }

  getFilesInCell(columnName: string, domainName: string, tableName: string, cinchyId: number): Observable<{ fileId: number, fileName: string }[]> {
    const query = `SELECT [${columnName}].[Cinchy Id] as 'fileIds', [${columnName}].[File Name] as 'fileNames'  FROM [${domainName}].[${tableName}] WHERE [Cinchy Id]=${cinchyId}`;
    return this.cincyService.executeCsql(query, null).pipe( map(
      resp => {
        let result = [];
        const resultRecord = resp['queryResult'].toObjectArray();
        if (resultRecord?.length && resultRecord[0]['fileIds'] && resultRecord[0]['fileNames']) {
          const fileIds = resultRecord[0]['fileIds']?.toString().split(',').map(x => parseInt(x.trim())) ?? [];
          const fileNames = resultRecord[0]['fileNames']?.toString().split(',').map(x => x.trim()) ?? [];
          fileIds.forEach( (id, index) => {
            result.push({ fileId: id, fileName: fileNames[index] });
          });
        }
        return result;
      }
    ));
  }

  updateFilesInCell(fileIds: number[], columnName: string, domainName: string, tableName: string, cinchyId: number): Observable<any> {
    const ids = fileIds.length > 0 ? fileIds?.join(',1,') + ',1' : '';
    const query = `UPDATE t SET t.[${columnName}]='${ids}' FROM [${domainName}].[${tableName}] t WHERE [Deleted] IS NULL AND [Cinchy Id]=${cinchyId}`;
    return this.cincyService.executeCsql(query, null).pipe( map( result => result.queryResult.toObjectArray() as { fileId: number, fileName: string }[] ));
  }

  getAccountDirectors(): Observable<IGetQuery> {
    return this.cincyService.executeQuery('Sales', 'Get Account Directors', null);
  }

  getAllOpportunities(): Observable<IGetQuery> {
    return this.cincyService.executeQuery('Sales', 'Get All Opportunities', null);
  }

  getOpportunitiesForDirector(id): Observable<IGetQuery> {
    const params = {
      '@accountDirectorId': id
    };
    return this.cincyService.executeQuery('Sales', 'Get Opportunities For Director', params);
  }

  getAllPeople(): Observable<IGetQuery> {
    return this.cachedPeople ? of(this.cachedPeople) : this.cincyService.executeQuery('Contacts', 'Get All People', null);
  }

  getAllCompanies(): Observable<IGetQuery> {
    return this.cincyService.executeQuery('Contacts', 'Get All Companies', null);
  }


  getFormMetaData(formId?): Observable<IGetQuery> {
    // Get form Meta data Only when Once.
    // For QA change Cinchy DX to Configuration
    const params = {
      '@formId': formId ? formId : sessionStorage.getItem('formId')
    };
    return this.cincyService.executeQuery('Cinchy Forms', 'Get Form MetaData', params);
  }

  getJsonDataBySectionId(formSectionId): Observable<IGetQuery> {
    // Get JsonData using sectionId.
    const params = {
      '@formSectionId': formSectionId
    };
    return this.cincyService.executeQuery('Cinchy Forms', 'Get Json Metadata', params);
  }

  // init the subject
  public stopRequest: Subject<void> = new Subject<void>();
    
  getJsonDataByFormId() {
    // Get form Meta data using form Id
    const params = {
      '@formId': sessionStorage.getItem('formId')
    };
    return this.cincyService.executeQuery('Cinchy Forms', 'Get Json Metadata By Form Id', params);
  }

  getAllRowsOfTable(subtitleColumn, domain, table, lookupFilter?): Observable<IGetQuery> {
    const whereCondition = lookupFilter ? `WHERE [Deleted] IS NULL AND ${lookupFilter}` : `WHERE [Deleted] IS NULL`
    const query = `SELECT [${subtitleColumn}] as 'fullName',
                   [Cinchy Id] as 'id'
                   FROM
                   [${domain}].[${table}]
                   ${whereCondition}
               `;
    return this.cincyService.executeCsql(query, null);
  }

  getFormSections(): Observable<IGetQuery> {
    const params = {
      '@formId': sessionStorage.getItem('formId')
    };
    return this.cincyService.executeQuery('Cinchy Forms', 'Get Form Sections', params);
  }
}
