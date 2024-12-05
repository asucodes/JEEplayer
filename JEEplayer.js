const API_KEY = 'AIzaSyCvWQOdIqBpyAcu65o7ME_RFDfagkSZaUI'; // Your YouTube Data API key

let dbPromise;
let db; // Define db in the global scope

function initDB() {
    return new Promise((resolve, reject) => {
        const request = window.indexedDB.open('playlistDB', 1);

        request.onerror = function(event) {
            console.error('Database error:', event.target.errorCode);
            reject(event.target.error);
        };

        request.onsuccess = function(event) {
            db = event.target.result; // Assign db in the global scope
            console.log('Database opened successfully');
            resolve(db);
        };

        request.onupgradeneeded = function(event) {
            const db = event.target.result;
            const playlistStore = db.createObjectStore('playlists', { keyPath: 'id' });
            resolve(db);
        };
    });
}

dbPromise = initDB();

function addPlaylistToDB(playlist) {
    dbPromise.then(db => {
        if (!db) {
            console.error('IndexedDB not initialized.');
            return;
        }

        const transaction = db.transaction(['playlists'], 'readwrite');
        const store = transaction.objectStore('playlists');
        const requestAdd = store.add(playlist);

        requestAdd.onsuccess = function() {
            console.log('Playlist added to IndexedDB');
        };

        requestAdd.onerror = function(event) {
            console.error('Error adding playlist to IndexedDB:', event.target.errorCode);
        };
    }).catch(error => {
        console.error('Error initializing IndexedDB:', error);
    });
}

function getAllPlaylistsFromDB(callback) {
    dbPromise.then(db => {
        if (!db) {
            console.error('IndexedDB not initialized.');
            return;
        }

        const transaction = db.transaction(['playlists'], 'readonly');
        const store = transaction.objectStore('playlists');
        const requestGetAll = store.getAll();

        requestGetAll.onsuccess = function(event) {
            callback(event.target.result);
        };

        requestGetAll.onerror = function(event) {
            console.error('Error retrieving playlists from IndexedDB:', event.target.errorCode);
            callback(null);
        };
    }).catch(error => {
        console.error('Error initializing IndexedDB:', error);
    });
}

document.addEventListener('DOMContentLoaded', () => {
    loadPlaylists();
});

function displayPlaylist(playlistId, details) {
    const playlistContainer = document.createElement('div');
    playlistContainer.className = 'playlist';

    if (details?.thumbnails?.default?.url) {
        const thumbnailImg = document.createElement('img');
        thumbnailImg.src = details.thumbnails.default.url;
        thumbnailImg.alt = details.title;
        playlistContainer.appendChild(thumbnailImg);
    } else {
        console.error('Missing thumbnails:', details);
        return;
    }

    const playlistTitle = document.createElement('h3');
    playlistTitle.textContent = details.title;
    playlistTitle.addEventListener('click', () => {
        window.location.href = `playlist.html?list=${playlistId}`;
    });
    playlistContainer.appendChild(playlistTitle);

    const removeButton = document.createElement('button');
    removeButton.textContent = 'Remove Playlist';
    removeButton.addEventListener('click', () => removePlaylist(playlistId));
    playlistContainer.appendChild(removeButton);

    document.getElementById('playlistsContainer').appendChild(playlistContainer);
}

function removePlaylist(playlistId) {
    dbPromise.then(db => {
        if (!db) {
            console.error('IndexedDB not initialized.');
            return;
        }

        const transaction = db.transaction(['playlists'], 'readwrite');
        const store = transaction.objectStore('playlists');
        const requestDelete = store.delete(playlistId);

        requestDelete.onsuccess = function() {
            console.log('Playlist removed from IndexedDB');
            document.getElementById('playlistsContainer').innerHTML = '';
            loadPlaylists();
        };

        requestDelete.onerror = function(event) {
            console.error('Error removing playlist from IndexedDB:', event.target.errorCode);
        };
    }).catch(error => {
        console.error('Error initializing IndexedDB:', error);
    });
}

