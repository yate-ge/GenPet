/** Conversation notes: what the user said to the pet that later stories may use. Never changes the pet or a story. */
import { randomUUID } from 'node:crypto';
import { identifier, text, type Chat } from './model.js';
import type { Store } from './store.js';

export async function noteChat(store: Store, petId: string, note: string) {
  identifier(petId, 'petId');
  const brief = text(note, 'chat note');
  if (brief.length > 1000) throw new Error('A chat note is a brief record of at most 1000 characters');
  return store.transaction(state => {
    if (!state.pet || state.pet.id !== petId) throw new Error('Chat note belongs to another or missing pet');
    const chat: Chat = { id: `chat-${randomUUID()}`, petId, at: Date.now(), text: brief };
    (state.chats ??= []).push(chat);
    return chat;
  });
}
