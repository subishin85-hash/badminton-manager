const waitingPlayers = document.getElementById('waitingPlayers');
const restPlayers = document.getElementById('restPlayers');
const assignableAreas = document.querySelectorAll('.assignable-area');
const finishButtons = document.querySelectorAll('.finish-game-btn');
const callCourtButtons = document.querySelectorAll('.call-court-btn');
const courtActiveButtons = document.querySelectorAll('.court-active-btn');
const waitingBox = document.querySelector('.waiting-box');
const restBox = document.querySelector('.rest-box');
const restLabel = document.querySelector('.rest-label');
const createPlaceholderBtn = document.getElementById('createPlaceholderBtn');
const resetWorkoutBtn = document.getElementById('resetWorkoutBtn');
const editPlayersBtn = document.getElementById('editPlayersBtn');
const clearNextGamesBtn = document.getElementById('clearNextGamesBtn');
const autoAssignBtn = document.getElementById('autoAssignBtn');
const showStatsBtn = document.getElementById('showStatsBtn');
const autoAssignModal = document.getElementById('autoAssignModal');
const autoAssignEmptyBtn = document.getElementById('autoAssignEmptyBtn');
const autoAssignAllBtn = document.getElementById('autoAssignAllBtn');
const autoAssignCancelBtn = document.getElementById('autoAssignCancelBtn');
const undoBtn = document.getElementById('undoBtn');
const redoBtn = document.getElementById('redoBtn');
const selectedCountBox = document.getElementById('selectedCountBox');

const COURT_STATE_KEY = 'ganghoCourtState';
const COURT_ACTIVE_KEY = 'ganghoActiveCourts';
const savedPlayers = localStorage.getItem('selectedPlayers');
let players = savedPlayers ? JSON.parse(savedPlayers) : [];
let activeCourts = JSON.parse(localStorage.getItem(COURT_ACTIVE_KEY)) || {
    1: true,
    2: true,
    3: true,
    4: true
};

function saveActiveCourts() {
    localStorage.setItem(COURT_ACTIVE_KEY, JSON.stringify(activeCourts));
}

function isCourtActive(courtNo) {
    return activeCourts[courtNo] !== false;
}

function getCourtNoFromAreaId(areaId) {
    const match = areaId.match(/Court(\d+)/);
    return match ? match[1] : null;
}
function saveCourtState() {
    localStorage.setItem(COURT_STATE_KEY, JSON.stringify(players));
}

function loadCourtState() {
    const savedCourtState = localStorage.getItem(COURT_STATE_KEY);

    if (!savedCourtState) {
        return;
    }

    try {
        const savedCourtPlayers = JSON.parse(savedCourtState);
        const currentSelectedPlayers = players;
        const currentNames = currentSelectedPlayers.map(player => player.name);

        const savedStateMatchesCurrentPlayers = savedCourtPlayers.every(player => {
            const realName = player.isPlaceholder ? player.originalPlayer : player.name;
            return currentNames.includes(realName);
        });

        if (!savedStateMatchesCurrentPlayers) {
            return;
        }

        const mergedPlayers = [...savedCourtPlayers];

        currentSelectedPlayers.forEach((currentPlayer) => {
            const alreadyInSavedState = mergedPlayers.some(savedPlayer => {
                const savedRealName = savedPlayer.isPlaceholder ? savedPlayer.originalPlayer : savedPlayer.name;
                return savedRealName === currentPlayer.name;
            });

            if (!alreadyInSavedState) {
                mergedPlayers.push({
                    ...currentPlayer,
                    assignedTo: null,
                    assignedOrder: null,
                    gamesPlayed: currentPlayer.gamesPlayed || 0
                });
            }
        });

        players = mergedPlayers;
    } catch (error) {
        console.error('코트 상태를 불러오는 중 오류가 발생했습니다.', error);
    }
}

let selectedPlayer = null;
let selectedPlayers = [];

function isPlayerSelected(player) {
    return selectedPlayers.some(selected => selected.name === player.name);
}

