

import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.12.5/firebase-app.js';
import {
    getFirestore,
    doc,
    setDoc,
    onSnapshot,
    serverTimestamp
} from 'https://www.gstatic.com/firebasejs/10.12.5/firebase-firestore.js';

const firebaseConfig = {
    apiKey: 'AIzaSyCwamdg7jeeo1s-I6M2qVe09syW3c4r-hs',
    authDomain: 'gangho-badminton-manager.firebaseapp.com',
    projectId: 'gangho-badminton-manager',
    storageBucket: 'gangho-badminton-manager.firebasestorage.app',
    messagingSenderId: '37341668037',
    appId: '1:37341668037:web:7ad9a2ad13c6feed0306ac',
    measurementId: 'G-X7EJGGXEYY'
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const matchStateRef = doc(db, 'ganghoMatch', 'currentState');

async function saveMatchStateToFirebase(state) {
    await setDoc(matchStateRef, {
        ...state,
        updatedAt: serverTimestamp()
    });
}

function watchMatchStateFromFirebase(callback) {
    return onSnapshot(matchStateRef, (snapshot) => {
        if (!snapshot.exists()) {
            callback(null);
            return;
        }

        callback(snapshot.data());
    });
}

window.ganghoFirebase = {
    saveMatchStateToFirebase,
    watchMatchStateFromFirebase
};