function loadPlaylists() {
    getAllPlaylistsFromDB(playlists => {
        if (playlists?.length > 0) {
            playlists.forEach(playlist => {
                if (playlist?.details?.thumbnails) {
                    displayPlaylist(playlist.id, playlist.details);
                } else {
                    console.error('Invalid playlist details:', playlist);
                }
            });
        } else {
            console.log('No playlists found.');
        }
    });
}

function showError(message) {
    const errorMessage = document.getElementById('errorMessage');
    errorMessage.textContent = message;
    setTimeout(() => {
        errorMessage.textContent = '';
    }, 3000);
}

document.getElementById('addMoreButton').addEventListener('click', function() {
    document.getElementById('playlistForm').style.display = 'block';
});

document.getElementById('addPlaylistButton').addEventListener('click', function(event) {
    event.preventDefault();
    const playlistInput = document.getElementById('playlistInput').value;
    addPlaylist(playlistInput);
});

function addPlaylist(playlistUrl) {
    const playlistId = extractPlaylistId(playlistUrl);
    if (playlistId) {
        fetchPlaylistDetails(playlistId).then(details => {
            addPlaylistToDB({ id: playlistId, details });
            displayPlaylist(playlistId, details);
            document.getElementById('playlistForm').reset();
            document.getElementById('playlistForm').style.display = 'none';
        }).catch(() => {
            showError('Invalid Playlist URL or API Error');
        });
    } else {
        showError('Invalid Playlist URL');
    }
}

function extractPlaylistId(url) {
    try {
        const urlObj = new URL(url);
        if (urlObj.hostname.includes('youtube.com') || urlObj.hostname === 'youtu.be') {
            const urlParams = new URLSearchParams(urlObj.search);
            return urlParams.get('list');
        }
        return null;
    } catch {
        return null;
    }
}

function fetchPlaylistDetails(playlistId) {
    return fetch(`https://www.googleapis.com/youtube/v3/playlists?part=snippet&id=${playlistId}&key=${API_KEY}`)
        .then(response => {
            if (!response.ok) throw new Error(`API request failed: ${response.status}`);
            return response.json();
        })
        .then(data => {
            if (data.items?.length > 0) {
                return data.items[0].snippet;
            } else {
                throw new Error('Playlist not found or empty');
            }
        })
        .catch(error => {
            console.error('Error fetching playlist details:', error);
            throw error;
        });
}

function displayPlaylistWithWatchedStatus(playlistWithWatchedStatus) {
    const playlistContainer = document.getElementById('playlistContainer');
    playlistContainer.innerHTML = '';

    playlistWithWatchedStatus.forEach(video => {
        const videoItem = document.createElement('div');
        videoItem.classList.add('video-item');

        const checkbox = document.createElement('input');
        checkbox.type = 'checkbox';
        checkbox.checked = video.watched || false;
        checkbox.addEventListener('change', () => {
            updateWatchedStatus(video.id, checkbox.checked);
        });

        const videoTitle = document.createElement('span');
        videoTitle.textContent = video.title;

        videoItem.appendChild(checkbox);
        videoItem.appendChild(videoTitle);
        playlistContainer.appendChild(videoItem);
    });
}

function updateWatchedStatus(videoId, watched) {
    dbPromise.then(db => {
        const tx = db.transaction('playlists', 'readwrite');
        const store = tx.objectStore('playlists');
        const getRequest = store.get(videoId);

        getRequest.onsuccess = function() {
            const video = getRequest.result;
            video.watched = watched;

            const putRequest = store.put(video);
            putRequest.onsuccess = () => console.log('Watched status updated.');
        };
    });
}

document.addEventListener('DOMContentLoaded', loadPlaylistWithWatchedStatus);

function loadPlaylistWithWatchedStatus() {
    // To implement: Retrieve playlists and watched status
}
