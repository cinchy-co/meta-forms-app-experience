import { Observable, of, Subject, throwError } from "rxjs";
import { catchError, map, takeUntil, tap } from "rxjs/operators";

import { Injectable } from "@angular/core";
import { HttpClient } from "@angular/common/http";

import { Cinchy, CinchyService } from "@cinchy-co/angular-sdk";

import { IFormFieldMetadata } from "../models/form-field-metadata.model";
import { IFormMetadata } from "../models/form-metadata-model";
import { IFormSectionMetadata } from "../models/form-section-metadata.model";
import { ILookupRecord } from "../models/lookup-record.model";

import { AppStateService } from "./app-state.service";


@Injectable({
  providedIn: "root"
})
export class CinchyQueryService {

  private readonly DOMAIN: string = "Cinchy Forms";
  //private readonly DOMAIN: string = "Sandbox";

  private _formMetadataCache: { [formId: string] : IFormMetadata } = {};
  private _formSectionsMetadataCache: { [formId: string] : IFormSectionMetadata[] } = {};
  private _formFieldsMetadataCache: { [formId: string]: IFormFieldMetadata[] } = {};


  /**
   * This will allow us to cancel a retrieval of lookup records that is still in flight when another filtered response comes in.
   */
  public resetLookupRecords = new Subject<void>();

  /**
   * Search is limited to the first N records per CIN-02737.
   */
  public static readonly LOOKUP_RECORD_LABEL_COUNT = 10;


  constructor(
    private _appStateService: AppStateService,
    private _cinchyService: CinchyService,
    private _httpClient: HttpClient
  ) {}


  getFilesInCell(columnName: string, domainName: string, tableName: string, rowId: number): Observable<Array<{ fileId: number, fileName: string }>> {

    const query = `
      SELECT
        [${columnName}].[Cinchy ID] AS 'fileIds',
        [${columnName}].[File Name] AS 'fileNames'
      FROM [${domainName}].[${tableName}]
      WHERE [Cinchy ID]=${rowId};`;

    return this._cinchyService.executeCsql(query, null).pipe(map(
      resp => {
        let result = [];
        const resultRecord = resp["queryResult"].toObjectArray();

        if (resultRecord?.length && resultRecord[0]["fileIds"] && resultRecord[0]["fileNames"]) {
          const fileIds = resultRecord[0]["fileIds"]?.toString().split(",").map(x => parseInt(x.trim())) ?? [];
          const fileNames = resultRecord[0]["fileNames"]?.toString().split(",").map(x => x.trim()) ?? [];

          fileIds.forEach((id, index) => {

            result.push({ fileId: id, fileName: fileNames[index] });
          });
        }

        return result;
      }
    ));
  }


  getFormMetadata(formId?: string): Observable<IFormMetadata> {

    const id = formId ?? this._appStateService.formId;

    if (this._formMetadataCache[id]) {
      return of(this._formMetadataCache[id]);
    }

    const query = "Get Form Metadata";
    const params = {
      "@formId": id
    };

    return this._cinchyService.executeQuery(this.DOMAIN, query, params).pipe(
      map((response: { queryResult: Cinchy.QueryResult }): IFormMetadata => {

        const resultArray = response?.queryResult?.toObjectArray();

        return resultArray?.length ? resultArray[0] as IFormMetadata : null;
      }),
      tap((result: IFormMetadata) => {
        if (result) {
          this._formMetadataCache[id] = result;
        }
      }),
      catchError(error => {
        console.error("Error fetching form metadata:", error);
        return throwError(error);
      })
    );
  }


  getFormSectionsMetadata(formId?: string): Observable<IFormSectionMetadata[]> {

    const id = formId ?? this._appStateService.formId;

    if (this._formSectionsMetadataCache[id])
      return of(this._formSectionsMetadataCache[id]);

    const query = "Get Form Sections Metadata";
    const params = {
      "@formId": id
    };

    return this._cinchyService.executeQuery(this.DOMAIN, query, params).pipe(
      map((response: { queryResult: Cinchy.QueryResult }) => {

        return <IFormSectionMetadata[]>response?.queryResult?.toObjectArray();
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


  getFormFieldsMetadata(formId?: string): Observable<IFormFieldMetadata[]> {

    const id = formId ?? this._appStateService.formId;

    if (this._formFieldsMetadataCache[id]) {
      return of(this._formFieldsMetadataCache[id]);
    }

    const query = "Get Form Fields Metadata";
    const params = {
      "@formId": id
    };

    return this._cinchyService.executeQuery(this.DOMAIN, query, params).pipe(
      map(response => {

        return <IFormFieldMetadata[]> response?.queryResult?.toObjectArray();
      }),
      tap((result: IFormFieldMetadata[]) => {

        if (result) {
          this._formFieldsMetadataCache[id] = result;
        }
      }),
      catchError(error => {
        console.error("Error fetching form fields metadata:", error);

        return throwError(error);
      })
    );
  }


  getLookupRecords(subtitleColumn: string, domain: string, table: string, lookupFilter?: string, limitResults?: boolean): Observable<ILookupRecord[]> {

    // If more than LOOKUP_RECORD_LABEL_COUNT records are retrieved, we know to indicate that additional records are available for the given filter.
    const selectStatement = limitResults ? `SELECT TOP ${CinchyQueryService.LOOKUP_RECORD_LABEL_COUNT + 1}` : `SELECT`;
    const subCol = subtitleColumn ?? "Cinchy ID";

    const query = `
      ${selectStatement}
        [Cinchy ID] as 'id',
        [${subCol}] as 'label'
      FROM [${domain}].[${table}]
      WHERE [Deleted] IS NULL
        AND [${subCol}] IS NOT NULL
        ${lookupFilter ? `AND ${lookupFilter}` : ''}
      ORDER BY [${subCol}];`;

    return this._cinchyService.executeCsql(query, null).pipe(
      takeUntil(this.resetLookupRecords),
      map(response => {

        return <ILookupRecord[]>response?.queryResult?.toObjectArray();
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

      return this._httpClient.post(uploadUrl, formData);
    }

    return null;
  }


  updateFilesInCell(fileIds: number[], columnName: string, domainName: string, tableName: string, rowId: number): Observable<any> {

    const ids = fileIds.length > 0 ? fileIds?.join(',1,') + ',1' : '';
    const query = `
      UPDATE t
      SET t.[${columnName}]='${ids}'
      FROM [${domainName}].[${tableName}] t
      WHERE [Deleted] IS NULL
        AND [Cinchy ID]=${rowId};`;

    return this._cinchyService.executeCsql(query, null).pipe(map(result => result.queryResult.toObjectArray() as { fileId: number, fileName: string }[]));
  }
}
