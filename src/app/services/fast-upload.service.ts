import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, from } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class FastUploadService {
  private apiUrl = 'http://localhost:3000/anime';

  constructor(private http: HttpClient) {}

  /**
   * 🚀 FAST UPLOAD: Upload video directly to Cloudinary (bypasses server)
   * This is 5-10x faster than traditional server uploads
   */
  async uploadVideoDirectly(
    animeId: string, 
    file: File, 
    uploadType: 'trailer' | 'episode' | 'thumbnail',
    episodeNumber?: number,
    seasonNumber?: number,
    onProgress?: (progress: number) => void
  ): Promise<any> {
    try {
      console.log('🚀 Starting direct upload for:', file.name, 'Size:', this.formatFileSize(file.size));
      
      // Step 1: Get signed upload parameters from your server
      const signatureResponse = await this.http.get<any>(
        `${this.apiUrl}/${animeId}/upload-signature?type=${file.type.startsWith('video') ? 'video' : 'image'}`
      ).toPromise();
      
      if (!signatureResponse.success) {
        throw new Error('Failed to get upload signature');
      }
      
      const uploadParams = signatureResponse.uploadParams;
      console.log('✅ Got upload signature, uploading directly to Cloudinary...');
      
      // Step 2: Upload directly to Cloudinary with progress tracking
      const formData = new FormData();
      
      // Add all required Cloudinary parameters
      console.log('📦 Adding upload parameters to FormData:');
      Object.keys(uploadParams).forEach(key => {
        if (key !== 'upload_url') {
          const value = uploadParams[key];
          formData.append(key, value);
          
          // Log parameters (hide sensitive data)
          if (key === 'signature') {
            console.log(`- ${key}: ${value.substring(0, 10)}...`);
          } else if (key === 'api_key') {
            console.log(`- ${key}: ${value.substring(0, 6)}...`);
          } else {
            console.log(`- ${key}: ${value}`);
          }
        }
      });
      
      // Add the file
      formData.append('file', file);
      console.log(`- file: ${file.name} (${this.formatFileSize(file.size)})`);
      
      console.log('🚀 Uploading to:', uploadParams.upload_url);
      
      // Create XMLHttpRequest for progress tracking
      const uploadResult = await this.uploadWithProgress(
        uploadParams.upload_url,
        formData,
        onProgress
      );
      
      console.log('✅ Direct upload completed:', uploadResult);
      
      // Step 3: Confirm upload with your server to update database
      const confirmResult = await this.http.post<any>(
        `${this.apiUrl}/${animeId}/confirm-upload`,
        {
          public_id: uploadResult.public_id,
          secure_url: uploadResult.secure_url,
          resource_type: uploadResult.resource_type,
          signature: uploadResult.signature,
          timestamp: uploadResult.created_at ? new Date(uploadResult.created_at).getTime() / 1000 : Date.now() / 1000,
          uploadType,
          episodeNumber,
          seasonNumber
        }
      ).toPromise();
      
      console.log('✅ Upload confirmed and database updated');
      return {
        success: true,
        cloudinaryResult: uploadResult,
        databaseResult: confirmResult
      };
      
    } catch (error) {
      console.error('❌ Direct upload failed:', error);
      throw error;
    }
  }

  /**
   * Upload with progress tracking using XMLHttpRequest
   */
  private uploadWithProgress(
    url: string, 
    formData: FormData, 
    onProgress?: (progress: number) => void
  ): Promise<any> {
    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      
      // Track upload progress
      xhr.upload.addEventListener('progress', (event) => {
        if (event.lengthComputable && onProgress) {
          const progress = Math.round((event.loaded / event.total) * 100);
          onProgress(progress);
          console.log(`📊 Upload progress: ${progress}%`);
        }
      });
      
      xhr.addEventListener('load', () => {
        if (xhr.status === 200) {
          try {
            const result = JSON.parse(xhr.responseText);
            console.log('✅ Upload successful:', result);
            resolve(result);
          } catch (e) {
            console.error('❌ Invalid response from Cloudinary:', xhr.responseText);
            reject(new Error('Invalid response from Cloudinary'));
          }
        } else {
          console.error('❌ Upload failed with status:', xhr.status);
          console.error('❌ Response text:', xhr.responseText);
          console.error('❌ Response headers:', xhr.getAllResponseHeaders());
          
          let errorMessage = `Upload failed with status: ${xhr.status}`;
          
          try {
            const errorResponse = JSON.parse(xhr.responseText);
            if (errorResponse.error && errorResponse.error.message) {
              errorMessage += ` - ${errorResponse.error.message}`;
            }
          } catch (e) {
            // Response is not JSON, use status text
            if (xhr.statusText) {
              errorMessage += ` - ${xhr.statusText}`;
            }
          }
          
          reject(new Error(errorMessage));
        }
      });
      
      xhr.addEventListener('error', () => {
        reject(new Error('Upload failed due to network error'));
      });
      
      xhr.open('POST', url);
      xhr.send(formData);
    });
  }

  /**
   * Format file size for display
   */
  formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  /**
   * Estimate upload time based on file size and connection speed
   */
  estimateUploadTime(fileSize: number, speedMbps: number = 10): string {
    const fileSizeMb = fileSize / (1024 * 1024);
    const timeSeconds = (fileSizeMb * 8) / speedMbps; // Convert to bits and divide by speed
    
    if (timeSeconds < 60) {
      return `~${Math.round(timeSeconds)} seconds`;
    } else if (timeSeconds < 3600) {
      return `~${Math.round(timeSeconds / 60)} minutes`;
    } else {
      return `~${Math.round(timeSeconds / 3600)} hours`;
    }
  }
}
