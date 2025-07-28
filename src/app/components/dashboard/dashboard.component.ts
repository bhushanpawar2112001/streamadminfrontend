import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClientModule } from '@angular/common/http';
import { Router } from '@angular/router';
import { AuthService } from '../../services/auth.service';
import { ApiService } from '../../services/api.service';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, HttpClientModule],
  templateUrl: './dashboard.component.html',
  styleUrl: './dashboard.component.css'
})
export class DashboardComponent implements OnInit {
  currentUser: any;
  stats = {
    totalUsers: 0,
    totalAnimes: 0,
    totalSubscriptions: 0,
    activeUsers: 0
  };
  loading = true;

  constructor(
    private authService: AuthService,
    private apiService: ApiService,
    private router: Router
  ) {}

  ngOnInit() {
    this.currentUser = this.authService.getUser();
    this.loadStats();
  }

  loadStats() {
    // Load dashboard statistics
    Promise.all([
      this.apiService.get<any[]>('/users').toPromise(),
      this.apiService.get<any[]>('/anime').toPromise(),
      this.apiService.get<any[]>('/subscriptions').toPromise()
    ]).then(([users, animes, subscriptions]) => {
      this.stats = {
        totalUsers: users?.length || 0,
        totalAnimes: animes?.length || 0,
        totalSubscriptions: subscriptions?.length || 0,
        activeUsers: users?.filter((u: any) => u.status === 'active')?.length || 0
      };
      this.loading = false;
    }).catch(() => {
      this.loading = false;
    });
  }

  logout() {
    this.authService.logout();
    this.router.navigate(['/login']);
  }

  navigateTo(route: string) {
    this.router.navigate([route]);
  }
}
