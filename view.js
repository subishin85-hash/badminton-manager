

const updatedAtEl = document.getElementById('viewUpdatedAt');
const currentGamesEl = document.getElementById('viewCurrentGames');
const nextGamesEl = document.getElementById('viewNextGames');
const waitingPlayersEl = document.getElementById('viewWaitingPlayers');
const restPlayersEl = document.getElementById('viewRestPlayers');

function playerName(player) {
    return player.name || player.playerName || '이름없음';
}

function renderPlayerList(container, players) {
    container.innerHTML = '';

    if (!players.length) {
        container.textContent = '없음';
        return;
    }

    players.forEach((player) => {
        const div = document.createElement('div');
        div.textContent = playerName(player);
        container.appendChild(div);
    });
}

function getPlayersInArea(players, areaPrefix) {
    return players.filter(player =>
        player.assignedTo && player.assignedTo.startsWith(areaPrefix)
    );
}

function renderCourts(container, players, prefix) {
    container.innerHTML = '';

    for (let courtNo = 1; courtNo <= 4; courtNo++) {
        const court = document.createElement('div');

        const teamA = players.filter(p => p.assignedTo === `${prefix}${courtNo}A`);
        const teamB = players.filter(p => p.assignedTo === `${prefix}${courtNo}B`);

        court.innerHTML = `
            <h3>${courtNo}코트</h3>
            <div>${teamA.map(playerName).join(', ') || '-'}</div>
            <div>VS</div>
            <div>${teamB.map(playerName).join(', ') || '-'}</div>
        `;

        container.appendChild(court);
    }
}

function renderState(state) {
    const players = state.players || [];

    renderCourts(currentGamesEl, players, 'currentCourt');
    renderCourts(nextGamesEl, players, 'nextCourt');

    renderPlayerList(
        waitingPlayersEl,
        players.filter(player => !player.assignedTo)
    );

    renderPlayerList(
        restPlayersEl,
        getPlayersInArea(players, 'rest')
    );

    updatedAtEl.textContent = '실시간 연결 중';
}

function startWatching() {
    const waitForFirebase = setInterval(() => {
        if (!window.ganghoFirebase) {
            return;
        }

        clearInterval(waitForFirebase);

        window.ganghoFirebase.watchMatchStateFromFirebase((state) => {
            if (!state) {
                updatedAtEl.textContent = '데이터 없음';
                return;
            }

            renderState(state);
        });
    }, 300);
}

startWatching();