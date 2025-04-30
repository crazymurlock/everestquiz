const socket = io();
let self = ''; // Stores the nickname of the current user

// --- DOM Elements ---
const joinDiv = document.getElementById('join');
const lobbyDiv = document.getElementById('lobby');
const gameDiv = document.getElementById('game');
const resultDiv = document.getElementById('result');
const cntOv = document.getElementById('countdownOverlay');
const cntNum = document.getElementById('cnt');
const lobbyPl = document.getElementById('lobbyPlayers');
// const track = document.getElementById('track'); // Removed
// const flag = document.getElementById('flag');   // Removed
// const playersContainer = document.getElementById('playersContainer'); // Removed
const mountainContainer = document.getElementById('mountain-progress-container'); // New container
const questionDiv = document.getElementById('question');
const joinBtn = document.getElementById('joinBtn');
const nickIn = document.getElementById('nick');
const qtext = document.getElementById('qtext');
const optsDiv = document.getElementById('opts');
const winnerText = document.getElementById('winnerText');
const resStats = document.getElementById('resStats');

// --- State ---
// const circles = {}; // Removed - Handled by ProgressVisualizer
// const maxLevel = 5; // Removed - Handled by ProgressVisualizer
let visualizerInitialized = false; // Flag to track if visualizer is ready

