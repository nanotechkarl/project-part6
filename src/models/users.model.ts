import {Entity, model, property} from '@loopback/repository';

@model({
  //REVIEW added settings for custom collection name
  settings: {
    mongodb: {
      collection: 'users',
    },
  },
})
export class Users extends Entity {
  @property({
    type: 'string',
    id: true,
    generated: true,
  })
  _id?: number;

  @property({
    type: 'number',
  })
  id?: number;

  @property({
    type: 'string',
    required: true,
  })
  fullName: string;

  @property({
    type: 'string',
    required: true,
    //REVIEW validate email
    jsonSchema: {
      format: 'email',
    },
  })
  email: string;

  @property({
    type: 'string',
    required: true,
  })
  password: string;

  constructor(data?: Partial<Users>) {
    super(data);
  }
}

export interface UsersRelations {
  // describe navigational properties here
}

export type UsersWithRelations = Users & UsersRelations;
