import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClientModule } from '@angular/common/http';
import { ApiService } from '../../services/api.service';
import { FastUploadService } from '../../services/fast-upload.service';

interface Anime {
  _id: string;
  title: string;
  description: string;
  image: string;
  trailer: string;
  categories: string[];
  status: string;
  releaseYear: number;
  rating: number;
  seasons: Season[];
  createdAt: string;
}

interface Season {
  _id?: string;
  seasonNumber: number;
  title: string;
  description: string;
  releaseDate: Date;
  poster: string;
  episodes: Episode[];
}

interface Episode {
  _id?: string;
  episodeNumber: number;
  title: string;
  description: string;
  video: string;
  duration: string;
  thumbnail: string;
  releaseDate: Date;
}

@Component({
  selector: 'app-anime-management',
  standalone: true,
  imports: [CommonModule, FormsModule, HttpClientModule],
  templateUrl: './anime-management.component.html',
  styleUrl: './anime-management.component.css'
})
export class AnimeManagementComponent implements OnInit {
  animes: Anime[] = [];
  loading = true;
  showAddForm = false;
  showEditForm = false;
  selectedAnime: Anime | null = null;
  searchTerm = '';

  // Form data
  animeForm = {
    title: '',
    description: '',
    categories: '',
    status: 'Ongoing',
    releaseYear: new Date().getFullYear(),
    rating: 0,
    trailer: '',
    seasonCount: 1,
    episodesPerSeason: 12
  };

  // File upload
  posterFile: File | null = null;
  videoFile: File | null = null;

  // For episode video upload with progress tracking
  selectedEpisodeVideoFile: File | null = null;
  uploadingEpisode: {animeId: string, seasonNumber: number, episodeNumber: number} | null = null;
  
  // Upload progress tracking
  uploadProgress: {[key: string]: {
    progress: number;
    status: 'idle' | 'uploading' | 'processing' | 'completed' | 'error';
    error?: string;
    estimatedTime?: string;
    uploadedSize?: string;
    totalSize?: string;
  }} = {};

  constructor(
    private apiService: ApiService,
    private fastUploadService: FastUploadService
  ) {}

  ngOnInit() {
    this.loadAnimes();
  }

  loadAnimes() {
    this.loading = true;
    this.apiService.get<Anime[]>('/anime').subscribe({
      next: (animes) => {
        this.animes = animes;
        this.loading = false;
      },
      error: (error: any) => {
        console.error('Error loading animes:', error);
        this.loading = false;
      }
    });
  }

  searchAnimes() {
    if (!this.searchTerm.trim()) {
      this.loadAnimes();
    } else {
      this.apiService.get<Anime[]>(`/anime/search?q=${this.searchTerm}`).subscribe({
        next: (animes) => {
          this.animes = animes;
        },
        error: (error: any) => {
          console.error('Error searching animes:', error);
        }
      });
    }
  }

  onPosterSelected(event: any) {
    this.posterFile = event.target.files[0];
  }

  onVideoSelected(event: any) {
    this.videoFile = event.target.files[0];
  }

  onEpisodeVideoSelected(event: any, animeId: string, seasonNumber: number, episodeNumber: number) {
    const file = event.target.files[0];
    if (!file) return;
    
    this.selectedEpisodeVideoFile = file;
    this.uploadingEpisode = { animeId, seasonNumber, episodeNumber };
    
    // Initialize upload progress tracking
    const uploadKey = this.getUploadKey(animeId, seasonNumber, episodeNumber);
    this.uploadProgress[uploadKey] = {
      progress: 0,
      status: 'idle',
      totalSize: this.fastUploadService.formatFileSize(file.size),
      estimatedTime: this.fastUploadService.estimateUploadTime(file.size)
    };
    
    console.log('📁 File selected:', {
      name: file.name,
      size: this.fastUploadService.formatFileSize(file.size),
      type: file.type,
      estimatedUploadTime: this.uploadProgress[uploadKey].estimatedTime
    });
  }

  async uploadEpisodeVideo() {
    if (!this.selectedEpisodeVideoFile || !this.uploadingEpisode) return;
    
    const { animeId, seasonNumber, episodeNumber } = this.uploadingEpisode;
    const file = this.selectedEpisodeVideoFile;
    const uploadKey = this.getUploadKey(animeId, seasonNumber, episodeNumber);
    
    try {
      // Update status to uploading
      this.uploadProgress[uploadKey].status = 'uploading';
      this.uploadProgress[uploadKey].progress = 0;
      
      console.log('🚀 Starting fast upload for episode:', `S${seasonNumber}E${episodeNumber}`);
      
      // Use fast upload service with progress tracking
      const result = await this.fastUploadService.uploadVideoDirectly(
        animeId,
        file,
        'episode',
        episodeNumber,
        seasonNumber,
        (progress: number) => {
          // Real-time progress update
          this.uploadProgress[uploadKey].progress = progress;
          this.uploadProgress[uploadKey].uploadedSize = this.fastUploadService.formatFileSize(
            (file.size * progress) / 100
          );
          
          if (progress === 100) {
            this.uploadProgress[uploadKey].status = 'processing';
          }
        }
      );
      
      // Upload completed successfully
      this.uploadProgress[uploadKey].status = 'completed';
      this.uploadProgress[uploadKey].progress = 100;
      
      console.log('✅ Episode video uploaded successfully!');
      
      // Clean up
      this.selectedEpisodeVideoFile = null;
      this.uploadingEpisode = null;
      
      // Reload animes to show updated status
      this.loadAnimes();
      
      // Clear progress after a delay
      setTimeout(() => {
        delete this.uploadProgress[uploadKey];
      }, 3000);
      
    } catch (error: any) {
      console.error('❌ Error uploading episode video:', error);
      
      // Update status to error
      this.uploadProgress[uploadKey].status = 'error';
      this.uploadProgress[uploadKey].error = error.message || 'Upload failed';
    }
  }