// --- Progress Visualizer Module ---
const ProgressVisualizer = (() => {
    // --- Settings ---
    const AVATAR_SIZE = 25;
    const LEVELS = 5; // Corresponds to maxLevel
    const VERTICAL_PADDING = AVATAR_SIZE;
    const HORIZONTAL_PADDING = AVATAR_SIZE / 2;
    const MAX_SPREAD_FACTOR = 0.8;
    const JITTER_AMOUNT = 4; // Reduced jitter slightly

    // --- State ---
    let containerElement = null;
    let containerWidth = 0;
    let containerHeight = 0;
    let verticalStep = 0;
    let playerStates = {}; // { playerId: { id, name, avatarUrl, color, level, element, x, y }, ... }
    let levelsDistribution = {}; // { 0: [playerId1, ...], 1: [...], ... }
    let currentPlayerId = null;

    // --- Private functions ---
    function createAvatarElement(playerData) {
        const avatar = document.createElement('div');
        avatar.classList.add('player-avatar');
        avatar.id = `avatar-${playerData.id}`;
        avatar.dataset.playerId = playerData.id;
        avatar.title = playerData.name || playerData.id;

        // Use player color if provided
        if (playerData.color) {
             avatar.style.backgroundColor = playerData.color;
        }

        // Add image or initials
        if (playerData.avatarUrl) {
            const img = document.createElement('img');
            img.src = playerData.avatarUrl;
            img.alt = playerData.name || playerData.id;
            avatar.appendChild(img);
        } else {
            const name = playerData.name || playerData.id;
            avatar.textContent = name.substring(0, 2).toUpperCase();
        }

        // Highlight current player
        if (playerData.id === currentPlayerId) {
            avatar.classList.add('current-player');
        }
        return avatar;
    }

    function calculateTargetPosition(playerId, level) {
        // Ensure container dimensions are valid
        if (containerHeight <= VERTICAL_PADDING * 2 || containerWidth <= HORIZONTAL_PADDING * 2) {
            console.warn("Container dimensions too small for positioning.");
            return { top: containerHeight / 2 , left: containerWidth / 2 }; // Default to center
        }

        // 1. Calculate Vertical position (Y)
        const availableHeight = containerHeight - VERTICAL_PADDING * 2;
        verticalStep = availableHeight / LEVELS; // Calculate step dynamically
        const y = containerHeight - VERTICAL_PADDING - (level * verticalStep);

        // 2. Calculate Horizontal position (X)
        const playersOnThisLevel = levelsDistribution[level] || [];
        const playerCount = playersOnThisLevel.length;
        const playerIndex = playersOnThisLevel.indexOf(playerId);

        let x = containerWidth / 2; // Center default

        if (playerCount > 1) {
            const maxSpreadWidth = containerWidth * MAX_SPREAD_FACTOR - HORIZONTAL_PADDING * 2;
            // Calculate spacing, ensure it's not negative if avatars are large
            const requiredSpacing = AVATAR_SIZE * 1.5; // Ideal space per avatar
            const totalSpread = Math.min(maxSpreadWidth, (playerCount - 1) * requiredSpacing);
            const startX = (containerWidth - totalSpread) / 2;
            const stepX = playerCount > 1 ? totalSpread / (playerCount - 1) : 0;

            if (playerIndex !== -1) {
                 x = startX + (playerIndex * stepX);
            } else {
                 console.warn(`Player ${playerId} not found in level ${level} distribution.`);
                 x = containerWidth / 2; // Fallback
            }
        }

        // Add jitter
        const jitter = (Math.random() - 0.5) * JITTER_AMOUNT * 2;
        x += jitter;

        // Clamp X within bounds
        const minX = HORIZONTAL_PADDING + AVATAR_SIZE / 2;
        const maxX = containerWidth - HORIZONTAL_PADDING - AVATAR_SIZE / 2;
        x = Math.max(minX, Math.min(maxX, x));

        return { top: Math.max(VERTICAL_PADDING, Math.min(containerHeight - VERTICAL_PADDING, y)), left: x }; // Clamp Y too
    }

    function updateElementPosition(element, top, left) {
        if (element) {
            element.style.left = `${left}px`;
            element.style.top = `${top}px`;
        } else {
            console.warn("Attempted to move a non-existent element.");
        }
    }

    function recalculateLevelLayout(level) {
        const playersOnThisLevel = levelsDistribution[level] || [];
        playersOnThisLevel.forEach(pid => {
            const state = playerStates[pid];
            if (state && state.element) {
                const { top, left } = calculateTargetPosition(pid, level);
                // Only update if position actually changes significantly (optimization)
                if (Math.abs(state.x - left) > 1 || Math.abs(state.y - top) > 1) {
                    state.x = left;
                    state.y = top;
                    updateElementPosition(state.element, top, left);
                }
            }
        });
    }

    // --- Public methods ---
    function init(containerId, initialPlayersData = [], currentUserId = null) {
        containerElement = document.getElementById(containerId);
        if (!containerElement) {
            console.error(`ProgressVisualizer: Container with id "${containerId}" not found.`);
            return false; // Indicate failure
        }

        // Get dimensions AFTER the element is visible
        containerWidth = containerElement.offsetWidth;
        containerHeight = containerElement.offsetHeight;

        // Basic check for valid dimensions
        if (containerWidth <= 0 || containerHeight <= 0) {
             console.error("ProgressVisualizer: Container has zero dimensions. Is it visible?");
            // Try again shortly after? Or rely on playerList to trigger real init.
             return false; // Indicate failure
        }


        currentPlayerId = currentUserId;
        playerStates = {};
        levelsDistribution = {};
        for (let i = 0; i <= LEVELS; i++) {
            levelsDistribution[i] = [];
        }
        containerElement.innerHTML = ''; // Clear previous avatars

        initialPlayersData.forEach(playerData => {
             // Use nickname as the ID
            const playerId = playerData.nickname;
            if (!playerId) {
                console.warn("Player data missing nickname:", playerData);
                return; // Skip players without ID
            }
            const element = createAvatarElement({ ...playerData, id: playerId }); // Pass nickname as id
            const initialLevel = playerData.level || 0; // Use provided level or default to 0

            const initialState = {
                ...playerData,
                id: playerId, // Ensure id is set
                level: initialLevel,
                element: element,
                x: containerWidth / 2, // Initial rough position
                y: containerHeight - VERTICAL_PADDING,
            };
            playerStates[playerId] = initialState;
            if (!levelsDistribution[initialLevel]) levelsDistribution[initialLevel] = [];
            levelsDistribution[initialLevel].push(playerId);
            containerElement.appendChild(element);
        });

        // Calculate initial layout for all levels where players exist
        Object.keys(levelsDistribution).forEach(level => {
            if (levelsDistribution[level].length > 0) {
                recalculateLevelLayout(parseInt(level, 10));
            }
        });

        console.log(`ProgressVisualizer initialized with ${initialPlayersData.length} players.`);
        return true; // Indicate success
    }

    /**
     * Updates player progress to a specific level
     * @param {string} playerId - ID of the player (nickname)
     * @param {number} newLevel - The target level (0-5)
     */
    function updatePlayerProgress(playerId, newLevel) {
        const state = playerStates[playerId];
        if (!state) {
            console.warn(`ProgressVisualizer: Player "${playerId}" not found for update.`);
            return;
        }

        newLevel = Math.max(0, Math.min(LEVELS, newLevel)); // Clamp level
        const currentLevel = state.level;

        if (newLevel === currentLevel) {
            return; // No change
        }

        // 1. Update state level
        state.level = newLevel;

        // 2. Update level distribution
        if (levelsDistribution[currentLevel]) {
            const index = levelsDistribution[currentLevel].indexOf(playerId);
            if (index > -1) {
                levelsDistribution[currentLevel].splice(index, 1);
            }
        }
        if (!levelsDistribution[newLevel]) {
            levelsDistribution[newLevel] = [];
        }
        // Avoid adding duplicates if multiple updates arrive quickly
        if (!levelsDistribution[newLevel].includes(playerId)) {
             levelsDistribution[newLevel].push(playerId);
        }


        // 3. Recalculate layout for the OLD level
        if (levelsDistribution[currentLevel]) {
             recalculateLevelLayout(currentLevel);
        }

        // 4. Calculate target position for the updated player *immediately*
        const { top, left } = calculateTargetPosition(playerId, newLevel);
        state.x = left;
        state.y = top;
        updateElementPosition(state.element, top, left);

        // 5. Recalculate layout for the NEW level after a short delay (for smoother distribution)
        //    This helps if multiple players arrive at the same level nearly simultaneously.
        setTimeout(() => {
             recalculateLevelLayout(newLevel);
        }, 100);

        console.log(`Player ${playerId} moved to level ${newLevel}`);
    }

    function getPlayerState(playerId) {
        return playerStates[playerId] || null;
    }

    function highlightWinner(winnerId) {
        const state = playerStates[winnerId];
        if (state && state.element) {
            state.element.classList.add('winner'); // Add class for CSS styling/animation
            console.log(`Highlighting winner: ${winnerId}`);
        }
    }

     // Add a function to add players dynamically if needed later
     function addPlayer(playerData) {
         const playerId = playerData.nickname;
         if (!playerId || playerStates[playerId]) {
             // Already exists or invalid data
             return;
         }
          const element = createAvatarElement({ ...playerData, id: playerId });
          const initialLevel = playerData.level || 0;
          const initialState = {
              ...playerData,
              id: playerId,
              level: initialLevel,
              element: element,
               // Calculate rough initial position based on level
              x: containerWidth / 2, // Placeholder, recalculate soon
              y: containerHeight - VERTICAL_PADDING - (initialLevel * verticalStep)
          };
          playerStates[playerId] = initialState;
          if (!levelsDistribution[initialLevel]) levelsDistribution[initialLevel] = [];
          levelsDistribution[initialLevel].push(playerId);
          containerElement.appendChild(element);
          // Recalculate layout for the level this player joined
          recalculateLevelLayout(initialLevel);
     }

    return {
        init,
        updatePlayerProgress,
        getPlayerState,
        highlightWinner,
        addPlayer // Expose addPlayer if dynamic joining is possible post-init
    };
})();


