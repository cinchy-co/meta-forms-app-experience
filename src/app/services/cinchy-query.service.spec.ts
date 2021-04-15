import { TestBed } from '@angular/core/testing';

import { CinchyQueryService } from './cinchy-query.service';

describe('CinchyQueryService', () => {
  let service: CinchyQueryService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(CinchyQueryService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
