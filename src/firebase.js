import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyCoa3wJbecYIw0BIG03gYR8A-08eFzJBFE",
  authDomain: "comedy-club-pantry.firebaseapp.com",
  projectId: "comedy-club-pantry",
  storageBucket: "comedy-club-pantry.firebasestorage.app",
  messagingSenderId: "1083613666334",
  appId: "1:1083613666334:web:693417642442427384a20f",
};

const app = initializeApp(firebaseConfig);

export const db = getFirestore(app);