function toggleSelectedPlayer(player) {
    const selectedIndex = selectedPlayers.findIndex(selected => selected.name === player.name);

    if (selectedIndex === -1) {
        selectedPlayers.push(player);
        selectedPlayer = player;
    } else {
        selectedPlayers.splice(selectedIndex, 1);
        selectedPlayer = selectedPlayers[selectedPlayers.length - 1] || null;
    }
}

function clearSelectedPlayers() {
    selectedPlayers = [];
    selectedPlayer = null;
}
let undoHistory = [];
let redoHistory = [];
let pendingSpeechTimeout = null;
const MAX_UNDO_HISTORY = 20;

function getCurrentState() {
    return {
        players: JSON.parse(JSON.stringify(players)),
        activeCourts: JSON.parse(JSON.stringify(activeCourts)),
        assignmentCounter
    };
}

function stopPendingSpeech() {
    if (pendingSpeechTimeout) {
        clearTimeout(pendingSpeechTimeout);
        pendingSpeechTimeout = null;
    }

    if (window.speechSynthesis) {
        window.speechSynthesis.cancel();
    }
}

function saveUndoState() {
    undoHistory.push(getCurrentState());
    redoHistory = [];

    if (undoHistory.length > MAX_UNDO_HISTORY) {
        undoHistory.shift();
    }
}

function restoreUndoState() {
    if (undoHistory.length === 0) {
        alert('되돌릴 작업이 없습니다.');
        return;
    }

    stopPendingSpeech();

    redoHistory.push(getCurrentState());

    const previousState = undoHistory.pop();

    players = JSON.parse(JSON.stringify(previousState.players));
    activeCourts = JSON.parse(JSON.stringify(previousState.activeCourts || activeCourts));
    assignmentCounter = previousState.assignmentCounter;
    clearSelectedPlayers();
    renderAll();
}

function restoreRedoState() {
    if (redoHistory.length === 0) {
        alert('다시 실행할 작업이 없습니다.');
        return;
    }

    stopPendingSpeech();

    undoHistory.push(getCurrentState());

    if (undoHistory.length > MAX_UNDO_HISTORY) {
        undoHistory.shift();
    }

    const nextState = redoHistory.pop();

    players = JSON.parse(JSON.stringify(nextState.players));
activeCourts = JSON.parse(JSON.stringify(nextState.activeCourts || activeCourts));
assignmentCounter = nextState.assignmentCounter;
    clearSelectedPlayers();
    renderAll();
}
let assignmentCounter = 0;

function getPlayerDisplayName(player) {
    const gamesPlayed = player.gamesPlayed || 0;
    return `${player.name} (${gamesPlayed})`;
}

function getLowestWaitingGameCount() {
    const waitingRealPlayers = players.filter(player => !player.assignedTo && !player.isPlaceholder);

    if (waitingRealPlayers.length === 0) {
        return null;
    }

    return Math.min(...waitingRealPlayers.map(player => player.gamesPlayed || 0));
}

function createPlayerButton(player) {
    const playerBtn = document.createElement('button');
    playerBtn.type = 'button';
    playerBtn.className = 'court-player-btn';
    playerBtn.textContent = getPlayerDisplayName(player);

    if (isPlayerSelected(player)) {
        playerBtn.classList.add('selected-player');
    }

    const lowestWaitingGameCount = getLowestWaitingGameCount();

    if (!player.isPlaceholder && lowestWaitingGameCount !== null && (player.gamesPlayed || 0) === lowestWaitingGameCount) {
        playerBtn.classList.add('low-game-player');
    }

    playerBtn.addEventListener('click', (event) => {
        event.stopPropagation();
        toggleSelectedPlayer(player);
        renderAll();
    });

    return playerBtn;
}

function renderWaitingPlayers() {
    waitingPlayers.innerHTML = '';

    const waitingPlayerList = players
        .filter(player => !player.assignedTo)
        .sort((a, b) => {
            const gameDiff = (a.gamesPlayed || 0) - (b.gamesPlayed || 0);

            if (gameDiff !== 0) {
                return gameDiff;
            }

            return a.name.localeCompare(b.name, 'ko');
        });

    waitingPlayerList.forEach((player) => {
        const playerBtn = createPlayerButton(player);
        waitingPlayers.appendChild(playerBtn);
    });
}