// --- Socket Event Handlers ---

// Redirect if game is closed
socket.on('gameStatus', data => {
    if (!data.open) location = '/closed.html';
});

// Join button click
joinBtn.onclick = () => {
    const nick = nickIn.value.trim();
    if (!nick) return;
    self = nick; // Store own nickname
    socket.emit('join', nick);
    joinDiv.classList.remove('visible');
    lobbyDiv.classList.add('visible');
};

// Update lobby player list
socket.on('lobby', list => {
    lobbyPl.innerHTML = ''; // Clear previous list
    list.forEach(n => {
        const d = document.createElement('div');
        d.textContent = n;
        if (n === self) {
            d.style.fontWeight = 'bold'; // Highlight self in lobby
        }
        lobbyPl.append(d);
    });
});

// Handle countdown and game start
socket.on('countdown', n => {
    if (n > 0) {
        cntNum.textContent = n;
        cntOv.classList.add('show');
    } else {
        cntOv.classList.remove('show');
        lobbyDiv.classList.remove('visible');
        gameDiv.classList.add('visible');
        mountainContainer.style.display = 'block'; // Show the mountain viz container
        questionDiv.style.display = 'block';     // Show the question area
        // Initialization of visualizer will happen on first 'playerList' event
    }
});

// Display question and options
socket.on('question', q => {
    qtext.textContent = q.question;
    optsDiv.innerHTML = ''; // Clear previous options
    q.options.forEach((opt, i) => {
        const btn = document.createElement('button');
        btn.className = 'option-btn';
        btn.textContent = opt;
        // Send answer index on click
        btn.onclick = () => {
             socket.emit('answer', i);
             // Disable all buttons immediately after clicking one
             Array.from(optsDiv.children).forEach(b => b.disabled = true);
        };
        optsDiv.append(btn);
    });
});

