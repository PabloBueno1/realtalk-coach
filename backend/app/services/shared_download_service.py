import os
import time
import tempfile
import logging
import requests
from typing import Tuple, Optional
from pathlib import Path

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class SharedDownloadService:
    """
    Service for downloading videos once and sharing them between analysis endpoints.
    Handles download, logging, and cleanup.
    """
    
    def __init__(self):
        self.downloaded_files = {}  # Track downloaded files by URL
    
    def download_video(self, url: str, timeout: int = 300) -> Tuple[str, float, float]:
        """
        Download video from URL to a temporary file.
        
        Args:
            url: The signed URL to download from
            timeout: Download timeout in seconds
            
        Returns:
            Tuple of (file_path, file_size_mb, download_time_seconds)
            
        Raises:
            HTTPException: If download fails
        """
        # Check if we already downloaded this URL
        if url in self.downloaded_files:
            file_path, file_size, download_time = self.downloaded_files[url]
            print(f"🔄 Reusing previously downloaded file: {file_size:.1f}MB")
            logger.info(f"Reusing previously downloaded file: {file_size:.1f}MB")
            return file_path, file_size, download_time
        
        print(f"📥 Starting video download from URL")
        logger.info(f"Starting video download from URL")
        download_start_time = time.time()
        
        try:
            with requests.get(url, stream=True, timeout=timeout) as response:
                if response.status_code != 200:
                    raise Exception(f"Failed to download video from URL: {response.status_code}")
                
                # Check content length if available
                content_length = response.headers.get('content-length')
                max_size = 500 * 1024 * 1024  # 500MB limit
                
                if content_length:
                    file_size = int(content_length)
                    if file_size > max_size:
                        raise Exception(f"Video file too large ({file_size / (1024*1024):.1f}MB). Maximum size is 500MB.")
                    print(f"📊 Downloading video file: {file_size / (1024*1024):.1f}MB")
                    logger.info(f"Downloading video file: {file_size / (1024*1024):.1f}MB")
                
                # Save downloaded video file to temporary location with streaming
                print(f"💾 Saving downloaded video to temporary file")
                logger.info("Saving downloaded video to temporary file")
                with tempfile.NamedTemporaryFile(delete=False, suffix=".webm") as temp_video_file:
                    downloaded_size = 0
                    for chunk in response.iter_content(chunk_size=8192):  # 8KB chunks
                        if chunk:  # Filter out keep-alive chunks
                            temp_video_file.write(chunk)
                            downloaded_size += len(chunk)
                            # Check if we've exceeded our size limit
                            if downloaded_size > max_size:
                                raise Exception("Video file too large. Maximum size is 500MB.")
                    temp_video_path = temp_video_file.name
                    
                    download_time = time.time() - download_start_time
                    file_size_mb = downloaded_size / (1024 * 1024)
                    transfer_rate = file_size_mb / download_time if download_time > 0 else 0
                    
                    print(f"✅ Video download completed: {file_size_mb:.1f}MB in {download_time:.2f}s ({transfer_rate:.1f}MB/s)")
                    logger.info(f"Video download completed: {file_size_mb:.1f}MB in {download_time:.2f}s ({transfer_rate:.1f}MB/s)")
                    
                    # Store in our tracking dict
                    self.downloaded_files[url] = (temp_video_path, file_size_mb, download_time)
                    
                    return temp_video_path, file_size_mb, download_time
                    
        except requests.exceptions.Timeout:
            download_time = time.time() - download_start_time
            logger.error(f"Download timed out after {download_time:.2f}s")
            raise Exception("Download timed out. Please try again with a smaller video file.")
        except Exception as e:
            download_time = time.time() - download_start_time
            logger.error(f"Error downloading video file after {download_time:.2f}s: {str(e)}")
            raise Exception(f"Error downloading video file: {str(e)}")
    
    def cleanup_file(self, url: str) -> bool:
        """
        Clean up the downloaded file for a specific URL.
        
        Args:
            url: The URL that was downloaded
            
        Returns:
            True if cleanup was successful, False otherwise
        """
        if url not in self.downloaded_files:
            logger.warning(f"No downloaded file found for URL: {url}")
            return False
        
        file_path, file_size, download_time = self.downloaded_files[url]
        
        try:
            if os.path.exists(file_path):
                os.unlink(file_path)
                logger.info(f"Cleaned up downloaded file: {file_path} ({file_size:.1f}MB)")
            else:
                logger.warning(f"File not found during cleanup: {file_path}")
            
            # Remove from tracking dict
            del self.downloaded_files[url]
            return True
            
        except Exception as e:
            logger.error(f"Error cleaning up file {file_path}: {str(e)}")
            return False
    
    def cleanup_all_files(self) -> int:
        """
        Clean up all downloaded files.
        
        Returns:
            Number of files cleaned up
        """
        cleaned_count = 0
        urls_to_clean = list(self.downloaded_files.keys())
        
        for url in urls_to_clean:
            if self.cleanup_file(url):
                cleaned_count += 1
        
        logger.info(f"Cleaned up {cleaned_count} downloaded files")
        return cleaned_count
    
    def get_download_stats(self) -> dict:
        """
        Get statistics about downloaded files.
        
        Returns:
            Dictionary with download statistics
        """
        total_files = len(self.downloaded_files)
        total_size = sum(size for _, size, _ in self.downloaded_files.values())
        total_time = sum(time for _, _, time in self.downloaded_files.values())
        
        return {
            "total_files": total_files,
            "total_size_mb": total_size,
            "total_download_time": total_time,
            "average_transfer_rate": total_size / total_time if total_time > 0 else 0
        }

# Global instance
shared_download_service = SharedDownloadService() 