function createAssignedPlayerButton(player) {
    const playerBtn = document.createElement('button');
    playerBtn.type = 'button';
    playerBtn.className = 'court-player-btn assigned-player-btn';
    playerBtn.textContent = getPlayerDisplayName(player);

    if (isPlayerSelected(player)) {
        playerBtn.classList.add('selected-player');
    }

    playerBtn.addEventListener('click', (event) => {
        event.stopPropagation();

        if (selectedPlayers.length === 1 && selectedPlayer && selectedPlayer.name !== player.name) {
            const tempAssignedTo = selectedPlayer.assignedTo;
            const tempAssignedOrder = selectedPlayer.assignedOrder;

            selectedPlayer.assignedTo = player.assignedTo;
            selectedPlayer.assignedOrder = player.assignedOrder;

            player.assignedTo = tempAssignedTo;
            player.assignedOrder = tempAssignedOrder;

            clearSelectedPlayers();
            renderAll();
            return;
        }

        toggleSelectedPlayer(player);
        renderAll();
    });

    return playerBtn;
}
function renderCourtActiveState() {
    courtActiveButtons.forEach((button) => {
        const courtNo = button.dataset.court;
        const active = isCourtActive(courtNo);

        button.textContent = active ? '활성' : '비활성';
        button.classList.toggle('inactive', !active);
    });

    for (let courtNo = 1; courtNo <= 4; courtNo++) {
        const currentCourtArea = document.getElementById(`currentCourt${courtNo}A`);
        const nextCourtArea = document.getElementById(`nextCourt${courtNo}A`);
        const currentCourtBox = currentCourtArea ? currentCourtArea.closest('.badminton-court') : null;
        const nextCourtBox = nextCourtArea ? nextCourtArea.closest('.badminton-court') : null;
        const active = isCourtActive(String(courtNo));

        if (currentCourtBox) {
            currentCourtBox.classList.toggle('inactive-court', !active);
        }

        if (nextCourtBox) {
            nextCourtBox.classList.toggle('inactive-court', !active);
        }
    }
}
function renderCourts() {
    assignableAreas.forEach((area) => {
        const courtId = area.id;
        area.innerHTML = '';

        const assignedPlayers = players
            .filter(player => player.assignedTo === courtId)
            .sort((a, b) => (a.assignedOrder || 0) - (b.assignedOrder || 0));

        assignedPlayers.forEach((player) => {
            const playerBtn = createAssignedPlayerButton(player);
            area.appendChild(playerBtn);
        });
    });
}

function renderAll() {
    renderWaitingPlayers();
    renderCourts();
    renderRestPlayers();
    renderCourtActiveState();
    if (selectedCountBox) {
        selectedCountBox.textContent = `선택된 선수 : ${selectedPlayers.length}명`;
    }
    saveActiveCourts();
    saveCourtState();
}

function renderRestPlayers() {
    restPlayers.innerHTML = '';

    const restingPlayers = players.filter(player => player.assignedTo === 'rest');

    restingPlayers.forEach((player) => {
        const playerBtn = document.createElement('button');
        playerBtn.type = 'button';
        playerBtn.className = 'court-player-btn assigned-player-btn';
        playerBtn.textContent = getPlayerDisplayName(player);

        if (isPlayerSelected(player)) {
            playerBtn.classList.add('selected-player');
        }

        playerBtn.addEventListener('click', (event) => {
            event.stopPropagation();
            toggleSelectedPlayer(player);
            renderAll();
        });

        restPlayers.appendChild(playerBtn);
    });
}

