import { Image } from 'expo-image';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useCallback, useRef, useState } from 'react';
import {
  Dimensions,
  FlatList,
  StatusBar,
  StyleSheet,
  TouchableOpacity,
  View,
  ViewToken,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ThemedText } from '@/components/ThemedText';
import { IconSymbol } from '@/components/ui/IconSymbol';

interface VideoItem {
  id: string;
  videoThumbnail: any;
  artistImage: any;
  artistName: string;
  videoTitle: string;
  likes: string;
  comments: string;
  shares: string;
  isLiked: boolean;
  isFollowing: boolean;
  description: string;
}

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

// Mock video data - in a real app, this would come from an API
const mockVideos: VideoItem[] = [
  {
    id: '1',
    videoThumbnail: require('@/assets/images/masonwabe_jersey.png'),
    artistImage: require('@/assets/images/ masonwabe_profile_pic.png'),
    artistName: 'Masonwabe Ntloko',
    videoTitle: 'Creating traditional beadwork patterns',
    description: 'Behind the scenes of creating traditional beadwork patterns that tell stories of our heritage. Each bead represents a memory, a tradition passed down through generations.',
    likes: '12.4K',
    comments: '832',
    shares: '1.2K',
    isLiked: false,
    isFollowing: false,
  },
  {
    id: '2',
    videoThumbnail: require('@/assets/images/jersey_below.png'),
    artistImage: require('@/assets/images/ masonwabe_profile_pic.png'),
    artistName: 'Thabo Designs',
    videoTitle: 'Street art meets fashion',
    description: 'My creative process of blending urban street art with wearable fashion. Every piece tells a story of the streets.',
    likes: '8.9K',
    comments: '456',
    shares: '892',
    isLiked: true,
    isFollowing: true,
  },
  {
    id: '3',
    videoThumbnail: require('@/assets/images/masonwabe_jersey.png'),
    artistImage: require('@/assets/images/ masonwabe_profile_pic.png'),
    artistName: 'Nomsa Crafts',
    videoTitle: 'Hand-weaving techniques',
    description: 'Ancient hand-weaving techniques passed down through generations. The rhythm of the loom tells stories of our ancestors.',
    likes: '15.2K',
    comments: '1.1K',
    shares: '2.3K',
    isLiked: false,
    isFollowing: false,
  },
  {
    id: '4',
    videoThumbnail: require('@/assets/images/jersey_below.png'),
    artistImage: require('@/assets/images/ masonwabe_profile_pic.png'),
    artistName: 'Zinhle Arts',
    videoTitle: 'Clay pottery magic',
    description: 'Transforming raw clay into beautiful pottery pieces. Each creation carries the spirit of the earth.',
    likes: '9.7K',
    comments: '623',
    shares: '1.4K',
    isLiked: false,
    isFollowing: true,
  },
  {
    id: '5',
    videoThumbnail: require('@/assets/images/masonwabe_jersey.png'),
    artistImage: require('@/assets/images/ masonwabe_profile_pic.png'),
    artistName: 'Sipho Collections',
    videoTitle: 'Textile printing process',
    description: 'The art of traditional textile printing using natural dyes and patterns that represent our cultural identity.',
    likes: '11.3K',
    comments: '789',
    shares: '1.8K',
    isLiked: true,
    isFollowing: false,
  },
];