  addAnime() {
    if (!this.animeForm.title || !this.animeForm.description) {
      alert('Please fill in all required fields (Title and Description are required)');
      return;
    }

    // Validate title is not empty after trimming
    if (this.animeForm.title.trim() === '') {
      alert('Title cannot be empty');
      return;
    }

    const animeData = {
      title: this.animeForm.title.trim(),
      description: this.animeForm.description.trim(),
      categories: this.animeForm.categories ? this.animeForm.categories.split(',').map(c => c.trim()) : [],
      status: this.animeForm.status,
      releaseYear: this.animeForm.releaseYear,
      rating: this.animeForm.rating || 0,
      trailer: this.animeForm.trailer || '',
      seasonCount: this.animeForm.seasonCount || 1,
      episodesPerSeason: this.animeForm.episodesPerSeason || 12
    };

    // 1. Create the anime (metadata only)
    this.apiService.post('/anime', animeData).subscribe({
      next: (createdAnime: any) => {
        // 2. Upload poster if selected
        if (this.posterFile) {
          const formData = new FormData();
          formData.append('file', this.posterFile);
          this.apiService.post(`/anime/${createdAnime._id}/poster`, formData).subscribe();
        }
        // 3. Upload video if selected (for trailer)
        if (this.videoFile) {
          const formData = new FormData();
          formData.append('file', this.videoFile);
          this.apiService.post(`/anime/${createdAnime._id}/video`, formData).subscribe();
        }
        this.loadAnimes();
        this.resetForm();
        this.showAddForm = false;
      },
      error: (error: any) => {
        console.error('Error adding anime:', error);
        alert('Error adding anime');
      }
    });
  }

  editAnime() {
    if (!this.selectedAnime || !this.animeForm.title || !this.animeForm.description) {
      alert('Please fill in all required fields');
      return;
    }

    const animeData = {
      title: this.animeForm.title.trim(),
      description: this.animeForm.description.trim(),
      categories: this.animeForm.categories ? this.animeForm.categories.split(',').map(c => c.trim()) : [],
      status: this.animeForm.status,
      releaseYear: this.animeForm.releaseYear,
      rating: this.animeForm.rating || 0,
      trailer: this.animeForm.trailer || ''
      // Note: Season/episode structure updates will be handled separately
    };

    this.apiService.put(`/anime/${this.selectedAnime._id}`, animeData).subscribe({
      next: () => {
        this.loadAnimes();
        this.resetForm();
        this.showEditForm = false;
        this.selectedAnime = null;
      },
      error: (error: any) => {
        console.error('Error updating anime:', error);
        alert('Error updating anime');
      }
    });
  }

  deleteAnime(animeId: string) {
    if (confirm('Are you sure you want to delete this anime?')) {
      this.apiService.delete(`/anime/${animeId}`).subscribe({
        next: () => {
          this.loadAnimes();
        },
        error: (error: any) => {
          console.error('Error deleting anime:', error);
          alert('Error deleting anime');
        }
      });
    }
  }

  openEditForm(anime: Anime) {
    this.selectedAnime = anime;
    this.animeForm = {
      title: anime.title,
      description: anime.description,
      categories: anime.categories.join(', '),
      status: anime.status || 'Ongoing',
      releaseYear: anime.releaseYear || new Date().getFullYear(),
      rating: anime.rating,
      trailer: anime.trailer || '',
      seasonCount: anime.seasons?.length || 1,
      episodesPerSeason: anime.seasons?.[0]?.episodes?.length || 12
    };
    this.showEditForm = true;
  }

  resetForm() {
    this.animeForm = {
      title: '',
      description: '',
      categories: '',
      status: 'Ongoing',
      releaseYear: new Date().getFullYear(),
      rating: 0,
      trailer: '',
      seasonCount: 1,
      episodesPerSeason: 12
    };
    this.posterFile = null;
    this.videoFile = null;
  }

  toggleAddForm() {
    this.showAddForm = !this.showAddForm;
    if (this.showAddForm) {
      this.resetForm();
    }
  }

  getTotalEpisodes(anime: Anime): number {
    if (!anime.seasons || anime.seasons.length === 0) {
      return 0;
    }
    return anime.seasons.reduce((total, season) => {
      return total + (season.episodes?.length || 0);
    }, 0);
  }
  
  // Helper methods for upload progress tracking
  getUploadKey(animeId: string, seasonNumber: number, episodeNumber: number): string {
    return `${animeId}-S${seasonNumber}E${episodeNumber}`;
  }
  
  getUploadStatus(animeId: string, seasonNumber: number, episodeNumber: number) {
    const uploadKey = this.getUploadKey(animeId, seasonNumber, episodeNumber);
    return this.uploadProgress[uploadKey] || null;
  }
  
  isUploading(animeId: string, seasonNumber: number, episodeNumber: number): boolean {
    const status = this.getUploadStatus(animeId, seasonNumber, episodeNumber);
    return status?.status === 'uploading' || status?.status === 'processing';
  }
  
  hasUploadError(animeId: string, seasonNumber: number, episodeNumber: number): boolean {
    const status = this.getUploadStatus(animeId, seasonNumber, episodeNumber);
    return status?.status === 'error';
  }
  
  isUploadCompleted(animeId: string, seasonNumber: number, episodeNumber: number): boolean {
    const status = this.getUploadStatus(animeId, seasonNumber, episodeNumber);
    return status?.status === 'completed';
  }
}