assignableAreas.forEach((area) => {
    area.addEventListener('click', () => {
        saveUndoState();
        const courtNo = getCourtNoFromAreaId(area.id);

if (courtNo && !isCourtActive(courtNo)) {
    alert(`${courtNo}코트는 비활성 상태입니다.`);
    return;
}
        if (selectedPlayers.length === 0) {
            alert('먼저 선수를 선택해주세요.');
            return;
        }

        if (selectedPlayers.length >= 3) {
            const courtBaseId = area.id.slice(0, -1);
            const teamAId = `${courtBaseId}A`;
            const teamBId = `${courtBaseId}B`;

            const teamAPlayers = players.filter(player => player.assignedTo === teamAId);
            const teamBPlayers = players.filter(player => player.assignedTo === teamBId);

            const teamAAvailableSlots = 2 - teamAPlayers.length;
            const teamBAvailableSlots = 2 - teamBPlayers.length;
            const totalAvailableSlots = teamAAvailableSlots + teamBAvailableSlots;

            if (totalAvailableSlots <= 0) {
                alert('이 코트에는 더 이상 선수를 배정할 수 없습니다.');
                return;
            }

            const playersToAssign = selectedPlayers.slice(0, totalAvailableSlots);
            const playersForTeamA = playersToAssign.slice(0, teamAAvailableSlots);
            const playersForTeamB = playersToAssign.slice(teamAAvailableSlots, teamAAvailableSlots + teamBAvailableSlots);

            playersForTeamA.forEach((player) => {
                player.assignedTo = teamAId;

                if (!player.assignedOrder) {
                    player.assignedOrder = ++assignmentCounter;
                }
            });

            playersForTeamB.forEach((player) => {
                player.assignedTo = teamBId;

                if (!player.assignedOrder) {
                    player.assignedOrder = ++assignmentCounter;
                }
            });

            clearSelectedPlayers();
            renderAll();
            return;
        }

        const assignedPlayers = players.filter(player => player.assignedTo === area.id);
        const availableSlots = 2 - assignedPlayers.length;

        if (availableSlots <= 0) {
            alert('한 팀에는 최대 2명까지만 배정할 수 있습니다.');
            return;
        }

        const playersToAssign = selectedPlayers.slice(0, availableSlots);

        playersToAssign.forEach((player) => {
            player.assignedTo = area.id;

            if (!player.assignedOrder) {
                player.assignedOrder = ++assignmentCounter;
            }
        });

        clearSelectedPlayers();
        renderAll();
    });
});

restPlayers.addEventListener('click', () => {
    saveUndoState();
    if (selectedPlayers.length === 0) {
        return;
    }

    selectedPlayers.forEach((player) => {
        player.assignedTo = 'rest';
        player.assignedOrder = null;
    });

    clearSelectedPlayers();
    renderAll();
});

function moveSelectedPlayerToRest() {
    if (selectedPlayers.length === 0) {
        return;
    }
    saveUndoState();

    selectedPlayers.forEach((player) => {
        player.assignedTo = 'rest';
        player.assignedOrder = null;
    });

    clearSelectedPlayers();
    renderAll();
}

if (restBox) {
    restBox.addEventListener('click', () => {
        moveSelectedPlayerToRest();
    });
}

if (restLabel) {
    restLabel.addEventListener('click', () => {
        moveSelectedPlayerToRest();
    });
}

waitingPlayers.addEventListener('click', () => {
    saveUndoState();
    if (selectedPlayers.length === 0) {
        return;
    }

    selectedPlayers.forEach((player) => {
        player.assignedTo = null;
        player.assignedOrder = null;
    });

    clearSelectedPlayers();
    renderAll();
});

if (waitingBox) {
    waitingBox.addEventListener('click', () => {
        saveUndoState();
        if (selectedPlayers.length === 0) {
            return;
        }

        selectedPlayers.forEach((player) => {
            player.assignedTo = null;
            player.assignedOrder = null;
        });

        clearSelectedPlayers();
        renderAll();
    });
}


