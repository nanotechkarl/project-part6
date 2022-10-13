import {Entity, model, property} from '@loopback/repository';

@model({
  settings: {
    mongodb: {
      collection: 'uploads',
    },
  },
})
export class Uploads extends Entity {
  @property({
    type: 'number',
    id: true,
    generated: false,
    required: true,
  })
  id: number;

  @property({
    type: 'string',
    required: true,
  })
  label: string;

  @property({
    type: 'string',
    required: true,
  })
  file: string;

  @property({
    type: 'string',
    required: true,
  })
  fileId: string;

  @property({
    type: 'array',
    itemType: 'object',
  })
  sharedTo?: object[];

  constructor(data?: Partial<Uploads>) {
    super(data);
  }
}

export interface UploadsRelations {
  // describe navigational properties here
}

export type UploadsWithRelations = Uploads & UploadsRelations;
