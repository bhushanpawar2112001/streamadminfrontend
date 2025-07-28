import { Routes } from '@angular/router';
import { LoginComponent } from './components/login/login.component';
import { DashboardComponent } from './components/dashboard/dashboard.component';
import { UserManagementComponent } from './components/user-management/user-management.component';
import { AnimeManagementComponent } from './components/anime-management/anime-management.component';
import { SubscriptionManagementComponent } from './components/subscription-management/subscription-management.component';

export const routes: Routes = [
  { path: '', redirectTo: '/login', pathMatch: 'full' },
  { path: 'login', component: LoginComponent },
  { path: 'dashboard', component: DashboardComponent },
  { path: 'users', component: UserManagementComponent },
  { path: 'anime', component: AnimeManagementComponent },
  { path: 'subscriptions', component: SubscriptionManagementComponent },
];
