const memberInput = document.getElementById('memberNameInput');
const guestInput = document.getElementById('guestNameInput');
const addMemberBtn = document.getElementById('addMemberBtn');
const addGuestBtn = document.getElementById('addGuestBtn');
const memberList = document.getElementById('memberList');
const guestList = document.getElementById('guestList');
const completeBtn = document.getElementById('completeBtn');
const excelImportBtn = document.getElementById('excelImportBtn');
const excelFileInput = document.getElementById('excelFileInput');
const deleteSelectedMembersBtn = document.getElementById('deleteSelectedMembersBtn');
const deleteSelectedGuestsBtn = document.getElementById('deleteSelectedGuestsBtn');
const selectAllBtn = document.getElementById('selectAllBtn');
const clearAllBtn = document.getElementById('clearAllBtn');
const memberSearchInput = document.getElementById('memberSearchInput');

let players = [];

const MEMBER_STORAGE_KEY = 'ganghoMemberList';
const SELECTED_PLAYERS_KEY = 'selectedPlayers';
const COURT_STATE_KEY = 'ganghoCourtState';
const LONG_PRESS_DURATION = 800;

function saveMemberList() {
    const members = players
        .filter(player => player.type === 'member')
        .map(player => ({
            name: player.name,
            type: 'member',
            selected: false
        }));

    localStorage.setItem(MEMBER_STORAGE_KEY, JSON.stringify(members));
}

function loadMemberList() {
    const savedMembers = localStorage.getItem(MEMBER_STORAGE_KEY);

    if (!savedMembers) {
        return;
    }

    try {
        const parsedMembers = JSON.parse(savedMembers);

        players = parsedMembers.map(player => ({
            name: player.name,
            type: 'member',
            selected: false
        }));
    } catch (error) {
        console.error('회원 명단을 불러오는 중 오류가 발생했습니다.', error);
        players = [];
    }
}

function loadSelectedPlayersForEdit() {
    const savedSelectedPlayers = localStorage.getItem(SELECTED_PLAYERS_KEY);

    if (!savedSelectedPlayers) {
        return;
    }

    try {
        const selectedPlayers = JSON.parse(savedSelectedPlayers);

        selectedPlayers.forEach((savedPlayer) => {
            if (savedPlayer.isPlaceholder) {
                return;
            }

            const existingPlayer = players.find(player => player.name === savedPlayer.name);

            if (existingPlayer) {
                existingPlayer.selected = true;
                return;
            }

            players.push({
                name: savedPlayer.name,
                type: savedPlayer.type || 'guest',
                selected: true
            });
        });
    } catch (error) {
        console.error('참가자 명단을 불러오는 중 오류가 발생했습니다.', error);
    }
}

function removePlayerFromSelectedPlayers(name) {
    const savedSelectedPlayers = localStorage.getItem(SELECTED_PLAYERS_KEY);

    if (!savedSelectedPlayers) {
        return;
    }

    try {
        const selectedPlayers = JSON.parse(savedSelectedPlayers);
        const filteredPlayers = selectedPlayers.filter(player => player.name !== name);
        localStorage.setItem(SELECTED_PLAYERS_KEY, JSON.stringify(filteredPlayers));
    } catch (error) {
        console.error('참가자 명단에서 선수를 삭제하는 중 오류가 발생했습니다.', error);
    }
}

function deleteSinglePlayer(index) {
    const player = players[index];

    if (!player) {
        return;
    }

    const confirmMessage = player.type === 'guest'
        ? `${player.name} 게스트를 삭제할까요?\n오늘 참가자 명단에서도 함께 삭제됩니다.`
        : `${player.name} 선수를 삭제할까요?\n회원 명단과 오늘 참가자 명단에서 함께 삭제됩니다.`;

    const confirmDelete = confirm(confirmMessage);

    if (!confirmDelete) {
        return;
    }

    players.splice(index, 1);
    removePlayerFromSelectedPlayers(player.name);
    saveMemberList();
    renderPlayers();
}

function makePlayerButton(player, index) {
    const btn = document.createElement('button');
    let longPressTimer = null;
    let isLongPressed = false;

    btn.type = 'button';
    btn.textContent = player.name;
    btn.className = 'player-btn';

    if (player.selected) {
        btn.classList.add('selected');
    }

    const startLongPress = () => {
        isLongPressed = false;
        longPressTimer = setTimeout(() => {
            isLongPressed = true;
            deleteSinglePlayer(index);
        }, LONG_PRESS_DURATION);
    };

    const cancelLongPress = () => {
        if (longPressTimer) {
            clearTimeout(longPressTimer);
            longPressTimer = null;
        }
    };

    btn.addEventListener('mousedown', startLongPress);
    btn.addEventListener('touchstart', startLongPress, { passive: true });

    btn.addEventListener('mouseup', cancelLongPress);
    btn.addEventListener('mouseleave', cancelLongPress);
    btn.addEventListener('touchend', cancelLongPress);
    btn.addEventListener('touchcancel', cancelLongPress);

    btn.addEventListener('click', () => {
        if (isLongPressed) {
            isLongPressed = false;
            return;
        }

        players[index].selected = !players[index].selected;
        renderPlayers();
    });

    return btn;
}

function renderPlayers() {
    memberList.innerHTML = '';
    guestList.innerHTML = '';

    const searchKeyword = memberSearchInput ? memberSearchInput.value.trim() : '';

    players.forEach((player, index) => {
        if (player.type !== 'guest' && searchKeyword !== '' && !player.name.includes(searchKeyword)) {
            return;
        }

        const item = makePlayerButton(player, index);

        if (player.type === 'guest') {
            guestList.appendChild(item);
        } else {
            memberList.appendChild(item);
        }
    });
}

