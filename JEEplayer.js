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
            // You can add more object stores or indexes here if needed
            resolve(db);
        };
    });
}

// Call the initDB function to initialize IndexedDB
dbPromise = initDB();

// Function to add playlist to IndexedDB
function addPlaylistToDB(playlist) {
    dbPromise.then(db => {
        if (!db) {
            console.error('IndexedDB not initialized.');
            return;
        }
        
        const transaction = db.transaction(['playlists'], 'readwrite');
        const store = transaction.objectStore('playlists');
        const requestAdd = store.add(playlist);

        requestAdd.onsuccess = function(event) {
            console.log('Playlist added to IndexedDB');
        };

        requestAdd.onerror = function(event) {
            console.error('Error adding playlist to IndexedDB:', event.target.errorCode);
        };
    }).catch(error => {
        console.error('Error initializing IndexedDB:', error);
    });
}

// Function to get all playlists from IndexedDB
function getAllPlaylistsFromDB(callback) {
    dbPromise.then(db => {
        if (!db) {
            console.error('IndexedDB not initialized.');
            return;
        }

        const transaction = db.transaction(['playlists'], 'readonly');
        const store = transaction.objectStore('playlists');
        const requestGetAll = store.getAll(); // Changed variable name to requestGetAll

        requestGetAll.onsuccess = function(event) {
            const playlists = event.target.result;
            callback(playlists);
        };

        requestGetAll.onerror = function(event) {
            console.error('Error retrieving playlists from IndexedDB:', event.target.errorCode);
            callback(null);
        };
    }).catch(error => {
        console.error('Error initializing IndexedDB:', error);
    });
}

// Function to load playlists after the DOM has loaded
document.addEventListener('DOMContentLoaded', (event) => {
    loadPlaylists();
});

// Function to display playlists
// Function to display playlists
function displayPlaylist(playlistId, details) {
    const playlistContainer = document.createElement('div');
    playlistContainer.className = 'playlist';
    
    // Check if the details object and thumbnails property exist
    if (details && details.thumbnails && details.thumbnails.default && details.thumbnails.default.url) {
        const thumbnailImg = document.createElement('img');
        thumbnailImg.src = details.thumbnails.default.url;
        thumbnailImg.alt = details.title;
        playlistContainer.appendChild(thumbnailImg);
    } else {
        console.error('Invalid details object or missing thumbnails property:', details);
        return; // Exit the function if thumbnails property is missing
    }

    const playlistTitle = document.createElement('h3');
    playlistTitle.textContent = details.title;
    playlistTitle.classList.add('playlist-title'); // Add a class to the playlist title for styling
    playlistTitle.addEventListener('click', function() {
        window.location.href = `playlist.html?list=${playlistId}`; // Redirect to playlist.html with playlist ID as query parameter
    });
    playlistContainer.appendChild(playlistTitle);

    const removeButton = document.createElement('button');
    removeButton.textContent = 'Remove Playlist';
    removeButton.classList.add('deleteButton'); // Add the deleteButton class
    removeButton.addEventListener('click', function() {
        removePlaylist(playlistId);
    });
    playlistContainer.appendChild(removeButton);

    document.getElementById('playlistsContainer').appendChild(playlistContainer);
}




