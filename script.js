// 🔊 Mood mapping for Spotify search queries (genres/keywords)
const moodQueries = {
  happy: "genre:pop mood:happy",
  sad: "genre:acoustic mood:sad",
  energetic: "genre:dance mood:energetic",
  relaxed: "genre:chill mood:relaxed"
};

// Global variables
let tracks = [];
let currentTrackIndex = 0;
let player = null;
let accessToken = null;
let deviceId = null;

const albumArt = document.getElementById("album-art");
const songTitle = document.getElementById("song-title");
const playBtn = document.getElementById("play");
const pauseBtn = document.getElementById("pause");
const nextBtn = document.getElementById("next");
const prevBtn = document.getElementById("prev");
const loginBtn = document.getElementById("login-btn");
const moodSection = document.getElementById("mood-section");

// FIX: Extract token from URL query parameters (Authorization Code Flow)
window.addEventListener('load', () => {
  const params = new URLSearchParams(window.location.search);
  accessToken = params.get('access_token'); // Get token from ?access_token=...

  if (accessToken) {
    loginBtn.style.display = 'none';
    moodSection.style.display = 'block';

    // Load the Spotify Web Playback SDK script dynamically
    if (!document.querySelector('script[src*="sdk.js"]')) {
        const script = document.createElement('script');
        script.src = 'https://sdk.scdn.co/spotify-player.js'; // CORRECT SDK URL
        document.body.appendChild(script);
    }
    
    // This waits for the SDK to load and call the global onSpotifyWebPlaybackSDKReady function
    window.onSpotifyWebPlaybackSDKReady = initSpotifyPlayer;

    // Clean URL: Remove the tokens from the URL
    window.history.replaceState({}, document.title, window.location.pathname);

  } else if (params.get('error')) {
      // Show Spotify authorization errors if they occur
      alert("Spotify Authorization Failed: " + params.get('error'));
  }
});

// Login function
function login() {
  window.location.href = '/login';
}

// Initialize Spotify Player
function initSpotifyPlayer() {
  const token = accessToken;
  player = new Spotify.Player({
    name: 'Mood Recommender',
    getOAuthToken: cb => { cb(token); },
    volume: 0.5
  });

  // Ready event
  player.addListener('ready', ({ device_id }) => {
    console.log('Ready with Device ID', device_id);
    deviceId = device_id;
  });

  player.connect();
}

// 🎶 Fetch tracks from Spotify API
async function showMusic(mood) {
  if (!accessToken || !deviceId) {
    alert('Please login first!');
    return;
  }

  const query = moodQueries[mood] || "pop";
  const limit = 20;

  try {
    // FIX: Correct Spotify API search endpoint
    const response = await fetch(
      `https://api.spotify.com/v1/search?q=${encodeURIComponent(query)}&type=track&limit=${limit}`,
      {
        headers: { 'Authorization': `Bearer ${accessToken}` }
      }
    );
    const data = await response.json();

    if (data.tracks && data.tracks.items.length > 0) {
      tracks = data.tracks.items;
      currentTrackIndex = 0;
      loadTrack(currentTrackIndex);
      playTrack();
    } else {
      songTitle.textContent = "No tracks found for this mood.";
      albumArt.src = "./images/black-disk-art.png";
    }
  } catch (error) {
    console.error("Error fetching songs:", error);
    alert('Error fetching tracks. Token may have expired—login again.');
  }
}

// 🎵 Load track info
function loadTrack(index) {
  const track = tracks[index];
  if (!track) return;

  songTitle.textContent = `${track.name} — ${track.artists[0].name}`;
  albumArt.src = track.album.images[0]?.url || "./images/black-disk-art.png";
}

// ▶️ Play (queue and play via Spotify API)
async function playTrack() {
  if (!tracks.length || !deviceId) return;

  const trackUri = tracks[currentTrackIndex].uri;
  try {
    // FIX: Correct Spotify API playback endpoint (Start/Resume)
    await fetch(`https://api.spotify.com/v1/me/player/play?device_id=${deviceId}`, {
      method: 'PUT',
      headers: { 'Authorization': `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        uris: [trackUri],
        position_ms: 0
      })
    });
    albumArt.classList.add("spin");
    playBtn.style.display = "none";
    pauseBtn.style.display = "inline-block";
  } catch (error) {
    console.error('Play error:', error);
  }
}

// ⏸️ Pause
async function pauseTrack() {
  if (!deviceId) return;
  try {
    // FIX: Correct Spotify API playback endpoint (Pause)
    await fetch(`https://api.spotify.com/v1/me/player/pause?device_id=${deviceId}`, {
      method: 'PUT',
      headers: { 'Authorization': `Bearer ${accessToken}` }
    });
    albumArt.classList.remove("spin");
    playBtn.style.display = "inline-block";
    pauseBtn.style.display = "none";
  } catch (error) {
    console.error('Pause error:', error);
  }
}

// ⏭️ Next
async function nextTrack() {
  if (tracks.length === 0) return;
  currentTrackIndex = (currentTrackIndex + 1) % tracks.length;
  loadTrack(currentTrackIndex);
  await playTrack();
}

// ⏮️ Previous
async function prevTrack() {
  if (tracks.length === 0) return;
  currentTrackIndex = (currentTrackIndex - 1 + tracks.length) % tracks.length;
  loadTrack(currentTrackIndex);
  await playTrack();
}

// 🎧 Event listeners
playBtn.addEventListener("click", playTrack);
pauseBtn.addEventListener("click", pauseTrack);
nextBtn.addEventListener("click", nextTrack);
prevBtn.addEventListener("click", prevTrack);

// Hide pause by default
pauseBtn.style.display = "none";