import { Injectable, Inject } from '@angular/core';
import { CinchyService } from '@cinchy-co/angular-sdk';
import { Observable, of, throwError } from 'rxjs';
import { IGetQuery } from "../models/state.model";
import { HttpClient } from '@angular/common/http';
import { catchError, map, tap } from 'rxjs/operators';
import { Subject } from 'rxjs';
import { IFormMetadata } from '../models/form-metadata-model';
import { IFormFieldMetadata } from '../models/form-field-metadata.model';
import { IFormSectionMetadata } from '../models/form-section-metadata.model';
import { ILookupRecord } from '../models/lookup-record.model';

@Injectable({
  providedIn: 'root'
})
export class CinchyQueryService {
  private readonly DOMAIN: string = 'Cinchy Forms';
  //private readonly DOMAIN: string = 'Sandbox';

  private _formMetadataCache: { [formId: string] : IFormMetadata } = {};
  private _formSectionsMetadataCache: { [formId: string] : IFormSectionMetadata[] } = {};
  private _formFieldsMetadataCache: { [formId: string] : IFormFieldMetadata[] } = {};

  constructor(private cincyService: CinchyService, private httpClient: HttpClient) { }

  getFormMetadata(formId?: string | number): Observable<IFormMetadata> {
    const id = formId ? formId : sessionStorage.getItem('formId');
    if (this._formMetadataCache[id])
      return of(this._formMetadataCache[id]);

    const query = 'Get Form Metadata';
    const params = {
      '@formId': id
    };

    return this.cincyService.executeQuery(this.DOMAIN, query, params).pipe(
      map(response => {
        const resultArray = response?.queryResult?.toObjectArray();
        return resultArray?.length ? <IFormMetadata>resultArray[0] : null;
      }),
      tap((result: IFormMetadata) => {
        if (result)
          this._formMetadataCache[id] = result;
      }),
      catchError(error => {
        console.error("Error fetching form metadata:", error);
        return throwError(error);
      })
    );
  }

  getFormSections(formId?: string | number): Observable<IFormSectionMetadata[]> {
    const id = formId ? formId : sessionStorage.getItem('formId');
    if (this._formSectionsMetadataCache[id])
      return of(this._formSectionsMetadataCache[id]);

    const query = 'Get Form Sections Metadata';
    const params = {
      '@formId': id
    };

    return this.cincyService.executeQuery(this.DOMAIN, query, params).pipe(
      map(response => {
        return <IFormSectionMetadata[]> response?.queryResult?.toObjectArray();
      }),
      tap((result: IFormSectionMetadata[]) => {
        if (result)
          this._formSectionsMetadataCache[id] = result;
      }),
      catchError(error => {
        console.error("Error fetching form fields metadata:", error);
        return throwError(error);
      })
    );
  }

  getFormFieldsMetadata(formId?: string | number): Observable<IFormFieldMetadata[]> {
    const id = formId ? formId : sessionStorage.getItem('formId');
    if (this._formFieldsMetadataCache[id])
      return of(this._formFieldsMetadataCache[id]);

    const query = 'Get Form Fields Metadata';
    const params = {
      '@formId': id
    };

    return this.cincyService.executeQuery(this.DOMAIN, query, params).pipe(
      map(response => {
        return <IFormFieldMetadata[]> response?.queryResult?.toObjectArray();
      }),
      tap((result: IFormFieldMetadata[]) => {
        if (result)
          this._formFieldsMetadataCache[id] = result;
      }),
      catchError(error => {
        console.error("Error fetching form fields metadata:", error);
        return throwError(error);
      })
    );
  }

  getLookupRecords(subtitleColumn, domain, table, lookupFilter?): Observable<ILookupRecord[]> {
    const query = `
      SELECT 
        [Cinchy Id]         as 'id',
        [${subtitleColumn}] as 'label'
      FROM [${domain}].[${table}]
      WHERE [Deleted] IS NULL ${lookupFilter ? `AND ${lookupFilter}` : ''};`;
    return this.cincyService.executeCsql(query, null).pipe(
      map(response => {
        return <ILookupRecord[]> response?.queryResult?.toObjectArray();
      }),
      catchError(error => {
        console.error("Error fetching lookup records:", error);
        return throwError(error);
      })
    );
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
      return this.httpClient.post(uploadUrl, formData);
    }
    return null;
  }

  getFilesInCell(columnName: string, domainName: string, tableName: string, cinchyId: number): Observable<{ fileId: number, fileName: string }[]> {
    const query = `SELECT [${columnName}].[Cinchy Id] as 'fileIds', [${columnName}].[File Name] as 'fileNames'  FROM [${domainName}].[${tableName}] WHERE [Cinchy Id]=${cinchyId}`;
    return this.cincyService.executeCsql(query, null).pipe(map(
      resp => {
        let result = [];
        const resultRecord = resp['queryResult'].toObjectArray();
        if (resultRecord?.length && resultRecord[0]['fileIds'] && resultRecord[0]['fileNames']) {
          const fileIds = resultRecord[0]['fileIds']?.toString().split(',').map(x => parseInt(x.trim())) ?? [];
          const fileNames = resultRecord[0]['fileNames']?.toString().split(',').map(x => x.trim()) ?? [];
          fileIds.forEach((id, index) => {
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
    return this.cincyService.executeCsql(query, null).pipe(map(result => result.queryResult.toObjectArray() as { fileId: number, fileName: string }[]));
  }
}