// Function to remove playlist
function removePlaylist(playlistId) {
    dbPromise.then(db => {
        if (!db) {
            console.error('IndexedDB not initialized.');
            return;
        }
        
        const transaction = db.transaction(['playlists'], 'readwrite');
        const store = transaction.objectStore('playlists');
        const requestDelete = store.delete(playlistId);

        requestDelete.onsuccess = function(event) {
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

// Function to load playlists
function loadPlaylists() {
    getAllPlaylistsFromDB(function(playlists) {
        if (playlists) {
            playlists.forEach(playlist => {
                if (playlist.details && playlist.details.thumbnails) {
                    displayPlaylist(playlist.id, playlist.details);
                } else {
                    console.error('Invalid playlist details:', playlist);
                }
            });
        } else {
            console.log('No playlists found in IndexedDB');
        }
    });
}

// Function to show error message
function showError(message) {
    const errorMessage = document.getElementById('errorMessage');
    errorMessage.textContent = message;
    setTimeout(() => {
        errorMessage.textContent = '';
    }, 3000);
}

// Event listener for adding more playlists
document.getElementById('addMoreButton').addEventListener('click', function() {
    document.getElementById('playlistForm').style.display = 'block';
});

// Event listener for adding playlist
document.getElementById('addPlaylistButton').addEventListener('click', function(event) {
    event.preventDefault();
    const playlistInput = document.getElementById('playlistInput').value;
    addPlaylist(playlistInput);
});

// Function to add playlist
function addPlaylist(playlistUrl) {
    const playlistId = extractPlaylistId(playlistUrl);
    if (playlistId) {
        fetchPlaylistDetails(playlistId).then(details => {
            addPlaylistToDB({ id: playlistId, details: details }); // Store playlist in IndexedDB
            displayPlaylist(playlistId, details);
            document.getElementById('playlistForm').reset();
            document.getElementById('playlistForm').style.display = 'none';
        }).catch(error => {
            showError('Invalid Playlist URL or API Error');
        });
    } else {
        showError('Invalid Playlist URL');
    }
}

// Function to extract playlist ID from URL
function extractPlaylistId(url) {
    try {
        const urlObj = new URL(url);
        if (urlObj.hostname.includes('youtube.com') || urlObj.hostname === 'youtu.be') {
            const urlParams = new URLSearchParams(urlObj.search);
            return urlParams.get('list');
        }
        return null;
    } catch (e) {
        return null;
    }
}

// Function to fetch playlist details
function fetchPlaylistDetails(playlistId) {
    return fetch(`https://www.googleapis.com/youtube/v3/playlists?part=snippet&id=${playlistId}&key=${API_KEY}`)
        .then(response => response.json())
        .then(data => {
            if (data.items && data.items.length > 0) {
                const snippet = data.items[0].snippet;
                if (snippet && snippet.thumbnails) {
                    return snippet;
                } else {
                    throw new Error('Playlist details are incomplete or missing thumbnails');
                }
            } else {
                throw new Error('Playlist not found or empty');
            }
        })
        .catch(error => {
            console.error('Error fetching playlist details:', error);
            throw error;
        });
}
// Updated JavaScript code for playlist.js

// Function to display playlist with checkboxes and watched status
function displayPlaylistWithWatchedStatus(playlistWithWatchedStatus) {
    const playlistContainer = document.getElementById('playlistContainer');

    // Clear existing content
    playlistContainer.innerHTML = '';

    // Iterate through playlist and display videos with checkboxes and watched status
    playlistWithWatchedStatus.forEach(video => {
        const videoItem = document.createElement('div');
        videoItem.classList.add('video-item');

        const checkbox = document.createElement('input');
        checkbox.type = 'checkbox';
        checkbox.checked = video.watched; // Set checkbox state based on watched status
        checkbox.addEventListener('change', () => {
            // Update watched status in database when checkbox state changes
            updateWatchedStatus(video.id, checkbox.checked);
        });

        const videoTitle = document.createElement('span');
        videoTitle.textContent = video.title;

        videoItem.appendChild(checkbox);
        videoItem.appendChild(videoTitle);

        playlistContainer.appendChild(videoItem);
    });
}

// Function to update watched status in database
function updateWatchedStatus(videoId, watched) {
    // Update IndexedDB with the new watched status for the specified video ID
    // You can use the IndexedDB API similar to how you added and retrieved playlists
}

// Function to load playlist and watched status from database
function loadPlaylistWithWatchedStatus() {
    // Retrieve playlist and watched status from IndexedDB
    // You can use the IndexedDB API to retrieve data from the database
    // Once data is retrieved, call displayPlaylistWithWatchedStatus to render the playlist
}

// Call loadPlaylistWithWatchedStatus when the page loads to initialize the playlist
document.addEventListener('DOMContentLoaded', loadPlaylistWithWatchedStatus);

