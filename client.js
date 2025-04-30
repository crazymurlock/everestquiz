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
const mountainContainer = document.getElementById('mountain-progress-container'); // Reference to the mountain container
const questionDiv = document.getElementById('question');
const joinBtn = document.getElementById('joinBtn');
const nickIn = document.getElementById('nick');
const qtext = document.getElementById('qtext');
const optsDiv = document.getElementById('opts');
const winnerText = document.getElementById('winnerText');
const resStats = document.getElementById('resStats');

// --- State ---
let visualizerInitialized = false; // Flag to track if visualizer is ready

// --- Progress Visualizer Module ---
const ProgressVisualizer = (() => {
    // --- Settings ---
    const AVATAR_SIZE = 25;
    const LEVELS = 5;
    const VERTICAL_PADDING = AVATAR_SIZE;
    const HORIZONTAL_PADDING = AVATAR_SIZE / 2;
    const MAX_SPREAD_FACTOR = 0.8;
    const JITTER_AMOUNT = 4;

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
        avatar.id = `avatar-${playerData.id}`; // Use consistent ID (nickname)
        avatar.dataset.playerId = playerData.id;
        avatar.title = playerData.name || playerData.id;

        if (playerData.color) {
             avatar.style.backgroundColor = playerData.color;
        }

        if (playerData.avatarUrl) {
            const img = document.createElement('img');
            img.src = playerData.avatarUrl;
            img.alt = playerData.name || playerData.id;
            avatar.appendChild(img);
        } else {
            const name = playerData.name || playerData.id;
            avatar.textContent = name.substring(0, 2).toUpperCase();
        }

        if (playerData.id === currentPlayerId) {
            avatar.classList.add('current-player');
        }
        return avatar;
    }

    function calculateTargetPosition(playerId, level) {
        // Ensure container dimensions are valid and calculated
         if (!containerElement || containerHeight <= VERTICAL_PADDING * 2 || containerWidth <= HORIZONTAL_PADDING * 2) {
            console.warn("Cannot calculate position: Container dimensions invalid or not ready.", { containerHeight, containerWidth });
            // Return a default position (e.g., bottom center) if calculation fails
             return { top: containerHeight - VERTICAL_PADDING , left: containerWidth / 2 };
        }

        // 1. Calculate Vertical position (Y)
        const availableHeight = containerHeight - VERTICAL_PADDING * 2;
        verticalStep = availableHeight / LEVELS;
        const y = containerHeight - VERTICAL_PADDING - (level * verticalStep);

        // 2. Calculate Horizontal position (X)
        const playersOnThisLevel = levelsDistribution[level] || [];
        const playerCount = playersOnThisLevel.length;
        const playerIndex = playersOnThisLevel.indexOf(playerId);

        let x = containerWidth / 2; // Center default

        if (playerCount > 1) {
            const maxSpreadWidth = containerWidth * MAX_SPREAD_FACTOR - HORIZONTAL_PADDING * 2;
            const requiredSpacing = AVATAR_SIZE * 1.5;
            const totalSpread = Math.min(maxSpreadWidth, (playerCount - 1) * requiredSpacing);
            const startX = (containerWidth - totalSpread) / 2;
            const stepX = playerCount > 1 ? totalSpread / (playerCount - 1) : 0;

            if (playerIndex !== -1) {
                 x = startX + (playerIndex * stepX);
            } else {
                 console.warn(`Player ${playerId} not found in level ${level} distribution during position calculation.`);
                 x = containerWidth / 2;
            }
        }

        // Add jitter
        const jitter = (Math.random() - 0.5) * JITTER_AMOUNT * 2;
        x += jitter;

        // Clamp X within bounds
        const minX = HORIZONTAL_PADDING + AVATAR_SIZE / 2;
        const maxX = containerWidth - HORIZONTAL_PADDING - AVATAR_SIZE / 2;
        x = Math.max(minX, Math.min(maxX, x));

        // Clamp Y within bounds too
        const minY = VERTICAL_PADDING;
        const maxY = containerHeight - VERTICAL_PADDING;
        const clampedY = Math.max(minY, Math.min(maxY, y));

        return { top: clampedY, left: x };
    }

    function updateElementPosition(element, top, left) {
        if (element) {
            // console.log(`  Moving ${element.dataset.playerId} to top: ${top.toFixed(1)}, left: ${left.toFixed(1)}`);
            element.style.left = `${left}px`;
            element.style.top = `${top}px`;
        } else {
            console.warn("Attempted to move a non-existent element.");
        }
    }

    function recalculateLevelLayout(level) {
        const playersOnThisLevel = levelsDistribution[level] || [];
        // console.log(`Recalculating layout for level ${level} with ${playersOnThisLevel.length} players.`);
        playersOnThisLevel.forEach(pid => {
            const state = playerStates[pid];
            if (state && state.element) {
                const { top, left } = calculateTargetPosition(pid, level);
                // Update stored coords and element style
                state.x = left;
                state.y = top;
                updateElementPosition(state.element, top, left);
            }
        });
    }

    // --- Public methods ---
    function init(containerId, initialPlayersData = [], currentUserId = null) {
        console.log("ProgressVisualizer: Attempting initialization...");
        containerElement = document.getElementById(containerId);
        if (!containerElement) {
            console.error(`ProgressVisualizer init FAIL: Container #${containerId} not found.`);
            return false; // Indicate failure
        }

        // Get dimensions AFTER the element should be visible
        containerWidth = containerElement.offsetWidth;
        containerHeight = containerElement.offsetHeight;
        currentPlayerId = currentUserId; // Store current user ID

         // Check for valid dimensions
        if (containerWidth <= 0 || containerHeight <= 0) {
             console.error(`ProgressVisualizer init FAIL: Container #${containerId} has zero dimensions. Width: ${containerWidth}, Height: ${containerHeight}. Is it visible?`);
             // Reset dimensions to allow recalculation later if needed
             containerWidth = 0;
             containerHeight = 0;
             return false; // Indicate failure
        }
        console.log(`ProgressVisualizer init: Container dimensions ok (${containerWidth}x${containerHeight}). Current player: ${currentPlayerId}`);


        // Reset states
        playerStates = {};
        levelsDistribution = {};
        for (let i = 0; i <= LEVELS; i++) {
            levelsDistribution[i] = [];
        }
        containerElement.innerHTML = ''; // Clear previous avatars

        initialPlayersData.forEach(playerData => {
             const playerId = playerData.nickname; // Assuming nickname is the unique ID
             if (!playerId) {
                console.warn("Skipping player data missing nickname:", playerData);
                return;
            }
            const element = createAvatarElement({ ...playerData, id: playerId });
            const initialLevel = playerData.level || 0;

            const initialState = {
                ...playerData,
                id: playerId,
                level: initialLevel,
                element: element,
                x: -999, // Mark as not yet calculated
                y: -999,
            };
            playerStates[playerId] = initialState;
            if (!levelsDistribution[initialLevel]) levelsDistribution[initialLevel] = [];
            levelsDistribution[initialLevel].push(playerId);
            containerElement.appendChild(element);
        });

        // Calculate initial layout for all levels *after* adding all elements
        console.log("ProgressVisualizer init: Calculating initial layout...");
        Object.keys(levelsDistribution).forEach(levelStr => {
            const level = parseInt(levelStr, 10);
            if (levelsDistribution[level].length > 0) {
                recalculateLevelLayout(level);
            }
        });

        console.log(`ProgressVisualizer init SUCCESS: Initialized with ${initialPlayersData.length} players.`);
        return true; // Indicate success
    }

    function updatePlayerProgress(playerId, newLevel) {
        console.log(`ProgressVisualizer: Update requested for ${playerId} to level ${newLevel}`);
        const state = playerStates[playerId];
        if (!state) {
            console.warn(`ProgressVisualizer update FAIL: Player "${playerId}" not found.`);
            return;
        }

        newLevel = Math.max(0, Math.min(LEVELS, newLevel)); // Clamp level
        const currentLevel = state.level;

        if (newLevel === currentLevel) {
             console.log(`ProgressVisualizer: No level change for ${playerId} (already at ${currentLevel}).`);
            return; // No change needed
        }
         console.log(`  Player ${playerId}: Moving from ${currentLevel} to ${newLevel}`);

        // 1. Update state level
        state.level = newLevel;

        // 2. Update level distribution
        if (levelsDistribution[currentLevel]) {
            const index = levelsDistribution[currentLevel].indexOf(playerId);
            if (index > -1) {
                levelsDistribution[currentLevel].splice(index, 1);
                 console.log(`  Removed ${playerId} from level ${currentLevel} distribution.`);
            }
        }
        if (!levelsDistribution[newLevel]) {
            levelsDistribution[newLevel] = [];
        }
        if (!levelsDistribution[newLevel].includes(playerId)) {
             levelsDistribution[newLevel].push(playerId);
             console.log(`  Added ${playerId} to level ${newLevel} distribution.`);
        }


        // 3. Recalculate layout for the OLD level (as player left)
        if (levelsDistribution[currentLevel] && levelsDistribution[currentLevel].length > 0) {
             console.log(`  Recalculating OLD level ${currentLevel} layout.`);
             recalculateLevelLayout(currentLevel);
        } else {
             console.log(`  No recalculation needed for empty OLD level ${currentLevel}.`);
        }

        // 4. Calculate *target* position for the updated player first
         console.log(`  Calculating TARGET position for ${playerId} at level ${newLevel}.`);
        const { top, left } = calculateTargetPosition(playerId, newLevel);
        // Update state coords BEFORE moving element for consistency
        state.x = left;
        state.y = top;
        // Move the element (CSS transition handles the animation)
        updateElementPosition(state.element, top, left);


        // 5. Recalculate layout for the NEW level (as player arrived)
        //    This adjusts positions of others already there. Delay slightly?
        console.log(`  Recalculating NEW level ${newLevel} layout.`);
        // No delay seems necessary now, let's recalculate immediately
         recalculateLevelLayout(newLevel);


        console.log(`  Player ${playerId} update processed.`);
    }

    function getPlayerState(playerId) {
        return playerStates[playerId] || null;
    }

    function highlightWinner(winnerId) {
        const state = playerStates[winnerId];
        if (state && state.element) {
            state.element.classList.add('winner');
            console.log(`Highlighting winner: ${winnerId}`);
        }
    }

     function addPlayer(playerData) {
         const playerId = playerData.nickname;
          console.log(`ProgressVisualizer: Adding player ${playerId}`);
         if (!playerId || playerStates[playerId]) {
             console.warn(`  Skipping add: Player ${playerId} already exists or has no ID.`);
             return;
         }
          // Check if container is ready before adding elements
          if (!containerElement || containerWidth <= 0) {
              console.warn(`  Skipping add: Container not ready for player ${playerId}`);
              return;
          }

          const element = createAvatarElement({ ...playerData, id: playerId });
          const initialLevel = playerData.level || 0;
          const initialState = {
              ...playerData,
              id: playerId,
              level: initialLevel,
              element: element,
              x: -999, // Mark as not calculated
              y: -999,
          };
          playerStates[playerId] = initialState;
          if (!levelsDistribution[initialLevel]) levelsDistribution[initialLevel] = [];
          levelsDistribution[initialLevel].push(playerId);
          containerElement.appendChild(element);
          // Recalculate layout for the level this player joined
           console.log(`  Recalculating layout for level ${initialLevel} after adding ${playerId}.`);
          recalculateLevelLayout(initialLevel);
     }

    return {
        init,
        updatePlayerProgress,
        getPlayerState,
        highlightWinner,
        addPlayer
    };
})();


