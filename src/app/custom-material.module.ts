import {NgModule} from '@angular/core';
import {MatTableModule} from '@angular/material/table';
import {MatAutocompleteModule} from '@angular/material/autocomplete';
import {MatInputModule} from '@angular/material/input';
import {MatPaginatorModule} from '@angular/material/paginator';
import {MatNativeDateModule} from '@angular/material';
import {MatDatepickerModule} from '@angular/material/datepicker';
import {MatProgressSpinnerModule} from '@angular/material/progress-spinner';
import {MatIconModule} from '@angular/material/icon';
import {CdkTableModule} from '@angular/cdk/table';
import {MatTooltipModule} from '@angular/material/tooltip';
import {MatButtonToggleModule} from '@angular/material/button-toggle';
import {MatExpansionModule} from '@angular/material/expansion';
import {MatDialogModule} from '@angular/material/dialog';
import {MatSidenavModule} from '@angular/material/sidenav';
import {MatToolbarModule} from '@angular/material/toolbar';
import {MatButtonModule} from '@angular/material/button';
import {MatSortModule} from '@angular/material/sort';
import {MatCardModule} from '@angular/material/card';
import {MatSelectModule} from '@angular/material/select';

@NgModule({
  imports: [
    MatTableModule,
    CdkTableModule,
    MatAutocompleteModule,
    MatInputModule,
    MatPaginatorModule,
    MatProgressSpinnerModule,
    MatIconModule,
    MatExpansionModule,
    MatTooltipModule,
    MatButtonToggleModule,
    MatDialogModule,
    MatSidenavModule,
    MatToolbarModule,
    MatButtonModule,
    MatSortModule,
    MatCardModule,
    MatDatepickerModule,
    MatNativeDateModule,
    MatSelectModule
  ],
  declarations: [],
  providers: [],
  exports: [
    MatTableModule,
    CdkTableModule,
    MatAutocompleteModule,
    MatInputModule,
    MatPaginatorModule,
    MatProgressSpinnerModule,
    MatIconModule,
    MatExpansionModule,
    MatTooltipModule,
    MatButtonToggleModule,
    MatDialogModule,
    MatSidenavModule,
    MatToolbarModule,
    MatButtonModule,
    MatSortModule,
    MatCardModule,
    MatDatepickerModule,
    MatNativeDateModule,
    MatSelectModule
  ]
})

export class CustomMaterialModule {
}
