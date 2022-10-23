import {authenticate} from '@loopback/authentication';
import {inject} from '@loopback/core';
import {repository} from '@loopback/repository';
import {
  del,
  get,
  getModelSchemaRef,
  param,
  post,
  requestBody,
  response,
} from '@loopback/rest';
import {SecurityBindings, securityId, UserProfile} from '@loopback/security';
import {Chats} from '../models';
import {ChatsRepository, UsersRepository} from '../repositories';

/* #region  - Request/response schema */
const responseSchema = {
  getAll: {
    description: 'Array of Chats model instances',
    content: {
      'application/json': {
        schema: {
          type: 'array',
          items: getModelSchemaRef(Chats, {includeRelations: true}),
        },
      },
    },
  },
  add: {
    description: 'Chats model instance',
    content: {
      'application/json': {
        schema: getModelSchemaRef(Chats, {
          exclude: ['id'],
        }),
      },
    },
  },
  deleteAll: {
    description: 'Chats DELETE success',
    content: {
      'application/json': {
        schema: {
          type: 'object',
          properties: {
            count: {type: 'number'},
          },
        },
      },
    },
  },
};

const requestBodySchema = {
  add: {
    content: {
      'application/json': {
        schema: getModelSchemaRef(Chats, {
          title: 'NewChats',
          exclude: ['id', 'date', 'userId'],
        }),
      },
    },
  },
};
/* #endregion */

@authenticate('jwt')
export class ChatsController {
  /* #region  - Constructor */
  constructor(
    @inject(SecurityBindings.USER, {optional: true})
    public user: UserProfile,
    @repository(ChatsRepository)
    public chatsRepository: ChatsRepository,
    @repository(UsersRepository)
    protected usersRepository: UsersRepository,
  ) {}
  /* #endregion */

  /* #region  - Add chat */
  @post('/chats')
  @response(200, responseSchema.add)
  async create(
    @requestBody(requestBodySchema.add)
    chats: Chats,
  ): Promise<Chats> {
    const found = await this.usersRepository.find({
      where: {id: parseInt(this.user[securityId])},
    });
    if (!found.length) throw new Error('User does not exist');

    const date = new Date();
    const dateFormatted =
      [date.getMonth() + 1, date.getDate(), date.getFullYear()].join('/') +
      ' ' +
      [date.getHours(), date.getMinutes(), date.getSeconds()].join(':');

    chats.date = dateFormatted;
    chats.userId = parseInt(this.user[securityId]);

    return this.chatsRepository.create(chats);
  }
  /* #endregion */

  /* #region  - Get all chats */
  @get('/chats')
  @response(200, responseSchema.getAll)
  async find(): Promise<Chats[]> {
    return this.chatsRepository.find({fields: {id: false}});
  }
  /* #endregion */

  /* #region  - Delete chats */
  @del('/chats/{userId}')
  @response(204, responseSchema.deleteAll)
  async deleteById(@param.path.number('userId') userId: number) {
    return this.chatsRepository.deleteAll({userId});
  }
  /* #endregion */
}
