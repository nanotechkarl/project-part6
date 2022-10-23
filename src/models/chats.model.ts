import {Entity, model, property} from '@loopback/repository';

@model({
  settings: {
    mongodb: {
      collection: 'chats',
    },
  },
})
export class Chats extends Entity {
  @property({
    type: 'number',
    id: true,
    generated: true,
  })
  id: number;

  @property({
    type: 'number',
    required: true,
  })
  userId: number;

  @property({
    type: 'string',
    required: true,
  })
  message: string;

  @property({
    type: 'string',
    required: true,
  })
  date: string;

  constructor(data?: Partial<Chats>) {
    super(data);
  }
}

export interface ChatsRelations {
  // describe navigational properties here
}

export type ChatsWithRelations = Chats & ChatsRelations;
