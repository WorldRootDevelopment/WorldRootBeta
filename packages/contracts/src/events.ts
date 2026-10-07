/**
 * Domain events carried by the outbox. Payloads hold ids, not content:
 * consumers load what they need and access is re-checked at that point.
 */
export interface EventPayloads {
  'user.onboarded': { userId: string };
  'community.created': { communityId: string };
  'community.member_joined': { communityId: string; userId: string };
  'world.copied': { worldId: string; sourceWorldId: string; communityId: string };
  'character.copied': { characterId: string; sourceCharacterId: string; communityId: string };
}

export type EventType = keyof EventPayloads;

export interface DomainEvent<T extends EventType = EventType> {
  id: string;
  type: T;
  payload: EventPayloads[T];
  createdAt: Date;
}
