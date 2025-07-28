import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClientModule } from '@angular/common/http';
import { ApiService } from '../../services/api.service';

interface User {
  _id: string;
  username: string;
  email: string;
  role: string;
  status: string;
  createdAt: string;
  lastLogin?: string;
}

@Component({
  selector: 'app-user-management',
  standalone: true,
  imports: [CommonModule, FormsModule, HttpClientModule],
  templateUrl: './user-management.component.html',
  styleUrl: './user-management.component.css'
})
export class UserManagementComponent implements OnInit {
  users: User[] = [];
  filteredUsers: User[] = [];
  searchTerm: string = '';
  loading = true;
  selectedUser: User | null = null;

  constructor(private apiService: ApiService) {}

  ngOnInit() {
    this.loadUsers();
  }

  loadUsers() {
    this.loading = true;
    this.apiService.get<User[]>('/users').subscribe({
      next: (users) => {
        this.users = users;
        this.filteredUsers = users;
        this.loading = false;
      },
      error: (error: any) => {
        console.error('Error loading users:', error);
        this.loading = false;
      }
    });
  }

  searchUsers() {
    if (!this.searchTerm.trim()) {
      this.filteredUsers = this.users;
    } else {
      this.filteredUsers = this.users.filter(user =>
        user.username.toLowerCase().includes(this.searchTerm.toLowerCase()) ||
        user.email.toLowerCase().includes(this.searchTerm.toLowerCase())
      );
    }
  }

  blockUser(userId: string) {
    this.apiService.patch(`/users/${userId}/block`, {}).subscribe({
      next: () => {
        this.loadUsers();
      },
      error: (error: any) => {
        console.error('Error blocking user:', error);
      }
    });
  }

  unblockUser(userId: string) {
    this.apiService.patch(`/users/${userId}/unblock`, {}).subscribe({
      next: () => {
        this.loadUsers();
      },
      error: (error: any) => {
        console.error('Error unblocking user:', error);
      }
    });
  }

  promoteToAdmin(userId: string) {
    this.apiService.patch(`/users/${userId}/promote`, {}).subscribe({
      next: () => {
        this.loadUsers();
      },
      error: (error: any) => {
        console.error('Error promoting user:', error);
      }
    });
  }

  viewHistory(userId: string) {
    this.apiService.get(`/users/${userId}/history`).subscribe({
      next: (history) => {
        console.log('User history:', history);
        // You can implement a modal to show history
      },
      error: (error: any) => {
        console.error('Error loading user history:', error);
      }
    });
  }

  selectUser(user: User) {
    this.selectedUser = user;
  }
}