// --- Socket Event Handlers ---

socket.on('gameStatus', data => {
    if (!data.open) location = '/closed.html';
});

joinBtn.onclick = () => {
    const nick = nickIn.value.trim();
    if (!nick) return;
    self = nick;
    socket.emit('join', nick);
    joinDiv.classList.remove('visible');
    lobbyDiv.classList.add('visible');
};

socket.on('lobby', list => {
    lobbyPl.innerHTML = '';
    list.forEach(n => {
        const d = document.createElement('div');
        d.textContent = n;
        if (n === self) {
            d.style.fontWeight = 'bold';
        }
        lobbyPl.append(d);
    });
});

socket.on('countdown', n => {
    if (n > 0) {
        cntNum.textContent = n;
        cntOv.classList.add('show');
    } else {
        cntOv.classList.remove('show');
        lobbyDiv.classList.remove('visible');
        gameDiv.classList.add('visible');
        // Make sure containers are displayed *before* first playerList might arrive
        mountainContainer.style.display = 'block';
        questionDiv.style.display = 'block';
        console.log("Game starting - showing mountain and question divs.");
        // Reset visualizer state for new game
        visualizerInitialized = false;
    }
});

socket.on('question', q => {
    qtext.textContent = q.question;
    optsDiv.innerHTML = '';
    q.options.forEach((opt, i) => {
        const btn = document.createElement('button');
        btn.className = 'option-btn';
        btn.textContent = opt;
        btn.onclick = () => {
             socket.emit('answer', i);
             Array.from(optsDiv.children).forEach(b => b.disabled = true);
        };
        optsDiv.append(btn);
    });
});