function addPlayerFromInput(input, type) {
    const name = input.value.trim();

    if (name === '') {
        alert('이름을 입력해주세요.');
        input.focus();
        return;
    }

    const alreadyExists = players.some(player => player.name === name);

    if (alreadyExists) {
        alert('이미 등록된 이름입니다.');
        input.focus();
        return;
    }

    players.push({
        name: name,
        type: type,
        selected: false
    });

    if (type === 'member') {
        saveMemberList();
    }

    input.value = '';
    input.focus();
    renderPlayers();
}

addMemberBtn.addEventListener('click', () => {
    addPlayerFromInput(memberInput, 'member');
});

addGuestBtn.addEventListener('click', () => {
    addPlayerFromInput(guestInput, 'guest');
});

memberInput.addEventListener('keydown', (event) => {
    if (event.key === 'Enter') {
        addPlayerFromInput(memberInput, 'member');
    }
});

guestInput.addEventListener('keydown', (event) => {
    if (event.key === 'Enter') {
        addPlayerFromInput(guestInput, 'guest');
    }
});

completeBtn.addEventListener('click', () => {
    const selectedPlayers = players.filter(player => player.selected);

    if (selectedPlayers.length === 0) {
        alert('참가할 선수를 선택해주세요.');
        return;
    }

    const savedSelectedPlayers = localStorage.getItem(SELECTED_PLAYERS_KEY);
    let mergedPlayers = [];

    if (savedSelectedPlayers) {
        try {
            mergedPlayers = JSON.parse(savedSelectedPlayers).filter(player => !player.isPlaceholder);
        } catch (error) {
            console.error('기존 참가자 명단을 불러오는 중 오류가 발생했습니다.', error);
            mergedPlayers = [];
        }
    }

    selectedPlayers.forEach((selectedPlayer) => {
        const existingPlayer = mergedPlayers.find(player => player.name === selectedPlayer.name);

        if (!existingPlayer) {
            mergedPlayers.push({
                name: selectedPlayer.name,
                type: selectedPlayer.type,
                selected: true,
                assignedTo: null,
                assignedOrder: null,
                gamesPlayed: 0
            });
        }
    });

    localStorage.setItem(SELECTED_PLAYERS_KEY, JSON.stringify(mergedPlayers));
    location.href = 'court.html';
});

function deleteSelectedPlayersByType(type) {
    const selectedCount = players.filter(player => player.type === type && player.selected).length;

    if (selectedCount === 0) {
        alert('삭제할 선수를 선택해주세요.');
        return;
    }

    const confirmDelete = confirm(`선택한 ${selectedCount}명을 삭제할까요?`);

    if (!confirmDelete) {
        return;
    }

    players = players.filter(player => !(player.type === type && player.selected));
    saveMemberList();
    renderPlayers();
}

deleteSelectedMembersBtn.addEventListener('click', () => {
    deleteSelectedPlayersByType('member');
});

deleteSelectedGuestsBtn.addEventListener('click', () => {
    deleteSelectedPlayersByType('guest');
});

if (selectAllBtn) {
    selectAllBtn.addEventListener('click', () => {
        players.forEach(player => {
            player.selected = true;
        });
        renderPlayers();
    });
}

if (clearAllBtn) {
    clearAllBtn.addEventListener('click', () => {
        players.forEach(player => {
            player.selected = false;
        });
        renderPlayers();
    });
}

if (memberSearchInput) {
    memberSearchInput.addEventListener('input', () => {
        renderPlayers();
    });
}

excelImportBtn.addEventListener('click', () => {
    excelFileInput.click();
});

excelFileInput.addEventListener('change', (event) => {
    const file = event.target.files[0];

    if (!file) {
        return;
    }

    const reader = new FileReader();

    reader.onload = (e) => {
        const data = new Uint8Array(e.target.result);
        const workbook = XLSX.read(data, { type: 'array' });
        const firstSheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheetName];
        const rows = XLSX.utils.sheet_to_json(worksheet, { header: 1 });

        if (rows.length === 0) {
            alert('엑셀 파일에 데이터가 없습니다.');
            return;
        }

        let headerRowIndex = -1;
        let nameColumnIndex = -1;

        rows.forEach((row, rowIndex) => {
            if (nameColumnIndex !== -1) {
                return;
            }

            row.forEach((cell, columnIndex) => {
                const headerName = String(cell || '').trim();

                if (headerName === '선수명' || headerName === '이름' || headerName.includes('선수명') || headerName.includes('이름')) {
                    headerRowIndex = rowIndex;
                    nameColumnIndex = columnIndex;
                }
            });
        });

        if (nameColumnIndex === -1) {
            alert('엑셀에서 "선수명" 또는 "이름" 열을 찾을 수 없습니다. 선수명 제목이 있는 열을 확인해주세요.');
            return;
        }

        rows.slice(headerRowIndex + 1).forEach((row) => {
            const name = row[nameColumnIndex];

            if (!name) {
                return;
            }

            const trimmedName = String(name).trim();

            if (
                trimmedName === '' ||
                trimmedName === '선수명' ||
                trimmedName === '이름' ||
                trimmedName === '번호' ||
                /^\d+$/.test(trimmedName) ||
                trimmedName.includes('http') ||
                trimmedName.includes('www.') ||
                trimmedName.includes('.com')
            ) {
                return;
            }

            const alreadyExists = players.some(player => player.name === trimmedName);

            if (!alreadyExists) {
                players.push({
                    name: trimmedName,
                    type: 'member',
                    selected: false
                });
            }
        });

        saveMemberList();
        renderPlayers();
        alert('엑셀 회원 명단을 불러왔습니다.');
        excelFileInput.value = '';
    };

    reader.readAsArrayBuffer(file);
});

loadMemberList();
loadSelectedPlayersForEdit();
renderPlayers();