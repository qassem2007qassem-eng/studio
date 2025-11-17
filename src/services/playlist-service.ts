'use client';

import { 
  collection, 
  doc, 
  getDoc,
  deleteDoc,
  query, 
  where,
  getDocs,
} from 'firebase/firestore';
import { initializeFirebase } from '@/firebase';
import { type Playlist } from '@/lib/types';


export async function getPlaylistsByTeacher(teacherId: string): Promise<Playlist[]> {
  const { firestore } = initializeFirebase();
  try {
    const playlistsQuery = query(collection(firestore, 'playlists'), where('teacherId', '==', teacherId));
    const querySnapshot = await getDocs(playlistsQuery);
    return querySnapshot.docs.map(doc => doc.data() as Playlist);
  } catch (error) {
    console.error("Error getting playlists by teacher:", error);
    return [];
  }
}

export async function deletePlaylist(playlistId: string): Promise<void> {
  const { firestore } = initializeFirebase();
  try {
    const playlistRef = doc(firestore, 'playlists', playlistId);
    await deleteDoc(playlistRef);
  } catch (error) {
    console.error("Error deleting playlist:", error);
    throw error;
  }
}