// Show answer result (correct/wrong)
socket.on('answerResult', res => {
    Array.from(optsDiv.children).forEach((b, i) => {
        if (i === res.correctIndex) {
            b.classList.add('correct');
        } else if (i === res.chosenIndex && !res.correct) { // Highlight wrong choice
             b.classList.add('wrong');
        }
        b.disabled = true; // Ensure all are disabled
    });
    // Optional: Clear buttons after a delay? Or wait for next question?
    // setTimeout(() => optsDiv.innerHTML = '', 1500); // Example delay
});

// Update player visualization based on server list
socket.on('playerList', list => {
    // Initialize visualizer on the first player list received *after* game start
    if (!visualizerInitialized && gameDiv.classList.contains('visible')) {
        // Pass the list and current user's nickname
        visualizerInitialized = ProgressVisualizer.init('mountain-progress-container', list, self);
        // If init failed (e.g., container not ready), retry on next update?
         if (!visualizerInitialized) {
            console.error("Visualizer failed to initialize. Retrying may be needed.");
             return; // Don't proceed with updates if init failed
         }
    }

    // If initialized, update positions
    if (visualizerInitialized) {
        list.forEach(p => {
            const currentState = ProgressVisualizer.getPlayerState(p.nickname);
            if (currentState) {
                 // Update if level differs
                if (currentState.level !== p.level) {
                    ProgressVisualizer.updatePlayerProgress(p.nickname, p.level);
                }
            } else {
                 // Player joined mid-game? Add them dynamically.
                 console.log(`New player detected mid-game: ${p.nickname}`);
                 ProgressVisualizer.addPlayer(p);
                 // Might need a slight delay before update if addPlayer is async or needs layout recalc
                 setTimeout(() => ProgressVisualizer.updatePlayerProgress(p.nickname, p.level), 50);
            }

        });
    }
});

// Handle game over: show results, highlight winner
socket.on('gameOver', data => {
     // Highlight winner immediately on the mountain
    if (visualizerInitialized && data.winner) {
         ProgressVisualizer.highlightWinner(data.winner.nickname);
    }

    // Delay before showing results screen
    setTimeout(() => {
        gameDiv.classList.remove('visible');
        resultDiv.classList.add('visible');

        // Display winner text
        if (data.winner) {
             winnerText.textContent = `🏅 ${data.winner.nickname} — ${data.winner.correct} правильн. за ${Math.round(data.winner.time / 1000)}с`;
        } else {
             winnerText.textContent = "Игра окончена!"; // Fallback if no winner data
        }


        // Populate results table
        resStats.innerHTML = ''; // Clear previous stats
        data.stats.forEach(p => {
            const tr = document.createElement('tr');
            tr.innerHTML = `<td>${p.nickname}</td><td>${p.correct}</td><td>${Math.round(p.time / 1000)}</td>`;
             if(data.winner && p.nickname === data.winner.nickname) {
                 tr.style.fontWeight = 'bold'; // Highlight winner row
             }
            resStats.append(tr);
        });

        // Confetti effect!
        confetti({
             particleCount: 150,
             spread: 90,
             origin: { y: 0.6 }
        });

    }, 3000); // 3 second delay
});