export default function VideoPlayerScreen() {
  const params = useLocalSearchParams();
  const router = useRouter();
  const [videos, setVideos] = useState(mockVideos);
  const [currentVideoIndex, setCurrentVideoIndex] = useState(0);
  const flatListRef = useRef<FlatList>(null);

  // Initialize starting video based on passed ID
  React.useEffect(() => {
    if (params.videoId) {
      const index = videos.findIndex(v => v.id === params.videoId);
      if (index >= 0) {
        setCurrentVideoIndex(index);
        setTimeout(() => {
          flatListRef.current?.scrollToIndex({ index, animated: false });
        }, 100);
      }
    }
  }, [params.videoId]);

  const onViewableItemsChanged = useCallback(({ viewableItems }: { viewableItems: ViewToken[] }) => {
    if (viewableItems.length > 0) {
      setCurrentVideoIndex(viewableItems[0].index || 0);
    }
  }, []);

  const viewabilityConfig = {
    itemVisiblePercentThreshold: 50,
  };

  const handleLike = (videoId: string) => {
    setVideos(prev => prev.map(video => 
      video.id === videoId 
        ? { ...video, isLiked: !video.isLiked }
        : video
    ));
  };

  const handleFollow = (videoId: string) => {
    setVideos(prev => prev.map(video => 
      video.id === videoId 
        ? { ...video, isFollowing: !video.isFollowing }
        : video
    ));
  };

  const handleShare = (videoId: string) => {
    console.log('Share video:', videoId);
    // Implement share functionality
  };

  const handleComment = (videoId: string) => {
    console.log('Open comments for video:', videoId);
    // Implement comments functionality
  };

  const handleArtistPress = (artistName: string) => {
    const artistId = artistName.toLowerCase().replace(/\s+/g, '-');
    router.push(`/artist/${artistId}`);
  };

  const loadMoreVideos = () => {
    // Simulate loading more videos (infinite scroll)
    const newVideos = mockVideos.map((video, index) => ({
      ...video,
      id: `${video.id}_${videos.length + index}`,
    }));
    setVideos(prev => [...prev, ...newVideos]);
  };

  const renderVideo = ({ item: video }: { item: VideoItem }) => (
    <View style={styles.videoContainer}>
      {/* Video Background */}
      <TouchableOpacity style={styles.videoTouchable} activeOpacity={1}>
        <Image source={video.videoThumbnail} style={styles.videoBackground} />
        
        {/* Play/Pause indicator - in real app, this would show actual video controls */}
        <View style={styles.playIndicator}>
          <IconSymbol name="play.fill" size={20} color="rgba(255,255,255,0.8)" />
        </View>
      </TouchableOpacity>

      {/* Side Actions */}
      <View style={styles.sideActions}>
        {/* Artist Profile */}
        <TouchableOpacity 
          style={styles.artistProfile}
          onPress={() => handleArtistPress(video.artistName)}
        >
          <Image source={video.artistImage} style={styles.artistProfileImage} />
          {!video.isFollowing && (
            <TouchableOpacity 
              style={styles.followButton}
              onPress={() => handleFollow(video.id)}
            >
              <IconSymbol name="plus" size={12} color="#fff" />
            </TouchableOpacity>
          )}
        </TouchableOpacity>

        {/* Like Button */}
        <TouchableOpacity 
          style={styles.actionButton}
          onPress={() => handleLike(video.id)}
        >
          <IconSymbol 
            name={video.isLiked ? "heart.fill" : "heart"} 
            size={28} 
            color={video.isLiked ? "#ff3040" : "#fff"} 
          />
          <ThemedText style={styles.actionText}>{video.likes}</ThemedText>
        </TouchableOpacity>

        {/* Comment Button */}
        <TouchableOpacity 
          style={styles.actionButton}
          onPress={() => handleComment(video.id)}
        >
          <IconSymbol name="bubble.left" size={28} color="#fff" />
          <ThemedText style={styles.actionText}>{video.comments}</ThemedText>
        </TouchableOpacity>

        {/* Share Button */}
        <TouchableOpacity 
          style={styles.actionButton}
          onPress={() => handleShare(video.id)}
        >
          <IconSymbol name="arrowshape.turn.up.right" size={28} color="#fff" />
          <ThemedText style={styles.actionText}>{video.shares}</ThemedText>
        </TouchableOpacity>

        {/* More Options */}
        <TouchableOpacity style={styles.actionButton}>
          <IconSymbol name="ellipsis" size={28} color="#fff" />
        </TouchableOpacity>
      </View>

      {/* Bottom Info */}
      <View style={styles.bottomInfo}>
        <TouchableOpacity onPress={() => handleArtistPress(video.artistName)}>
          <ThemedText style={styles.artistNameText}>@{video.artistName}</ThemedText>
        </TouchableOpacity>
        <ThemedText style={styles.videoTitleText}>{video.videoTitle}</ThemedText>
        <ThemedText style={styles.descriptionText} numberOfLines={2}>
          {video.description}
        </ThemedText>
      </View>

      {/* Close Button */}
      <TouchableOpacity 
        style={styles.closeButton}
        onPress={() => router.back()}
      >
        <IconSymbol name="xmark" size={24} color="#fff" />
      </TouchableOpacity>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#000" />
      <FlatList
        ref={flatListRef}
        data={videos}
        renderItem={renderVideo}
        keyExtractor={(item) => item.id}
        pagingEnabled
        showsVerticalScrollIndicator={false}
        onViewableItemsChanged={onViewableItemsChanged}
        viewabilityConfig={viewabilityConfig}
        onEndReached={loadMoreVideos}
        onEndReachedThreshold={0.5}
        getItemLayout={(data, index) => ({
          length: screenHeight,
          offset: screenHeight * index,
          index,
        })}
        initialScrollIndex={currentVideoIndex}
        removeClippedSubviews={false}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  videoContainer: {
    width: screenWidth,
    height: screenHeight,
    position: 'relative',
  },
  videoTouchable: {
    flex: 1,
  },
  videoBackground: {
    width: '100%',
    height: '100%',
    backgroundColor: '#000',
  },
  playIndicator: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    transform: [{ translateX: -10 }, { translateY: -10 }],
  },
  sideActions: {
    position: 'absolute',
    right: 16,
    bottom: 120,
    alignItems: 'center',
    gap: 24,
  },
  artistProfile: {
    alignItems: 'center',
    marginBottom: 8,
  },
  artistProfileImage: {
    width: 48,
    height: 48,
    borderRadius: 24,
    borderWidth: 2,
    borderColor: '#fff',
  },
  followButton: {
    position: 'absolute',
    bottom: -6,
    backgroundColor: '#ff3040',
    width: 20,
    height: 20,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionButton: {
    alignItems: 'center',
    gap: 4,
  },
  actionText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
    textAlign: 'center',
  },
  bottomInfo: {
    position: 'absolute',
    bottom: 120,
    left: 16,
    right: 80,
  },
  artistNameText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 4,
  },
  videoTitleText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '600',
    marginBottom: 8,
  },
  descriptionText: {
    color: '#fff',
    fontSize: 14,
    lineHeight: 18,
    opacity: 0.9,
  },
  closeButton: {
    position: 'absolute',
    top: 60,
    left: 16,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    alignItems: 'center',
    justifyContent: 'center',
  },
});