if (createPlaceholderBtn) {
    createPlaceholderBtn.addEventListener('click', () => {
        saveUndoState();
        if (!selectedPlayer) {
            alert('현재 경기 중인 선수를 먼저 선택해주세요.');
            return;
        }

        if (!selectedPlayer.assignedTo || !selectedPlayer.assignedTo.startsWith('currentCourt')) {
            alert('현재 경기 코트에 배정된 선수만 복사할 수 있습니다.');
            return;
        }

        const placeholderName = `${selectedPlayer.name}(경기중)`;

        const alreadyExists = players.some(player => player.name === placeholderName);

        if (alreadyExists) {
            alert('이미 생성된 경기중 선수가 있습니다.');
            return;
        }

        players.push({
            name: placeholderName,
            isPlaceholder: true,
            originalPlayer: selectedPlayer.name,
            gamesPlayed: selectedPlayer.gamesPlayed || 0,
            assignedTo: null,
            assignedOrder: null
        });

        clearSelectedPlayers();
        renderAll();
    });
}


if (editPlayersBtn) {
    editPlayersBtn.addEventListener('click', () => {
        location.href = 'register.html';
    });
}


function showGameStats() {
    const realPlayers = players.filter(player => !player.isPlaceholder);

    if (realPlayers.length === 0) {
        alert('통계에 표시할 선수가 없습니다.');
        return;
    }

    const sortedPlayers = [...realPlayers]
        .sort((a, b) => {
            const gameDiff = (b.gamesPlayed || 0) - (a.gamesPlayed || 0);

            if (gameDiff !== 0) {
                return gameDiff;
            }

            return a.name.localeCompare(b.name, 'ko');
        });

    const totalPlayerGames = sortedPlayers.reduce((sum, player) => sum + (player.gamesPlayed || 0), 0);
    const estimatedGames = Math.floor(totalPlayerGames / 4);

    const statLines = sortedPlayers.map((player, index) => {
        return `${index + 1}. ${player.name} - ${player.gamesPlayed || 0}경기`;
    });

    const message = [
        '📊 오늘 경기 통계',
        '',
        `참가자: ${realPlayers.length}명`,
        `완료 경기: ${estimatedGames}경기`,
        '',
        ...statLines
    ].join('\n');

    alert(message);
}

if (showStatsBtn) {
    showStatsBtn.addEventListener('click', () => {
        showGameStats();
    });
}



function shufflePlayers(playerList) {
    const shuffled = [...playerList];

    for (let i = shuffled.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }

    return shuffled;
}

function getAutoAssignWaitingPlayers() {
    const waitingPlayerList = players.filter(player => !player.assignedTo);
    const groupedByGames = new Map();

    waitingPlayerList.forEach((player) => {
        const gamesPlayed = player.gamesPlayed || 0;

        if (!groupedByGames.has(gamesPlayed)) {
            groupedByGames.set(gamesPlayed, []);
        }

        groupedByGames.get(gamesPlayed).push(player);
    });

    return [...groupedByGames.keys()]
        .sort((a, b) => a - b)
        .flatMap(gameCount => shufflePlayers(groupedByGames.get(gameCount)));
}

function isNextCourtEmpty(courtNo) {
    return !players.some(player =>
        player.assignedTo === `nextCourt${courtNo}A` ||
        player.assignedTo === `nextCourt${courtNo}B`
    );
}

function clearNextCourtsForAutoAssign() {
    players.forEach((player) => {
        if (player.assignedTo && player.assignedTo.startsWith('nextCourt')) {
            player.assignedTo = null;
            player.assignedOrder = null;
        }
    });
}

function getAutoAssignTargetCourts(onlyEmptyCourts) {
    const targetCourts = [];

    for (let courtNo = 1; courtNo <= 4; courtNo++) {
        if (!isCourtActive(String(courtNo))) {
            continue;
        }

        if (onlyEmptyCourts && !isNextCourtEmpty(courtNo)) {
            continue;
        }

        targetCourts.push(courtNo);
    }

    return targetCourts;
}

function assignFourPlayersToNextCourt(courtNo, courtPlayers) {
    courtPlayers.forEach((player, index) => {
        player.assignedTo = index < 2 ? `nextCourt${courtNo}A` : `nextCourt${courtNo}B`;
        player.assignedOrder = index < 2 ? index + 1 : index - 1;
    });
}

