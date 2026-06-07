import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import { Dimensions, StyleSheet, TouchableOpacity, View } from 'react-native';
import { ThemedText } from './ThemedText';
import { IconSymbol } from './ui/IconSymbol';

interface VideoCardProps {
  id: string;
  videoThumbnail: any;
  artistImage: any;
  artistName: string;
  videoTitle: string;
  likes: string;
  isLiked?: boolean;
  onPlay?: () => void;
  onLike?: () => void;
  onArtistPress?: () => void;
}

const { width } = Dimensions.get('window');
const videoWidth = width - 40; // 20px padding on each side

export function VideoCard({
  id,
  videoThumbnail,
  artistImage,
  artistName,
  videoTitle,
  likes,
  isLiked = false,
  onPlay,
  onLike,
  onArtistPress,
}: VideoCardProps) {
  const [liked, setLiked] = useState(isLiked);
  const router = useRouter();

  const handleLike = () => {
    setLiked(!liked);
    onLike?.();
  };

  const handleArtistPressInternal = () => {
    // Convert artist name to URL-friendly format
    const artistId = artistName.toLowerCase().replace(/\s+/g, '-');
    router.push(`/artist/${artistId}`);
    onArtistPress?.(); // Call the original handler if provided
  };

  return (
    <View style={styles.container}>
      {/* Video Thumbnail */}
      <TouchableOpacity
        style={styles.videoContainer}
        onPress={onPlay}
        activeOpacity={0.95}
      >
        <Image source={videoThumbnail} style={styles.videoThumbnail} />
        
        {/* Play Button Overlay */}
        <View style={styles.playOverlay}>
          <View style={styles.playButton}>
            <IconSymbol name="play.fill" size={24} color="#fff" />
          </View>
        </View>

        {/* Video Info Overlay */}
        <View style={styles.videoInfoOverlay}>
          <View style={styles.videoInfo}>
            <ThemedText style={styles.videoTitle} numberOfLines={2}>
              {videoTitle}
            </ThemedText>
          </View>
        </View>
      </TouchableOpacity>

      {/* Bottom Section */}
      <View style={styles.bottomSection}>
        {/* Artist Info */}
        <TouchableOpacity
          style={styles.artistSection}
          onPress={handleArtistPressInternal}
          activeOpacity={0.7}
        >
          <Image source={artistImage} style={styles.artistImage} />
          <View style={styles.artistInfo}>
            <ThemedText style={styles.artistName}>{artistName}</ThemedText>
            <ThemedText style={styles.videoSubtitle}>Artist showcase</ThemedText>
          </View>
        </TouchableOpacity>

        {/* Action Buttons */}
        <View style={styles.actionSection}>
          <TouchableOpacity
            style={styles.actionButton}
            onPress={handleLike}
            activeOpacity={0.7}
          >
            <IconSymbol
              name={liked ? "heart.fill" : "heart"}
              size={20}
              color={liked ? "#ff3040" : "#666"}
            />
            <ThemedText style={[styles.actionText, liked && styles.likedText]}>
              {likes}
            </ThemedText>
          </TouchableOpacity>

          <TouchableOpacity style={styles.actionButton} activeOpacity={0.7}>
            <IconSymbol name="bubble.left" size={20} color="#666" />
            <ThemedText style={styles.actionText}>Share</ThemedText>
          </TouchableOpacity>

          <TouchableOpacity style={styles.actionButton} activeOpacity={0.7}>
            <IconSymbol name="bookmark" size={20} color="#666" />
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: videoWidth,
    alignSelf: 'center',
    backgroundColor: '#fff',
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 8,
    marginBottom: 20,
  },
  videoContainer: {
    position: 'relative',
    aspectRatio: 9 / 16, // TikTok/Instagram Reels aspect ratio
    backgroundColor: '#f5f5f5',
  },
  videoThumbnail: {
    width: '100%',
    height: '100%',
  },
  playOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
  },
  playButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    borderRadius: 35,
    width: 70,
    height: 70,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 5,
  },
  videoInfoOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    background: 'linear-gradient(transparent, rgba(0,0,0,0.7))',
    backgroundColor: 'rgba(0,0,0,0.4)',
    padding: 16,
  },
  videoInfo: {
    marginBottom: 8,
  },
  videoTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
    lineHeight: 22,
  },
  bottomSection: {
    padding: 16,
  },
  artistSection: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  artistImage: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginRight: 12,
    backgroundColor: '#f5f5f5',
  },
  artistInfo: {
    flex: 1,
  },
  artistName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 2,
  },
  videoSubtitle: {
    fontSize: 12,
    color: '#666',
  },
  actionSection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 24,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  actionText: {
    fontSize: 12,
    color: '#666',
    fontWeight: '500',
  },
  likedText: {
    color: '#ff3040',
  },
});