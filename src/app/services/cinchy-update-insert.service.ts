import {Injectable} from '@angular/core';
import {CinchyService} from '@cinchy-co/angular-sdk';
import {Observable, of} from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class CinchyUpdateInsertService {

  constructor(private cincyService: CinchyService) {
  }

  addContactInPerson(contactFormValues) {
    const insertPersonQuery = `
      INSERT INTO [Contacts].[People] ([Name],[Email],[Title],[Company])
      VALUES (@name, @email, @title, RESOLVELINK(@companyName, 'Name'))
      SELECT [Name] as 'label',
             [Company] as 'company',
             [Title] as 'title',
             [Cinchy Id] as 'id'
      FROM   [Contacts].[People]
      WHERE  [Cinchy Id]=@cinchy_row_id
    `;
    const params = {
      '@name': `${contactFormValues.firstName} ${contactFormValues.lastName}`,
      '@email': contactFormValues.email,
      '@title': contactFormValues.title,
      '@companyName': contactFormValues.company ? contactFormValues.company.fullName : ''
    };
    return this.cincyService.executeCsql(insertPersonQuery, params);
  }
}