socket.on('answerResult', res => {
    Array.from(optsDiv.children).forEach((b, i) => {
        if (i === res.correctIndex) {
            b.classList.add('correct');
        } else if (i === res.chosenIndex && !res.correct) { // Assuming server sends chosenIndex
             b.classList.add('wrong');
        }
         // Ensure *all* buttons are disabled regardless of correctness
         b.disabled = true;
    });
    // Maybe clear the result highlights after a short delay?
    // setTimeout(() => {
    //     Array.from(optsDiv.children).forEach(b => {
    //         b.classList.remove('correct', 'wrong');
    //     });
    // }, 1500);
});

socket.on('playerList', list => {
    // console.log("Received playerList:", list); // DEBUG: Log received data

    // Check if the game screen is visible before doing anything
    if (!gameDiv.classList.contains('visible')) {
        // console.log("Skipping playerList processing: game not visible.");
        return;
    }

    // Initialize visualizer on the first player list *after* game start
    if (!visualizerInitialized) {
        console.log("PlayerList received, attempting first-time initialization...");
        // Use setTimeout to allow DOM to update (mountain container visibility)
        setTimeout(() => {
            // Pass the list and current user's nickname
             visualizerInitialized = ProgressVisualizer.init('mountain-progress-container', list, self);
             if (!visualizerInitialized) {
                 console.error("Visualizer initialization failed inside setTimeout. Check container visibility and dimensions.");
            } else {
                 console.log("Visualizer initialized successfully via setTimeout.");
                 // Process the list *again* now that it's initialized?
                 // Or rely on the next playerList event. Let's process immediately:
                 processPlayerListUpdates(list);
            }
        }, 0); // Delay of 0ms pushes execution after current rendering cycle
    } else {
         // If already initialized, just process updates
         processPlayerListUpdates(list);
    }
});

