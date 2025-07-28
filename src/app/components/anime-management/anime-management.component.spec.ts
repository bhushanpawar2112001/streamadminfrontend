import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AnimeManagementComponent } from './anime-management.component';

describe('AnimeManagementComponent', () => {
  let component: AnimeManagementComponent;
  let fixture: ComponentFixture<AnimeManagementComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AnimeManagementComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(AnimeManagementComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
