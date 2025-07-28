import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClientModule } from '@angular/common/http';
import { ApiService } from '../../services/api.service';

interface Subscription {
  _id: string;
  name: string;
  price: number;
  duration: number; // in months
  features: string[];
  status: 'active' | 'inactive';
  createdAt: string;
}

@Component({
  selector: 'app-subscription-management',
  standalone: true,
  imports: [CommonModule, FormsModule, HttpClientModule],
  templateUrl: './subscription-management.component.html',
  styleUrl: './subscription-management.component.css'
})
export class SubscriptionManagementComponent implements OnInit {
  subscriptions: Subscription[] = [];
  loading = true;
  showAddForm = false;
  showEditForm = false;
  selectedSubscription: Subscription | null = null;

  // Form data
  subscriptionForm = {
    name: '',
    price: 0,
    duration: 1,
    features: '',
    status: 'active' as 'active' | 'inactive'
  };

  constructor(private apiService: ApiService) {}

  ngOnInit() {
    this.loadSubscriptions();
  }

  loadSubscriptions() {
    this.loading = true;
    this.apiService.get<Subscription[]>('/subscriptions').subscribe({
      next: (subscriptions) => {
        this.subscriptions = subscriptions;
        this.loading = false;
      },
      error: (error: any) => {
        console.error('Error loading subscriptions:', error);
        this.loading = false;
      }
    });
  }

  addSubscription() {
    if (!this.subscriptionForm.name || this.subscriptionForm.price <= 0) {
      alert('Please fill in all required fields');
      return;
    }

    const subscriptionData = {
      ...this.subscriptionForm,
      features: this.subscriptionForm.features.split(',').map(f => f.trim()).filter(f => f)
    };

    this.apiService.post('/subscriptions', subscriptionData).subscribe({
      next: () => {
        this.loadSubscriptions();
        this.resetForm();
        this.showAddForm = false;
      },
      error: (error: any) => {
        console.error('Error adding subscription:', error);
        alert('Error adding subscription');
      }
    });
  }

  editSubscription() {
    if (!this.selectedSubscription || !this.subscriptionForm.name || this.subscriptionForm.price <= 0) {
      alert('Please fill in all required fields');
      return;
    }

    const subscriptionData = {
      ...this.subscriptionForm,
      features: this.subscriptionForm.features.split(',').map(f => f.trim()).filter(f => f)
    };

    this.apiService.put(`/subscriptions/${this.selectedSubscription._id}`, subscriptionData).subscribe({
      next: () => {
        this.loadSubscriptions();
        this.resetForm();
        this.showEditForm = false;
        this.selectedSubscription = null;
      },
      error: (error: any) => {
        console.error('Error updating subscription:', error);
        alert('Error updating subscription');
      }
    });
  }

  deleteSubscription(subscriptionId: string) {
    if (confirm('Are you sure you want to delete this subscription plan?')) {
      this.apiService.delete(`/subscriptions/${subscriptionId}`).subscribe({
        next: () => {
          this.loadSubscriptions();
        },
        error: (error: any) => {
          console.error('Error deleting subscription:', error);
          alert('Error deleting subscription');
        }
      });
    }
  }

  toggleSubscriptionStatus(subscription: Subscription) {
    const newStatus = subscription.status === 'active' ? 'inactive' : 'active';
    this.apiService.patch(`/subscriptions/${subscription._id}`, { status: newStatus }).subscribe({
      next: () => {
        this.loadSubscriptions();
      },
      error: (error: any) => {
        console.error('Error updating subscription status:', error);
        alert('Error updating subscription status');
      }
    });
  }

  openEditForm(subscription: Subscription) {
    this.selectedSubscription = subscription;
    this.subscriptionForm = {
      name: subscription.name,
      price: subscription.price,
      duration: subscription.duration,
      features: subscription.features.join(', '),
      status: subscription.status
    };
    this.showEditForm = true;
  }

  resetForm() {
    this.subscriptionForm = {
      name: '',
      price: 0,
      duration: 1,
      features: '',
      status: 'active'
    };
  }

  toggleAddForm() {
    this.showAddForm = !this.showAddForm;
    if (this.showAddForm) {
      this.resetForm();
    }
  }

  getDurationText(months: number): string {
    if (months === 1) return '1 month';
    if (months === 12) return '1 year';
    return `${months} months`;
  }
}