// Helper function to process player list updates
function processPlayerListUpdates(list) {
     console.log("Processing player list updates...");
     list.forEach(p => {
         const playerId = p.nickname; // Assuming nickname is the unique ID
         if (!playerId) {
             console.warn("Skipping player update: Missing nickname in data", p);
             return;
         }

         const currentState = ProgressVisualizer.getPlayerState(playerId);

         if (currentState) {
             // Player exists, check if level needs update
             if (currentState.level !== p.level) {
                 ProgressVisualizer.updatePlayerProgress(playerId, p.level);
             } else {
                  // Optional: Force recalculate position even if level same? Could help alignment.
                  // ProgressVisualizer.recalculateLevelLayout(currentState.level);
             }
         } else {
             // Player doesn't exist in visualizer yet (joined mid-game or init issue?)
             console.log(`Player ${playerId} not found in visualizer, attempting to add.`);
             ProgressVisualizer.addPlayer(p);
              // It might take a moment for addPlayer to fully process,
              // but updatePlayerProgress should handle the level update on next playerList event.
         }
     });
     console.log("Finished processing player list updates.");
}


socket.on('gameOver', data => {
     console.log("Game Over:", data);
    if (visualizerInitialized && data.winner && data.winner.nickname) {
         ProgressVisualizer.highlightWinner(data.winner.nickname);
    }

    setTimeout(() => {
        gameDiv.classList.remove('visible');
        resultDiv.classList.add('visible');

        if (data.winner) {
             winnerText.textContent = `🏅 ${data.winner.nickname} — ${data.winner.correct} правильн. за ${Math.round(data.winner.time / 1000)}с`;
        } else {
             winnerText.textContent = "Игра окончена!";
        }

        resStats.innerHTML = '';
        data.stats.sort((a, b) => b.correct - a.correct || a.time - b.time); // Sort results
        data.stats.forEach(p => {
            const tr = document.createElement('tr');
            tr.innerHTML = `<td>${p.nickname}</td><td>${p.correct}</td><td>${Math.round(p.time / 1000)}</td>`;
             if(data.winner && p.nickname === data.winner.nickname) {
                 tr.style.fontWeight = 'bold';
                 tr.style.backgroundColor = '#e8f5e9'; // Highlight winner row slightly
             }
            resStats.append(tr);
        });

        confetti({
             particleCount: 150,
             spread: 90,
             origin: { y: 0.6 }
        });

    }, 3000); // Delay before showing results
});