function autoAssignNextGames(onlyEmptyCourts) {
    saveUndoState();

    if (!onlyEmptyCourts) {
        clearNextCourtsForAutoAssign();
    }

    const targetCourts = getAutoAssignTargetCourts(onlyEmptyCourts);

    if (targetCourts.length === 0) {
        alert('자동 배정할 활성 코트가 없습니다.');
        return;
    }

    const waitingPlayerList = getAutoAssignWaitingPlayers();
    const assignableCourtCount = Math.min(targetCourts.length, Math.floor(waitingPlayerList.length / 4));

    if (assignableCourtCount === 0) {
        alert('자동 배정하려면 대기 선수가 최소 4명 필요합니다.');
        return;
    }

    for (let i = 0; i < assignableCourtCount; i++) {
        const courtNo = targetCourts[i];
        const courtPlayers = waitingPlayerList.slice(i * 4, i * 4 + 4);
        assignFourPlayersToNextCourt(courtNo, courtPlayers);
    }

    clearSelectedPlayers();
    renderAll();
}

if (autoAssignBtn) {
    autoAssignBtn.addEventListener('click', () => {
        autoAssignModal.classList.remove('hidden');
    });
}
if (autoAssignEmptyBtn) {
    autoAssignEmptyBtn.addEventListener('click', () => {
        autoAssignModal.classList.add('hidden');
        autoAssignNextGames(true);
    });
}

if (autoAssignAllBtn) {
    autoAssignAllBtn.addEventListener('click', () => {
        autoAssignModal.classList.add('hidden');
        autoAssignNextGames(false);
    });
}

if (autoAssignCancelBtn) {
    autoAssignCancelBtn.addEventListener('click', () => {
        autoAssignModal.classList.add('hidden');
    });
}
if (clearNextGamesBtn) {
    clearNextGamesBtn.addEventListener('click', () => {
        saveUndoState();
        const confirmClear = confirm('다음 경기 배정을 모두 초기화할까요?');

        if (!confirmClear) {
            return;
        }

        players.forEach((player) => {
            if (player.assignedTo && player.assignedTo.startsWith('nextCourt')) {
                player.assignedTo = null;
                player.assignedOrder = null;
            }
        });

        clearSelectedPlayers();
        renderAll();
    });
}
courtActiveButtons.forEach((button) => {
    button.addEventListener('click', (event) => {
        event.stopPropagation();
        saveUndoState();

        const courtNo = button.dataset.court;
        const willBeActive = !isCourtActive(courtNo);

        if (!willBeActive) {
            const confirmInactive = confirm(`${courtNo}코트를 비활성화할까요? 해당 코트의 현재/다음 경기 선수는 대기칸으로 이동합니다.`);

            if (!confirmInactive) {
                return;
            }

            players.forEach((player) => {
                if (player.assignedTo === `currentCourt${courtNo}A` ||
                    player.assignedTo === `currentCourt${courtNo}B` ||
                    player.assignedTo === `nextCourt${courtNo}A` ||
                    player.assignedTo === `nextCourt${courtNo}B`) {
                    player.assignedTo = null;
                    player.assignedOrder = null;
                }
            });
        }

        activeCourts[courtNo] = willBeActive;
        clearSelectedPlayers();
        renderAll();
    });
});
if (resetWorkoutBtn) {
    resetWorkoutBtn.addEventListener('click', () => {
        const confirmReset = confirm('새 운동을 시작할까요? 현재 코트 배정과 경기 수가 모두 초기화됩니다.');

        if (!confirmReset) {
            return;
        }

        players = players
            .filter(player => !player.isPlaceholder)
            .map(player => ({
                ...player,
                assignedTo: null,
                assignedOrder: null,
                gamesPlayed: 0
            }));

        clearSelectedPlayers();
assignmentCounter = 0;
activeCourts = {
    1: true,
    2: true,
    3: true,
    4: true
};
localStorage.removeItem(COURT_STATE_KEY);
localStorage.removeItem(COURT_ACTIVE_KEY);
localStorage.removeItem('selectedPlayers');
location.href = 'index.html';
    });
}

function getCourtPlayerNames(courtNo) {
    const teamAPlayers = players
        .filter(player => player.assignedTo === `currentCourt${courtNo}A`)
        .sort((a, b) => (a.assignedOrder || 0) - (b.assignedOrder || 0));

    const teamBPlayers = players
        .filter(player => player.assignedTo === `currentCourt${courtNo}B`)
        .sort((a, b) => (a.assignedOrder || 0) - (b.assignedOrder || 0));

    return [...teamAPlayers, ...teamBPlayers]
        .map(player => player.isPlaceholder ? player.originalPlayer : player.name);
}

function speakCourtPlayers(courtNo) {
    const courtPlayerNames = getCourtPlayerNames(courtNo);

    if (courtPlayerNames.length === 0) {
        alert(`${courtNo}코트에 배정된 선수가 없습니다.`);
        return;
    }

    const playerCallText = courtPlayerNames
        .map(name => `${name}님.`)
        .join(' ');

    const message = `${playerCallText} ${courtNo}번 코트로 입장해주세요.`;

    if (!window.speechSynthesis) {
        alert(message);
        return;
    }

    const speech = new SpeechSynthesisUtterance(message);
    speech.lang = 'ko-KR';
    speech.rate = 0.8;
    speech.pitch = 1;
    speech.volume = 1;

    window.speechSynthesis.speak(speech);
}

callCourtButtons.forEach((button) => {
    button.addEventListener('click', (event) => {
        event.stopPropagation();
        const courtNo = button.dataset.court;
        speakCourtPlayers(courtNo);
    });
});

finishButtons.forEach((button) => {
    button.addEventListener('click', () => {
        saveUndoState();
        const courtNo = button.dataset.court;
        if (!isCourtActive(courtNo)) {
        alert(`${courtNo}코트는 비활성 상태입니다.`);
        return;
}
        const replacedCurrentPlayerNames = new Set();
        const endedGameCounts = new Map();

        ['A', 'B'].forEach((team) => {
            players.forEach((player) => {
                if (player.assignedTo === `nextCourt${courtNo}${team}` && player.isPlaceholder) {
                    replacedCurrentPlayerNames.add(player.originalPlayer);
                }
            });
        });

        ['A', 'B'].forEach((team) => {
            players.forEach((player) => {
                if (player.assignedTo === `currentCourt${courtNo}${team}`) {
                    player.gamesPlayed = (player.gamesPlayed || 0) + 1;
                    endedGameCounts.set(player.name, player.gamesPlayed);
                    player.assignedTo = null;
                    player.assignedOrder = null;
                }
            });
        });

        ['A', 'B'].forEach((team) => {
            let promotedOrder = 1;

            players.forEach((player) => {
                if (player.assignedTo === `nextCourt${courtNo}${team}`) {
                    if (player.isPlaceholder) {
                        const originalName = player.originalPlayer;
                        player.name = originalName;
                        player.isPlaceholder = false;

                        if (endedGameCounts.has(originalName)) {
                            player.gamesPlayed = endedGameCounts.get(originalName);
                        }
                    }

                    player.assignedTo = `currentCourt${courtNo}${team}`;
                    player.assignedOrder = promotedOrder++;
                }
            });
        });

        players = players.filter((player) => {
            return !(replacedCurrentPlayerNames.has(player.name) && !player.assignedTo);
        });

        renderAll();

        if (pendingSpeechTimeout) {
            clearTimeout(pendingSpeechTimeout);
        }

        pendingSpeechTimeout = setTimeout(() => {
            pendingSpeechTimeout = null;
            speakCourtPlayers(courtNo);
        }, 100);
    });
});

if (undoBtn) {
    undoBtn.addEventListener('click', () => {
        restoreUndoState();
    });
}

if (redoBtn) {
    redoBtn.addEventListener('click', () => {
        restoreRedoState();
    });
}

loadCourtState();
renderAll();
